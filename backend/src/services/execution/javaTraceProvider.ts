import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { config } from "../../config/env.js";
import { killProcessTree } from "../../utils/processTree.js";
import type {
  LanguageCapability,
  TraceProvider,
  TraceRequest,
  TraceResult,
} from "../../types/execution.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_LIMITATIONS = [
  "Captured up to 500 source line and return events",
  "Arrays serialized up to 50 elements",
  "Strings truncated at 256 characters",
  "Stack frame depth limited to 15 frames",
  "Standard output & error capped at 64KB",
];

const MAX_STREAM_BYTES = 64 * 1024; // 64 KB hard cap for process output streams

export class JavaTraceProvider implements TraceProvider {
  public readonly language = "java";
  private tracerClasspath: string;
  private maxCodeLength: number;
  private defaultTimeoutMs: number;
  private defaultMaxSteps: number;

  constructor(options?: {
    tracerClasspath?: string;
    maxCodeLength?: number;
    defaultTimeoutMs?: number;
    defaultMaxSteps?: number;
  }) {
    // Path to the pre-compiled JavaTracer class files
    this.tracerClasspath =
      options?.tracerClasspath || path.resolve(__dirname, "../../../dist/tracer/java");
    this.maxCodeLength = options?.maxCodeLength || 32 * 1024; // 32KB hard limit for source code
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 6000;  // 6s default timeout
    this.defaultMaxSteps = options?.defaultMaxSteps || 500;     // 500 steps hard ceiling
  }

  public getCapability(): LanguageCapability {
    const isTraceAllowed =
      Boolean(config.JAVA_TRACE_WORKER_URL) ||
      config.ENABLE_JAVA_TRACING ||
      !config.isProduction;

    return {
      language: "java",
      displayName: "Java",
      version: "OpenJDK 17 / 24",
      supportsRun: true,
      supportsTrace: isTraceAllowed,
      limitations: isTraceAllowed
        ? DEFAULT_LIMITATIONS
        : ["Java tracing is disabled in production pending deployment of an isolated container execution boundary."],
    };
  }

  async trace(request: TraceRequest): Promise<TraceResult> {
    if (request.language.toLowerCase() !== "java") {
      return {
        success: false,
        language: request.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `JavaTraceProvider does not support language '${request.language}'.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    // Production security gate: fail closed if no isolated worker and tracing not explicitly enabled
    if (config.isProduction && !config.JAVA_TRACE_WORKER_URL && !config.ENABLE_JAVA_TRACING) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Java trace execution is disabled in production without a verified isolated worker boundary (JAVA_TRACE_WORKER_URL).",
        stdout: "",
        stderr: "",
        limitations: [
          "Disabled in production to protect host application from unisolated execution risks.",
        ],
      };
    }

    if (!request.sourceCode || request.sourceCode.trim().length === 0) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Source code cannot be empty.",
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    if (request.sourceCode.length > this.maxCodeLength) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `Source code exceeds maximum permitted size of ${this.maxCodeLength} bytes.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    // 1. If remote worker URL is configured, dispatch trace over HTTP to dedicated worker container
    if (config.JAVA_TRACE_WORKER_URL) {
      return await this.dispatchToWorker(request);
    }

    // 2. Direct local execution (for development, test, or hardened worker process)
    return await this.executeLocal(request);
  }

  /**
   * Dispatch trace request to dedicated isolated container worker service
   */
  private async dispatchToWorker(request: TraceRequest): Promise<TraceResult> {
    const workerEndpoint = `${config.JAVA_TRACE_WORKER_URL?.replace(/\/+$/, "")}/trace`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (request.timeoutMs || this.defaultTimeoutMs) + 2000);

    try {
      const res = await fetch(workerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "java",
          sourceCode: request.sourceCode,
          maxSteps: Math.min(request.maxSteps || request.maxEvents || this.defaultMaxSteps, 500),
          timeoutMs: Math.min(request.timeoutMs || this.defaultTimeoutMs, 10000),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          language: "java",
          events: [],
          truncated: false,
          totalEvents: 0,
          error: errJson.message || `Java trace worker returned HTTP ${res.status}`,
          stdout: "",
          stderr: "",
          limitations: DEFAULT_LIMITATIONS,
        };
      }

      return (await res.json()) as TraceResult;
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: isTimeout
          ? `Java trace worker request timed out.`
          : `Failed to communicate with Java trace worker: ${err.message}`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Local execution using direct process invocation, process tree killing, and strict resource bounds
   */
  private async executeLocal(request: TraceRequest): Promise<TraceResult> {
    const className = this.extractClassName(request.sourceCode) || "Solution";
    const runId = randomUUID();
    const sandboxDir = path.join(os.tmpdir(), `algolens-java-${runId}`);
    const sourceFilePath = path.join(sandboxDir, `${className}.java`);

    try {
      await fs.promises.mkdir(sandboxDir, { recursive: true });
      await fs.promises.writeFile(sourceFilePath, request.sourceCode, "utf8");

      // Verify that JavaTracer.class is pre-compiled and available
      this.verifyTracerArtifacts();

      // 1. Compile with debug info (-g) using direct process invocation (shell: false)
      const timeoutMs = Math.min(request.timeoutMs || this.defaultTimeoutMs, 10000);
      const compileResult = await this.compileJava(sandboxDir, className, timeoutMs);
      if (!compileResult.success) {
        return {
          success: false,
          language: "java",
          events: [],
          truncated: false,
          totalEvents: 0,
          error: "Compilation failed",
          compilationOutput: compileResult.output,
          stdout: "",
          stderr: compileResult.output,
          limitations: DEFAULT_LIMITATIONS,
        };
      }

      // 2. Launch JavaTracer with JDI using direct process invocation and process tree killing
      const maxSteps = Math.min(request.maxSteps || request.maxEvents || this.defaultMaxSteps, 500);
      const traceOutput = await this.runTracer(sandboxDir, className, maxSteps, timeoutMs);

      return traceOutput;
    } catch (err: any) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: err.message || "Unknown error during Java tracing execution",
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    } finally {
      // Ephemeral cleanup with actionable operational error logging
      try {
        await fs.promises.rm(sandboxDir, { recursive: true, force: true });
      } catch (cleanupErr: any) {
        console.error(
          `[AlgoLens Operational Error] Failed to delete ephemeral sandbox directory '${sandboxDir}': ${cleanupErr?.message}`
        );
      }
    }
  }

  private extractClassName(sourceCode: string): string | null {
    const publicMatch = sourceCode.match(/public\s+class\s+([A-Za-z0-9_$]+)/);
    if (publicMatch && publicMatch[1]) {
      return publicMatch[1];
    }
    const classMatch = sourceCode.match(/class\s+([A-Za-z0-9_$]+)/);
    if (classMatch && classMatch[1]) {
      return classMatch[1];
    }
    return null;
  }

  private verifyTracerArtifacts(): void {
    const classFile = path.join(
      this.tracerClasspath,
      "com",
      "algolens",
      "tracer",
      "JavaTracer.class"
    );
    if (!fs.existsSync(classFile)) {
      throw new Error(
        `Required JavaTracer class artifact not found at '${classFile}'. ` +
          `Production deployments must pre-compile JavaTracer during image build using 'npm run build:tracer'.`
      );
    }
  }

  private async compileJava(
    dir: string,
    className: string,
    timeoutMs: number
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const javaFile = `${className}.java`;

      // Direct process invocation: shell: false, strict argument array, serial GC & memory bound
      const javac: ChildProcess = spawn(
        "javac",
        ["-g", "-encoding", "UTF-8", "-J-Xmx64m", "-J-XX:+UseSerialGC", javaFile],
        {
          cwd: dir,
          shell: false,
          windowsHide: true,
        }
      );

      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(async () => {
        if (!finished) {
          finished = true;
          await killProcessTree(javac);
          resolve({
            success: false,
            output: `Compilation timed out after ${timeoutMs}ms. Process terminated.`,
          });
        }
      }, timeoutMs);

      javac.stdout?.on("data", (data: Buffer) => {
        if (stdout.length < MAX_STREAM_BYTES) {
          stdout += data.toString("utf8");
        }
      });

      javac.stderr?.on("data", (data: Buffer) => {
        if (stderr.length < MAX_STREAM_BYTES) {
          stderr += data.toString("utf8");
        }
      });

      javac.on("close", (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          const fullOutput = (stdout + "\n" + stderr).trim();
          resolve({
            success: code === 0,
            output: fullOutput,
          });
        }
      });

      javac.on("error", (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve({
            success: false,
            output: `Failed to invoke javac: ${err.message}`,
          });
        }
      });
    });
  }

  private async runTracer(
    sandboxDir: string,
    className: string,
    maxSteps: number,
    timeoutMs: number
  ): Promise<TraceResult> {
    return new Promise((resolve) => {
      // Direct process invocation: shell: false, clean arguments without shell escaping
      const java: ChildProcess = spawn(
        "java",
        [
          "--add-modules",
          "jdk.jdi",
          "-Xmx64m",
          "-XX:+UseSerialGC",
          "-XX:MaxRAM=128m",
          "-cp",
          this.tracerClasspath,
          "com.algolens.tracer.JavaTracer",
          "-cp",
          sandboxDir,
          "-main",
          className,
          "-maxSteps",
          maxSteps.toString(),
        ],
        {
          cwd: sandboxDir,
          shell: false,
          detached: process.platform !== "win32",
          windowsHide: true,
        }
      );

      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(async () => {
        if (!finished) {
          finished = true;
          await killProcessTree(java);
          resolve({
            success: false,
            language: "java",
            events: [],
            truncated: false,
            totalEvents: 0,
            error: `Execution timed out after ${timeoutMs}ms. Process tree terminated.`,
            stdout,
            stderr,
            limitations: DEFAULT_LIMITATIONS,
          });
        }
      }, timeoutMs);

      java.stdout?.on("data", (data: Buffer) => {
        if (stdout.length < MAX_STREAM_BYTES) {
          stdout += data.toString("utf8");
        } else if (!stdout.endsWith("[Output stream truncated]\n")) {
          stdout += "\n[Output stream truncated]\n";
        }
      });

      java.stderr?.on("data", (data: Buffer) => {
        if (stderr.length < MAX_STREAM_BYTES) {
          stderr += data.toString("utf8");
        } else if (!stderr.endsWith("[Error stream truncated]\n")) {
          stderr += "\n[Error stream truncated]\n";
        }
      });

      java.on("close", (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);

          // Find JSON in stdout
          const jsonStart = stdout.indexOf("{");
          const jsonEnd = stdout.lastIndexOf("}");

          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
            try {
              const parsed = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1)) as TraceResult;
              resolve(parsed);
              return;
            } catch (parseErr: any) {
              resolve({
                success: false,
                language: "java",
                events: [],
                truncated: false,
                totalEvents: 0,
                error: `Failed to parse debugger trace JSON: ${parseErr.message}`,
                stdout,
                stderr,
                limitations: DEFAULT_LIMITATIONS,
              });
              return;
            }
          }

          resolve({
            success: false,
            language: "java",
            events: [],
            truncated: false,
            totalEvents: 0,
            error: code !== 0 ? `Debugger exited with code ${code}` : "No trace output produced",
            stdout,
            stderr,
            limitations: DEFAULT_LIMITATIONS,
          });
        }
      });

      java.on("error", (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve({
            success: false,
            language: "java",
            events: [],
            truncated: false,
            totalEvents: 0,
            error: `Failed to launch Java debugger: ${err.message}`,
            stdout: "",
            stderr: "",
            limitations: DEFAULT_LIMITATIONS,
          });
        }
      });
    });
  }
}

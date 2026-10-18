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

export const DEFAULT_JAVA_LIMITATIONS = [
  "Captured up to 500 source line and return events",
  "Arrays serialized up to 50 elements",
  "Strings truncated at 256 characters",
  "Stack frame depth limited to 15 frames",
  "Standard output & error capped at 64KB",
];

const MAX_STREAM_BYTES = 64 * 1024; // 64 KB hard cap for process output streams

/**
 * RemoteJavaTraceDispatcher
 *
 * Used exclusively by the main API service.
 * It ONLY communicates with the isolated Java trace worker over HTTP.
 * Under NO circumstances does it contain or invoke local compiler or debugger processes.
 * If the worker URL is missing or the worker experiences an outage, it fails closed.
 */
export class RemoteJavaTraceDispatcher implements TraceProvider {
  public readonly language = "java";
  private workerUrl?: string;
  private defaultTimeoutMs: number;
  private defaultMaxSteps: number;

  constructor(options?: {
    workerUrl?: string;
    defaultTimeoutMs?: number;
    defaultMaxSteps?: number;
  }) {
    this.workerUrl = options?.workerUrl || config.JAVA_TRACE_WORKER_URL;
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 6000;
    this.defaultMaxSteps = options?.defaultMaxSteps || 500;
  }

  public getCapability(): LanguageCapability {
    const isAvailable = Boolean(this.workerUrl);
    return {
      language: "java",
      displayName: "Java",
      version: "OpenJDK 17 / 24",
      supportsRun: true,
      supportsTrace: isAvailable,
      limitations: isAvailable
        ? DEFAULT_JAVA_LIMITATIONS
        : [
            "Java tracing requires an isolated container worker (JAVA_TRACE_WORKER_URL).",
            "The main API fails closed and will not execute untrusted Java code locally.",
          ],
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
        error: `RemoteJavaTraceDispatcher does not support language '${request.language}'.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_JAVA_LIMITATIONS,
      };
    }

    if (!this.workerUrl) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error:
          "Java tracing is unavailable: JAVA_TRACE_WORKER_URL is not configured. " +
          "The main API strictly refuses to execute user Java code locally.",
        stdout: "",
        stderr: "",
        limitations: [
          "Failing closed to prevent unisolated code execution in the main API.",
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
        limitations: DEFAULT_JAVA_LIMITATIONS,
      };
    }

    if (request.sourceCode.length > 32 * 1024) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Source code exceeds maximum permitted size of 32KB.",
        stdout: "",
        stderr: "",
        limitations: DEFAULT_JAVA_LIMITATIONS,
      };
    }

    const workerEndpoint = `${this.workerUrl.replace(/\/+$/, "")}/trace`;
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs + 2000);

    try {
      const res = await fetch(workerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "java",
          sourceCode: request.sourceCode,
          maxSteps: Math.min(request.maxSteps || request.maxEvents || this.defaultMaxSteps, 500),
          timeoutMs: Math.min(timeoutMs, 10000),
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
          error:
            errJson.message ||
            `Java trace worker returned HTTP ${res.status}. The main API will not fall back to local execution.`,
          stdout: "",
          stderr: "",
          limitations: DEFAULT_JAVA_LIMITATIONS,
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
          ? "Java trace worker request timed out. The main API will not fall back to local execution."
          : `Java trace worker is unavailable (${err.message}). The main API will not fall back to local execution.`,
        stdout: "",
        stderr: "",
        limitations: [
          "Failing closed during worker outage to prevent unisolated local execution.",
        ],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * LocalJavaTraceExecutor
 *
 * Dedicated local execution engine for Java JDI debugging.
 * Authorized ONLY inside the dedicated worker container (EXECUTION_ROLE === 'worker')
 * or via explicit dependency injection in test harnesses.
 *
 * Enforces:
 * - Direct process spawning (shell: false)
 * - Process tree termination on timeout
 * - Output stream hard truncation (64KB)
 * - JDI heap memory bounds (-Xmx64m -XX:+UseSerialGC -XX:MaxRAM=128m)
 * - Ephemeral directory cleanup with operational error logging
 */
export class LocalJavaTraceExecutor implements TraceProvider {
  public readonly language = "java";
  private tracerClasspath: string;
  private maxCodeLength: number;
  private defaultTimeoutMs: number;
  private defaultMaxSteps: number;
  private authorizedForLocal: boolean;

  constructor(options?: {
    tracerClasspath?: string;
    maxCodeLength?: number;
    defaultTimeoutMs?: number;
    defaultMaxSteps?: number;
    authorizedForLocal?: boolean;
  }) {
    this.authorizedForLocal =
      options?.authorizedForLocal ??
      (config.EXECUTION_ROLE === "worker" || process.env.NODE_ENV === "test");

    this.tracerClasspath =
      options?.tracerClasspath || path.resolve(__dirname, "../../../dist/tracer/java");
    this.maxCodeLength = options?.maxCodeLength || 32 * 1024;
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 6000;
    this.defaultMaxSteps = options?.defaultMaxSteps || 500;
  }

  public getCapability(): LanguageCapability {
    return {
      language: "java",
      displayName: "Java",
      version: "OpenJDK 17 / 24",
      supportsRun: true,
      supportsTrace: true,
      limitations: DEFAULT_JAVA_LIMITATIONS,
    };
  }

  async trace(request: TraceRequest): Promise<TraceResult> {
    if (!this.authorizedForLocal) {
      return {
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error:
          "Unauthorized local Java execution: LocalJavaTraceExecutor is restricted to " +
          "the dedicated worker role (EXECUTION_ROLE=worker). The main application cannot execute local JVM code.",
        stdout: "",
        stderr: "",
        limitations: [
          "Security violation: Local execution attempted outside authorized worker boundary.",
        ],
      };
    }

    if (request.language.toLowerCase() !== "java") {
      return {
        success: false,
        language: request.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `LocalJavaTraceExecutor does not support language '${request.language}'.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_JAVA_LIMITATIONS,
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
        limitations: DEFAULT_JAVA_LIMITATIONS,
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
        limitations: DEFAULT_JAVA_LIMITATIONS,
      };
    }

    return await this.executeLocal(request);
  }

  private async executeLocal(request: TraceRequest): Promise<TraceResult> {
    const className = this.extractClassName(request.sourceCode) || "Solution";
    const runId = randomUUID();
    const sandboxDir = path.join(os.tmpdir(), `algolens-java-${runId}`);
    const sourceFilePath = path.join(sandboxDir, `${className}.java`);

    try {
      await fs.promises.mkdir(sandboxDir, { recursive: true });
      await fs.promises.writeFile(sourceFilePath, request.sourceCode, "utf8");

      this.verifyTracerArtifacts();

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
          limitations: DEFAULT_JAVA_LIMITATIONS,
        };
      }

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
        limitations: DEFAULT_JAVA_LIMITATIONS,
      };
    } finally {
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
            limitations: DEFAULT_JAVA_LIMITATIONS,
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
                limitations: DEFAULT_JAVA_LIMITATIONS,
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
            limitations: DEFAULT_JAVA_LIMITATIONS,
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
            limitations: DEFAULT_JAVA_LIMITATIONS,
          });
        }
      });
    });
  }
}

/**
 * JavaTraceProvider
 * Backward-compatible provider that selects RemoteJavaTraceDispatcher or LocalJavaTraceExecutor
 * based on the explicit EXECUTION_ROLE or supplied options.
 */
export class JavaTraceProvider implements TraceProvider {
  public readonly language = "java";
  private delegate: TraceProvider;

  constructor(options?: {
    role?: "api" | "worker";
    workerUrl?: string;
    tracerClasspath?: string;
    maxCodeLength?: number;
    defaultTimeoutMs?: number;
    defaultMaxSteps?: number;
    authorizedForLocal?: boolean;
  }) {
    const effectiveRole = options?.role || config.EXECUTION_ROLE;
    if (effectiveRole === "worker" || options?.authorizedForLocal) {
      this.delegate = new LocalJavaTraceExecutor(options);
    } else {
      this.delegate = new RemoteJavaTraceDispatcher({
        workerUrl: options?.workerUrl,
        defaultTimeoutMs: options?.defaultTimeoutMs,
        defaultMaxSteps: options?.defaultMaxSteps,
      });
    }
  }

  public getCapability(): LanguageCapability {
    return this.delegate.getCapability();
  }

  public async trace(request: TraceRequest): Promise<TraceResult> {
    return await this.delegate.trace(request);
  }
}

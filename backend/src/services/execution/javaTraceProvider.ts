import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
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
];

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
    // Path to the compiled JavaTracer class
    this.tracerClasspath =
      options?.tracerClasspath || path.resolve(__dirname, "../../../dist/tracer/java");
    this.maxCodeLength = options?.maxCodeLength || 64 * 1024; // 64KB
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 10000; // 10s
    this.defaultMaxSteps = options?.defaultMaxSteps || 500;
  }

  public getCapability(): LanguageCapability {
    return {
      language: "java",
      displayName: "Java",
      version: "OpenJDK 17 / 24",
      supportsRun: true,
      supportsTrace: true,
      limitations: DEFAULT_LIMITATIONS,
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

    // Determine the class name. Default to "Solution" if not found.
    const className = this.extractClassName(request.sourceCode) || "Solution";
    const runId = randomUUID();
    const sandboxDir = path.join(os.tmpdir(), `algolens-java-${runId}`);
    const sourceFilePath = path.join(sandboxDir, `${className}.java`);

    try {
      await fs.promises.mkdir(sandboxDir, { recursive: true });
      await fs.promises.writeFile(sourceFilePath, request.sourceCode, "utf8");

      // 1. Compile with debug info (-g)
      const compileResult = await this.compileJava(
        sandboxDir,
        className,
        request.timeoutMs || this.defaultTimeoutMs
      );
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

      // 2. Ensure JavaTracer is compiled and available
      await this.ensureTracerCompiled();

      // 3. Launch JavaTracer with JDI
      const maxSteps = request.maxSteps || request.maxEvents || this.defaultMaxSteps;
      const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
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
      // Ephemeral cleanup
      try {
        await fs.promises.rm(sandboxDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        // Silently ignore cleanup error in tmpdir
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

  private async compileJava(
    dir: string,
    className: string,
    timeoutMs: number
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const javaFile = `${className}.java`;
      const javac = spawn("javac", ["-g", "-encoding", "UTF-8", javaFile], {
        cwd: dir,
        shell: true,
      });

      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          javac.kill();
          resolve({
            success: false,
            output: "Compilation timed out after " + timeoutMs + "ms",
          });
        }
      }, timeoutMs);

      javac.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      javac.stderr.on("data", (data) => {
        stderr += data.toString();
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

  private async ensureTracerCompiled(): Promise<void> {
    const classFile = path.join(
      this.tracerClasspath,
      "com",
      "algolens",
      "tracer",
      "JavaTracer.class"
    );
    if (fs.existsSync(classFile)) {
      return;
    }

    const sourceFile = path.resolve(
      __dirname,
      "../../tracer/java/com/algolens/tracer/JavaTracer.java"
    );
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`JavaTracer source not found at: ${sourceFile}`);
    }

    await fs.promises.mkdir(this.tracerClasspath, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const javac = spawn(
        "javac",
        ["--add-modules", "jdk.jdi", "-d", `"${this.tracerClasspath}"`, `"${sourceFile}"`],
        { shell: true }
      );

      let errOutput = "";
      javac.stderr.on("data", (d) => {
        errOutput += d.toString();
      });

      javac.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to compile JavaTracer: ${errOutput}`));
        }
      });

      javac.on("error", reject);
    });
  }

  private async runTracer(
    sandboxDir: string,
    className: string,
    maxSteps: number,
    timeoutMs: number
  ): Promise<TraceResult> {
    return new Promise((resolve) => {
      const java = spawn(
        "java",
        [
          "--add-modules",
          "jdk.jdi",
          "-cp",
          `"${this.tracerClasspath}"`,
          "com.algolens.tracer.JavaTracer",
          "-cp",
          `"${sandboxDir}"`,
          "-main",
          className,
          "-maxSteps",
          maxSteps.toString(),
        ],
        {
          cwd: sandboxDir,
          shell: true,
        }
      );

      let stdout = "";
      let stderr = "";
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          java.kill();
          resolve({
            success: false,
            language: "java",
            events: [],
            truncated: false,
            totalEvents: 0,
            error: `Execution timed out after ${timeoutMs}ms.`,
            stdout,
            stderr,
            limitations: DEFAULT_LIMITATIONS,
          });
        }
      }, timeoutMs);

      java.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      java.stderr.on("data", (data) => {
        stderr += data.toString();
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

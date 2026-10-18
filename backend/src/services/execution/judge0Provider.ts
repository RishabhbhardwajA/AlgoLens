import type {
  ExecutionProvider,
  ExecutionResult,
  ExecutionStatus,
  LanguageCapability,
  RunRequest,
} from "../../types/execution.js";
import { resolveLanguage, getLanguageCapabilities } from "./languageRegistry.js";

export interface Judge0Config {
  apiUrl: string;
  apiKey?: string;
  apiHost?: string;
  pollIntervalMs?: number;
  maxWaitTimeMs?: number;
}

export class Judge0Provider implements ExecutionProvider {
  public readonly name = "Judge0";
  private readonly config: Required<Judge0Config>;

  constructor(options: Judge0Config) {
    this.config = {
      apiUrl: options.apiUrl.replace(/\/+$/, ""),
      apiKey: options.apiKey || "",
      apiHost: options.apiHost || "",
      pollIntervalMs: options.pollIntervalMs || 400,
      maxWaitTimeMs: options.maxWaitTimeMs || 10000,
    };
  }

  public listCapabilities(): LanguageCapability[] {
    return getLanguageCapabilities();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      if (this.config.apiHost) {
        // RapidAPI gateway style headers
        headers["X-RapidAPI-Key"] = this.config.apiKey;
        headers["X-RapidAPI-Host"] = this.config.apiHost;
      } else {
        // Direct Judge0 self-hosted / CE token header
        headers["X-Auth-Token"] = this.config.apiKey;
      }
    }

    return headers;
  }

  public async submit(req: RunRequest): Promise<string> {
    const langConfig = resolveLanguage(req.language);
    if (!langConfig) {
      throw new Error(`Unsupported language: '${req.language}'. Allowed: java, python, cpp, javascript.`);
    }

    const payload = {
      language_id: langConfig.judge0Id,
      source_code: Buffer.from(req.sourceCode || "").toString("base64"),
      stdin: req.stdin ? Buffer.from(req.stdin).toString("base64") : "",
      cpu_time_limit: Math.min(Math.max(req.cpuTimeLimit || 5, 1), 10),
      memory_limit: Math.min(Math.max(req.memoryLimitKb || 128000, 32000), 512000),
    };

    const submitUrl = `${this.config.apiUrl}/submissions?base64_encoded=true&wait=false`;
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Judge0 submission failed (${response.status} ${response.statusText}): ${errText}`);
    }

    const data = (await response.json()) as { token: string };
    if (!data.token) {
      throw new Error("Judge0 response did not include a submission token.");
    }

    return data.token;
  }

  public async getSubmission(token: string): Promise<ExecutionResult> {
    const pollUrl = `${this.config.apiUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=true`;
    const startTime = Date.now();

    while (Date.now() - startTime < this.config.maxWaitTimeMs) {
      const response = await fetch(pollUrl, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Judge0 poll failed (${response.status}): ${errText}`);
      }

      const resData = (await response.json()) as {
        status?: { id: number; description: string };
        stdout?: string | null;
        stderr?: string | null;
        compile_output?: string | null;
        message?: string | null;
        exit_code?: number | null;
        time?: string | null;
        memory?: number | null;
      };

      const statusId = resData.status?.id ?? 1;

      // Status 1: In Queue, Status 2: Processing
      if (statusId === 1 || statusId === 2) {
        await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
        continue;
      }

      // Completed execution
      const decodeB64 = (val?: string | null) =>
        val ? Buffer.from(val, "base64").toString("utf-8") : "";

      const stdout = decodeB64(resData.stdout);
      const stderr = decodeB64(resData.stderr) || (resData.message ? decodeB64(resData.message) : "");
      const compileOutput = decodeB64(resData.compile_output);

      let status: ExecutionStatus = "INTERNAL_ERROR";
      if (statusId === 3) {
        status = "SUCCESS";
      } else if (statusId === 6) {
        status = "COMPILATION_ERROR";
      } else if (statusId === 5) {
        status = "TIME_LIMIT_EXCEEDED";
      } else if (statusId >= 7 && statusId <= 12) {
        status = "RUNTIME_ERROR";
      }

      return {
        stdout,
        stderr,
        compileOutput,
        status,
        exitCode: typeof resData.exit_code === "number" ? resData.exit_code : null,
        timeMs: resData.time ? Math.round(parseFloat(resData.time) * 1000) : undefined,
        memoryKb: typeof resData.memory === "number" ? resData.memory : undefined,
        isMock: false,
      };
    }

    return {
      stdout: "",
      stderr: "Execution polling timed out waiting for Judge0 response.",
      compileOutput: "",
      status: "TIME_LIMIT_EXCEEDED",
      exitCode: null,
      isMock: false,
    };
  }

  public async runSync(req: RunRequest): Promise<ExecutionResult> {
    const token = await this.submit(req);
    return this.getSubmission(token);
  }
}

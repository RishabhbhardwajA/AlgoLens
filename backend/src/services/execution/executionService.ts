import { config } from "../../config/env.js";
import type {
  ExecutionProvider,
  ExecutionResult,
  LanguageCapability,
  RunRequest,
  TraceProvider,
  TraceRequest,
  TraceResult,
} from "../../types/execution.js";
import { Judge0Provider } from "./judge0Provider.js";
import { MockExecutionProvider } from "./mockExecutionProvider.js";
import { JavaTraceProvider } from "./javaTraceProvider.js";
import {
  getLanguageCapabilities,
  resolveLanguage,
} from "./languageRegistry.js";

const DEFAULT_LIMITATIONS = [
  "Captured up to 500 source line and return events",
  "Arrays serialized up to 50 elements",
  "Strings truncated at 256 characters",
  "Stack frame depth limited to 15 frames",
];

export class ExecutionService {
  private executionProvider: ExecutionProvider;
  private traceProviders: Map<string, TraceProvider> = new Map();
  private maxSourceLength: number = 64 * 1024; // 64 KB
  private maxStdinLength: number = 32 * 1024;  // 32 KB

  constructor() {
    if (config.USE_MOCK_EXECUTION || !config.JUDGE0_API_URL) {
      this.executionProvider = new MockExecutionProvider();
    } else {
      this.executionProvider = new Judge0Provider({
        apiUrl: config.JUDGE0_API_URL,
        apiKey: config.JUDGE0_API_KEY,
        apiHost: config.JUDGE0_API_HOST,
      });
    }

    // Register Trace Providers
    this.traceProviders.set("java", new JavaTraceProvider());
  }

  /**
   * Set custom execution provider (useful for testing)
   */
  public setExecutionProvider(provider: ExecutionProvider): void {
    this.executionProvider = provider;
  }

  /**
   * Set custom trace provider (useful for testing)
   */
  public setTraceProvider(language: string, provider: TraceProvider): void {
    this.traceProviders.set(language.toLowerCase(), provider);
  }

  /**
   * Returns list of all languages supported by AlgoLens with their Run & Trace capabilities
   */
  public getCapabilities(): LanguageCapability[] {
    return getLanguageCapabilities();
  }

  /**
   * Execute code using the configured provider
   */
  public async runCode(req: RunRequest): Promise<ExecutionResult> {
    if (!req.sourceCode || req.sourceCode.trim().length === 0) {
      throw new Error("Source code cannot be empty.");
    }

    if (req.sourceCode.length > this.maxSourceLength) {
      throw new Error(`Source code exceeds maximum permitted length of ${this.maxSourceLength} bytes.`);
    }

    if (req.stdin && req.stdin.length > this.maxStdinLength) {
      throw new Error(`Standard input exceeds maximum permitted length of ${this.maxStdinLength} bytes.`);
    }

    const langConfig = resolveLanguage(req.language);
    if (!langConfig || !langConfig.supportsRun) {
      throw new Error(`Language '${req.language}' is not supported for Run execution.`);
    }

    const timeLimit = req.cpuTimeLimit || req.cpuTimeLimitSec || 5;

    // Bound cpu and memory limits to server-configured ceilings
    const boundedReq: RunRequest = {
      ...req,
      cpuTimeLimit: Math.min(timeLimit, 10),
      memoryLimitKb: Math.min(req.memoryLimitKb || 128000, 256000),
    };

    const token = await this.executionProvider.submit(boundedReq);
    if (this.executionProvider.getResult) {
      return await this.executionProvider.getResult(token);
    }
    return await this.executionProvider.getSubmission(token);
  }

  /**
   * Trace execution step-by-step using language debugger provider
   */
  public async traceCode(req: TraceRequest): Promise<TraceResult> {
    if (!req.sourceCode || req.sourceCode.trim().length === 0) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Source code cannot be empty.",
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    if (req.sourceCode.length > this.maxSourceLength) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `Source code exceeds maximum permitted length of ${this.maxSourceLength} bytes.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    const langConfig = resolveLanguage(req.language);
    if (!langConfig || !langConfig.supportsTrace) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `Language '${req.language}' does not currently support Trace mode. Trace is available for: Java.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    const provider = this.traceProviders.get(langConfig.language.toLowerCase());
    if (!provider) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `No debugger trace provider registered for language '${req.language}'.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    // Bound max steps
    const stepLimit = req.maxSteps || req.maxEvents || 500;
    const boundedMaxSteps = Math.min(stepLimit, 1000);
    const boundedTimeoutMs = Math.min(req.timeoutMs || 10000, 15000);

    return await provider.trace({
      ...req,
      maxSteps: boundedMaxSteps,
      timeoutMs: boundedTimeoutMs,
    });
  }
}

export const executionService = new ExecutionService();

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
import {
  JavaTraceProvider,
  LocalJavaTraceExecutor,
  RemoteJavaTraceDispatcher,
} from "./javaTraceProvider.js";
import {
  getLanguageCapabilities,
  resolveLanguage,
} from "./languageRegistry.js";

const DEFAULT_LIMITATIONS = [
  "Captured up to 500 source line and return events",
  "Arrays serialized up to 50 elements",
  "Strings truncated at 256 characters",
  "Stack frame depth limited to 15 frames",
  "Standard output & error capped at 64KB",
];

export class ExecutionService {
  private executionProvider: ExecutionProvider | null = null;
  private traceProviders: Map<string, TraceProvider> = new Map();
  private maxSourceLength: number = 32 * 1024; // 32 KB hard limit
  private maxStdinLength: number = 16 * 1024;  // 16 KB hard limit

  // Concurrency tracking to prevent resource starvation
  private activeTraces: number = 0;
  private readonly maxConcurrentTraces: number = 3;

  constructor() {
    if (config.JUDGE0_API_URL) {
      this.executionProvider = new Judge0Provider({
        apiUrl: config.JUDGE0_API_URL,
        apiKey: config.JUDGE0_API_KEY,
        apiHost: config.JUDGE0_API_HOST,
      });
    } else if (config.USE_MOCK_EXECUTION) {
      this.executionProvider = new MockExecutionProvider();
    } else {
      // In production without a provider, executionProvider remains null (fail closed)
      this.executionProvider = null;
    }

    // Register Trace Providers based on explicit execution role
    if (config.EXECUTION_ROLE === "worker" || (!config.isProduction && process.env.NODE_ENV === "test")) {
      this.traceProviders.set("java", new LocalJavaTraceExecutor({ authorizedForLocal: true }));
    } else {
      // Main API service uses RemoteJavaTraceDispatcher; never executes local compiler or debugger
      this.traceProviders.set(
        "java",
        new RemoteJavaTraceDispatcher({ workerUrl: config.JAVA_TRACE_WORKER_URL })
      );
    }
  }

  /**
   * Set custom execution provider (useful for testing)
   */
  public setExecutionProvider(provider: ExecutionProvider | null): void {
    this.executionProvider = provider;
  }

  /**
   * Set custom trace provider (useful for testing)
   */
  public setTraceProvider(language: string, provider: TraceProvider): void {
    this.traceProviders.set(language.toLowerCase(), provider);
  }

  /**
   * Check if Run mode is available in the current environment
   */
  public isRunAvailable(): boolean {
    return this.executionProvider !== null;
  }

  /**
   * Returns list of all languages supported by AlgoLens with their Run & Trace capabilities
   */
  public getCapabilities(): LanguageCapability[] {
    const baseCaps = getLanguageCapabilities();
    const runAvailable = this.isRunAvailable();
    const javaProvider = this.traceProviders.get("java");
    const isTraceAllowed = javaProvider ? javaProvider.getCapability().supportsTrace : false;

    return baseCaps.map((cap) => {
      const capCopy = { ...cap };
      if (!runAvailable) {
        capCopy.supportsRun = false;
        capCopy.limitations = [
          ...capCopy.limitations,
          "Run mode is currently unavailable: no execution provider (e.g. Judge0) is configured.",
        ];
      }

      if (capCopy.language === "java") {
        capCopy.supportsTrace = isTraceAllowed;
        if (!isTraceAllowed) {
          capCopy.limitations = [
            ...capCopy.limitations,
            "Java tracing requires an isolated container worker (JAVA_TRACE_WORKER_URL). Local execution is disabled in the main application.",
          ];
        }
      }

      return capCopy;
    });
  }

  /**
   * Execute code using the configured provider.
   * Fails closed with descriptive error if no provider is configured.
   */
  public async runCode(req: RunRequest): Promise<ExecutionResult> {
    if (!this.executionProvider) {
      throw new Error(
        "Code execution is currently unavailable. An execution provider (e.g. Judge0) is not configured in this environment."
      );
    }

    if (!req.sourceCode || req.sourceCode.trim().length === 0) {
      throw new Error("Source code cannot be empty.");
    }

    if (req.sourceCode.length > this.maxSourceLength) {
      throw new Error(
        `Source code exceeds maximum permitted length of ${this.maxSourceLength} bytes.`
      );
    }

    if (req.stdin && req.stdin.length > this.maxStdinLength) {
      throw new Error(
        `Standard input exceeds maximum permitted length of ${this.maxStdinLength} bytes.`
      );
    }

    const langConfig = resolveLanguage(req.language);
    if (!langConfig || !langConfig.supportsRun) {
      throw new Error(`Language '${req.language}' is not supported for Run execution.`);
    }

    const timeLimit = req.cpuTimeLimit || req.cpuTimeLimitSec || 5;

    // Bound cpu and memory limits to server-configured ceilings
    const boundedReq: RunRequest = {
      ...req,
      cpuTimeLimit: Math.min(timeLimit, 5), // Max 5 seconds
      memoryLimitKb: Math.min(req.memoryLimitKb || 64000, 128000), // Max 128MB
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

    // Main API check: fail closed if no worker is configured
    if (config.EXECUTION_ROLE !== "worker" && !config.JAVA_TRACE_WORKER_URL) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error:
          "Java tracing requires an isolated container worker (JAVA_TRACE_WORKER_URL). " +
          "The main API strictly refuses to execute user Java code locally.",
        stdout: "",
        stderr: "",
        limitations: [
          "Failing closed to prevent unisolated code execution in the main API.",
        ],
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

    // Concurrency limit enforcement
    if (this.activeTraces >= this.maxConcurrentTraces) {
      return {
        success: false,
        language: req.language,
        events: [],
        truncated: false,
        totalEvents: 0,
        error: `Server is currently processing maximum concurrent trace requests (${this.maxConcurrentTraces}). Please retry in a few moments.`,
        stdout: "",
        stderr: "",
        limitations: DEFAULT_LIMITATIONS,
      };
    }

    this.activeTraces++;
    try {
      // Hard server ceilings
      const stepLimit = req.maxSteps || req.maxEvents || 500;
      const boundedMaxSteps = Math.min(stepLimit, 500);
      const boundedTimeoutMs = Math.min(req.timeoutMs || 6000, 10000);

      return await provider.trace({
        ...req,
        maxSteps: boundedMaxSteps,
        timeoutMs: boundedTimeoutMs,
      });
    } finally {
      this.activeTraces = Math.max(0, this.activeTraces - 1);
    }
  }
}

export const executionService = new ExecutionService();

import type { Request, Response, NextFunction } from "express";
import { executionService } from "../services/execution/executionService.js";
import { resolveLanguage } from "../services/execution/languageRegistry.js";

export const executionController = {
  getCapabilities(_req: Request, res: Response) {
    const capabilities = executionService.getCapabilities();
    return res.json({
      success: true,
      languages: capabilities,
      runAvailable: executionService.isRunAvailable(),
    });
  },

  async run(req: Request, res: Response, next: NextFunction) {
    try {
      if (!executionService.isRunAvailable()) {
        return res.status(503).json({
          error: "Execution Provider Unavailable",
          message:
            "Code execution is currently unavailable. An execution provider (e.g. Judge0) is not configured in this environment.",
          status: "INTERNAL_ERROR",
          stdout: "",
          stderr: "Service Unavailable: No execution provider configured.",
          compileOutput: "",
          exitCode: 1,
        });
      }

      const { language, sourceCode, stdin, cpuTimeLimitSec, memoryLimitKb } = req.body;

      if (!language || typeof language !== "string") {
        return res.status(400).json({
          error: "Validation Error",
          message: "Field 'language' is required and must be a string.",
        });
      }

      if (!sourceCode || typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Field 'sourceCode' is required and cannot be empty.",
        });
      }

      if (sourceCode.length > 32 * 1024) {
        return res.status(400).json({
          error: "Payload Too Large",
          message: "Source code exceeds the maximum allowed size of 32KB.",
        });
      }

      const langConfig = resolveLanguage(language);
      if (!langConfig) {
        return res.status(400).json({
          error: "Unsupported Language",
          message: `Language '${language}' is not supported for execution. Supported languages: java, python, cpp, javascript.`,
        });
      }

      const boundedCpuLimit = Math.min(
        typeof cpuTimeLimitSec === "number" ? cpuTimeLimitSec : 5,
        5
      );
      const boundedMemory = Math.min(
        typeof memoryLimitKb === "number" ? memoryLimitKb : 64000,
        128000
      );

      const result = await executionService.runCode({
        language: langConfig.language,
        sourceCode,
        stdin: typeof stdin === "string" ? stdin : undefined,
        cpuTimeLimitSec: boundedCpuLimit,
        memoryLimitKb: boundedMemory,
      });

      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  },

  async trace(req: Request, res: Response, next: NextFunction) {
    try {
      const { language, sourceCode, maxSteps, timeoutMs } = req.body;

      if (!language || typeof language !== "string") {
        return res.status(400).json({
          error: "Validation Error",
          message: "Field 'language' is required and must be a string.",
        });
      }

      if (!sourceCode || typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Field 'sourceCode' is required and cannot be empty.",
        });
      }

      if (sourceCode.length > 32 * 1024) {
        return res.status(400).json({
          error: "Payload Too Large",
          message: "Source code exceeds the maximum allowed size of 32KB.",
        });
      }

      const langConfig = resolveLanguage(language);
      if (!langConfig) {
        return res.status(400).json({
          error: "Unsupported Language",
          message: `Language '${language}' is not recognized. Trace is currently available for: java.`,
        });
      }

      if (!langConfig.supportsTrace) {
        return res.status(400).json({
          error: "Trace Not Supported",
          message: `Language '${language}' does not support Trace mode. Trace is currently supported for Java.`,
          limitations: langConfig.limitations,
        });
      }

      const boundedSteps = Math.min(typeof maxSteps === "number" ? maxSteps : 500, 500);
      const boundedTimeout = Math.min(typeof timeoutMs === "number" ? timeoutMs : 6000, 10000);

      const traceResult = await executionService.traceCode({
        language: langConfig.language,
        sourceCode,
        maxSteps: boundedSteps,
        timeoutMs: boundedTimeout,
      });

      if (!traceResult.success) {
        if (
          traceResult.error?.includes("JAVA_TRACE_WORKER_URL is not configured") ||
          traceResult.error?.includes("unavailable")
        ) {
          return res.status(503).json(traceResult);
        }
        if (
          traceResult.error?.includes("disabled") ||
          traceResult.error?.includes("Unauthorized") ||
          traceResult.error?.includes("refuses to execute")
        ) {
          return res.status(403).json(traceResult);
        }
      }

      return res.json(traceResult);
    } catch (err: any) {
      return next(err);
    }
  },
};

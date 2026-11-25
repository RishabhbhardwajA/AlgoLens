import type { Request, Response, NextFunction } from "express";
import { executionService } from "../services/execution/executionService.js";
import { resolveLanguage } from "../services/execution/languageRegistry.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { ExecutionValidatedRequest } from "../validators/executionValidators.js";

export const executionController = {
  getCapabilities(_req: Request, res: Response) {
    const capabilities = executionService.getCapabilities();
    return sendSuccess(res, {
      languages: capabilities,
      runAvailable: executionService.isRunAvailable(),
    });
  },

  async run(req: ExecutionValidatedRequest, res: Response, next: NextFunction) {
    try {
      if (!executionService.isRunAvailable()) {
        return sendError(
          res,
          "Execution Provider Unavailable",
          "Code execution is currently unavailable. An execution provider (e.g. Judge0) is not configured in this environment.",
          503,
          {
            status: "INTERNAL_ERROR",
            stdout: "",
            stderr: "Service Unavailable: No execution provider configured.",
            compileOutput: "",
            exitCode: 1,
          }
        );
      }

      const { language, sourceCode, stdin, cpuTimeLimitSec, memoryLimitKb } = req.body;
      const langConfig = req.resolvedLanguageConfig || resolveLanguage(language);
      if (!langConfig) {
        return sendError(res, "Unsupported Language", `Language '${language}' is not supported.`, 400);
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

  async trace(req: ExecutionValidatedRequest, res: Response, next: NextFunction) {
    try {
      const { language, sourceCode, maxSteps, timeoutMs } = req.body;
      const langConfig = req.resolvedLanguageConfig || resolveLanguage(language);
      if (!langConfig) {
        return sendError(res, "Unsupported Language", `Language '${language}' is not recognized.`, 400);
      }

      const boundedSteps = Math.min(typeof maxSteps === "number" ? maxSteps : 500, 2000);
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
          traceResult.error?.includes("unavailable") ||
          traceResult.error?.includes("maximum concurrent")
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

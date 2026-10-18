import type { Request, Response, NextFunction } from "express";
import { executionService } from "../services/execution/executionService.js";
import { resolveLanguage } from "../services/execution/languageRegistry.js";

export const executionController = {
  getCapabilities(_req: Request, res: Response) {
    const capabilities = executionService.getCapabilities();
    return res.json({
      success: true,
      languages: capabilities,
    });
  },

  async run(req: Request, res: Response, next: NextFunction) {
    try {
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

      const langConfig = resolveLanguage(language);
      if (!langConfig) {
        return res.status(400).json({
          error: "Unsupported Language",
          message: `Language '${language}' is not supported for execution. Supported languages: java, python, cpp, javascript.`,
        });
      }

      const result = await executionService.runCode({
        language: langConfig.language,
        sourceCode,
        stdin: typeof stdin === "string" ? stdin : undefined,
        cpuTimeLimitSec: typeof cpuTimeLimitSec === "number" ? cpuTimeLimitSec : undefined,
        memoryLimitKb: typeof memoryLimitKb === "number" ? memoryLimitKb : undefined,
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
          message: `Language '${language}' does not support Trace mode yet. Trace is currently available for: java.`,
          limitations: langConfig.limitations,
        });
      }

      const traceResult = await executionService.traceCode({
        language: langConfig.language,
        sourceCode,
        maxSteps: typeof maxSteps === "number" ? maxSteps : undefined,
        timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
      });

      return res.json(traceResult);
    } catch (err: any) {
      return next(err);
    }
  },
};

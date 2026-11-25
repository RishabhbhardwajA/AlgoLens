import type { Request, Response, NextFunction } from "express";
import { resolveLanguage } from "../services/execution/languageRegistry.js";
import { sendError } from "../utils/apiResponse.js";

const MAX_SOURCE_CODE_BYTES = 32 * 1024;

export interface ExecutionValidatedRequest extends Request {
  resolvedLanguageConfig?: NonNullable<ReturnType<typeof resolveLanguage>>;
}

/**
 * Shared validation middleware for code execution (/run) and tracing (/trace).
 * Eliminates duplicated language, payload length, and support checks across endpoints.
 */
export function validateExecutionPayload(mode: "run" | "trace") {
  return (req: ExecutionValidatedRequest, res: Response, next: NextFunction) => {
    const { language, sourceCode } = req.body;

    if (!language || typeof language !== "string") {
      return sendError(
        res,
        "Validation Error",
        "Field 'language' is required and must be a string.",
        400
      );
    }

    if (!sourceCode || typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
      return sendError(
        res,
        "Validation Error",
        "Field 'sourceCode' is required and cannot be empty.",
        400
      );
    }

    if (sourceCode.length > MAX_SOURCE_CODE_BYTES) {
      return sendError(
        res,
        "Payload Too Large",
        "Source code exceeds the maximum allowed size of 32KB.",
        400
      );
    }

    const langConfig = resolveLanguage(language);
    if (!langConfig) {
      return sendError(
        res,
        "Unsupported Language",
        mode === "trace"
          ? `Language '${language}' is not recognized. Trace is currently available for: java.`
          : `Language '${language}' is not supported for execution. Supported languages: java, python, cpp, javascript.`,
        400
      );
    }

    if (mode === "trace" && !langConfig.supportsTrace) {
      return sendError(
        res,
        "Trace Not Supported",
        `Language '${language}' does not support Trace mode. Trace is currently supported for Java.`,
        400,
        { limitations: langConfig.limitations }
      );
    }

    req.resolvedLanguageConfig = langConfig;
    next();
  };
}

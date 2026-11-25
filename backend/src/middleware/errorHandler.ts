import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return _next(err);
  }

  if (!err) {
    return res.status(500).json({
      error: "InternalServerError",
      message: "An unexpected error occurred. Please try again later.",
    });
  }

  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      error: "PayloadTooLarge",
      message: "Request payload exceeds the maximum permitted server size (256 KB).",
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Malformed JSON payload in request body.",
    });
  }

  if (
    err.code === "SQLITE_BUSY" ||
    (typeof err.message === "string" && err.message.includes("database is locked"))
  ) {
    return res.status(503).json({
      error: "ServiceUnavailable",
      message: "The server is experiencing high load. Please retry in a few seconds.",
    });
  }

  if (err.name === "ValidationError" || err.name === "AuthServiceError") {
    return res.status(err.statusCode || 400).json({
      error: err.name,
      message: err.message,
      details: err.details || [],
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid token signature. Please log in again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Session token has expired. Please log in again.",
    });
  }

  if (err.message && err.message.includes("UNIQUE constraint failed")) {
    return res.status(409).json({
      error: "Conflict",
      message: "A record with this unique identifier or email already exists.",
    });
  }

  console.error("[ServerError Unhandled]:", err);

  const status = typeof err.status === "number" ? err.status : 500;
  const isProd = process.env.NODE_ENV === "production";

  return res.status(status).json({
    error: err.name || "InternalServerError",
    message: isProd && status === 500 ? "An unexpected error occurred. Please try again later." : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

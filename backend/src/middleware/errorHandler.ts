import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Malformed JSON payload in request body.",
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

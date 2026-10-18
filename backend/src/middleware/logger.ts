import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusCategory = Math.floor(statusCode / 100);

    const color =
      statusCategory === 2
        ? "\x1b[32m"
        : statusCategory === 3
        ? "\x1b[36m"
        : statusCategory === 4
        ? "\x1b[33m"
        : "\x1b[31m";

    const reset = "\x1b[0m";

    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} -> ${color}${statusCode}${reset} (${duration}ms)`
      );
    }
  });

  next();
}

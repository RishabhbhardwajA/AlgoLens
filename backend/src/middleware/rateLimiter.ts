import rateLimit from "express-rate-limit";

function createJsonRateLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too Many Requests",
      message,
    },
  });
}

export const authLimiter = createJsonRateLimiter(
  15 * 60 * 1000,
  30,
  "Too many authentication attempts from this IP. Please try again after 15 minutes."
);

export const apiLimiter = createJsonRateLimiter(
  60 * 1000,
  120,
  "Rate limit exceeded. Please slow down."
);

export const runLimiter = createJsonRateLimiter(
  60 * 1000,
  30,
  "Run execution rate limit reached (30/min). Please wait a moment before running more code."
);

export const traceLimiter = createJsonRateLimiter(
  60 * 1000,
  10,
  "Trace debugger rate limit reached (10/min). Debugger tracing is resource-intensive. Please wait a moment."
);

export const geminiLimiter = createJsonRateLimiter(
  60 * 1000,
  15,
  "Gemini AI rate limit reached (15/min). Please wait a moment before sending more AI requests."
);

// Backward compatibility export
export const executionLimiter = runLimiter;

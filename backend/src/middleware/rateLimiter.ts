import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import type { AuthenticatedRequest } from "../types/index.js";

function keyByUserOrIp(req: Request): string {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip || "127.0.0.1");
}

function createJsonRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  perUser?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.perUser ? keyByUserOrIp : undefined,
    message: {
      error: "Too Many Requests",
      message: options.message,
    },
  });
}

export const oauthInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req: Request, res: Response) {
    const isPopup = req.query.mode === "popup";
    const msg = "Too many Google Sign-In attempts. Please wait a few minutes before retrying.";
    let clientOrigin = "http://localhost:5173";
    try {
      clientOrigin = new URL(config.CLIENT_URL).origin;
    } catch {
      // keep default
    }

    if (isPopup) {
      const candidates = [clientOrigin];
      if (!config.isProduction) {
        if (typeof req.query.origin === "string" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.query.origin)) {
          candidates.unshift(req.query.origin);
        }
        candidates.push("http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173");
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(429).send(
        `<!doctype html><html><body style="font-family:sans-serif;padding:24px;text-align:center;"><h3>Too Many Attempts</h3><p>${msg}</p><script>(function(){var targets=${JSON.stringify(Array.from(new Set(candidates)))};if(window.opener&&!window.opener.closed){for(var i=0;i<targets.length;i++){try{window.opener.postMessage({type:"ALGOLENS_OAUTH_ERROR",errorCode:"rate_limited",message:${JSON.stringify(msg)}},targets[i]);}catch(e){}}window.close();}})();</script></body></html>`
      );
    }

    return res.redirect(`${clientOrigin}/login?oauthError=rate_limited`);
  },
});

export const authLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
});

export const strictAccountLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many password reset or verification code requests. Please wait 15 minutes before retrying.",
});

export const apiLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Rate limit exceeded. Please slow down.",
});

export const userWriteLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  perUser: true,
  message: "Too many account save requests in a short time. Please pause for a moment.",
});

export const runLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  perUser: true,
  message: "Run execution rate limit reached (20/min). Please wait a moment before running more code.",
});

export const traceLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  perUser: true,
  message: "Trace debugger rate limit reached (8/min). Debugger tracing is resource-intensive. Please wait a moment.",
});

export const geminiLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  max: 6,
  perUser: true,
  message: "AI Tutor rate limit reached (6 requests/min). Please wait a minute before sending another request.",
});

export const geminiHourlyLimiter = createJsonRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 18,
  perUser: true,
  message: "Hourly AI request limit reached (18/hour) to preserve server capacity. Please try again later.",
});

// Backward compatibility export
export const executionLimiter = runLimiter;

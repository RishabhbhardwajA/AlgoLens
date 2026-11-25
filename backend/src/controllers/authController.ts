import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "node:crypto";
import { authService, AuthServiceError } from "../services/authService.js";
import { config } from "../config/env.js";
import { sanitizeString } from "../utils/sanitizer.js";
import {
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  OAUTH_STATE_COOKIE_NAME,
} from "../utils/cookies.js";
import type { AuthenticatedRequest } from "../types/index.js";

function sanitizeRedirectPath(rawPath: unknown): string {
  if (typeof rawPath !== "string" || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/";
  }
  return rawPath;
}

function getClientOrigin(): string {
  try {
    return new URL(config.CLIENT_URL).origin;
  } catch {
    return "http://localhost:5173";
  }
}

function getAllowedFrontendOrigins(): string[] {
  const origins = new Set<string>([getClientOrigin()]);
  try {
    if (config.PUBLIC_APP_URL) {
      origins.add(new URL(config.PUBLIC_APP_URL).origin);
    }
  } catch {
    // ignore invalid optional URL
  }
  if (!config.isProduction) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:5174");
    origins.add("http://127.0.0.1:5174");
    origins.add("http://localhost:3000");
  }
  return Array.from(origins);
}

function resolveAllowedOpenerOrigin(rawOrigin: unknown): string {
  const fallbackOrigin = getClientOrigin();
  if (typeof rawOrigin !== "string" || !rawOrigin.trim()) {
    return fallbackOrigin;
  }
  try {
    const candidateOrigin = new URL(rawOrigin).origin;
    if (getAllowedFrontendOrigins().includes(candidateOrigin)) {
      return candidateOrigin;
    }
    if (!config.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(candidateOrigin)) {
      return candidateOrigin;
    }
    return fallbackOrigin;
  } catch {
    return fallbackOrigin;
  }
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wantsJsonOnly(req: Request): boolean {
  const accept = req.headers.accept || "";
  return accept.includes("application/json") && !accept.includes("text/html") && !accept.includes("*/*");
}

export function renderOAuthPopupHtml(params: {
  status: "success" | "error";
  message: string;
  errorCode?: string;
  targetOrigin: string;
  fallbackUrl: string;
}): string {
  const isSuccess = params.status === "success";
  const payload = isSuccess
    ? { type: "ALGOLENS_OAUTH_SUCCESS" }
    : {
        type: "ALGOLENS_OAUTH_ERROR",
        errorCode: params.errorCode || "oauth_failed",
        message: params.message,
      };
  const candidateTargets = Array.from(new Set([params.targetOrigin, ...getAllowedFrontendOrigins()]));

  const titleText = isSuccess ? "Signed in to AlgoLens" : "Google Sign-In Issue";
  const safeTitle = escapeHtml(titleText);
  const safeMessage = escapeHtml(params.message);
  const safeFallbackHref = escapeHtml(params.fallbackUrl);
  const badgeColor = isSuccess ? "#10b981" : "#ef4444";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f7fb;font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;padding:24px;}
    .card{max-width:400px;width:100%;background:rgba(255,255,255,.88);border:1px solid rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 18px 42px -12px rgba(70,72,212,.18);text-align:center;}
    .badge{width:44px;height:44px;border-radius:999px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:${badgeColor};color:#fff;font-size:20px;font-weight:700;}
    h1{font-size:17px;margin:0 0 8px;font-weight:700;}
    p{font-size:13px;line-height:1.5;color:#475569;margin:0 0 18px;}
    .btn{display:inline-block;padding:10px 18px;border-radius:999px;background:#4648d4;color:#fff;text-decoration:none;font-size:13px;font-weight:600;border:0;cursor:pointer;}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? "&#10003;" : "!"}</div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <a class="btn" href="${safeFallbackHref}" onclick="if(window.opener){window.close();return false;}">Return to AlgoLens</a>
  </div>
  <script>
    (function () {
      var payload = ${serializeForScript(payload)};
      var targets = ${serializeForScript(candidateTargets)};
      if (window.opener && !window.opener.closed) {
        for (var i = 0; i < targets.length; i++) {
          try { window.opener.postMessage(payload, targets[i]); } catch (e) {}
        }
        try { window.close(); } catch (e) {}
      } else {
        ${isSuccess ? `window.location.replace(${serializeForScript(params.fallbackUrl)});` : ""}
      }
    })();
  </script>
</body>
</html>`;
}

export function sendOAuthFailure(
  req: Request,
  res: Response,
  opts: {
    mode: "popup" | "redirect" | "auto";
    targetOrigin: string;
    nextPath?: string;
    statusCode: number;
    errorCode: string;
    message: string;
    jsonErrorName?: string;
  }
) {
  if (opts.mode === "popup") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(opts.statusCode).send(
      renderOAuthPopupHtml({
        status: "error",
        errorCode: opts.errorCode,
        message: opts.message,
        targetOrigin: opts.targetOrigin,
        fallbackUrl: `${opts.targetOrigin}/login?oauthError=${encodeURIComponent(opts.errorCode)}`,
      })
    );
  }

  if (wantsJsonOnly(req)) {
    return res.status(opts.statusCode).json({
      error: opts.jsonErrorName || "OAuthError",
      code: opts.errorCode,
      message: opts.message,
    });
  }

  if (opts.mode === "auto") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(opts.statusCode).send(
      renderOAuthPopupHtml({
        status: "error",
        errorCode: opts.errorCode,
        message: opts.message,
        targetOrigin: opts.targetOrigin,
        fallbackUrl: `${opts.targetOrigin}/login?oauthError=${encodeURIComponent(opts.errorCode)}`,
      })
    );
  }

  const nextQuery = opts.nextPath ? `&next=${encodeURIComponent(opts.nextPath)}` : "";
  return res.redirect(
    `${opts.targetOrigin}/login?oauthError=${encodeURIComponent(opts.errorCode)}${nextQuery}`
  );
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({
        name: sanitizeString(name),
        email: email.trim().toLowerCase(),
        password,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setSessionCookie(res, result.token);

      return res.status(201).json({
        success: true,
        message: "Email verified! Welcome to AlgoLens.",
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.resendOtp(email.trim().toLowerCase());
      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate(
      "local",
      { session: false },
      async (err: Error | null, user: any, info: any) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({
            error: "Unauthorized",
            message: info?.message || "Invalid email or password.",
          });
        }

        try {
          const result = await authService.authenticate(user);
          setSessionCookie(res, result.token);

          return res.json({
            success: true,
            message: "Logged in successfully!",
            user: result.user,
          });
        } catch (authErr) {
          return next(authErr);
        }
      }
    )(req, res, next);
  },

  logout(_req: Request, res: Response) {
    clearSessionCookie(res);
    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  },

  getAuthProviders(_req: Request, res: Response) {
    return res.json({
      success: true,
      googleEnabled: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
      emailOtpEnabled: true,
    });
  },

  googleAuthInit(req: Request, res: Response) {
    const mode = req.query.mode === "popup" ? "popup" : "redirect";
    const nextPath = sanitizeRedirectPath(req.query.next);
    const openerOrigin = resolveAllowedOpenerOrigin(
      req.query.origin || req.headers.origin || req.headers.referer
    );

    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return sendOAuthFailure(req, res, {
        mode,
        targetOrigin: openerOrigin,
        nextPath,
        statusCode: 503,
        errorCode: "not_configured",
        jsonErrorName: "OAuth Not Configured",
        message:
          "Google OAuth credentials are not configured on this server. Please sign in with email and password.",
      });
    }

    const nonce = crypto.randomBytes(24).toString("hex");
    const statePayload = JSON.stringify({ nonce, mode, nextPath, openerOrigin });

    res.cookie(OAUTH_STATE_COOKIE_NAME, statePayload, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      path: "/",
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state: nonce,
      access_type: "online",
      prompt: "select_account",
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  },

  async googleAuthCallback(req: Request, res: Response) {
    const clearOAuthState = () => {
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        path: "/",
      });
    };

    let mode: "popup" | "redirect" | "auto" = "auto";
    let nextPath = "/";
    let targetOrigin = getClientOrigin();

    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const returnedState = typeof req.query.state === "string" ? req.query.state : "";
      const oauthError = typeof req.query.error === "string" ? req.query.error : "";

      const cookies = parseCookies(req.headers.cookie);
      const rawCookieState = cookies[OAUTH_STATE_COOKIE_NAME];
      clearOAuthState();

      let parsedState: { nonce: string; mode: string; nextPath: string; openerOrigin?: string } | null = null;
      try {
        parsedState = rawCookieState ? JSON.parse(rawCookieState) : null;
      } catch {
        parsedState = null;
      }

      mode = parsedState ? (parsedState.mode === "popup" ? "popup" : "redirect") : "auto";
      nextPath = sanitizeRedirectPath(parsedState?.nextPath);
      targetOrigin = resolveAllowedOpenerOrigin(parsedState?.openerOrigin);

      if (oauthError) {
        const isCancelled = oauthError === "access_denied";
        return sendOAuthFailure(req, res, {
          mode,
          targetOrigin,
          nextPath,
          statusCode: 400,
          errorCode: isCancelled ? "cancelled" : "oauth_denied",
          message: isCancelled
            ? "Google Sign-In was cancelled. You can try again or sign in with email."
            : "Google denied the sign-in request. Please try again.",
        });
      }

      if (!code || !parsedState || !returnedState || parsedState.nonce !== returnedState) {
        return sendOAuthFailure(req, res, {
          mode,
          targetOrigin,
          nextPath,
          statusCode: 400,
          errorCode: "invalid_state",
          jsonErrorName: "Invalid OAuth State",
          message:
            "Google sign-in session expired or state cookies were missing. Ensure cookies are enabled and retry.",
        });
      }

      const { token } = await authService.authenticateWithGoogleCode(code);
      setSessionCookie(res, token);

      if (mode === "popup") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(
          renderOAuthPopupHtml({
            status: "success",
            message: "Google Sign-In succeeded! Returning to AlgoLens...",
            targetOrigin,
            fallbackUrl: `${targetOrigin}${nextPath}`,
          })
        );
      }

      return res.redirect(`${targetOrigin}${nextPath}`);
    } catch (error: unknown) {
      clearOAuthState();

      if (error instanceof AuthServiceError) {
        return sendOAuthFailure(req, res, {
          mode,
          targetOrigin,
          nextPath,
          statusCode: error.statusCode,
          errorCode: error.code || "oauth_failed",
          jsonErrorName: error.name,
          message: error.message,
        });
      }

      console.error("[Google OAuth Unhandled Error]:", error);
      return sendOAuthFailure(req, res, {
        mode,
        targetOrigin,
        nextPath,
        statusCode: 500,
        errorCode: "server_error",
        jsonErrorName: "OAuthServerError",
        message: "An unexpected error occurred during Google Sign-In. Please try again.",
      });
    }
  },

  getMe(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user!;
    const { stats } = authService.getUserSummary(user.id);

    return res.json({
      success: true,
      user,
      stats,
    });
  },

  updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user!;
      const { name, bio, avatar_url } = req.body;

      const sanitizedUpdates: { name?: string; bio?: string; avatar_url?: string } = {};
      if (name !== undefined) sanitizedUpdates.name = sanitizeString(name);
      if (bio !== undefined) sanitizedUpdates.bio = sanitizeString(bio);
      if (avatar_url !== undefined) sanitizedUpdates.avatar_url = avatar_url.trim();

      const updatedUser = authService.updateProfile(user.id, sanitizedUpdates);

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user!;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(user.id, currentPassword, newPassword);

      return res.json({
        success: true,
        message: "Password changed successfully. Please keep it safe.",
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email.trim());
      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      return res.json({
        success: true,
        message: "Your password has been reset successfully! You can now log in with your new password.",
      });
    } catch (error) {
      next(error);
    }
  },
};

import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "node:crypto";
import { authService } from "../services/authService.js";
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

function getAllowedFrontendOrigins(): Set<string> {
  const origins = new Set<string>([getClientOrigin()]);
  if (!config.isProduction) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:3000");
  }
  return origins;
}

function resolveAllowedOpenerOrigin(rawOrigin: unknown): string {
  const fallbackOrigin = getClientOrigin();
  if (typeof rawOrigin !== "string" || !rawOrigin.trim()) {
    return fallbackOrigin;
  }
  try {
    const candidateOrigin = new URL(rawOrigin).origin;
    return getAllowedFrontendOrigins().has(candidateOrigin) ? candidateOrigin : fallbackOrigin;
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

        const result = await authService.authenticate(user);
        setSessionCookie(res, result.token);

        return res.json({
          success: true,
          message: "Logged in successfully!",
          user: result.user,
        });
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

  googleAuthInit(req: Request, res: Response) {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        error: "OAuth Not Configured",
        message:
          "Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured on this server.",
      });
    }

    const mode = req.query.mode === "popup" ? "popup" : "redirect";
    const nextPath = sanitizeRedirectPath(req.query.next);
    const openerOrigin = resolveAllowedOpenerOrigin(
      req.query.origin || req.headers.origin || req.headers.referer
    );
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

  async googleAuthCallback(req: Request, res: Response, next: NextFunction) {
    const clearOAuthState = () => {
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        path: "/",
      });
    };

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

      const mode = parsedState?.mode === "popup" ? "popup" : "redirect";
      const nextPath = sanitizeRedirectPath(parsedState?.nextPath);
      const targetOrigin = resolveAllowedOpenerOrigin(parsedState?.openerOrigin);
      const safeTargetOrigin = serializeForScript(targetOrigin);
      const safeRedirectUrl = serializeForScript(`${targetOrigin}${nextPath}`);

      if (oauthError) {
        if (mode === "popup") {
          return res.status(400).send(
            `<!doctype html><html><body><script>if(window.opener){window.opener.postMessage({type:"ALGOLENS_OAUTH_ERROR",message:"Google Sign-In was cancelled or denied."},${safeTargetOrigin});window.close();}</script><p>Authentication cancelled.</p></body></html>`
          );
        }
        return res.redirect(`${targetOrigin}/login?oauthError=cancelled`);
      }

      if (!code || !parsedState || !returnedState || parsedState.nonce !== returnedState) {
        return res.status(400).json({
          error: "Invalid OAuth State",
          message: "Google OAuth state verification failed. Please retry signing in.",
        });
      }

      const { token } = await authService.authenticateWithGoogleCode(code);
      setSessionCookie(res, token);

      if (mode === "popup") {
        return res.send(
          `<!doctype html><html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: "ALGOLENS_OAUTH_SUCCESS" }, ${safeTargetOrigin});
              window.close();
            } else {
              window.location.href = ${safeRedirectUrl};
            }
          </script><p>Google Sign-In succeeded! Closing window...</p></body></html>`
        );
      }

      return res.redirect(`${targetOrigin}${nextPath}`);
    } catch (error) {
      clearOAuthState();
      next(error);
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

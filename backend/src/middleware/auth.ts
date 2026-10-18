import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import type { SanitizedUser, AuthenticatedRequest } from "../types/index.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: Error | null, user: SanitizedUser | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        const message =
          info?.name === "TokenExpiredError"
            ? "Session expired. Please log in again."
            : "Authentication required. Please log in.";
        return res.status(401).json({
          error: "Unauthorized",
          message,
        });
      }
      (req as AuthenticatedRequest).user = user;
      next();
    }
  )(req, res, next);
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    "jwt",
    { session: false },
    (_err: Error | null, user: SanitizedUser | false) => {
      if (user) {
        (req as AuthenticatedRequest).user = user;
      }
      next();
    }
  )(req, res, next);
}

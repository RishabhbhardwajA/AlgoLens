import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import { authService } from "../services/authService.js";
import { sanitizeString } from "../utils/sanitizer.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({
        name: sanitizeString(name),
        email: email.trim().toLowerCase(),
        password,
      });

      return res.status(201).json({
        success: true,
        message: "Account created successfully! Welcome to AlgoLens.",
        token: result.token,
        user: result.user,
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
        return res.json({
          success: true,
          message: "Logged in successfully!",
          token: result.token,
          user: result.user,
        });
      }
    )(req, res, next);
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

  forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    const result = authService.forgotPassword(email.trim());
    return res.json({
      success: true,
      ...result,
    });
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

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { userRepository, sanitizeUser } from "../repositories/userRepository.js";
import { JWT_SECRET } from "../config/env.js";
import type { SanitizedUser, UserStats } from "../types/index.js";

export { JWT_SECRET };
export const JWT_EXPIRES_IN = "7d";

export class AuthServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

export const authService = {
  async register(params: { name: string; email: string; password: string }): Promise<{ token: string; user: SanitizedUser }> {
    const existing = userRepository.findUserByEmail(params.email);
    if (existing) {
      throw new AuthServiceError("An account with this email address already exists. Please log in.", 409);
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(params.password, saltRounds);

    const newUser = userRepository.createUser({
      name: params.name,
      email: params.email,
      password_hash,
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return { token, user: sanitizeUser(newUser) };
  },

  async authenticate(user: any): Promise<{ token: string; user: SanitizedUser }> {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    return { token, user };
  },

  getUserSummary(userId: string): { stats: UserStats } {
    const bookmarks = userRepository.getBookmarks(userId);
    const progress = userRepository.getProgress(userId);
    const snippets = userRepository.getSnippets(userId);

    const completedCount = progress.filter((p) => p.completed === 1).length;

    return {
      stats: {
        bookmarksCount: bookmarks.length,
        completedCount,
        snippetsCount: snippets.length,
        quizzesAttempted: progress.filter((p) => p.quiz_score > 0).length,
      },
    };
  },

  updateProfile(userId: string, updates: { name?: string; bio?: string; avatar_url?: string }): SanitizedUser {
    const updated = userRepository.updateProfile(userId, updates);
    if (!updated) {
      throw new AuthServiceError("User not found.", 404);
    }
    return sanitizeUser(updated);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = userRepository.findUserById(userId);
    if (!user) {
      throw new AuthServiceError("User not found.", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new AuthServiceError("Current password is incorrect.", 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    userRepository.updatePassword(userId, password_hash);
  },

  forgotPassword(email: string): { message: string; demoResetToken?: string } {
    const user = userRepository.findUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      userRepository.createPasswordReset(user.id, token, expiresAt);

      return {
        message: "If an account with this email exists, a password reset token has been issued.",
        demoResetToken: token,
      };
    }

    return {
      message: "If an account with this email exists, a password reset token has been issued.",
    };
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = userRepository.findPasswordReset(token.trim());
    if (!resetRecord) {
      throw new AuthServiceError("This password reset token is invalid or has already been used.", 400);
    }

    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
      throw new AuthServiceError("This password reset token has expired. Please request a new one.", 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    userRepository.updatePassword(resetRecord.user_id, password_hash);
    userRepository.markPasswordResetUsed(resetRecord.id);
  },
};

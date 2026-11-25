import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { userRepository, sanitizeUser } from "../repositories/userRepository.js";
import { config, JWT_SECRET } from "../config/env.js";
import { emailService } from "./emailService.js";
import type { SanitizedUser, UserStats } from "../types/index.js";

export { JWT_SECRET };
export const JWT_EXPIRES_IN = "7d";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;

export class AuthServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

function hmacSha256(payload: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payload)
    .digest("hex");
}

function hashOtp(email: string, otp: string): string {
  return hmacSha256(`${email.trim().toLowerCase()}:${otp.trim()}`);
}

function hashResetToken(token: string): string {
  return hmacSha256(`password-reset:${token.trim()}`);
}

function generateNumericOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function signSessionToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export const authService = {
  /**
   * Initiates email + password signup by generating a cryptographically random 6-digit OTP,
   * storing its salted HMAC hash with a 10-minute TTL, and emailing it to the user.
   */
  async register(params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ requiresOtp: boolean; email: string; cooldownSeconds: number; message: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = userRepository.findUserByEmail(cleanEmail);

    if (existing && (existing.password_hash !== null || existing.auth_provider === "local" || existing.auth_provider === "both")) {
      throw new AuthServiceError(
        "An account with this email address already exists. Please log in.",
        409
      );
    }

    const activeOtp = userRepository.findActiveOtp(cleanEmail);
    if (activeOtp) {
      const elapsedMs = Date.now() - new Date(activeOtp.last_sent_at).getTime();
      if (elapsedMs < OTP_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000);
        throw new AuthServiceError(
          `Please wait ${waitSec} seconds before requesting a new verification code.`,
          429
        );
      }
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const otpCode = generateNumericOtp();
    const otpHash = hashOtp(cleanEmail, otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    userRepository.upsertOtpVerification({
      email: cleanEmail,
      pending_name: params.name.trim(),
      pending_password_hash: passwordHash,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    await emailService.sendOtpEmail({
      to: cleanEmail,
      name: params.name.trim(),
      otpCode,
      expiresMinutes: 10,
    });

    return {
      requiresOtp: true,
      email: cleanEmail,
      cooldownSeconds: 60,
      message: "A 6-digit verification code has been sent to your email.",
    };
  },

  /**
   * Verifies the 6-digit OTP code (enforcing 10-minute TTL and max 5 attempts)
   * and completes account creation (or links local password onto an existing Google user).
   */
  async verifyOtp(params: {
    email: string;
    otp: string;
  }): Promise<{ token: string; user: SanitizedUser }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const record = userRepository.findActiveOtp(cleanEmail);

    if (!record) {
      throw new AuthServiceError(
        "Verification code is missing or has expired. Please sign up or request a new code.",
        400
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      userRepository.deleteOtpForEmail(cleanEmail);
      throw new AuthServiceError(
        "Too many failed verification attempts. Please request a new code.",
        429
      );
    }

    const candidateHash = hashOtp(cleanEmail, params.otp);
    const matches = crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(record.otp_hash, "hex")
    );

    if (!matches) {
      const nextAttempts = userRepository.incrementOtpAttempt(record.id);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        userRepository.deleteOtpForEmail(cleanEmail);
        throw new AuthServiceError(
          "Too many failed verification attempts (max 5). Please register or request a new code.",
          429
        );
      }
      const remaining = OTP_MAX_ATTEMPTS - nextAttempts;
      throw new AuthServiceError(
        `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        400
      );
    }

    // Complete registration or link local password if user previously signed up via Google
    const existing = userRepository.findUserByEmail(cleanEmail);
    let userRecord;
    if (existing) {
      userRecord = userRepository.linkLocalPasswordToUser(
        existing.id,
        record.pending_name,
        record.pending_password_hash
      );
    } else {
      userRecord = userRepository.createUser({
        name: record.pending_name,
        email: cleanEmail,
        password_hash: record.pending_password_hash,
        is_email_verified: true,
        auth_provider: "local",
      });
    }

    userRepository.deleteOtpForEmail(cleanEmail);

    if (!userRecord) {
      throw new AuthServiceError("Failed to finalize verified user account.", 500);
    }

    const sanitized = sanitizeUser(userRecord);
    const token = signSessionToken(sanitized);
    return { token, user: sanitized };
  },

  /**
   * Resends a fresh 6-digit OTP respecting a strict 60-second cooldown window.
   */
  async resendOtp(email: string): Promise<{ cooldownSeconds: number; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const record = userRepository.findActiveOtp(cleanEmail);
    if (!record) {
      throw new AuthServiceError(
        "No active signup session found for this email. Please submit the signup form again.",
        404
      );
    }

    const elapsedMs = Date.now() - new Date(record.last_sent_at).getTime();
    if (elapsedMs < OTP_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000);
      throw new AuthServiceError(
        `Please wait ${waitSec} seconds before requesting another code.`,
        429
      );
    }

    const otpCode = generateNumericOtp();
    const otpHash = hashOtp(cleanEmail, otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    userRepository.upsertOtpVerification({
      email: cleanEmail,
      pending_name: record.pending_name,
      pending_password_hash: record.pending_password_hash,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    await emailService.sendOtpEmail({
      to: cleanEmail,
      name: record.pending_name,
      otpCode,
      expiresMinutes: 10,
    });

    return {
      cooldownSeconds: 60,
      message: "A fresh 6-digit verification code has been dispatched.",
    };
  },

  async authenticate(user: SanitizedUser): Promise<{ token: string; user: SanitizedUser }> {
    const token = signSessionToken(user);
    return { token, user };
  },

  /**
   * Exchanges Google OAuth 2.0 authorization code for user profile and signs in / links account.
   */
  async authenticateWithGoogleCode(code: string): Promise<{ token: string; user: SanitizedUser }> {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      throw new AuthServiceError("Google Sign-In is not configured on this server.", 503);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      throw new AuthServiceError("Failed to exchange Google OAuth authorization code.", 401);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new AuthServiceError("Google OAuth did not issue an access token.", 401);
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!profileRes.ok) {
      throw new AuthServiceError("Failed to retrieve verified Google profile.", 401);
    }

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AuthServiceError("Google account does not have a verified email address.", 403);
    }

    return this.findOrLinkGoogleAccount({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      avatarUrl: profile.picture || "",
    });
  },

  /**
   * Automatically links a verified Google identity onto an existing local account (or creates a new one)
   * without causing duplicate-key errors. Bypasses OTP because Google has already verified the email.
   */
  findOrLinkGoogleAccount(params: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): { token: string; user: SanitizedUser } {
    const cleanEmail = params.email.trim().toLowerCase();

    let existing = userRepository.findUserByGoogleId(params.googleId);
    if (!existing) {
      existing = userRepository.findUserByEmail(cleanEmail);
    }

    let finalRecord;
    if (existing) {
      finalRecord = userRepository.linkGoogleToUser(existing.id, params.googleId, params.avatarUrl);
    } else {
      finalRecord = userRepository.createUser({
        name: params.name.trim(),
        email: cleanEmail,
        password_hash: null,
        google_id: params.googleId,
        avatar_url: params.avatarUrl || "",
        is_email_verified: true,
        auth_provider: "google",
      });
    }

    if (!finalRecord) {
      throw new AuthServiceError("Unable to create or link Google account.", 500);
    }

    const sanitized = sanitizeUser(finalRecord);
    const token = signSessionToken(sanitized);
    return { token, user: sanitized };
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

    if (!user.password_hash) {
      throw new AuthServiceError(
        "This account uses Google Sign-In without a local password.",
        400
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new AuthServiceError("Current password is incorrect.", 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    userRepository.updatePassword(userId, password_hash);
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const message =
      "If an account with this email exists, a password reset token has been sent.";
    const user = userRepository.findUserByEmail(email.trim().toLowerCase());
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      userRepository.invalidateUserPasswordResets(user.id);
      userRepository.createPasswordReset(user.id, tokenHash, expiresAt);

      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: token,
        expiresMinutes: 60,
      });
    }

    return { message };
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = userRepository.findPasswordReset(hashResetToken(token));
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

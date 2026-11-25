import { db } from "../database/database.js";
import crypto from "node:crypto";
import type {
  AuthProvider,
  UserRecord,
  SanitizedUser,
  OtpVerificationRecord,
  ProgressRecord,
  SnippetRecord,
  PasswordResetRecord,
  ChallengeAttemptRecord,
  ChallengeStats,
  BookmarkedTraceRecord,
  WeakTopicSummary,
} from "../types/index.js";

export function sanitizeUser(user: UserRecord): SanitizedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio || "",
    avatar_url: user.avatar_url || "",
    role: user.role || "student",
    is_email_verified: Boolean(user.is_email_verified),
    auth_provider: user.auth_provider || "local",
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export const userRepository = {
  findUserByEmail(email: string): UserRecord | null {
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
    const result = stmt.get(email.trim()) as unknown as UserRecord | undefined;
    return result || null;
  },

  findUserById(id: string): UserRecord | null {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    const result = stmt.get(id) as unknown as UserRecord | undefined;
    return result || null;
  },

  findUserByGoogleId(googleId: string): UserRecord | null {
    const stmt = db.prepare("SELECT * FROM users WHERE google_id = ? LIMIT 1");
    const result = stmt.get(googleId) as unknown as UserRecord | undefined;
    return result || null;
  },

  createUser(params: {
    name: string;
    email: string;
    password_hash: string | null;
    google_id?: string | null;
    avatar_url?: string;
    is_email_verified?: boolean;
    auth_provider?: AuthProvider;
  }): UserRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, google_id, bio, avatar_url, role,
        is_email_verified, auth_provider, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, '', ?, 'student', ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.name.trim(),
      params.email.trim().toLowerCase(),
      params.password_hash,
      params.google_id ?? null,
      params.avatar_url ?? "",
      params.is_email_verified ? 1 : 0,
      params.auth_provider ?? "local",
      now,
      now
    );
    return this.findUserById(id)!;
  },

  linkGoogleToUser(userId: string, googleId: string, avatarUrl?: string): UserRecord | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    const nextProvider: AuthProvider = user.password_hash ? "both" : "google";
    const nextAvatar = user.avatar_url || avatarUrl || "";
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET google_id = ?, is_email_verified = 1, auth_provider = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?
    `).run(googleId, nextProvider, nextAvatar, now, userId);
    return this.findUserById(userId);
  },

  linkLocalPasswordToUser(userId: string, name: string, passwordHash: string): UserRecord | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    const nextProvider: AuthProvider = user.google_id ? "both" : "local";
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET name = ?, password_hash = ?, is_email_verified = 1, auth_provider = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim() || user.name, passwordHash, nextProvider, now, userId);
    return this.findUserById(userId);
  },

  updateProfile(id: string, updates: { name?: string; bio?: string; avatar_url?: string }): UserRecord | null {
    const user = this.findUserById(id);
    if (!user) return null;

    const newName = updates.name !== undefined ? updates.name.trim() : user.name;
    const newBio = updates.bio !== undefined ? updates.bio.trim() : user.bio;
    const newAvatar = updates.avatar_url !== undefined ? updates.avatar_url.trim() : user.avatar_url;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE users SET name = ?, bio = ?, avatar_url = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(newName, newBio, newAvatar, now, id);
    return this.findUserById(id);
  },

  updatePassword(id: string, password_hash: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?");
    const info = stmt.run(password_hash, now, id);
    return (info as any).changes > 0;
  },

  // Bookmarks
  getBookmarks(userId: string): string[] {
    const stmt = db.prepare("SELECT algorithm_id FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC");
    const rows = stmt.all(userId) as unknown as Array<{ algorithm_id: string }>;
    return rows.map((r) => r.algorithm_id);
  },

  addBookmark(userId: string, algorithmId: string): boolean {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO user_bookmarks (id, user_id, algorithm_id, created_at)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(id, userId, algorithmId, now);
      return true;
    } catch {
      return false;
    }
  },

  removeBookmark(userId: string, algorithmId: string): boolean {
    const stmt = db.prepare("DELETE FROM user_bookmarks WHERE user_id = ? AND algorithm_id = ?");
    const info = stmt.run(userId, algorithmId);
    return (info as any).changes > 0;
  },

  // Progress
  getProgress(userId: string): ProgressRecord[] {
    const stmt = db.prepare("SELECT * FROM user_progress WHERE user_id = ?");
    return stmt.all(userId) as unknown as ProgressRecord[];
  },

  recordProgress(
    userId: string,
    algorithmId: string,
    updates: { completed?: boolean; quiz_score?: number; steps_explored?: number }
  ): ProgressRecord {
    const now = new Date().toISOString();
    const existing = db
      .prepare("SELECT * FROM user_progress WHERE user_id = ? AND algorithm_id = ?")
      .get(userId, algorithmId) as unknown as ProgressRecord | undefined;

    if (existing) {
      const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : existing.completed;
      const quiz_score = updates.quiz_score !== undefined ? Math.max(existing.quiz_score, updates.quiz_score) : existing.quiz_score;
      const steps_explored = updates.steps_explored !== undefined ? existing.steps_explored + updates.steps_explored : existing.steps_explored;

      db.prepare(`
        UPDATE user_progress
        SET completed = ?, quiz_score = ?, steps_explored = ?, last_accessed_at = ?
        WHERE user_id = ? AND algorithm_id = ?
      `).run(completed, quiz_score, steps_explored, now, userId, algorithmId);
    } else {
      const id = crypto.randomUUID();
      const completed = updates.completed ? 1 : 0;
      const quiz_score = updates.quiz_score ?? 0;
      const steps_explored = updates.steps_explored ?? 0;

      db.prepare(`
        INSERT INTO user_progress (id, user_id, algorithm_id, completed, quiz_score, steps_explored, last_accessed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, algorithmId, completed, quiz_score, steps_explored, now);
    }

    return db
      .prepare("SELECT * FROM user_progress WHERE user_id = ? AND algorithm_id = ?")
      .get(userId, algorithmId) as unknown as ProgressRecord;
  },

  // Snippets
  getSnippets(userId: string): SnippetRecord[] {
    const stmt = db.prepare("SELECT * FROM saved_snippets WHERE user_id = ? ORDER BY updated_at DESC");
    return stmt.all(userId) as unknown as SnippetRecord[];
  },

  createSnippet(
    userId: string,
    data: { title: string; code: string; input_data?: string; algorithm_category?: string }
  ): SnippetRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO saved_snippets (id, user_id, title, code, input_data, algorithm_category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      data.title.trim(),
      data.code,
      data.input_data || "",
      data.algorithm_category || "custom",
      now,
      now
    );

    return db.prepare("SELECT * FROM saved_snippets WHERE id = ?").get(id) as unknown as SnippetRecord;
  },

  deleteSnippet(userId: string, snippetId: string): boolean {
    const stmt = db.prepare("DELETE FROM saved_snippets WHERE id = ? AND user_id = ?");
    const info = stmt.run(snippetId, userId);
    return (info as any).changes > 0;
  },

  // Password Resets
  invalidateUserPasswordResets(userId: string): void {
    db.prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0").run(userId);
  },

  createPasswordReset(userId: string, tokenHash: string, expiresAt: string): void {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO password_resets (id, user_id, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, userId, tokenHash, expiresAt);
  },

  findPasswordReset(tokenHash: string): PasswordResetRecord | null {
    const stmt = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 LIMIT 1");
    const result = stmt.get(tokenHash) as unknown as PasswordResetRecord | undefined;
    return result || null;
  },

  markPasswordResetUsed(id: string): void {
    db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(id);
  },

  // Email OTP Verification (10-minute TTL semantics)
  purgeExpiredOtps(): void {
    const now = new Date().toISOString();
    db.prepare("DELETE FROM otp_verifications WHERE expires_at <= ?").run(now);
  },

  findActiveOtp(email: string): OtpVerificationRecord | null {
    this.purgeExpiredOtps();
    const stmt = db.prepare(
      "SELECT * FROM otp_verifications WHERE LOWER(email) = LOWER(?) LIMIT 1"
    );
    const result = stmt.get(email.trim()) as unknown as OtpVerificationRecord | undefined;
    return result || null;
  },

  upsertOtpVerification(params: {
    email: string;
    pending_name: string;
    pending_password_hash: string;
    otp_hash: string;
    expires_at: string;
  }): OtpVerificationRecord {
    const cleanEmail = params.email.trim().toLowerCase();
    this.purgeExpiredOtps();
    db.prepare("DELETE FROM otp_verifications WHERE LOWER(email) = LOWER(?)").run(cleanEmail);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO otp_verifications (
        id, email, pending_name, pending_password_hash, otp_hash, attempts, expires_at, last_sent_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      id,
      cleanEmail,
      params.pending_name.trim(),
      params.pending_password_hash,
      params.otp_hash,
      params.expires_at,
      now,
      now
    );

    return db
      .prepare("SELECT * FROM otp_verifications WHERE id = ?")
      .get(id) as unknown as OtpVerificationRecord;
  },

  incrementOtpAttempt(id: string): number {
    db.prepare("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?").run(id);
    const row = db
      .prepare("SELECT attempts FROM otp_verifications WHERE id = ?")
      .get(id) as unknown as { attempts: number } | undefined;
    return row?.attempts ?? 0;
  },

  deleteOtpForEmail(email: string): void {
    db.prepare("DELETE FROM otp_verifications WHERE LOWER(email) = LOWER(?)").run(email.trim());
  },

  // Challenge Attempts & Weak Topic Analytics
  recordChallengeAttempt(
    userId: string,
    data: {
      algorithmId: string;
      stepIndex: number;
      challengeType: string;
      selectedOption: string;
      correctOption: string;
      isCorrect: boolean;
      xpEarned: number;
    }
  ): ChallengeAttemptRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_challenge_attempts
      (id, user_id, algorithm_id, step_index, challenge_type, selected_option, correct_option, is_correct, xp_earned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.algorithmId.trim(),
      data.stepIndex,
      data.challengeType,
      data.selectedOption,
      data.correctOption,
      data.isCorrect ? 1 : 0,
      data.xpEarned,
      now
    );

    return db
      .prepare("SELECT * FROM user_challenge_attempts WHERE id = ?")
      .get(id) as unknown as ChallengeAttemptRecord;
  },

  getChallengeStats(userId: string): ChallengeStats {
    const agg = db
      .prepare(`
        SELECT
          COUNT(*) as totalAttempts,
          COALESCE(SUM(is_correct), 0) as totalCorrect,
          COALESCE(SUM(xp_earned), 0) as totalXp
        FROM user_challenge_attempts
        WHERE user_id = ?
      `)
      .get(userId) as unknown as { totalAttempts: number; totalCorrect: number; totalXp: number };

    const recentAttempts = db
      .prepare("SELECT * FROM user_challenge_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 15")
      .all(userId) as unknown as ChallengeAttemptRecord[];

    const totalAttempts = Number(agg?.totalAttempts || 0);
    const totalCorrect = Number(agg?.totalCorrect || 0);
    const accuracyPercent = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    return {
      totalAttempts,
      totalCorrect,
      accuracyPercent,
      totalXp: Number(agg?.totalXp || 0),
      recentAttempts,
    };
  },

  getWeakTopicsAnalytics(userId: string): WeakTopicSummary[] {
    const rows = db
      .prepare(`
        SELECT
          algorithm_id,
          challenge_type,
          COUNT(*) as attempts,
          SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as mistakes
        FROM user_challenge_attempts
        WHERE user_id = ?
        GROUP BY algorithm_id, challenge_type
        ORDER BY mistakes DESC, attempts DESC
      `)
      .all(userId) as unknown as Array<{
        algorithm_id: string;
        challenge_type: string;
        attempts: number;
        mistakes: number;
      }>;

    const TOPIC_RECOMMENDATIONS: Record<string, string> = {
      mid_prediction: "Review midpoint integer overflow prevention and interval halving invariants.",
      branch_prediction: "Practice comparison operators and search space elimination conditions.",
      pointer_prediction: "Focus on two-pointer convergence logic and opposite-end pointer updates.",
      termination_prediction: "Review loop guard bounds (<= vs <) to catch off-by-one termination errors.",
      swap_prediction: "Trace element exchanges and partition boundary indices step-by-step.",
      return_prediction: "Trace recursive call stacks and base-case unwinding carefully.",
    };

    return rows.map((r) => {
      const attempts = Number(r.attempts);
      const mistakes = Number(r.mistakes);
      const accuracyPercent = attempts > 0 ? Math.round(((attempts - mistakes) / attempts) * 100) : 100;
      return {
        topic: r.challenge_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        algorithmId: r.algorithm_id,
        attempts,
        mistakes,
        accuracyPercent,
        recommendation:
          TOPIC_RECOMMENDATIONS[r.challenge_type] ||
          `Practice stepping through ${r.algorithm_id} carefully with Predict mode enabled.`,
      };
    });
  },

  // Bookmarked Trace Snapshots
  getTraceBookmarks(userId: string): BookmarkedTraceRecord[] {
    return db
      .prepare("SELECT * FROM bookmarked_traces WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as unknown as BookmarkedTraceRecord[];
  },

  addTraceBookmark(
    userId: string,
    data: { algorithmId: string; stepIndex: number; stepSnapshot: string; note?: string }
  ): BookmarkedTraceRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO bookmarked_traces (id, user_id, algorithm_id, step_index, step_snapshot, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.algorithmId.trim(), data.stepIndex, data.stepSnapshot, data.note || "", now);

    return db
      .prepare("SELECT * FROM bookmarked_traces WHERE id = ?")
      .get(id) as unknown as BookmarkedTraceRecord;
  },

  removeTraceBookmark(userId: string, bookmarkId: string): boolean {
    const info = db
      .prepare("DELETE FROM bookmarked_traces WHERE id = ? AND user_id = ?")
      .run(bookmarkId, userId);
    return (info as any).changes > 0;
  },
};

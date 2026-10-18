import { db } from "../database/database.js";
import crypto from "node:crypto";
import type {
  UserRecord,
  SanitizedUser,
  ProgressRecord,
  SnippetRecord,
  PasswordResetRecord,
} from "../types/index.js";

export function sanitizeUser(user: UserRecord): SanitizedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio || "",
    avatar_url: user.avatar_url || "",
    role: user.role || "student",
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

  createUser(params: { name: string; email: string; password_hash: string }): UserRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, bio, avatar_url, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', '', 'student', ?, ?)
    `);
    stmt.run(id, params.name.trim(), params.email.trim().toLowerCase(), params.password_hash, now, now);
    return this.findUserById(id)!;
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
  createPasswordReset(userId: string, token: string, expiresAt: string): void {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO password_resets (id, user_id, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, userId, token, expiresAt);
  },

  findPasswordReset(token: string): PasswordResetRecord | null {
    const stmt = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 LIMIT 1");
    const result = stmt.get(token) as unknown as PasswordResetRecord | undefined;
    return result || null;
  },

  markPasswordResetUsed(id: string): void {
    db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(id);
  },
};

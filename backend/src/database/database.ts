import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stable persistent data directory outside of both src/ and dist/
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../../data");
export const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DEFAULT_DATA_DIR, "algolens.db");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Legacy fallback: if persistent DB does not exist yet but old src/database/algolens.db exists, safely copy it
if (!fs.existsSync(DB_PATH)) {
  const legacyPath = path.resolve(__dirname, "algolens.db");
  if (fs.existsSync(legacyPath)) {
    fs.copyFileSync(legacyPath, DB_PATH);
  }
}

// Initialize SQLite database instance
export const db = new DatabaseSync(DB_PATH);

// High-performance WAL mode and strict foreign key integrity
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize schema tables
export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT DEFAULT 'student',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      algorithm_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, algorithm_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      algorithm_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      quiz_score INTEGER DEFAULT 0,
      steps_explored INTEGER DEFAULT 0,
      last_accessed_at TEXT NOT NULL,
      UNIQUE(user_id, algorithm_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_snippets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      input_data TEXT DEFAULT '',
      algorithm_category TEXT DEFAULT 'custom',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_snippets_user ON saved_snippets(user_id);
    CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);
  `);
}

// Automatically initialize schema upon load
initDatabase();

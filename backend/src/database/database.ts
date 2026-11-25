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
      password_hash TEXT NULL,
      google_id TEXT UNIQUE NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT DEFAULT 'student',
      is_email_verified INTEGER NOT NULL DEFAULT 0,
      auth_provider TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      pending_name TEXT NOT NULL,
      pending_password_hash TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS user_challenge_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      algorithm_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      challenge_type TEXT NOT NULL,
      selected_option TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarked_traces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      algorithm_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      step_snapshot TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_snippets_user ON saved_snippets(user_id);
    CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_challenges_user ON user_challenge_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_trace_bookmarks_user ON bookmarked_traces(user_id);
  `);

  // Safe idempotent migration for existing databases lacking Google OAuth / nullable password_hash
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{
    name: string;
    notnull: number;
  }>;
  const hasGoogleId = userCols.some((c) => c.name === "google_id");
  const passwordNotNull = userCols.find((c) => c.name === "password_hash")?.notnull === 1;

  if (!hasGoogleId || passwordNotNull) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN TRANSACTION;");
    try {
      db.exec(`
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NULL,
          google_id TEXT UNIQUE NULL,
          bio TEXT DEFAULT '',
          avatar_url TEXT DEFAULT '',
          role TEXT DEFAULT 'student',
          is_email_verified INTEGER NOT NULL DEFAULT 0,
          auth_provider TEXT NOT NULL DEFAULT 'local',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO users_migrated (
          id, name, email, password_hash, google_id, bio, avatar_url, role,
          is_email_verified, auth_provider, created_at, updated_at
        )
        SELECT
          id, name, email, password_hash, NULL, COALESCE(bio, ''), COALESCE(avatar_url, ''),
          COALESCE(role, 'student'), 1, 'local', created_at, updated_at
        FROM users;

        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      `);
      db.exec("COMMIT;");
    } catch (migrationErr) {
      db.exec("ROLLBACK;");
      throw migrationErr;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  } else {
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);");
  }
}

// Automatically initialize schema upon load
initDatabase();

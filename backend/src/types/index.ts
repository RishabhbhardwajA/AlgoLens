import type { Request } from "express";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  bio: string;
  avatar_url: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar_url: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkRecord {
  id: string;
  user_id: string;
  algorithm_id: string;
  created_at: string;
}

export interface ProgressRecord {
  id: string;
  user_id: string;
  algorithm_id: string;
  completed: number;
  quiz_score: number;
  steps_explored: number;
  last_accessed_at: string;
}

export interface SnippetRecord {
  id: string;
  user_id: string;
  title: string;
  code: string;
  input_data: string;
  algorithm_category: string;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: number;
}

export interface AuthenticatedRequest extends Request {
  user?: SanitizedUser;
}

export interface UserStats {
  bookmarksCount: number;
  completedCount: number;
  snippetsCount: number;
  quizzesAttempted: number;
}

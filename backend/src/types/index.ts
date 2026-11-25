import type { Request } from "express";

export type AuthProvider = "local" | "google" | "both";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  bio: string;
  avatar_url: string;
  role: string;
  is_email_verified: number;
  auth_provider: AuthProvider;
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
  is_email_verified: boolean;
  auth_provider: AuthProvider;
  created_at: string;
  updated_at: string;
}

export interface OtpVerificationRecord {
  id: string;
  email: string;
  pending_name: string;
  pending_password_hash: string;
  otp_hash: string;
  attempts: number;
  expires_at: string;
  last_sent_at: string;
  created_at: string;
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

export interface ChallengeAttemptRecord {
  id: string;
  user_id: string;
  algorithm_id: string;
  step_index: number;
  challenge_type: string;
  selected_option: string;
  correct_option: string;
  is_correct: number;
  xp_earned: number;
  created_at: string;
}

export interface ChallengeStats {
  totalAttempts: number;
  totalCorrect: number;
  accuracyPercent: number;
  totalXp: number;
  recentAttempts: ChallengeAttemptRecord[];
}

export interface BookmarkedTraceRecord {
  id: string;
  user_id: string;
  algorithm_id: string;
  step_index: number;
  step_snapshot: string;
  note: string;
  created_at: string;
}

export interface WeakTopicSummary {
  topic: string;
  algorithmId: string;
  attempts: number;
  mistakes: number;
  accuracyPercent: number;
  recommendation: string;
}

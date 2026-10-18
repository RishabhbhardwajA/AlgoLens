// API Client for AlgoLens Backend

const BASE_URL = "/api";

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatar_url: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  bookmarksCount: number;
  completedCount: number;
  snippetsCount: number;
  quizzesAttempted: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  stats?: UserStats;
  demoResetToken?: string;
}

export interface ProgressItem {
  id: string;
  user_id: string;
  algorithm_id: string;
  completed: number;
  quiz_score: number;
  steps_explored: number;
  last_accessed_at: string;
}

export interface SnippetItem {
  id: string;
  user_id: string;
  title: string;
  code: string;
  input_data: string;
  algorithm_category: string;
  created_at: string;
  updated_at: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("algolens_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    error: "NetworkError",
    message: "Failed to parse server response.",
  }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const authApi = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<{ success: boolean; user: User; stats: UserStats }> {
    return request<{ success: boolean; user: User; stats: UserStats }>("/auth/me");
  },

  async updateProfile(updates: { name?: string; bio?: string; avatar_url?: string }): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; demoResetToken?: string }> {
    return request<{ success: boolean; message: string; demoResetToken?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

export const userApi = {
  async getBookmarks(): Promise<{ success: boolean; bookmarks: string[] }> {
    return request<{ success: boolean; bookmarks: string[] }>("/user/bookmarks");
  },

  async addBookmark(algorithmId: string): Promise<{ success: boolean; bookmarks: string[] }> {
    return request<{ success: boolean; bookmarks: string[] }>("/user/bookmarks", {
      method: "POST",
      body: JSON.stringify({ algorithmId }),
    });
  },

  async removeBookmark(algorithmId: string): Promise<{ success: boolean; bookmarks: string[] }> {
    return request<{ success: boolean; bookmarks: string[] }>(`/user/bookmarks/${algorithmId}`, {
      method: "DELETE",
    });
  },

  async getProgress(): Promise<{ success: boolean; progress: ProgressItem[] }> {
    return request<{ success: boolean; progress: ProgressItem[] }>("/user/progress");
  },

  async recordProgress(
    algorithmId: string,
    data: { completed?: boolean; quiz_score?: number; steps_explored?: number }
  ): Promise<{ success: boolean; record: ProgressItem }> {
    return request<{ success: boolean; record: ProgressItem }>("/user/progress", {
      method: "POST",
      body: JSON.stringify({ algorithmId, ...data }),
    });
  },

  async getSnippets(): Promise<{ success: boolean; snippets: SnippetItem[] }> {
    return request<{ success: boolean; snippets: SnippetItem[] }>("/user/snippets");
  },

  async saveSnippet(data: {
    title: string;
    code: string;
    input_data?: string;
    algorithm_category?: string;
  }): Promise<{ success: boolean; snippet: SnippetItem }> {
    return request<{ success: boolean; snippet: SnippetItem }>("/user/snippets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteSnippet(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/user/snippets/${id}`, {
      method: "DELETE",
    });
  },
};

import { create } from "zustand";
import { authApi, userApi, type User, type UserStats, type ProgressItem, type SnippetItem } from "@/services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  stats: UserStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  bookmarks: string[];
  progress: ProgressItem[];
  snippets: SnippetItem[];

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: { name?: string; bio?: string; avatar_url?: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  fetchBookmarks: () => Promise<void>;
  toggleBookmark: (algorithmId: string) => Promise<void>;
  isBookmarked: (algorithmId: string) => boolean;
  fetchProgress: () => Promise<void>;
  recordProgress: (
    algorithmId: string,
    data: { completed?: boolean; quiz_score?: number; steps_explored?: number }
  ) => Promise<void>;
  fetchSnippets: () => Promise<void>;
  saveSnippet: (data: {
    title: string;
    code: string;
    input_data?: string;
    algorithm_category?: string;
  }) => Promise<SnippetItem | null>;
  deleteSnippet: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("algolens_token"),
  stats: null,
  isAuthenticated: !!localStorage.getItem("algolens_token"),
  isLoading: false,
  error: null,
  bookmarks: [],
  progress: [],
  snippets: [],

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      if (res.token && res.user) {
        localStorage.setItem("algolens_token", res.token);
        set({
          user: res.user,
          token: res.token,
          isAuthenticated: true,
          isLoading: false,
        });
        // Load user data in background
        get().fetchBookmarks();
        get().fetchProgress();
        get().fetchSnippets();
        return true;
      }
      set({ isLoading: false, error: "Login failed" });
      return false;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Failed to log in" });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(name, email, password);
      if (res.token && res.user) {
        localStorage.setItem("algolens_token", res.token);
        set({
          user: res.user,
          token: res.token,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: "Registration failed" });
      return false;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Failed to register" });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("algolens_token");
    set({
      user: null,
      token: null,
      stats: null,
      isAuthenticated: false,
      bookmarks: [],
      progress: [],
      snippets: [],
      error: null,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("algolens_token");
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const data = await authApi.getMe();
      if (data.user) {
        set({
          user: data.user,
          stats: data.stats,
          isAuthenticated: true,
          isLoading: false,
        });
        // Also sync bookmarks and snippets
        get().fetchBookmarks();
        get().fetchProgress();
        get().fetchSnippets();
      }
    } catch {
      // Invalid/expired token
      localStorage.removeItem("algolens_token");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateProfile: async (updates) => {
    try {
      const res = await authApi.updateProfile(updates);
      if (res.user) {
        set({ user: res.user });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  fetchBookmarks: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getBookmarks();
      if (res.bookmarks) {
        set({ bookmarks: res.bookmarks });
      }
    } catch {
      // silent fail if unauthorized
    }
  },

  toggleBookmark: async (algorithmId: string) => {
    if (!get().isAuthenticated) return;
    const isCurrently = get().bookmarks.includes(algorithmId);
    try {
      if (isCurrently) {
        const res = await userApi.removeBookmark(algorithmId);
        set({ bookmarks: res.bookmarks });
      } else {
        const res = await userApi.addBookmark(algorithmId);
        set({ bookmarks: res.bookmarks });
      }
    } catch (err: any) {
      console.error("Failed to toggle bookmark:", err);
    }
  },

  isBookmarked: (algorithmId: string) => {
    return get().bookmarks.includes(algorithmId);
  },

  fetchProgress: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getProgress();
      if (res.progress) {
        set({ progress: res.progress });
      }
    } catch {
      // silent fail
    }
  },

  recordProgress: async (algorithmId, data) => {
    if (!get().isAuthenticated) return;
    try {
      await userApi.recordProgress(algorithmId, data);
      get().fetchProgress();
    } catch (err: any) {
      console.error("Failed to record progress:", err);
    }
  },

  fetchSnippets: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getSnippets();
      if (res.snippets) {
        set({ snippets: res.snippets });
      }
    } catch {
      // silent fail
    }
  },

  saveSnippet: async (data) => {
    if (!get().isAuthenticated) return null;
    try {
      const res = await userApi.saveSnippet(data);
      if (res.snippet) {
        set((state) => ({ snippets: [res.snippet, ...state.snippets] }));
        return res.snippet;
      }
      return null;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  deleteSnippet: async (id) => {
    if (!get().isAuthenticated) return false;
    try {
      await userApi.deleteSnippet(id);
      set((state) => ({ snippets: state.snippets.filter((s) => s.id !== id) }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },
}));

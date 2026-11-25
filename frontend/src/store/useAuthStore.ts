import { create } from "zustand";
import {
  authApi,
  userApi,
  type User,
  type UserStats,
  type ProgressItem,
  type SnippetItem,
  type ChallengeStatsData,
  type BookmarkedTraceItem,
  type WeakTopicItem,
} from "@/services/api";

interface AuthState {
  user: User | null;
  stats: UserStats | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  isLoading: boolean;
  error: string | null;
  bookmarks: string[];
  progress: ProgressItem[];
  snippets: SnippetItem[];
  challengeStats: ChallengeStatsData | null;
  traceBookmarks: BookmarkedTraceItem[];
  weakTopics: WeakTopicItem[];

  // OTP Verification State
  pendingOtpEmail: string | null;
  otpCooldownSeconds: number;

  // Inline Action-Gating Modal State
  authModalOpen: boolean;
  authModalMode: "login" | "register" | "otp";
  authModalReason: string | null;
  pendingAction: (() => void | Promise<void>) | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ ok: boolean; requiresOtp?: boolean }>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<{ ok: boolean; cooldownSeconds?: number }>;
  clearPendingOtp: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateProfile: (updates: { name?: string; bio?: string; avatar_url?: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  openAuthModal: (reason?: string, mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  requireAuthAction: (actionLabel: string, callback: () => void | Promise<void>) => void;
  completeAuthAndResume: () => Promise<boolean>;
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
  recordChallengeAttempt: (data: {
    algorithmId: string;
    stepIndex: number;
    challengeType: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    xpEarned: number;
  }) => Promise<void>;
  fetchChallengeStats: () => Promise<void>;
  fetchWeakTopics: () => Promise<void>;
  fetchTraceBookmarks: () => Promise<void>;
  addTraceBookmark: (data: {
    algorithmId: string;
    stepIndex: number;
    stepSnapshot: unknown;
    note?: string;
  }) => Promise<BookmarkedTraceItem | null>;
  removeTraceBookmark: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  stats: null,
  isAuthenticated: false,
  isAuthChecking: true,
  isLoading: false,
  error: null,
  bookmarks: [],
  progress: [],
  snippets: [],
  challengeStats: null,
  traceBookmarks: [],
  weakTopics: [],
  pendingOtpEmail: null,
  otpCooldownSeconds: 0,
  authModalOpen: false,
  authModalMode: "login",
  authModalReason: null,
  pendingAction: null,

  clearError: () => set({ error: null }),

  clearPendingOtp: () => set({ pendingOtpEmail: null, otpCooldownSeconds: 0, authModalMode: "register" }),

  openAuthModal: (reason, mode = "login") =>
    set({
      authModalOpen: true,
      authModalReason: reason || null,
      authModalMode: mode,
      error: null,
    }),

  closeAuthModal: () =>
    set({
      authModalOpen: false,
      authModalReason: null,
      pendingAction: null,
      pendingOtpEmail: null,
      error: null,
    }),

  requireAuthAction: (actionLabel, callback) => {
    if (get().isAuthenticated && get().user) {
      void callback();
      return;
    }
    set({
      authModalOpen: true,
      authModalMode: "login",
      authModalReason: actionLabel,
      pendingAction: callback,
      error: null,
    });
  },

  completeAuthAndResume: async () => {
    const ok = await get().checkAuth();
    if (ok) {
      const actionToRun = get().pendingAction;
      set({
        authModalOpen: false,
        authModalReason: null,
        pendingAction: null,
        pendingOtpEmail: null,
        error: null,
      });
      if (actionToRun) {
        try {
          await actionToRun();
        } catch (err) {
          console.error("Failed to resume pending authenticated action:", err);
        }
      }
      return true;
    }
    set({
      error:
        "Authentication succeeded, but your session cookie could not be verified. Please ensure cookies are enabled for this site.",
    });
    return false;
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      if (res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isLoading: false,
        });
        await get().completeAuthAndResume();
        return true;
      }
      set({ isLoading: false, error: "Login failed" });
      return false;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Failed to log in" });
      return false;
    }
  },

  register: async (name, email, password, confirmPassword) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(name, email, password, confirmPassword);
      if (res.requiresOtp && res.email) {
        set({
          isLoading: false,
          pendingOtpEmail: res.email,
          otpCooldownSeconds: res.cooldownSeconds ?? 60,
          authModalMode: "otp",
        });
        return { ok: true, requiresOtp: true };
      }
      if (res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isLoading: false,
        });
        await get().completeAuthAndResume();
        return { ok: true, requiresOtp: false };
      }
      set({ isLoading: false, error: "Registration failed" });
      return { ok: false };
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Failed to register" });
      return { ok: false };
    }
  },

  verifyOtp: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.verifyOtp(email, otp);
      if (res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isLoading: false,
          pendingOtpEmail: null,
          otpCooldownSeconds: 0,
        });
        await get().completeAuthAndResume();
        return true;
      }
      set({ isLoading: false, error: "Verification failed" });
      return false;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Invalid verification code" });
      return false;
    }
  },

  resendOtp: async (email) => {
    set({ error: null });
    try {
      const res = await authApi.resendOtp(email);
      set({ otpCooldownSeconds: res.cooldownSeconds ?? 60 });
      return { ok: true, cooldownSeconds: res.cooldownSeconds ?? 60 };
    } catch (err: any) {
      set({ error: err.message || "Failed to resend verification code" });
      return { ok: false };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ensure local state resets even on offline call
    }
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("algolens_token");
    }
    set({
      user: null,
      stats: null,
      isAuthenticated: false,
      bookmarks: [],
      progress: [],
      snippets: [],
      challengeStats: null,
      traceBookmarks: [],
      weakTopics: [],
      pendingOtpEmail: null,
      pendingAction: null,
      error: null,
    });
  },

  checkAuth: async () => {
    if (typeof window !== "undefined" && window.localStorage) {
      // Purge any legacy client token storage for strict httpOnly cookie compliance
      localStorage.removeItem("algolens_token");
    }

    try {
      set({ isLoading: true });
      const data = await authApi.getMe();
      if (data.user) {
        set({
          user: data.user,
          stats: data.stats,
          isAuthenticated: true,
          isAuthChecking: false,
          isLoading: false,
        });
        get().fetchBookmarks();
        get().fetchProgress();
        get().fetchSnippets();
        get().fetchChallengeStats();
        get().fetchTraceBookmarks();
        get().fetchWeakTopics();
        return true;
      }
      set({ user: null, isAuthenticated: false, isAuthChecking: false, isLoading: false });
      return false;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isAuthChecking: false,
        isLoading: false,
      });
      return false;
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
      // silent
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
      // silent
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
      // silent
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

  recordChallengeAttempt: async (data) => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.recordChallengeAttempt(data);
      set({ challengeStats: res.stats });
      get().fetchWeakTopics();
    } catch {
      // non-blocking
    }
  },

  fetchChallengeStats: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getChallengeStats();
      set({ challengeStats: res.stats });
    } catch {
      // silent
    }
  },

  fetchWeakTopics: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getWeakTopics();
      set({ weakTopics: res.weakTopics });
    } catch {
      // silent
    }
  },

  fetchTraceBookmarks: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await userApi.getTraceBookmarks();
      set({ traceBookmarks: res.traceBookmarks });
    } catch {
      // silent
    }
  },

  addTraceBookmark: async (data) => {
    if (!get().isAuthenticated) return null;
    try {
      const res = await userApi.addTraceBookmark(data);
      set((state) => ({ traceBookmarks: [res.bookmark, ...state.traceBookmarks] }));
      return res.bookmark;
    } catch {
      return null;
    }
  },

  removeTraceBookmark: async (id: string) => {
    if (!get().isAuthenticated) return false;
    try {
      await userApi.removeTraceBookmark(id);
      set((state) => ({
        traceBookmarks: state.traceBookmarks.filter((b) => b.id !== id),
      }));
      return true;
    } catch {
      return false;
    }
  },
}));

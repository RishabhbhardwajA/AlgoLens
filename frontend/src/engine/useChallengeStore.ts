import { create } from "zustand";
import type { ChallengeQuestion } from "@/utils/challengeGenerator";

interface ChallengeState {
  isChallengeMode: boolean;
  activeChallenge: ChallengeQuestion | null;
  score: number;
  streak: number;
  highestStreak: number;
  totalAnswered: number;
  totalCorrect: number;
  skippedStepIndices: number[];
  userAnswer: {
    selectedIndex: number;
    isCorrect: boolean;
  } | null;

  // Actions
  toggleChallengeMode: () => void;
  setChallengeMode: (enabled: boolean) => void;
  setActiveChallenge: (challenge: ChallengeQuestion | null) => void;
  submitAnswer: (selectedIndex: number) => { isCorrect: boolean; xpEarned: number };
  skipChallenge: (stepIndex?: number) => void;
  dismissChallenge: () => void;
  resetStats: () => void;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  isChallengeMode: false,
  activeChallenge: null,
  score: 0,
  streak: 0,
  highestStreak: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  skippedStepIndices: [],
  userAnswer: null,

  toggleChallengeMode: () => {
    set((state) => ({
      isChallengeMode: !state.isChallengeMode,
      activeChallenge: null,
      userAnswer: null,
      skippedStepIndices: [],
    }));
  },

  setChallengeMode: (enabled: boolean) => {
    set({
      isChallengeMode: enabled,
      activeChallenge: null,
      userAnswer: null,
      skippedStepIndices: [],
    });
  },

  setActiveChallenge: (challenge) => {
    set({ activeChallenge: challenge, userAnswer: null });
  },

  submitAnswer: (selectedIndex: number) => {
    const { activeChallenge, streak, highestStreak, score, totalAnswered, totalCorrect } = get();
    if (!activeChallenge) return { isCorrect: false, xpEarned: 0 };

    const isCorrect = selectedIndex === activeChallenge.correctIndex;
    const newStreak = isCorrect ? streak + 1 : 0;
    const bonus = isCorrect ? Math.min(newStreak * 10, 50) : 0;
    const xpEarned = isCorrect ? activeChallenge.xp + bonus : 0;

    set({
      userAnswer: { selectedIndex, isCorrect },
      score: score + xpEarned,
      streak: newStreak,
      highestStreak: Math.max(highestStreak, newStreak),
      totalAnswered: totalAnswered + 1,
      totalCorrect: isCorrect ? totalCorrect + 1 : totalCorrect,
    });

    return { isCorrect, xpEarned };
  },

  skipChallenge: (stepIndex?: number) => {
    set((state) => ({
      activeChallenge: null,
      userAnswer: null,
      skippedStepIndices:
        stepIndex !== undefined
          ? [...state.skippedStepIndices, stepIndex]
          : state.skippedStepIndices,
    }));
  },

  dismissChallenge: () => {
    set({ activeChallenge: null, userAnswer: null });
  },

  resetStats: () => {
    set({
      score: 0,
      streak: 0,
      highestStreak: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      activeChallenge: null,
      userAnswer: null,
      skippedStepIndices: [],
    });
  },
}));

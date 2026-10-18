// ============================================================
// Execution Controller — Zustand store (fixed)
// ============================================================
import { create } from "zustand";
import { useZoomStore } from "./useZoomStore";
import type {
  ExecutionStep,
  VisualizableAlgorithm,
} from "./executionTypes";

// ---- Store shape (no computed getters — plain state + actions) ----
export interface ExecutionState {
  algorithm: VisualizableAlgorithm | null;
  algorithmId: string | null;
  steps: ExecutionStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: 0.5 | 1 | 1.5 | 2;
  hasStarted: boolean;
  rawInput: string;
  error: string | null;
}

export interface ExecutionActions {
  loadAlgorithm(alg: VisualizableAlgorithm): void;
  setRawInput(input: string): void;
  runAlgorithm(): void;
  play(): void;
  pause(): void;
  next(): void;
  prev(): void;
  reset(): void;
  jumpTo(index: number): void;
  setSpeed(speed: 0.5 | 1 | 1.5 | 2): void;
  clearError(): void;
}

export type ExecutionStore = ExecutionState & ExecutionActions;

// Interval ref lives outside the store (not serializable)
let _playInterval: ReturnType<typeof setInterval> | null = null;

function clearPlay() {
  if (_playInterval !== null) {
    clearInterval(_playInterval);
    _playInterval = null;
  }
}

const SPEED_MS: Record<number, number> = {
  0.5: 1600,
  1: 800,
  1.5: 500,
  2: 300,
};

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  // ----- Plain state -----
  algorithm: null,
  algorithmId: null,
  steps: [],
  currentStepIndex: -1,
  isPlaying: false,
  speed: 1,
  hasStarted: false,
  rawInput: "",
  error: null,

  // ----- Actions -----

  loadAlgorithm(alg: VisualizableAlgorithm) {
    clearPlay();
    useZoomStore.getState().resetZoom();
    set({
      algorithm: alg,
      algorithmId: alg.id,
      rawInput: alg.defaultInput,
      steps: [],
      currentStepIndex: -1,
      isPlaying: false,
      hasStarted: false,
    });
  },

  setRawInput(input: string) {
    set({ rawInput: input, error: null });
  },

  runAlgorithm() {
    clearPlay();
    const { algorithm, rawInput } = get();
    if (!algorithm) return;

    try {
      const parsed = algorithm.parseInput(rawInput);
      const validation = algorithm.validateInput(parsed);
      if (!validation.valid) {
        set({ error: `Input validation failed: ${validation.error}` });
        return;
      }
      const steps = algorithm.execute(parsed);
      
      if (steps.length === 0) {
        set({ error: "Algorithm produced no execution steps." });
        return;
      }
      
      set({
        steps,
        currentStepIndex: 0,
        isPlaying: false,
        hasStarted: true,
        error: null,
      });
    } catch (e) {
      console.error("Algorithm execution error:", e);
      set({ error: e instanceof Error ? e.message : "An unknown error occurred during execution" });
    }
  },

  play() {
    const { steps, currentStepIndex, speed } = get();
    if (currentStepIndex >= steps.length - 1) return;

    clearPlay();
    set({ isPlaying: true });

    _playInterval = setInterval(() => {
      const state = get();
      if (state.currentStepIndex >= state.steps.length - 1) {
        clearPlay();
        set({ isPlaying: false });
        return;
      }
      set({ currentStepIndex: state.currentStepIndex + 1 });
    }, SPEED_MS[speed]);
  },

  pause() {
    clearPlay();
    set({ isPlaying: false });
  },

  next() {
    clearPlay();
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1, isPlaying: false });
    }
  },

  prev() {
    clearPlay();
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1, isPlaying: false });
    }
  },

  reset() {
    clearPlay();
    set({
      steps: [],
      currentStepIndex: -1,
      isPlaying: false,
      hasStarted: false,
    });
  },

  jumpTo(index: number) {
    clearPlay();
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index, isPlaying: false });
    }
  },

  setSpeed(s) {
    const { isPlaying } = get();
    set({ speed: s });
    if (isPlaying) {
      get().play();
    }
  },

  clearError() {
    set({ error: null });
  }
}));

// ============================================================
// Selector hooks — compute derived values outside the store
// ============================================================

/** Get the current execution step (null if not started or index out of range) */
export function useCurrentStep(): ExecutionStep | null {
  return useExecutionStore((s) =>
    s.currentStepIndex >= 0 && s.currentStepIndex < s.steps.length
      ? s.steps[s.currentStepIndex]
      : null
  );
}

export function useTotalSteps(): number {
  return useExecutionStore((s) => s.steps.length);
}

export function useIsFirstStep(): boolean {
  return useExecutionStore((s) => s.currentStepIndex <= 0);
}

export function useIsLastStep(): boolean {
  return useExecutionStore(
    (s) => s.currentStepIndex >= s.steps.length - 1
  );
}

export function useStepProgress(): number {
  return useExecutionStore((s) => {
    if (s.steps.length <= 1) return 0;
    return (s.currentStepIndex / (s.steps.length - 1)) * 100;
  });
}

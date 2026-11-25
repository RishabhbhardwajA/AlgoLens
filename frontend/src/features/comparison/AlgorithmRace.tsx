import { useState, useEffect, useMemo } from "react";
import { getAlgorithm } from "@/algorithms/registry";
import type { ExecutionStep, ArrayElement } from "@/engine/executionTypes";
import { Footer } from "@/components/Footer/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildToolJsonLd } from "@/utils/seoSchemas";
import { computeBarHeights, formatBigO } from "@/utils/visualHelpers";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Trophy,
  Zap,
  Gauge,
  Dices,
} from "lucide-react";

type RaceCategory = "sorting" | "searching";

interface RacePreset {
  id: RaceCategory;
  label: string;
  options: Array<{ id: string; name: string }>;
  defaultLeft: string;
  defaultRight: string;
  defaultInput: string;
}

const RACE_CONFIGS: Record<RaceCategory, RacePreset> = {
  sorting: {
    id: "sorting",
    label: "Sorting Algorithms Race",
    options: [
      { id: "bubble-sort", name: "Bubble Sort" },
      { id: "insertion-sort", name: "Insertion Sort" },
      { id: "merge-sort", name: "Merge Sort" },
    ],
    defaultLeft: "bubble-sort",
    defaultRight: "merge-sort",
    defaultInput: "[42, 17, 89, 5, 34, 71, 12, 60, 23, 8]",
  },
  searching: {
    id: "searching",
    label: "Searching Algorithms Race",
    options: [
      { id: "linear-search", name: "Linear Search" },
      { id: "binary-search", name: "Binary Search" },
    ],
    defaultLeft: "linear-search",
    defaultRight: "binary-search",
    defaultInput: JSON.stringify({ array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 72 }),
  },
};

function isArrayMutationEvent(st: ExecutionStep): boolean {
  if (st.event.type === "SWAP") return true;
  if (st.event.type === "UPDATE") {
    const v = st.event.variable;
    return (
      typeof st.event.data?.index === "number" ||
      v.startsWith("arr[") ||
      v.startsWith("nums[") ||
      v.startsWith("result[") ||
      v.startsWith("dp[")
    );
  }
  return false;
}

function computeTelemetry(steps: ExecutionStep[], upToIndex: number) {
  let comparisons = 0;
  let swapsOrUpdates = 0;
  let maxDepth = 1;
  const boundedIndex = Math.min(upToIndex, Math.max(0, steps.length - 1));
  for (let i = 0; i <= boundedIndex; i++) {
    const st = steps[i];
    if (!st) continue;
    if (st.event.type === "COMPARE") comparisons++;
    if (isArrayMutationEvent(st)) swapsOrUpdates++;
    const stepDepth = Math.max(
      st.callStack?.length || 1,
      st.depth !== undefined ? st.depth + 1 : 1
    );
    if (stepDepth > maxDepth) maxDepth = stepDepth;
  }
  return { comparisons, swapsOrUpdates, maxDepth };
}

function extractElements(step: ExecutionStep | undefined): ArrayElement[] {
  const viz = step?.visualizationState;
  if (!viz) return [];
  if (viz.type === "array") return viz.elements;
  if (viz.type === "tree" && viz.arraySnapshot) return viz.arraySnapshot;
  return [];
}

function getElementBarColor(state: ArrayElement["state"], isNegative = false): string {
  const negTint = isNegative ? "border-b-2 border-b-rose-500" : "";
  switch (state) {
    case "found":
    case "visited":
      return `bg-emerald-500 border-emerald-600 ${negTint}`;
    case "comparing":
    case "pointer-mid":
      return `bg-amber-500 border-amber-600 ${negTint}`;
    case "current":
    case "pointer-left":
      return `bg-indigo-500 border-indigo-600 ${negTint}`;
    case "pointer-right":
      return `bg-pink-500 border-pink-600 ${negTint}`;
    case "eliminated":
      return `bg-slate-200 border-slate-300 opacity-55 ${negTint}`;
    default:
      return `bg-slate-400 border-slate-500 ${negTint}`;
  }
}

export default function AlgorithmRace() {
  useDocumentMeta({
    title: "Algorithm Big-O Race — Side-by-Side Complexity Comparison | AlgoLens",
    description:
      "Compare sorting and searching algorithms side-by-side on identical inputs to inspect real comparisons, swaps, and Big-O execution counts.",
    canonicalPath: "/race",
    ogImage: "/og/race.png",
    jsonLd: buildToolJsonLd(
      typeof window !== "undefined" ? window.location.origin : "",
      "/race",
      "AlgoLens Algorithm Big-O Race",
      "Side-by-side algorithm step execution comparison tool."
    ),
  });

  const [category, setCategory] = useState<RaceCategory>("sorting");
  const [leftAlgoId, setLeftAlgoId] = useState<string>(RACE_CONFIGS.sorting.defaultLeft);
  const [rightAlgoId, setRightAlgoId] = useState<string>(RACE_CONFIGS.sorting.defaultRight);
  const [rawInput, setRawInput] = useState<string>(RACE_CONFIGS.sorting.defaultInput);
  const [inputError, setInputError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCategoryChange = (nextCat: RaceCategory) => {
    setIsPlaying(false);
    setTick(0);
    setCategory(nextCat);
    const cfg = RACE_CONFIGS[nextCat];
    setLeftAlgoId(cfg.defaultLeft);
    setRightAlgoId(cfg.defaultRight);
    setRawInput(cfg.defaultInput);
    setInputError(null);
  };

  const handleRandomize = () => {
    setIsPlaying(false);
    setTick(0);
    if (category === "sorting") {
      const arr = Array.from({ length: 10 }, () => Math.floor(Math.random() * 90) + 5);
      setRawInput(JSON.stringify(arr));
    } else {
      const arr = Array.from({ length: 10 }, () => Math.floor(Math.random() * 95) + 2).sort(
        (a, b) => a - b
      );
      const target = arr[Math.floor(Math.random() * arr.length)];
      setRawInput(JSON.stringify({ array: arr, target }));
    }
    setInputError(null);
  };

  const { leftAlg, rightAlg, leftSteps, rightSteps, error } = useMemo(() => {
    const aL = getAlgorithm(leftAlgoId);
    const aR = getAlgorithm(rightAlgoId);
    if (!aL || !aR) {
      return { leftAlg: aL, rightAlg: aR, leftSteps: [], rightSteps: [], error: "Missing algorithm." };
    }
    try {
      const parsedL = aL.parseInput(rawInput);
      const parsedR = aR.parseInput(rawInput);
      const vL = aL.validateInput(parsedL);
      const vR = aR.validateInput(parsedR);
      if (!vL.valid || !vR.valid) {
        return {
          leftAlg: aL,
          rightAlg: aR,
          leftSteps: [],
          rightSteps: [],
          error: vL.error || vR.error || "Invalid input.",
        };
      }
      return {
        leftAlg: aL,
        rightAlg: aR,
        leftSteps: aL.execute(parsedL),
        rightSteps: aR.execute(parsedR),
        error: null,
      };
    } catch (e: unknown) {
      return {
        leftAlg: aL,
        rightAlg: aR,
        leftSteps: [],
        rightSteps: [],
        error: e instanceof Error ? e.message : "Could not parse race dataset.",
      };
    }
  }, [leftAlgoId, rightAlgoId, rawInput]);

  useEffect(() => {
    setInputError(error);
  }, [error]);

  const maxTicks = Math.max(leftSteps.length, rightSteps.length);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setTick((prev) => {
        if (prev >= maxTicks - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [isPlaying, maxTicks]);

  const leftActiveIndex = Math.min(tick, Math.max(0, leftSteps.length - 1));
  const rightActiveIndex = Math.min(tick, Math.max(0, rightSteps.length - 1));
  const leftStep = leftSteps[leftActiveIndex];
  const rightStep = rightSteps[rightActiveIndex];

  const leftTelemetry = useMemo(
    () => computeTelemetry(leftSteps, leftActiveIndex),
    [leftSteps, leftActiveIndex]
  );
  const rightTelemetry = useMemo(
    () => computeTelemetry(rightSteps, rightActiveIndex),
    [rightSteps, rightActiveIndex]
  );

  const leftTotalTelemetry = useMemo(
    () => computeTelemetry(leftSteps, Math.max(0, leftSteps.length - 1)),
    [leftSteps]
  );
  const rightTotalTelemetry = useMemo(
    () => computeTelemetry(rightSteps, Math.max(0, rightSteps.length - 1)),
    [rightSteps]
  );

  const leftFinished = leftSteps.length > 0 && tick >= leftSteps.length - 1;
  const rightFinished = rightSteps.length > 0 && tick >= rightSteps.length - 1;

  const leftOps = leftTotalTelemetry.comparisons + leftTotalTelemetry.swapsOrUpdates;
  const rightOps = rightTotalTelemetry.comparisons + rightTotalTelemetry.swapsOrUpdates;

  const winnerSide =
    leftSteps.length > 0 && rightSteps.length > 0
      ? leftOps < rightOps
        ? "left"
        : rightOps < leftOps
        ? "right"
        : leftSteps.length < rightSteps.length
        ? "left"
        : rightSteps.length < leftSteps.length
        ? "right"
        : "tie"
      : null;

  const renderLane = (
    side: "left" | "right",
    alg: typeof leftAlg,
    steps: ExecutionStep[],
    step: ExecutionStep | undefined,
    telemetry: ReturnType<typeof computeTelemetry>,
    finished: boolean
  ) => {
    const elements = extractElements(step);
    const barHeights = computeBarHeights(elements);

    return (
      <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-col gap-4">
        {/* Lane Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={side === "left" ? leftAlgoId : rightAlgoId}
                aria-label={side === "left" ? "Left algorithm" : "Right algorithm"}
                onChange={(e) => {
                  setIsPlaying(false);
                  setTick(0);
                  if (side === "left") setLeftAlgoId(e.target.value);
                  else setRightAlgoId(e.target.value);
                }}
                className="text-sm font-bold text-slate-900 glass-input rounded-full px-3 py-1 outline-none cursor-pointer"
              >
                {RACE_CONFIGS[category].options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              {finished && winnerSide === side && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200/80 flex items-center gap-1 whitespace-nowrap">
                  <Trophy className="w-3 h-3" />
                  Fewer Ops ({telemetry.comparisons + telemetry.swapsOrUpdates})
                </span>
              )}
              {finished && winnerSide === "tie" && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 border border-indigo-200/80 whitespace-nowrap">
                  Tied
                </span>
              )}
            </div>
            {alg && (
              <div className="text-[11px] font-mono text-slate-600 mt-1">
                Time: <span className="font-semibold text-indigo-700">{formatBigO(alg.complexity.time)}</span>{" "}
                • Space: <span className="font-semibold text-sky-700">{formatBigO(alg.complexity.space)}</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-700">
              Step {steps.length > 0 ? Math.min(tick + 1, steps.length) : 0} / {steps.length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {steps.length === 0 ? "No trace" : finished ? "Completed" : "Running..."}
            </div>
          </div>
        </div>

        {/* Bars */}
        <div className="h-44 bg-white/60 backdrop-blur-md rounded-2xl border border-white/90 ring-1 ring-slate-200/50 p-3 sm:p-4 overflow-x-auto flex items-end justify-center gap-1.5">
          {elements.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              {error ? "Fix input to preview race bars" : "Preparing bar state..."}
            </div>
          ) : (
            elements.map((el, idx) => {
              const pct = barHeights[idx] ?? 10;
              const isNeg = Number.isFinite(Number(el.value)) && Number(el.value) < 0;
              return (
                <div
                  key={`${el.index}:${idx}`}
                  className="flex flex-col items-center justify-end gap-1 flex-1 min-w-[24px] max-w-[44px] h-full"
                >
                  <span
                    className={`text-[10px] font-mono font-semibold shrink-0 ${
                      isNeg ? "text-rose-700" : "text-slate-700"
                    }`}
                  >
                    {el.value}
                  </span>
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-xl border-t-2 transition-all duration-200 ${getElementBarColor(
                        el.state,
                        isNeg
                      )}`}
                      style={{ height: `${pct}%`, minHeight: "8px" }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 font-medium shrink-0">
                    {el.index}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Live Telemetry Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-white/65 backdrop-blur-sm border border-white/90 ring-1 ring-slate-200/50 text-center">
            <div className="text-[10px] font-semibold uppercase text-slate-600">Comparisons</div>
            <div className="text-base font-bold font-mono text-amber-700">
              {telemetry.comparisons}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/65 backdrop-blur-sm border border-white/90 ring-1 ring-slate-200/50 text-center">
            <div className="text-[10px] font-semibold uppercase text-slate-600">Swaps / Writes</div>
            <div className="text-base font-bold font-mono text-indigo-700">
              {telemetry.swapsOrUpdates}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/65 backdrop-blur-sm border border-white/90 ring-1 ring-slate-200/50 text-center">
            <div className="text-[10px] font-semibold uppercase text-slate-600">Max Stack Depth</div>
            <div className="text-base font-bold font-mono text-sky-700">{telemetry.maxDepth}</div>
          </div>
        </div>

        {/* Step Explanation */}
        <div className="text-xs text-slate-700 bg-indigo-50/55 backdrop-blur-sm border border-indigo-200/60 rounded-2xl px-3.5 py-2.5 min-h-[38px]">
          {step?.explanation || "Press Start Race to compare step-by-step execution."}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Side-by-Side Algorithm & Big-O Race</h1>
            <p className="text-xs text-slate-600">
              Compare two algorithms step-by-step on the exact same dataset to see Big-O complexity in action.
            </p>
          </div>
        </div>

        {/* Category Switcher */}
        <div className="flex flex-wrap items-center p-1 rounded-2xl sm:rounded-full glass-capsule-track gap-1 max-w-full">
          <button
            type="button"
            onClick={() => handleCategoryChange("sorting")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              category === "sorting"
                ? "glass-capsule-active"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sorting Race (O(n²) vs O(n log n))
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange("searching")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              category === "searching"
                ? "glass-capsule-active"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Search Race (O(n) vs O(log n))
          </button>
        </div>
      </div>

      {/* Shared Dataset & Playback Controls */}
      <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Shared Race Dataset (JSON)
          </label>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              value={rawInput}
              aria-label="Shared Race Dataset JSON"
              onChange={(e) => {
                setIsPlaying(false);
                setTick(0);
                setRawInput(e.target.value);
              }}
              className="flex-1 min-w-0 px-4 py-2 rounded-full glass-input font-mono text-xs text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={handleRandomize}
              className="px-3.5 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold border border-white/90 ring-1 ring-slate-200/70 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Dices className="w-4 h-4" />
              Randomize
            </button>
          </div>
          {inputError && <p className="text-xs text-rose-700 font-medium mt-1.5">{inputError}</p>}
        </div>

        {/* Synchronized Transport Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setTick(0);
            }}
            aria-label="Reset Race"
            className="p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-white/90 ring-1 ring-slate-200/70 cursor-pointer transition-all"
            title="Reset Race"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setTick((t) => Math.max(0, t - 1));
            }}
            disabled={tick <= 0}
            aria-label="Step Back"
            className="p-2.5 rounded-full bg-white/80 hover:bg-white disabled:opacity-40 text-slate-700 border border-white/90 ring-1 ring-slate-200/70 cursor-pointer transition-all"
            title="Step Back"
          >
            <StepBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (maxTicks > 0 && tick >= maxTicks - 1) setTick(0);
              setIsPlaying((p) => !p);
            }}
            disabled={maxTicks === 0}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying
              ? "Pause Race"
              : maxTicks > 0 && tick >= maxTicks - 1
              ? "Replay Race"
              : "Start Race"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setTick((t) => Math.min(Math.max(0, maxTicks - 1), t + 1));
            }}
            disabled={maxTicks === 0 || tick >= maxTicks - 1}
            aria-label="Step Forward"
            className="p-2.5 rounded-full bg-white/80 hover:bg-white disabled:opacity-40 text-slate-700 border border-white/90 ring-1 ring-slate-200/70 cursor-pointer transition-all"
            title="Step Forward"
          >
            <StepForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dual Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderLane("left", leftAlg, leftSteps, leftStep, leftTelemetry, leftFinished)}
        {renderLane("right", rightAlg, rightSteps, rightStep, rightTelemetry, rightFinished)}
      </div>

      {/* Empirical Comparison Footer Banner */}
      {leftSteps.length > 0 && rightSteps.length > 0 && (
        <div className="p-4 rounded-3xl glass-surface bg-gradient-to-r from-indigo-50/65 to-violet-50/65 border-indigo-200/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {winnerSide === "tie" ? (
                <>
                  Tied total operations ({leftOps}) and execution steps ({leftSteps.length}) between{" "}
                  <strong className="text-indigo-700">{leftAlg?.name}</strong> and{" "}
                  <strong className="text-indigo-700">{rightAlg?.name}</strong>.
                </>
              ) : leftOps !== rightOps ? (
                <>
                  Empirical Operations Advantage:{" "}
                  {Math.abs(leftOps - rightOps)} fewer comparisons + array writes for{" "}
                  <strong className="text-indigo-700">
                    {leftOps < rightOps ? leftAlg?.name : rightAlg?.name}
                  </strong>{" "}
                  ({Math.min(leftOps, rightOps)} vs {Math.max(leftOps, rightOps)} ops).
                </>
              ) : (
                <>
                  Empirical Step Advantage:{" "}
                  {Math.abs(leftSteps.length - rightSteps.length)} fewer execution steps for{" "}
                  <strong className="text-indigo-700">
                    {leftSteps.length < rightSteps.length ? leftAlg?.name : rightAlg?.name}
                  </strong>
                  .
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] font-mono text-indigo-700 font-semibold">
            Race Tick: {tick + 1} / {maxTicks}
          </span>
        </div>
      )}
      <Footer />
    </div>
  );
}

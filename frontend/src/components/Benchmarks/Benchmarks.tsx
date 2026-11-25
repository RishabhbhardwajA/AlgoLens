import { Activity, Zap, TrendingUp, Clock } from "lucide-react";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { formatBigO } from "@/utils/visualHelpers";

const COMPLEXITY_PROFILE: Record<
  string,
  { label: string; color: string; bar: number; note: string }
> = {
  "1": {
    label: "Constant",
    color: "#059669",
    bar: 6,
    note: "Fastest possible — runtime does not scale with input size.",
  },
  "log n": {
    label: "Logarithmic",
    color: "#047857",
    bar: 16,
    note: "Grows extremely slowly — halves remaining search space per step.",
  },
  h: {
    label: "Tree Height",
    color: "#0284C7",
    bar: 28,
    note: "Proportional to root-to-leaf height (O(log n) balanced, O(n) skewed).",
  },
  w: {
    label: "Tree Width",
    color: "#0284C7",
    bar: 32,
    note: "Bounded by maximum breadth across tree levels (up to n/2 leaves).",
  },
  n: {
    label: "Linear",
    color: "#B45309",
    bar: 42,
    note: "Scales directly with input — single pass over elements.",
  },
  v: {
    label: "Linear (Vertices)",
    color: "#B45309",
    bar: 44,
    note: "Proportional to vertex count in the graph.",
  },
  "v + e": {
    label: "Graph Linear",
    color: "#D97706",
    bar: 52,
    note: "Optimal graph traversal touching each reachable vertex & edge once.",
  },
  "n log n": {
    label: "Linearithmic",
    color: "#C2410C",
    bar: 60,
    note: "Optimal general comparison-based sorting complexity.",
  },
  "n^2": {
    label: "Quadratic",
    color: "#DC2626",
    bar: 80,
    note: "Grows quickly — nested passes limit smooth execution on huge arrays.",
  },
  "2^n": {
    label: "Exponential",
    color: "#BE123C",
    bar: 98,
    note: "Branches double per depth — impractical beyond small n without memoization.",
  },
  "n!": {
    label: "Factorial",
    color: "#9F1239",
    bar: 100,
    note: "Super-exponential — only feasible for tiny n.",
  },
};

function getProfile(complexity: string) {
  const normalized = complexity
    .replace(/^O\(|\)$/gi, "")
    .replace(/²/g, "^2")
    .replace(/ⁿ/g, "^n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return (
    COMPLEXITY_PROFILE[normalized] ?? {
      label: formatBigO(complexity),
      color: "#4648D4",
      bar: 50,
      note: "Asymptotic growth profile based on input structure.",
    }
  );
}

export function Benchmarks({ algorithm }: { algorithm: VisualizableAlgorithm }) {
  const timeProfile = getProfile(algorithm.complexity.time);
  const spaceProfile = getProfile(algorithm.complexity.space);

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-8 relative bg-transparent">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/80 pb-6">
          <div className="p-3 bg-fuchsia-50/85 backdrop-blur-md border border-fuchsia-200/70 rounded-2xl shadow-xs shrink-0">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-fuchsia-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Performance Profile
            </h2>
            <p className="text-slate-600 font-medium text-sm">
              Asymptotic analysis for {algorithm.name}
            </p>
          </div>
        </div>

        {/* Complexity bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time */}
          <div className="p-5 sm:p-6 rounded-3xl glass-surface space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                Time Complexity
              </span>
            </div>
            <div
              className="text-3xl sm:text-4xl font-black font-mono break-words"
              style={{ color: timeProfile.color }}
            >
              {formatBigO(algorithm.complexity.time)}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>{timeProfile.label}</span>
                <span>Relative growth</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200/75 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${timeProfile.bar}%`, background: timeProfile.color }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{timeProfile.note}</p>
            {algorithm.complexity.timeDescription && (
              <p className="text-xs text-slate-600 italic">{algorithm.complexity.timeDescription}</p>
            )}
          </div>

          {/* Space */}
          <div className="p-5 sm:p-6 rounded-3xl glass-surface space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-600" />
              <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                Space Complexity
              </span>
            </div>
            <div
              className="text-3xl sm:text-4xl font-black font-mono break-words"
              style={{ color: spaceProfile.color }}
            >
              {formatBigO(algorithm.complexity.space)}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>{spaceProfile.label}</span>
                <span>Memory usage</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200/75 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${spaceProfile.bar}%`, background: spaceProfile.color }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{spaceProfile.note}</p>
            {algorithm.complexity.spaceDescription && (
              <p className="text-xs text-slate-600 italic">
                {algorithm.complexity.spaceDescription}
              </p>
            )}
          </div>
        </div>

        {/* Live Benchmarks Roadmap */}
        <div className="glass-surface rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center min-h-[240px] gap-4">
          <div className="p-4 rounded-2xl bg-indigo-50/85 border border-indigo-200/70 backdrop-blur-md">
            <TrendingUp className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Live Runtime Benchmarks</h3>
          <p className="text-slate-600 max-w-md text-center text-sm leading-relaxed">
            Actual measured execution times across random, sorted, and reversed input distributions
            are on the roadmap. Live benchmarks will run in a Web Worker without blocking the UI.
          </p>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Coming in a future update
          </div>
        </div>
      </div>

      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-sky-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
    </div>
  );
}

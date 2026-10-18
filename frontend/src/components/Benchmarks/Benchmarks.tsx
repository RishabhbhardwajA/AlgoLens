import { Activity, Zap, TrendingUp, Clock } from "lucide-react";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";

const COMPLEXITY_PROFILE: Record<string, { label: string; color: string; bar: number; note: string }> = {
  "1":         { label: "Constant",      color: "#10B981", bar: 5,  note: "Fastest possible — does not scale with input size." },
  "log n":     { label: "Logarithmic",   color: "#34D399", bar: 15, note: "Grows extremely slowly — excellent for large inputs." },
  "n":         { label: "Linear",        color: "#F59E0B", bar: 40, note: "Scales directly with input — acceptable for most problems." },
  "n log n":   { label: "Linearithmic",  color: "#F97316", bar: 55, note: "Optimal for comparison-based sorting algorithms." },
  "n²":        { label: "Quadratic",     color: "#EF4444", bar: 80, note: "Grows fast — only suitable for small inputs (n ≤ 10,000)." },
  "n^2":       { label: "Quadratic",     color: "#EF4444", bar: 80, note: "Grows fast — only suitable for small inputs (n ≤ 10,000)." },
  "2^n":       { label: "Exponential",   color: "#BE123C", bar: 98, note: "Brute-force territory — impractical beyond n ≈ 25." },
  "n!":        { label: "Factorial",     color: "#9F1239", bar: 100, note: "Extremely slow — only works for very small inputs." },
};

function getProfile(time: string) {
  const key = time.replace(/^O\(|\)$/g, "").trim().toLowerCase();
  return COMPLEXITY_PROFILE[key] ?? { label: time, color: "#94A3B8", bar: 50, note: "See complexity details above." };
}

export function Benchmarks({ algorithm }: { algorithm: VisualizableAlgorithm }) {
  const timeProfile = getProfile(algorithm.complexity.time);
  const spaceProfile = getProfile(algorithm.complexity.space);

  return (
    <div className="flex-1 overflow-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <div className="p-3 bg-fuchsia-50 border border-fuchsia-100 rounded-xl">
            <Zap className="w-8 h-8 text-fuchsia-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Performance Profile</h2>
            <p className="text-slate-500 font-medium">Asymptotic analysis for {algorithm.name}</p>
          </div>
        </div>

        {/* Complexity bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">Time Complexity</span>
            </div>
            <div className="text-4xl font-black font-mono" style={{ color: timeProfile.color }}>
              O({algorithm.complexity.time})
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>{timeProfile.label}</span>
                <span>Relative growth</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${timeProfile.bar}%`, background: timeProfile.color }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{timeProfile.note}</p>
            {algorithm.complexity.timeDescription && (
              <p className="text-xs text-slate-400 italic">{algorithm.complexity.timeDescription}</p>
            )}
          </div>

          {/* Space */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-500" />
              <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">Space Complexity</span>
            </div>
            <div className="text-4xl font-black font-mono" style={{ color: spaceProfile.color }}>
              O({algorithm.complexity.space})
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>{spaceProfile.label}</span>
                <span>Memory usage</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${spaceProfile.bar}%`, background: spaceProfile.color }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{spaceProfile.note}</p>
            {algorithm.complexity.spaceDescription && (
              <p className="text-xs text-slate-400 italic">{algorithm.complexity.spaceDescription}</p>
            )}
          </div>
        </div>

        {/* Live Benchmarks – Roadmap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[260px] gap-4">
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
            <TrendingUp className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">Live Runtime Benchmarks</h3>
          <p className="text-slate-500 max-w-md text-center text-sm leading-relaxed">
            Actual measured execution times across random, sorted, and reversed input distributions are on the roadmap.
            Live benchmarks will run in a Web Worker to measure real millisecond performance without blocking the UI.
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Coming in a future update
          </div>
        </div>

      </div>

      {/* Decorative Background */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-sky-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
    </div>
  );
}

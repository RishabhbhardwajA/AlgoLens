import { motion } from "framer-motion";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import { cn } from "@/utils/cn";
import { computeBarHeights } from "@/utils/visualHelpers";
import type { ArrayElement, VisualizationState } from "@/engine/executionTypes";

const STATE_STYLES: Record<ArrayElement["state"], string> = {
  default:
    "border-white/90 ring-1 ring-slate-200/70 bg-white/70 backdrop-blur-md text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.04)]",
  current:
    "border-indigo-400/90 bg-indigo-500/18 backdrop-blur-md text-indigo-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_0_16px_rgba(99,102,241,0.28)]",
  visited:
    "border-emerald-400/90 bg-emerald-500/16 backdrop-blur-md text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_10px_rgba(16,185,129,0.16)]",
  comparing:
    "border-amber-400/90 bg-amber-400/20 backdrop-blur-md text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_0_14px_rgba(245,158,11,0.25)]",
  found:
    "border-emerald-500/90 bg-emerald-500/22 backdrop-blur-md text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_0_18px_rgba(16,185,129,0.35)]",
  eliminated:
    "border-slate-200/70 bg-slate-100/55 backdrop-blur-sm text-slate-500 opacity-60",
  returning:
    "border-violet-400/90 bg-violet-500/18 backdrop-blur-md text-violet-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  "pointer-left":
    "border-indigo-400/90 bg-indigo-500/18 backdrop-blur-md text-indigo-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  "pointer-right":
    "border-pink-400/90 bg-pink-500/18 backdrop-blur-md text-pink-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  "pointer-mid":
    "border-amber-400/90 bg-amber-400/20 backdrop-blur-md text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
};

const STATE_DOT: Record<ArrayElement["state"], string> = {
  default: "bg-slate-400",
  current: "bg-indigo-500",
  visited: "bg-emerald-500",
  comparing: "bg-amber-500",
  found: "bg-emerald-600",
  eliminated: "bg-slate-400",
  returning: "bg-violet-500",
  "pointer-left": "bg-indigo-500",
  "pointer-right": "bg-pink-500",
  "pointer-mid": "bg-amber-500",
};

function resolveInitialArrayState(
  algorithm: ReturnType<typeof useExecutionStore.getState>["algorithm"],
  rawInput: string
): VisualizationState | null {
  if (!algorithm?.initialVisualizationState) return null;
  try {
    const parsed = algorithm.parseInput(rawInput);
    if (!algorithm.validateInput(parsed).valid) return null;
    return algorithm.initialVisualizationState(parsed);
  } catch {
    return null;
  }
}

export function ArrayVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const rawInput = useExecutionStore((s) => s.rawInput);
  const currentStep = useCurrentStep();

  if (!algorithm || algorithm.visualizationType !== "array") return null;

  const vizState =
    currentStep?.visualizationState ??
    (!hasStarted ? resolveInitialArrayState(algorithm, rawInput) : null);

  if (!vizState || vizState.type !== "array") {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        {hasStarted ? "No array state" : "Run algorithm to visualize"}
      </div>
    );
  }

  const { elements, pointers = {} } = vizState;
  const heights = computeBarHeights(elements);

  const outOfBoundsPointers = Object.entries(pointers).filter(
    ([, idx]) => idx < 0 || idx >= elements.length
  );

  return (
    <PanZoomCanvas
      className="w-full h-full"
      controlsPosition="top-left"
      controlsClassName="!top-3 !left-3"
      contentClassName="flex flex-col items-center justify-center w-full px-6 py-4 pb-16 gap-6 min-w-max"
    >
      {/* Bar chart */}
      <div className="flex items-end justify-center gap-1.5 h-40 w-full max-w-3xl">
        {elements.map((el, idx) => {
          const isSeparator = typeof el.value === "string" && el.value === "→";
          if (isSeparator) {
            return (
              <div
                key={`sep:${idx}`}
                className="flex flex-col items-center justify-center h-full px-1 shrink-0"
              >
                <span className="text-xs font-mono font-bold text-slate-500">→</span>
              </div>
            );
          }

          const rawNum = Number(el.value);
          const isNegative = Number.isFinite(rawNum) && rawNum < 0;
          const heightPct = heights[idx] ?? 10;
          const reactKey = `${el.index}:${idx}`;

          return (
            <div
              key={reactKey}
              className="flex flex-col items-center justify-end gap-1 h-full flex-1 min-w-[26px]"
              style={{ maxWidth: "60px" }}
            >
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold shrink-0",
                  isNegative ? "text-rose-700" : "text-slate-600"
                )}
              >
                {el.value}
              </span>
              <div className="flex-1 w-full flex items-end">
                <motion.div
                  layout
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-t-xl border backdrop-blur-md transition-colors duration-200",
                    getBarColor(el.state, isNegative)
                  )}
                  style={{ minHeight: "8px" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Index boxes */}
      <div className="flex gap-1.5 items-start flex-wrap justify-center max-w-3xl">
        {elements.map((el, idx) => {
          const isSeparator = typeof el.value === "string" && el.value === "→";
          const reactKey = `box:${el.index}:${idx}`;

          if (isSeparator) {
            return (
              <div key={reactKey} className="flex flex-col items-center gap-1 px-1">
                <div className="h-4 text-[10px] font-mono font-bold text-slate-600">
                  {el.label ?? ""}
                </div>
                <div className="h-10 px-2 flex items-center justify-center font-mono text-sm font-bold text-indigo-700">
                  →
                </div>
              </div>
            );
          }

          return (
            <div key={reactKey} className="flex flex-col items-center gap-1">
              {/* Label above */}
              <div className="h-4 text-[10px] font-mono font-bold text-center whitespace-nowrap">
                {el.label ? (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full",
                      el.state === "found"
                        ? "text-emerald-700"
                        : el.state === "pointer-left" || el.state === "current"
                        ? "text-indigo-700"
                        : el.state === "pointer-right"
                        ? "text-pink-700"
                        : el.state === "pointer-mid" || el.state === "comparing"
                        ? "text-amber-700"
                        : "text-slate-600"
                    )}
                  >
                    {el.label}
                  </span>
                ) : null}
              </div>

              {/* Box */}
              <motion.div
                layout
                animate={{ scale: el.state === "current" || el.state === "found" ? 1.08 : 1 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "min-w-10 h-10 px-2 flex items-center justify-center rounded-xl border-2 font-mono text-sm font-semibold transition-colors duration-200",
                  STATE_STYLES[el.state]
                )}
              >
                {el.value}
              </motion.div>

              {/* Index */}
              <span className="text-[10px] font-mono text-slate-500 font-medium">{el.index}</span>
            </div>
          );
        })}
      </div>

      {/* Out-of-bounds / Terminated Pointers */}
      {outOfBoundsPointers.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {outOfBoundsPointers.map(([name, idx]) => (
            <span
              key={name}
              className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50/85 backdrop-blur-md text-rose-700 text-[11px] font-mono font-semibold"
            >
              {name} = {idx} (out of bounds)
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/85">
        {(
          [
            ["current", "Active"],
            ["comparing", "Comparing"],
            ["found", "Found"],
            ["visited", "Processed / Sorted"],
            ["eliminated", "Eliminated"],
            ["pointer-left", "Left ptr"],
            ["pointer-right", "Right ptr"],
          ] as [ArrayElement["state"], string][]
        ).map(([state, label]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", STATE_DOT[state])} />
            <span className="text-[10px] text-slate-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </PanZoomCanvas>
  );
}

function getBarColor(state: ArrayElement["state"], isNegative = false): string {
  const negBorder = isNegative ? "border-b-2 border-b-rose-400/80" : "";
  switch (state) {
    case "current":
      return `bg-indigo-500/75 border-indigo-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_rgba(99,102,241,0.28)] ${negBorder}`;
    case "comparing":
      return `bg-amber-400/75 border-amber-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(245,158,11,0.22)] ${negBorder}`;
    case "found":
      return `bg-emerald-500/75 border-emerald-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_rgba(16,185,129,0.28)] ${negBorder}`;
    case "visited":
      return `bg-emerald-400/60 border-emerald-400/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${negBorder}`;
    case "eliminated":
      return `bg-slate-200/60 border-slate-300/70 opacity-50 ${negBorder}`;
    case "pointer-left":
      return `bg-sky-400/70 border-sky-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${negBorder}`;
    case "pointer-right":
      return `bg-pink-400/70 border-pink-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${negBorder}`;
    case "pointer-mid":
      return `bg-amber-400/75 border-amber-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${negBorder}`;
    default:
      return `bg-slate-300/70 border-slate-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.05)] ${negBorder}`;
  }
}

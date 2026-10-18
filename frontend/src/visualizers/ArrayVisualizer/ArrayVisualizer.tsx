import { motion, AnimatePresence } from "framer-motion";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import { cn } from "@/utils/cn";
import type { ArrayElement } from "@/engine/executionTypes";

const STATE_STYLES: Record<ArrayElement["state"], string> = {
  default: "border-zinc-600 bg-zinc-800 text-zinc-300",
  current: "border-indigo-400 bg-indigo-950 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]",
  visited: "border-emerald-500 bg-emerald-950 text-emerald-300",
  comparing: "border-amber-400 bg-amber-950 text-amber-200",
  found: "border-green-400 bg-green-950 text-green-200 shadow-[0_0_12px_rgba(74,222,128,0.3)]",
  eliminated: "border-zinc-700 bg-zinc-900 text-zinc-600 opacity-40",
  returning: "border-violet-500 bg-violet-950 text-violet-300",
  "pointer-left": "border-indigo-400 bg-indigo-950 text-indigo-200",
  "pointer-right": "border-pink-400 bg-pink-950 text-pink-200",
  "pointer-mid": "border-amber-400 bg-amber-950 text-amber-200",
};

const STATE_DOT: Record<ArrayElement["state"], string> = {
  default: "bg-zinc-600",
  current: "bg-indigo-400",
  visited: "bg-emerald-400",
  comparing: "bg-amber-400",
  found: "bg-green-400",
  eliminated: "bg-zinc-700",
  returning: "bg-violet-400",
  "pointer-left": "bg-indigo-400",
  "pointer-right": "bg-pink-400",
  "pointer-mid": "bg-amber-400",
};

export function ArrayVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const currentStep = useCurrentStep();

  if (!algorithm || algorithm.visualizationType !== "array") return null;

  const vizState = currentStep?.visualizationState;
  if (!vizState || vizState.type !== "array") {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        {hasStarted ? "No array state" : "Run algorithm to visualize"}
      </div>
    );
  }

  const { elements } = vizState;
  const nums = elements.map((e) => Number(e.value));
  const maxVal = Math.max(...nums.filter(Number.isFinite), 1);

  return (
    <PanZoomCanvas
      className="w-full h-full"
      controlsPosition="top-left"
      controlsClassName="!top-3 !left-3"
      contentClassName="flex flex-col items-center justify-center w-full px-6 py-4 gap-8 min-w-max"
    >
        {/* Bar chart */}
        <div className="flex items-end gap-1.5 h-40 w-full max-w-2xl">
          {elements.map((el) => {
            const heightPct = Math.max((Number(el.value) / maxVal) * 100, 4);
            return (
              <div
                key={el.index}
                className="flex flex-col items-center gap-1 origin-bottom flex-1"
                style={{ maxWidth: "60px" }}
              >
                <span className="text-[10px] font-mono text-zinc-400">{el.value}</span>
                <motion.div
                  layout
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-sm border-t-2 transition-colors duration-200",
                    getBarColor(el.state)
                  )}
                  style={{ minHeight: "8px" }}
                />
              </div>
            );
          })}
        </div>

        {/* Index boxes */}
        <div className="flex gap-1 items-start flex-wrap justify-center">
          {elements.map((el) => (
            <div key={el.index} className="flex flex-col items-center gap-1">
              {/* Label above */}
              <div className="h-4 text-[10px] font-mono font-bold text-center">
                {el.label ? (
                  <span
                    className={cn(
                      "px-1 rounded",
                      el.state === "found"
                        ? "text-green-400"
                        : el.state === "pointer-left" || el.state === "current"
                        ? "text-indigo-400"
                        : el.state === "pointer-right"
                        ? "text-pink-400"
                        : el.state === "pointer-mid" || el.state === "comparing"
                        ? "text-amber-400"
                        : "text-zinc-400"
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
                  "w-10 h-10 flex items-center justify-center rounded-md border-2 font-mono text-sm font-semibold transition-colors duration-200",
                  STATE_STYLES[el.state]
                )}
              >
                {el.value}
              </motion.div>

              {/* Index */}
              <span className="text-[10px] font-mono text-zinc-600">{el.index}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {(
            [
              ["current", "Active"],
              ["comparing", "Comparing"],
              ["found", "Found"],
              ["visited", "Sorted"],
              ["eliminated", "Eliminated"],
              ["pointer-left", "Left ptr"],
              ["pointer-right", "Right ptr"],
            ] as [ArrayElement["state"], string][]
          ).map(([state, label]) => (
            <div key={state} className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", STATE_DOT[state])} />
              <span className="text-[10px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
    </PanZoomCanvas>
  );
}

function getBarColor(state: ArrayElement["state"]): string {
  switch (state) {
    case "current":
      return "bg-indigo-900 border-indigo-400";
    case "comparing":
      return "bg-amber-900 border-amber-400";
    case "found":
      return "bg-green-900 border-green-400";
    case "visited":
      return "bg-emerald-900 border-emerald-500";
    case "eliminated":
      return "bg-zinc-900 border-zinc-700 opacity-40";
    case "pointer-left":
      return "bg-indigo-900 border-indigo-400";
    case "pointer-right":
      return "bg-pink-900 border-pink-400";
    case "pointer-mid":
      return "bg-amber-900 border-amber-400";
    default:
      return "bg-zinc-800 border-zinc-600";
  }
}

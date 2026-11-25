import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import type { GridCell } from "@/engine/executionTypes";

function resolveInitialGridState(
  algorithm: ReturnType<typeof useExecutionStore.getState>["algorithm"],
  rawInput: string
) {
  if (!algorithm?.initialVisualizationState) return null;
  try {
    const parsed = algorithm.parseInput(rawInput);
    const validation = algorithm.validateInput(parsed);
    if (!validation.valid) return null;
    return algorithm.initialVisualizationState(parsed);
  } catch {
    return null;
  }
}

export function GridVisualizer() {
  const currentStep = useCurrentStep();
  const algorithm = useExecutionStore((s) => s.algorithm);
  const rawInput = useExecutionStore((s) => s.rawInput);

  const currentState =
    currentStep?.visualizationState ?? resolveInitialGridState(algorithm, rawInput);

  if (!currentState || currentState.type !== "grid") {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 font-mono text-sm p-4">
        Run the algorithm to see the grid visualization.
      </div>
    );
  }

  const { grid } = currentState;

  return (
    <PanZoomCanvas
      className="w-full h-full"
      controlsPosition="top-left"
      controlsClassName="!top-3 !left-3"
      contentClassName="flex flex-col items-center justify-center p-8 pb-20 gap-6 min-w-max"
    >
      <div className="flex flex-col gap-1.5 p-4 rounded-3xl glass-surface">
        {grid.map((row: GridCell[], r: number) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell: GridCell, c: number) => {
              const isStart = cell.type === "start";
              const isEnd = cell.type === "end";
              const isWall = cell.type === "wall";

              let bg = "bg-white/65 border-white/90 ring-1 ring-slate-200/50 text-slate-700";
              let pulse = false;

              if (isWall) {
                bg = "bg-slate-300/75 border-slate-400/70";
              } else if (isStart) {
                bg = "bg-emerald-500/25 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]";
              } else if (isEnd) {
                bg = "bg-rose-500/25 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]";
              } else if (cell.state === "current") {
                bg = "bg-amber-400/75 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.45)]";
                pulse = true;
              } else if (cell.state === "exploring") {
                bg = "bg-sky-400/55 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]";
              } else if (cell.state === "path") {
                bg = "bg-indigo-500/75 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.45)]";
              } else if (cell.state === "visited") {
                bg = "bg-indigo-100/80 border-indigo-300/80";
              }

              return (
                <motion.div
                  key={r + "-" + c}
                  animate={pulse ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-8 h-8 rounded-lg border backdrop-blur-sm transition-colors duration-300 flex items-center justify-center",
                    bg
                  )}
                >
                  {isStart && <span className="text-[10px] font-bold text-emerald-800">S</span>}
                  {isEnd && <span className="text-[10px] font-bold text-rose-800">E</span>}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4 justify-center px-4 py-2 rounded-2xl sm:rounded-full glass-surface text-xs font-mono">
        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
          <div className="w-3 h-3 bg-emerald-400/45 border border-emerald-500 rounded-full" />
          Start
        </div>
        <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
          <div className="w-3 h-3 bg-rose-400/45 border border-rose-500 rounded-full" />
          Target
        </div>
        <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
          <div className="w-3 h-3 bg-amber-400/80 border border-amber-500 rounded-full" />
          Current
        </div>
        <div className="flex items-center gap-1.5 text-sky-800 font-semibold">
          <div className="w-3 h-3 bg-sky-400/60 border border-sky-500 rounded-full" />
          Exploring
        </div>
        <div className="flex items-center gap-1.5 text-indigo-800 font-semibold">
          <div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded-full" />
          Visited
        </div>
        <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
          <div className="w-3 h-3 bg-indigo-500/75 border border-indigo-500 rounded-full" />
          Path
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <div className="w-3 h-3 bg-slate-300/80 border border-slate-400 rounded-full" />
          Wall
        </div>
      </div>
    </PanZoomCanvas>
  );
}

import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import type { GridCell } from "@/engine/executionTypes";

export function GridVisualizer() {
  const currentStep = useCurrentStep();
  const algorithm = useExecutionStore((s) => s.algorithm);
  const rawInput = useExecutionStore((s) => s.rawInput);

  const currentState =
    currentStep?.visualizationState ??
    (algorithm?.initialVisualizationState
      ? algorithm.initialVisualizationState(algorithm.parseInput(rawInput))
      : null);

  if (!currentState || currentState.type !== "grid") {
    return (
      <div className="text-zinc-500 font-mono text-sm p-4">
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
      contentClassName="flex flex-col items-center justify-center p-8 gap-6 min-w-max"
    >
      <div className="flex flex-col gap-1 p-4 rounded-xl bg-obsidian-900/40 border border-white/[0.05]">
        {grid.map((row: GridCell[], r: number) => (
          <div key={r} className="flex gap-1">
            {row.map((cell: GridCell, c: number) => {
              const isStart = cell.type === "start";
              const isEnd = cell.type === "end";
              const isWall = cell.type === "wall";

              let bg = "bg-obsidian-800 border-white/[0.05]"; // default empty
              let pulse = false;

              if (isWall) {
                bg = "bg-zinc-800 border-zinc-700";
              } else if (isStart) {
                bg = "bg-emerald-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
              } else if (isEnd) {
                bg = "bg-rose-900 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]";
              } else if (cell.state === "current") {
                bg = "bg-cyber-amber border-cyber-amber shadow-[0_0_15px_rgba(245,158,11,0.6)]";
                pulse = true;
              } else if (cell.state === "exploring") {
                bg = "bg-quantum-cyan border-quantum-cyan shadow-[0_0_10px_rgba(0,242,254,0.4)]";
              } else if (cell.state === "path") {
                bg = "bg-electric-violet border-electric-violet shadow-[0_0_15px_rgba(139,92,246,0.6)]";
              } else if (cell.state === "visited") {
                bg = "bg-obsidian-700 border-quantum-cyan/30";
              }

              return (
                <motion.div
                  key={r + "-" + c}
                  animate={pulse ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-8 h-8 rounded-sm border transition-colors duration-300 flex items-center justify-center",
                    bg
                  )}
                >
                  {isStart && <span className="text-[10px] font-bold text-emerald-200">S</span>}
                  {isEnd && <span className="text-[10px] font-bold text-rose-200">E</span>}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 p-3 rounded-lg bg-obsidian-900/60 border border-white/[0.05] text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-3 h-3 bg-emerald-900 border border-emerald-500 rounded-sm"></div>
          Start
        </div>
        <div className="flex items-center gap-2 text-rose-400">
          <div className="w-3 h-3 bg-rose-900 border border-rose-500 rounded-sm"></div>
          Target
        </div>
        <div className="flex items-center gap-2 text-quantum-cyan">
          <div className="w-3 h-3 bg-quantum-cyan border border-quantum-cyan rounded-sm"></div>
          Exploring
        </div>
        <div className="flex items-center gap-2 text-electric-violet">
          <div className="w-3 h-3 bg-electric-violet border border-electric-violet rounded-sm"></div>
          Path
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm"></div>
          Wall
        </div>
      </div>
    </PanZoomCanvas>
  );
}

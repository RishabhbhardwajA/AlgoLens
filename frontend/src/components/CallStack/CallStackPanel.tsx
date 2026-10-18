import { motion, AnimatePresence } from "framer-motion";
import {
  useExecutionStore,
  useCurrentStep,
} from "@/engine/useExecutionController";
import { Layers } from "lucide-react";

export function CallStackPanel() {
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const currentStep = useCurrentStep();

  const frames = currentStep?.callStack ?? [];

  return (
    <div className="flex flex-col h-full bg-white/80 relative rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="h-8 px-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Call Stack Frames</span>
        </div>
        {frames.length > 0 && (
          <span className="text-[10px] font-bold tracking-widest text-indigo-600 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 uppercase">
            Depth: {frames.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs relative">
        {!hasStarted ? (
          <EmptyState text="Run algorithm to see the call stack" />
        ) : frames.length === 0 ? (
          <EmptyState text="Call stack is empty" />
        ) : (
          <AnimatePresence initial={false}>
            {[...frames].reverse().map((frame, reversedIdx) => {
              const isTop = reversedIdx === 0;
              const args = Object.entries(frame.args)
                .map(([k, v]) => `${k}=${formatValue(v)}`)
                .join(", ");

              return (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`p-2 rounded-lg border relative overflow-hidden ${
                    isTop
                      ? "bg-white border-indigo-400 shadow-[0_2px_8px_rgba(99,102,241,0.12)]"
                      : "bg-slate-50 border-slate-200 opacity-80 hover:opacity-100 transition-opacity"
                  }`}
                >
                  {isTop && <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                  
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isTop ? "text-indigo-600" : "text-slate-800"}`}>
                      {frame.functionName}
                    </span>
                    <span className={`text-[9px] font-bold tracking-widest px-1 py-0.5 rounded uppercase ${
                      isTop ? "bg-indigo-100 text-indigo-700" : "bg-violet-100 text-violet-700"
                    }`}>
                      {isTop ? `FRAME ${reversedIdx + 1}: ACTIVE` : `FRAME ${reversedIdx + 1}: WAITING`}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{args || "no args"}</span>
                    {!isTop && <span className="text-slate-400 italic">pending</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "?";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return `[${v.join(",")}]`;
  return String(v);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-xs py-8 font-medium">
      {text}
    </div>
  );
}

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
    <div className="flex flex-col h-full bg-white/68 backdrop-blur-xl relative rounded-3xl border border-white/88 overflow-hidden">
      <div className="h-9 px-3.5 bg-white/50 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Call Stack Frames</span>
        </div>
        {frames.length > 0 && (
          <span className="text-[10px] font-bold tracking-widest text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50/85 border border-indigo-200/60 uppercase">
            Depth: {frames.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 font-mono text-xs relative">
        {!hasStarted ? (
          <EmptyState text="Run algorithm to see the call stack" />
        ) : frames.length === 0 ? (
          <EmptyState text="Call stack is empty" />
        ) : (
          <AnimatePresence initial={false}>
            {[...frames].reverse().map((frame, reversedIdx) => {
              const isTop = reversedIdx === 0;
              const frameNumber = frames.length - reversedIdx;
              const explicitArgs = Object.entries(frame.args || {});
              const frameEntries =
                explicitArgs.length > 0
                  ? explicitArgs
                  : Object.entries(frame.localVariables || {});
              const args = frameEntries
                .map(([k, v]) => `${k}=${formatValue(v)}`)
                .join(", ");

              return (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`p-2.5 rounded-2xl border backdrop-blur-md relative overflow-hidden ${
                    isTop
                      ? "bg-white/88 border-indigo-300/90 shadow-[0_4px_14px_rgba(99,102,241,0.12)]"
                      : "bg-white/58 border-white/85 ring-1 ring-slate-200/50 opacity-85 hover:opacity-100 transition-opacity"
                  }`}
                >
                  {isTop && <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                  
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isTop ? "text-indigo-600" : "text-slate-800"}`}>
                      {frame.functionName}
                    </span>
                    <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase ${
                      isTop ? "bg-indigo-100/80 text-indigo-700" : "bg-violet-100/80 text-violet-700"
                    }`}>
                      {isTop ? `FRAME ${frameNumber}: ACTIVE` : `FRAME ${frameNumber}: WAITING`}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{args || "no args"}</span>
                    {!isTop && <span className="text-slate-600 italic">pending</span>}
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
  if (Array.isArray(v)) {
    return v.length > 6 ? `[${v.slice(0, 6).join(",")},...]` : `[${v.join(",")}]`;
  }
  return String(v);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-600 text-xs py-8 font-medium">
      {text}
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { Variable, ArrowRight, Sparkles, Activity } from "lucide-react";

export function VariablesPanel() {
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const steps = useExecutionStore((s) => s.steps);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const currentStep = useCurrentStep();

  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const currentVars = currentStep?.localVariables ?? {};
  const prevVars = prevStep?.localVariables ?? {};

  const entries = Object.entries(currentVars);

  // Compute exact diff between previous step and current step
  const diffs = entries.map(([key, currVal]) => {
    const hasPrev = prevStep !== null && key in prevVars;
    const oldVal = hasPrev ? prevVars[key] : undefined;
    const oldFormatted = hasPrev ? formatValue(oldVal) : null;
    const currFormatted = formatValue(currVal);
    const changed = hasPrev && oldFormatted !== currFormatted;
    const isNew = !hasPrev && prevStep !== null;

    return {
      key,
      currVal,
      currFormatted,
      oldVal,
      oldFormatted,
      changed,
      isNew,
      type: Array.isArray(currVal) ? "Array" : typeof currVal,
    };
  });

  const changedVars = diffs.filter((d) => d.changed);

  return (
    <div className="flex flex-col h-full bg-white/95 relative rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with status */}
      <div className="h-8 px-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <Variable className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Reactive Scope & State
          </span>
        </div>
        {currentStep && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
            Line {currentStep.line}
          </span>
        )}
      </div>

      {/* State Delta Summary Callout */}
      {hasStarted && changedVars.length > 0 && (
        <div className="px-3 py-1.5 bg-amber-50/90 border-b border-amber-200 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-900 overflow-hidden text-ellipsis whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-800">Delta:</span>
            {changedVars.map((v) => (
              <span key={v.key} className="inline-flex items-center gap-1 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-300">
                <span className="font-bold text-amber-900">{v.key}:</span>
                <span className="text-slate-500 line-through">{v.oldFormatted}</span>
                <ArrowRight className="w-2.5 h-2.5 text-amber-600" />
                <span className="font-bold text-amber-800">{v.currFormatted}</span>
              </span>
            ))}
          </div>
          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest shrink-0 ml-1">
            {changedVars.length} Mutated
          </span>
        </div>
      )}

      {/* Main Variable Table */}
      <div className="flex-1 overflow-y-auto">
        {!hasStarted ? (
          <EmptyState text="Run algorithm to inspect local variables" />
        ) : entries.length === 0 ? (
          <EmptyState text="No local variables in current frame" />
        ) : (
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-1 px-2.5">Identifier</th>
                <th className="py-1 px-1">Type</th>
                <th className="py-1 px-2.5 text-right">Value Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <AnimatePresence initial={false}>
                {diffs.map((diff) => (
                  <VariableRow key={diff.key} diff={diff} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Footer State Invariant Note */}
      {hasStarted && (
        <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between font-mono shrink-0">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-500" />
            <span>Scope: {currentStep?.functionName || "global"}()</span>
          </span>
          <span className="text-slate-400">
            {entries.length} tracked variable{entries.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}

interface VariableDiff {
  key: string;
  currVal: unknown;
  currFormatted: string;
  oldVal: unknown;
  oldFormatted: string | null;
  changed: boolean;
  isNew: boolean;
  type: string;
}

function VariableRow({ diff }: { diff: VariableDiff }) {
  const { key, currFormatted, oldFormatted, changed, isNew, type } = diff;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -3 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group transition-colors duration-200 ${
        changed
          ? "bg-amber-50/70 hover:bg-amber-100/70"
          : isNew
          ? "bg-indigo-50/50 hover:bg-indigo-100/50"
          : "hover:bg-slate-50"
      }`}
    >
      <td className="py-1.5 px-2.5 font-medium flex items-center space-x-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            changed ? "bg-amber-500 animate-pulse" : isNew ? "bg-indigo-500" : "bg-slate-400"
          }`}
        />
        <span className={changed ? "text-amber-800 font-bold" : isNew ? "text-indigo-700 font-semibold" : "text-slate-700"}>
          {key}
        </span>
        {changed && (
          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-200/80 text-amber-900 uppercase">
            Updated
          </span>
        )}
        {isNew && (
          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-200/80 text-indigo-900 uppercase">
            Init
          </span>
        )}
      </td>
      <td className="py-1.5 px-1 text-slate-400 text-[10px]">
        {type}
      </td>
      <td className="py-1.5 px-2.5 text-right font-bold">
        {changed ? (
          <span className="inline-flex items-center gap-1 font-mono">
            <span className="line-through text-slate-400 font-normal">{oldFormatted}</span>
            <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
            <span className="text-amber-900 font-bold">{currFormatted}</span>
          </span>
        ) : (
          <span className="text-slate-700 font-mono">{currFormatted}</span>
        )}
      </td>
    </motion.tr>
  );
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (v === "?") return "?";
  if (typeof v === "string") return v.startsWith("[") || v.startsWith("{") ? v : `"${v}"`;
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-xs py-8 font-medium">
      {text}
    </div>
  );
}

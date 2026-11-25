import { useState, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useExecutionStore,
  useCurrentStep,
} from "@/engine/useExecutionController";
import {
  Sparkles,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  MessageSquareQuote,
  ShieldCheck,
  Copy,
  Check,
  Zap,
  Repeat,
  Info,
  HelpCircle,
} from "lucide-react";
import { getInterviewInsight } from "@/utils/interviewMentor";
import { getStructuredExplanation } from "@/utils/explanationHelper";

export function ExplanationPanel() {
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const totalSteps = useExecutionStore((s) => s.steps.length);
  const steps = useExecutionStore((s) => s.steps);
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStep = useCurrentStep();

  const [mode, setMode] = useState<"copilot" | "interview">("copilot");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const insight = getInterviewInsight(currentStep, algorithm, currentStepIndex, totalSteps);
  const structured = getStructuredExplanation(currentStep, algorithm);

  // Dynamic telemetry metrics computed up to the current step
  const { comparisonsCount, swapsCount } = useMemo(() => {
    let comps = 0;
    let swaps = 0;
    const activeSlice = steps.slice(0, currentStepIndex + 1);
    for (const st of activeSlice) {
      if (st.event.type === "COMPARE") comps++;
      if (st.event.type === "SWAP") swaps++;
    }
    return { comparisonsCount: comps, swapsCount: swaps };
  }, [steps, currentStepIndex]);

  const handleCopyScript = async () => {
    if (!insight.candidateScript) return;
    try {
      await navigator.clipboard?.writeText(insight.candidateScript);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex-1 panel-elevated rounded-3xl relative overflow-hidden flex flex-col p-3.5 border border-white/90 justify-between bg-white/75 backdrop-blur-2xl">
      {/* Ambient Radiance */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-violet-200/35 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between mb-2 shrink-0 border-b border-slate-200/50 pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
            {mode === "interview" ? (
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            {mode === "interview" ? "Interview Mentor" : "AlgoLens Copilot"}
          </span>
        </div>

        {/* Mode Switcher Tabs — Capsule Switcher */}
        <div className="flex items-center p-0.5 rounded-full glass-capsule-track text-[10px] font-semibold">
          <button
            onClick={() => setMode("copilot")}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
              mode === "copilot"
                ? "glass-capsule-active font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Copilot
          </button>
          <button
            onClick={() => setMode("interview")}
            className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
              mode === "interview"
                ? "glass-capsule-active font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            Interview
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto pr-1 text-slate-700 scrollbar-thin">
        {!hasStarted ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-600">
            <GraduationCap className="w-8 h-8 mb-2 text-slate-400" aria-hidden="true" />
            <div className="font-semibold text-xs text-slate-700">Interview Mode Ready</div>
            <div className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
              Step through the algorithm to receive live interview coaching & invariants.
            </div>
          </div>
        ) : mode === "copilot" ? (
          /* Copilot Structured 3-Part Mode */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col gap-2 pb-1"
            >
              {/* Event & Step Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-50/90 text-indigo-700 border border-indigo-200/70 uppercase font-mono">
                    {currentStep?.event?.type || "STEP"}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    Line {currentStep?.line}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
              </div>

              {/* 1. What happened? */}
              <div className="p-2.5 rounded-2xl bg-sky-50/65 backdrop-blur-md border border-sky-200/70">
                <div className="flex items-center gap-1 text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-1">
                  <Info className="w-3 h-3 text-sky-600" />
                  1. What happened?
                </div>
                <div className="text-xs text-sky-950 font-medium leading-relaxed">
                  {structured.what}
                </div>
              </div>

              {/* 2. Why did it happen? */}
              <div className="p-2.5 rounded-2xl bg-indigo-50/65 backdrop-blur-md border border-indigo-200/70">
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                  <HelpCircle className="w-3 h-3 text-indigo-600" />
                  2. Why did it happen?
                </div>
                <div className="text-xs text-indigo-950 font-medium leading-relaxed">
                  {structured.why}
                </div>
              </div>

              {/* 3. Invariant / Condition */}
              <div className="p-2.5 rounded-2xl bg-emerald-50/65 backdrop-blur-md border border-emerald-200/70">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  3. Invariant Guarantee
                </div>
                <div className="text-[11px] text-emerald-950 leading-relaxed">
                  {structured.invariant}
                </div>
              </div>

              {/* Return value callout */}
              {currentStep?.returnValue !== undefined && currentStep.event.type === "RETURN" && (
                <div className="p-2 rounded-xl bg-emerald-100/75 border border-emerald-300/80 text-xs font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Returns {String(currentStep.returnValue)}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Interview Mentor Walkthrough Mode */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2 pb-2"
            >
              {/* Telemetry Chips */}
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50/85 text-amber-700 border border-amber-200/75">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {comparisonsCount} comps
                </span>
                {swapsCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/85 text-indigo-700 border border-indigo-200/75">
                    <Repeat className="w-3 h-3 text-indigo-500" />
                    {swapsCount} swaps
                  </span>
                )}
                {currentStep?.depth !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-50/85 text-violet-700 border border-violet-200/75">
                    Depth: {currentStep.depth}
                  </span>
                )}
              </div>

              {/* 1. Strategic Goal */}
              <div className="p-2.5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 ring-1 ring-slate-200/50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Strategic Intent
                </div>
                <div className="text-xs text-slate-800 font-medium leading-snug">
                  {insight.strategicGoal}
                </div>
              </div>

              {/* 2. Candidate Script with Copy button */}
              <div className="p-2.5 rounded-2xl bg-violet-50/65 backdrop-blur-md border border-violet-200/70 relative group">
                <div className="flex items-center justify-between text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1">
                  <div className="flex items-center gap-1">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-violet-600" />
                    What to say to the interviewer
                  </div>
                  <button
                    onClick={handleCopyScript}
                    className="p-1 rounded-full hover:bg-violet-100/80 text-violet-600 transition-colors cursor-pointer"
                    title="Copy talking point to clipboard"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-violet-900 font-serif italic leading-relaxed">
                  "{insight.candidateScript}"
                </div>
              </div>

              {/* 3. Invariant */}
              <div className="p-2.5 rounded-2xl bg-emerald-50/65 backdrop-blur-md border border-emerald-200/70">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Invariant Guarantee
                </div>
                <div className="text-[11px] text-emerald-900 leading-snug">
                  {insight.invariant}
                </div>
              </div>

              {/* 4. Gotcha & Trap */}
              <div className="p-2.5 rounded-2xl bg-amber-50/65 backdrop-blur-md border border-amber-200/70">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Common Candidate Trap
                </div>
                <div className="text-[11px] text-amber-900 leading-snug">
                  {insight.gotcha}
                </div>
              </div>

              {/* Return value callout if returning */}
              {currentStep?.returnValue !== undefined && currentStep.event.type === "RETURN" && (
                <div className="p-2 rounded-xl bg-emerald-100/75 border border-emerald-300/80 text-xs font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Returns {String(currentStep.returnValue)}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[10px] font-semibold text-slate-600 shrink-0">
        <span className="truncate max-w-[140px] text-indigo-700 font-mono">
          {insight.complexityContext}
        </span>
        <span className="text-[9px] text-slate-600 font-mono">
          Step {currentStepIndex + 1}/{totalSteps || 1}
        </span>
      </div>
    </div>
  );
}

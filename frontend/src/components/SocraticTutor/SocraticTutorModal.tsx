import { useState, useEffect, useRef, useCallback } from "react";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { askSocraticTutor, type SocraticTutorResponse } from "@/services/geminiApi";
import { ModalPortal } from "@/components/common/ModalPortal";
import {
  Sparkles,
  X,
  Send,
  Lightbulb,
  HelpCircle,
  Eye,
  Compass,
  Loader2,
  Cpu,
} from "lucide-react";

interface SocraticTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  overrideCode?: string;
  overrideAlgorithmId?: string;
  /** Runtime exception info. Pass a string message or a structured object; both are accepted. */
  exception?: { type?: string; message?: string; line?: number } | string | null;
}

const QUICK_PROMPTS = [
  "Why did the pointers or variables change at this step?",
  "Could an off-by-one or infinite loop happen here?",
  "Explain the active invariant at this exact line.",
];

export function SocraticTutorModal({
  isOpen,
  onClose,
  overrideCode,
  overrideAlgorithmId,
  exception,
}: SocraticTutorModalProps) {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const currentStep = useCurrentStep();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SocraticTutorResponse | null>(null);
  const [revealedTier, setRevealedTier] = useState<1 | 2 | 3>(2);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeAlgoId = overrideAlgorithmId || algorithm?.id || "custom-algorithm";

  // Reset stale response/error/query when switching algorithms or closing
  useEffect(() => {
    setResponse(null);
    setError(null);
    setQuery("");
  }, [activeAlgoId]);

  const handleConsult = useCallback(
    async (customPrompt?: string) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const reqId = ++requestIdRef.current;

      const stepPayload = currentStep || {
        line: 1,
        functionName: "main",
        event: { type: "STEP", description: "Initial code state", line: 1 },
        localVariables: {},
        callStack: [],
      };

      const resolvedCode =
        overrideCode ||
        (typeof algorithm?.sourceCode === "string"
          ? algorithm.sourceCode
          : algorithm?.sourceCode?.[algorithm.language] || "");

      setLoading(true);
      setError(null);
      setRevealedTier(2);

      try {
        const res = await askSocraticTutor({
          algorithmId: activeAlgoId,
          code: resolvedCode,
          step: stepPayload,
          userQuery: customPrompt ?? query,
          exception: typeof exception === "string" ? { message: exception } : exception,
          signal: controller.signal,
        });
        if (requestIdRef.current !== reqId) return;
        setResponse(res);
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError") ||
          requestIdRef.current !== reqId
        ) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to reach Socratic Tutor.");
      } finally {
        if (requestIdRef.current === reqId) {
          setLoading(false);
        }
      }
    },
    [activeAlgoId, algorithm, currentStep, exception, overrideCode, query]
  );

  // Consult once upon opening for the current step (or clear transient loading on close)
  const lastAutoConsultKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      requestIdRef.current += 1;
      lastAutoConsultKeyRef.current = null;
      setLoading(false);
      setError(null);
      setResponse(null);
      setQuery("");
      return;
    }

    const consultKey = `${activeAlgoId}:${currentStepIndex}:${currentStep?.line ?? 0}:${exception ?? ""}`;
    if (lastAutoConsultKeyRef.current !== consultKey && (currentStep || exception)) {
      lastAutoConsultKeyRef.current = consultKey;
      void handleConsult("Analyze the current trace state and explain what invariant holds here.");
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isOpen, activeAlgoId, currentStepIndex, currentStep, exception, handleConsult]);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Gemini Socratic Step & Bug Tutor"
      dialogClassName="w-full max-w-xl bg-white/92 backdrop-blur-2xl rounded-3xl border border-white/95 ring-1 ring-indigo-500/10 shadow-[0_24px_60px_-12px_rgba(99,102,241,0.22)] overflow-hidden flex flex-col max-h-[88vh]"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#4648D4] via-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight truncate">Gemini Socratic Step & Bug Tutor</h2>
            <p className="text-[11px] text-indigo-100 truncate">
              Trace-grounded hints from Line {currentStep?.line ?? 1} (
              {currentStep?.functionName || "main"}())
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Socratic Tutor"
          className="p-1.5 rounded-full text-indigo-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Step Context Strip */}
      {currentStep && (
        <div className="px-5 py-2.5 bg-white/65 backdrop-blur-md border-b border-slate-200/50 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-700 shrink-0">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 font-bold">
            Line {currentStep.line}
          </span>
          {Object.entries(currentStep.localVariables || {})
            .slice(0, 5)
            .map(([k, v]) => (
              <span
                key={k}
                className="px-2.5 py-0.5 rounded-full bg-white/85 border border-white/90 ring-1 ring-slate-200/60"
              >
                {k} = {JSON.stringify(v)}
              </span>
            ))}
        </div>
      )}

      {/* Body */}
      <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => {
                setQuery(q);
                void handleConsult(q);
              }}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/75 transition-colors cursor-pointer text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">
              Inspecting call stack & variable snapshot...
            </span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        ) : response ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <Compass className="w-4 h-4 shrink-0" />
                <span>Concept: {response.concept}</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/85 text-slate-600 border border-slate-200/70 flex items-center gap-1 shrink-0">
                <Cpu className="w-3 h-3" />
                {response.source === "gemini" ? "Gemini Live" : "Trace Engine"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/75 backdrop-blur-md border border-sky-200/75">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-800 mb-1">
                <Eye className="w-3.5 h-3.5" />
                Tier 1 — Snapshot Observation
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">{response.tier1Observation}</p>
            </div>

            {revealedTier >= 2 && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/75 backdrop-blur-md border border-indigo-200/75">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-800 mb-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Tier 2 — Guiding Question
                </div>
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {response.tier2GuidingQuestion}
                </p>
              </div>
            )}

            {revealedTier >= 3 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/75 backdrop-blur-md border border-emerald-200/75">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Tier 3 — Debugging & Invariant Hint
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {response.tier3ActionHint}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealedTier(3)}
                className="self-start text-xs font-semibold px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                Need a nudge? Reveal Tier 3 Hint
              </button>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-600">
            Ask a question below or pick a quick prompt to analyze this algorithm state.
          </div>
        )}
      </div>

      {/* Footer Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) void handleConsult(query);
        }}
        className="p-3.5 border-t border-slate-200/50 bg-white/70 backdrop-blur-md flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask why a variable changed or why a bug occurred..."
          className="flex-1 min-w-0 px-4 py-2 rounded-full glass-input text-xs text-slate-800 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>
    </ModalPortal>
  );
}

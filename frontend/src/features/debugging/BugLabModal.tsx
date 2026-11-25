import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, X, ArrowRight, CheckCircle2, AlertTriangle, Play, RotateCcw } from "lucide-react";
import { BUG_CATALOG, type BugExample } from "./bugCatalog";
import { useExecutionStore } from "@/engine/useExecutionController";
import { getAlgorithm } from "@/algorithms/registry";
import { ModalPortal } from "@/components/common/ModalPortal";
import { buildArrayVisualizationState } from "@/utils/arrayVisualizerHelper";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";

interface BugLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function buildBugAlgorithm(bug: BugExample): VisualizableAlgorithm<{ array: number[]; target: number }> {
  return {
    id: `bug-${bug.id}`,
    name: bug.title,
    category: bug.algorithmName === "Binary Search" ? "Arrays" : "Two Pointer",
    difficulty: "Easy",
    description: bug.description,
    sourceCode: { typescript: bug.buggyCode },
    language: "typescript",
    defaultInput: bug.knownInput,
    parseInput(raw: unknown) {
      if (typeof raw === "string") return JSON.parse(raw);
      return raw as { array: number[]; target: number };
    },
    validateInput(input) {
      if (!input || !Array.isArray(input.array) || typeof input.target !== "number") {
        return { valid: false, error: "Invalid bug demo input" };
      }
      return { valid: true };
    },
    initialVisualizationState(input) {
      const arr = Array.isArray(input?.array) ? input.array : [];
      return buildArrayVisualizationState(arr, {}, { shortLabels: true });
    },
    execute() {
      return bug.executeBuggy(bug.knownInput);
    },
    complexity: {
      time: "O(log n)",
      space: "O(1)",
    },
    visualizationType: "array",
    tags: ["bug-lab", bug.bugCategory.toLowerCase()],
  };
}

export function BugLabModal({ isOpen, onClose }: BugLabModalProps) {
  const navigate = useNavigate();
  const [selectedBugId, setSelectedBugId] = useState<string>(BUG_CATALOG[0].id);
  const [codeTab, setCodeTab] = useState<"buggy" | "fixed">("buggy");

  const selectedBug = BUG_CATALOG.find((b) => b.id === selectedBugId) || BUG_CATALOG[0];

  const handleLoadBuggyExecution = (bug: BugExample) => {
    try {
      const store = useExecutionStore.getState();
      store.pause();
      const bugAlg = buildBugAlgorithm(bug);
      store.loadAlgorithm(bugAlg);
      store.runAlgorithm();
      onClose();
    } catch (err) {
      console.error("Failed to load buggy execution:", err);
    }
  };

  const handleRestoreNormalAlgorithm = (algoName: string) => {
    const id = algoName === "Binary Search" ? "binary-search" : "two-sum-ii";
    const alg = getAlgorithm(id);
    if (alg) {
      useExecutionStore.getState().loadAlgorithm(alg);
      navigate(`/visualizer/${id}`);
    }
    onClose();
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="AlgoLens Bug Lab"
      dialogClassName="w-full max-w-4xl bg-white/92 backdrop-blur-2xl rounded-3xl shadow-[0_24px_60px_-12px_rgba(99,102,241,0.22)] border border-white/95 ring-1 ring-indigo-500/10 overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-rose-50/80 via-amber-50/70 to-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <Bug className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
              <span>AlgoLens Bug Lab</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100/90 text-rose-800 border border-rose-200/80">
                Deliberate Mistakes
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 truncate sm:whitespace-normal">
              Inspect common student mistakes, boundary bugs, and trace their failure in real time.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Bug Lab"
          className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body: 2-column layout (scrollable on mobile, split pane on md+) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
        {/* Left list (Cols 1-4) */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200/60 bg-slate-50/55 p-3 flex flex-col gap-2 md:overflow-y-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 px-1">
            Select Deliberate Bug
          </span>
          {BUG_CATALOG.map((bug) => {
            const isSelected = bug.id === selectedBugId;
            return (
              <button
                type="button"
                key={bug.id}
                onClick={() => setSelectedBugId(bug.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-white border-rose-300 shadow-sm ring-1 ring-rose-200"
                    : "bg-white/70 border-white/90 hover:bg-white/95 ring-1 ring-slate-200/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-mono whitespace-nowrap">
                    {bug.algorithmName}
                  </span>
                  <span className="text-[9px] font-semibold text-rose-700 whitespace-nowrap">
                    {bug.bugCategory}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-snug">
                  {bug.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right details (Cols 5-12) */}
        <div className="md:col-span-8 p-4 sm:p-5 flex flex-col gap-3.5 md:overflow-y-auto bg-white/50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 uppercase font-mono">
                {selectedBug.bugCategory}
              </span>
              <span className="text-xs font-medium text-slate-600 font-mono">
                Target: {selectedBug.algorithmName}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{selectedBug.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedBug.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-white/75 border border-white/90 ring-1 ring-slate-200/60 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                Test Input
              </span>
              <code className="text-xs font-mono text-indigo-700 font-semibold whitespace-pre-wrap break-words">
                {selectedBug.knownInput}
              </code>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/75 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                Observed Bug
              </span>
              <span className="text-xs font-semibold text-amber-950">
                {selectedBug.actualBuggyBehavior}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/75 flex items-start gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-900 text-[11px]">Expected Behavior:</div>
              <div className="text-emerald-800">{selectedBug.expectedBehavior}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/75 border border-white/90 ring-1 ring-slate-200/60 flex flex-col gap-1.5 text-xs">
            <div>
              <span className="font-bold text-slate-800">Root Cause: </span>
              <span className="text-slate-700 leading-relaxed">{selectedBug.rootCause}</span>
            </div>
            <div>
              <span className="font-bold text-emerald-700">How to Fix: </span>
              <span className="text-slate-700 leading-relaxed">{selectedBug.fixExplanation}</span>
            </div>
          </div>

          {/* Code comparison Tabs */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-full glass-capsule-track text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCodeTab("buggy")}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    codeTab === "buggy"
                      ? "bg-rose-50 text-rose-800 font-bold border border-rose-200 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Buggy Code
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab("fixed")}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    codeTab === "fixed"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Corrected Code
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">TypeScript</span>
            </div>

            <pre className="p-3.5 rounded-2xl bg-slate-900/95 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
              <code>{codeTab === "buggy" ? selectedBug.buggyCode : selectedBug.fixedCode}</code>
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => handleRestoreNormalAlgorithm(selectedBug.algorithmName)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white transition-colors flex items-center gap-1.5 border border-white/90 ring-1 ring-slate-200/70 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Working Code</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadBuggyExecution(selectedBug)}
              className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Step Through Bug in Visualizer</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

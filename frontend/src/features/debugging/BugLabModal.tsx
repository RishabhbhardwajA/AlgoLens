import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, X, ArrowRight, CheckCircle2, AlertTriangle, Play, RotateCcw, Code } from "lucide-react";
import { BUG_CATALOG, type BugExample } from "./bugCatalog";
import { useExecutionStore } from "@/engine/useExecutionController";
import { getAlgorithm } from "@/algorithms/registry";

interface BugLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugLabModal({ isOpen, onClose }: BugLabModalProps) {
  const [selectedBugId, setSelectedBugId] = useState<string>(BUG_CATALOG[0].id);
  const [codeTab, setCodeTab] = useState<"buggy" | "fixed">("buggy");

  const selectedBug = BUG_CATALOG.find((b) => b.id === selectedBugId) || BUG_CATALOG[0];

  const handleLoadBuggyExecution = (bug: BugExample) => {
    try {
      const steps = bug.executeBuggy(bug.knownInput);
      useExecutionStore.setState({
        steps,
        currentStepIndex: 0,
        isPlaying: false,
        hasStarted: true,
        rawInput: bug.knownInput,
        error: null,
      });
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
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-rose-50 via-amber-50 to-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-200 flex items-center justify-center text-rose-600">
                <Bug className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>AlgoLens Bug Lab</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Deliberate Mistakes
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Inspect common student mistakes, boundary bugs, and trace their failure in real time.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body: 2-column layout */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left list (Cols 1-4) */}
            <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/70 p-3 flex flex-col gap-2 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Select Deliberate Bug
              </span>
              {BUG_CATALOG.map((bug) => {
                const isSelected = bug.id === selectedBugId;
                return (
                  <button
                    key={bug.id}
                    onClick={() => setSelectedBugId(bug.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? "bg-white border-rose-300 shadow-sm ring-1 ring-rose-200"
                        : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                        {bug.algorithmName}
                      </span>
                      <span className="text-[9px] font-semibold text-rose-600">
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
            <div className="md:col-span-8 p-4 flex flex-col gap-3.5 overflow-y-auto bg-white">
              {/* Title & Category */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase font-mono">
                    {selectedBug.bugCategory}
                  </span>
                  <span className="text-xs font-medium text-slate-400 font-mono">
                    Target: {selectedBug.algorithmName}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{selectedBug.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedBug.description}</p>
              </div>

              {/* Known Input & Contrast Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Test Input
                  </span>
                  <code className="text-xs font-mono text-indigo-700 font-semibold break-all">
                    {selectedBug.knownInput}
                  </code>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Observed Bug
                  </span>
                  <span className="text-xs font-semibold text-amber-950">
                    {selectedBug.actualBuggyBehavior}
                  </span>
                </div>
              </div>

              {/* Expected vs Actual explanation */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-900 text-[11px]">Expected Behavior:</div>
                  <div className="text-emerald-800">{selectedBug.expectedBehavior}</div>
                </div>
              </div>

              {/* Root Cause & Fix Explanation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5 text-xs">
                <div>
                  <span className="font-bold text-slate-800">Root Cause: </span>
                  <span className="text-slate-600 leading-relaxed">{selectedBug.rootCause}</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-700">How to Fix: </span>
                  <span className="text-slate-600 leading-relaxed">{selectedBug.fixExplanation}</span>
                </div>
              </div>

              {/* Code comparison Tabs */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-[10px] font-semibold border border-slate-200">
                    <button
                      onClick={() => setCodeTab("buggy")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        codeTab === "buggy"
                          ? "bg-rose-50 text-rose-800 font-bold border border-rose-200 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Buggy Code
                    </button>
                    <button
                      onClick={() => setCodeTab("fixed")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        codeTab === "fixed"
                          ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Corrected Code
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">TypeScript</span>
                </div>

                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{codeTab === "buggy" ? selectedBug.buggyCode : selectedBug.fixedCode}</code>
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button
                  onClick={() => handleRestoreNormalAlgorithm(selectedBug.algorithmName)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Working Code</span>
                </button>

                <button
                  onClick={() => handleLoadBuggyExecution(selectedBug)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Step Through Bug in Visualizer</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

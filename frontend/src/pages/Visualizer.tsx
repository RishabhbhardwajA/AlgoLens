import { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExecutionStore } from "@/engine/useExecutionController";
import { getAlgorithm } from "@/algorithms/registry";
import { CodeEditorPanel } from "@/components/CodeEditor/CodeEditorPanel";
import { CallStackPanel } from "@/components/CallStack/CallStackPanel";
import { VariablesPanel } from "@/components/VariablesPanel/VariablesPanel";
import { ExplanationPanel } from "@/components/ExplanationPanel/ExplanationPanel";
import { ExecutionControls } from "@/components/ExecutionControls/ExecutionControls";
import { InputEditor } from "@/components/InputEditor/InputEditor";
import { VisualizerRouter } from "@/visualizers/VisualizerRouter";
import { Layers, ChevronRight, Activity, Trophy, Bookmark, Bug } from "lucide-react";
import { useState } from "react";
import { ComplexityMatrix } from "@/components/ComplexityMatrix/ComplexityMatrix";
import { Benchmarks } from "@/components/Benchmarks/Benchmarks";
import { ChallengeModal } from "@/components/ChallengeMode/ChallengeModal";
import { BugLabModal } from "@/features/debugging/BugLabModal";
import { useChallengeStore } from "@/engine/useChallengeStore";
import { generateChallenge } from "@/utils/challengeGenerator";
import { useAuthStore } from "@/store/useAuthStore";

export default function VisualizerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadAlgorithm, algorithm } = useExecutionStore();
  const [activeTab, setActiveTab] = useState<"ast" | "complexity" | "benchmarks">("ast");
  const [isBugLabOpen, setIsBugLabOpen] = useState(false);

  const steps = useExecutionStore((s) => s.steps);
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const isPlaying = useExecutionStore((s) => s.isPlaying);
  const pause = useExecutionStore((s) => s.pause);

  const {
    isChallengeMode,
    toggleChallengeMode,
    activeChallenge,
    setActiveChallenge,
    skippedStepIndices,
    streak,
    score,
  } = useChallengeStore();

  const { isBookmarked, toggleBookmark, recordProgress, isAuthenticated } = useAuthStore();
  const bookmarked = id ? isBookmarked(id) : false;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetId = id || searchParams.get("algo") || "binary-search";
    const alg = getAlgorithm(targetId);
    if (!alg) {
      navigate("/explore");
      return;
    }
    loadAlgorithm(alg);
    if (isAuthenticated) {
      recordProgress(targetId, { steps_explored: 1 });
    }
  }, [id, loadAlgorithm, navigate, isAuthenticated, recordProgress]);

  // Challenge Mode Watcher: Pauses on decision points and prompts user prediction
  useEffect(() => {
    if (!isChallengeMode) return;
    if (
      !activeChallenge &&
      steps.length > 0 &&
      currentStepIndex < steps.length - 1 &&
      !skippedStepIndices.includes(currentStepIndex)
    ) {
      const q = generateChallenge(steps, currentStepIndex);
      if (q) {
        if (isPlaying) {
          pause();
        }
        setActiveChallenge(q);
      }
    }
  }, [
    isChallengeMode,
    currentStepIndex,
    steps,
    isPlaying,
    pause,
    activeChallenge,
    setActiveChallenge,
    skippedStepIndices,
  ]);

  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const store = useExecutionStore.getState();
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowRight":
        case "l":
          e.preventDefault();
          store.next();
          break;
        case "ArrowLeft":
        case "h":
          e.preventDefault();
          store.prev();
          break;
        case " ":
          e.preventDefault();
          store.isPlaying ? store.pause() : store.play();
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            store.reset();
          }
          break;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!algorithm) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-slate-500">
        Loading algorithm...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-transparent overflow-hidden relative font-sans">
      {/* Background Blooms */}
      <div className="pointer-events-none absolute top-10 left-1/3 w-96 h-96 rounded-full blur-3xl -z-10" style={{ background: "rgba(99, 102, 241, 0.05)" }} />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl -z-10" style={{ background: "rgba(56, 189, 248, 0.05)" }} />

      {/* Top Header Breadcrumb HUD */}
      <div className="flex items-center justify-between px-6 py-2 border-b z-10 shrink-0 h-12"
        style={{ background: "rgba(255, 255, 255, 0.82)", backdropFilter: "blur(16px)", borderColor: "rgba(226, 232, 240, 0.7)" }}>
        <div className="flex items-center gap-2">
          <div 
            onClick={() => navigate("/explore")}
            className="flex items-center px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors"
            style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#64748B" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.borderColor = "#C7D2FE"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            <span>{algorithm.category}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "#0F172A" }}>{algorithm.name}</span>
          
          <div className="ml-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold"
            style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", color: "#6366F1" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            <span>O({algorithm.complexity.time}) Time</span>
            <span style={{ color: "#CBD5E1" }}>|</span>
            <span style={{ color: "#38BDF8" }}>O({algorithm.complexity.space}) Space</span>
          </div>
        </div>
        
        {/* Right HUD Controls: Bookmark, Quiz Toggle & Tabs */}
        <div className="flex items-center gap-2.5">
          {/* Bookmark Button */}
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate("/login");
                return;
              }
              if (id) toggleBookmark(id);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              bookmarked
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs"
                : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 border-slate-200"
            }`}
            title={bookmarked ? "Bookmarked (Click to remove)" : "Save to my bookmarks"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-indigo-600 text-indigo-600" : "text-slate-400"}`} />
            <span className="hidden sm:inline">{bookmarked ? "Saved" : "Bookmark"}</span>
          </button>

          {/* Challenge / Quiz Mode Toggle */}
          <button
            onClick={toggleChallengeMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              isChallengeMode
                ? "bg-amber-50 text-amber-800 border-amber-300 shadow-xs"
                : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 border-slate-200"
            }`}
            title="Toggle Interactive Predict Next Step Quiz Mode"
          >
            <Trophy className={`w-3.5 h-3.5 ${isChallengeMode ? "text-amber-500" : "text-slate-400"}`} />
            <span>{isChallengeMode ? "Quiz Active" : "Quiz Mode"}</span>
            {isChallengeMode && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-amber-700 font-bold ml-0.5">
                {streak > 0 && <span>🔥{streak}</span>}
                <span className="text-indigo-600">{score}XP</span>
              </span>
            )}
          </button>

          {/* Bug Lab Deliberate Mistakes Button */}
          <button
            onClick={() => setIsBugLabOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 shadow-xs cursor-pointer"
            title="Inspect common student mistakes & boundary bugs"
          >
            <Bug className="w-3.5 h-3.5 text-rose-600" />
            <span>Bug Lab</span>
          </button>

          {/* Navigation Tabs */}
          <div className="hidden lg:flex items-center gap-5 text-[13px] font-semibold" style={{ color: "#64748B" }}>
            <span 
              className="cursor-pointer py-1 transition-colors"
              style={activeTab === "ast" ? { color: "#6366F1", borderBottom: "2px solid #6366F1" } : {}}
              onClick={() => setActiveTab("ast")}
              onMouseEnter={e => { if (activeTab !== "ast") e.currentTarget.style.color = "#0F172A"; }}
              onMouseLeave={e => { if (activeTab !== "ast") e.currentTarget.style.color = "#64748B"; }}
            >
              AST Visualizer
            </span>
            <span 
              className="cursor-pointer py-1 transition-colors"
              style={activeTab === "complexity" ? { color: "#6366F1", borderBottom: "2px solid #6366F1" } : {}}
              onClick={() => setActiveTab("complexity")}
              onMouseEnter={e => { if (activeTab !== "complexity") e.currentTarget.style.color = "#0F172A"; }}
              onMouseLeave={e => { if (activeTab !== "complexity") e.currentTarget.style.color = "#64748B"; }}
            >
              Complexity Matrix
            </span>
            <span 
              className="cursor-pointer py-1 transition-colors"
              style={activeTab === "benchmarks" ? { color: "#6366F1", borderBottom: "2px solid #6366F1" } : {}}
              onClick={() => setActiveTab("benchmarks")}
              onMouseEnter={e => { if (activeTab !== "benchmarks") e.currentTarget.style.color = "#0F172A"; }}
              onMouseLeave={e => { if (activeTab !== "benchmarks") e.currentTarget.style.color = "#64748B"; }}
            >
              Benchmarks
            </span>
          </div>
        </div>
      </div>

      {activeTab === "complexity" && <ComplexityMatrix algorithm={algorithm} />}
      {activeTab === "benchmarks" && <Benchmarks algorithm={algorithm} />}

      {/* Main 12-Column Spatial Grid Layout */}
      <main 
        className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-hidden relative z-10 pb-16"
        style={{ display: activeTab === "ast" ? "grid" : "none" }}
      >
        
        {/* Left Column: Code Editor (Cols 1-4) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0 panel flex flex-col">
            <CodeEditorPanel />
          </div>
          <div className="h-36 panel shrink-0 flex flex-col">
            <InputEditor />
          </div>
        </section>

        {/* Center Column: Canvas (Cols 5-9) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0 panel relative">
          <div className="h-9 px-3.5 border-b flex items-center justify-between z-20 shrink-0 rounded-t-[0.75rem]"
            style={{ background: "rgba(255, 255, 255, 0.9)", borderColor: "rgba(226, 232, 240, 0.7)" }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: "#6366F1" }} />
              <span className="text-xs font-semibold" style={{ color: "#6366F1" }}>AST Graph Canvas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                style={{ background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}>Interactive</span>
            </div>
          </div>
          <div className="flex-1 relative rounded-b-[0.75rem] overflow-hidden" style={{ background: "#FFFFFF" }}>
            <VisualizerRouter />
            {/* Interactive Challenge Modal overlay */}
            <ChallengeModal />
            {/* Deliberate Mistakes Bug Lab Modal */}
            <BugLabModal isOpen={isBugLabOpen} onClose={() => setIsBugLabOpen(false)} />
          </div>
          <ExecutionControls />
        </section>

        {/* Right Stack: State & Telemetry (Cols 10-12) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0">
          {/* Top: Call Stack */}
          <div className="h-[31%] panel flex flex-col overflow-hidden">
            <CallStackPanel />
          </div>
          
          {/* Middle: Variables */}
          <div className="h-[35%] panel flex flex-col overflow-hidden">
            <VariablesPanel />
          </div>
          
          {/* Bottom: Explanation Copilot & Interview Mentor */}
          <div className="flex-1 panel-elevated relative overflow-hidden flex flex-col">
            <ExplanationPanel />
          </div>
        </aside>

      </main>

    </div>
  );
}

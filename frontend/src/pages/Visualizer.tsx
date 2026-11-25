import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useExecutionStore } from "@/engine/useExecutionController";
import { getAlgorithm } from "@/algorithms/registry";
import { CodeEditorPanel } from "@/components/CodeEditor/CodeEditorPanel";
import { CallStackPanel } from "@/components/CallStack/CallStackPanel";
import { VariablesPanel } from "@/components/VariablesPanel/VariablesPanel";
import { ExplanationPanel } from "@/components/ExplanationPanel/ExplanationPanel";
import { ExecutionControls } from "@/components/ExecutionControls/ExecutionControls";
import { InputEditor } from "@/components/InputEditor/InputEditor";
import { VisualizerRouter } from "@/visualizers/VisualizerRouter";
import { Layers, ChevronRight, Activity, Trophy, Bookmark, Bug, Sparkles, Pin } from "lucide-react";
import { ComplexityMatrix } from "@/components/ComplexityMatrix/ComplexityMatrix";
import { Benchmarks } from "@/components/Benchmarks/Benchmarks";
import { ChallengeModal } from "@/components/ChallengeMode/ChallengeModal";
import { BugLabModal } from "@/features/debugging/BugLabModal";
import { SocraticTutorModal } from "@/components/SocraticTutor/SocraticTutorModal";
import { useChallengeStore } from "@/engine/useChallengeStore";
import { generateChallenge } from "@/utils/challengeGenerator";
import { useAuthStore } from "@/store/useAuthStore";
import { ALGORITHM_META } from "@/data/algorithmMeta";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildAlgorithmJsonLd } from "@/utils/seoSchemas";
import { formatBigO } from "@/utils/visualHelpers";

export default function VisualizerPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { loadAlgorithm, algorithm } = useExecutionStore();
  const [activeTab, setActiveTab] = useState<"ast" | "complexity" | "benchmarks">("ast");
  const [isBugLabOpen, setIsBugLabOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [stepSavedToast, setStepSavedToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const {
    isBookmarked,
    toggleBookmark,
    recordProgress,
    addTraceBookmark,
    requireAuthAction,
    isAuthenticated,
  } = useAuthStore();

  const searchParams = new URLSearchParams(location.search);
  const routeTargetId = id || searchParams.get("algo") || "binary-search";
  const resolvedBookmarkId = algorithm?.id && !algorithm.id.startsWith("bug-") ? algorithm.id : routeTargetId;
  const bookmarked = resolvedBookmarkId ? isBookmarked(resolvedBookmarkId) : false;

  const metaLookupId = algorithm?.id && !algorithm.id.startsWith("bug-") ? algorithm.id : routeTargetId;
  const matchedMeta = ALGORITHM_META.find((m) => m.id === metaLookupId);

  useDocumentMeta({
    title: matchedMeta
      ? `${matchedMeta.name} Visualizer (${matchedMeta.timeComplexity}) | AlgoLens`
      : algorithm
        ? `${algorithm.name} Visualizer | AlgoLens`
        : "Algorithm Visualizer | AlgoLens",
    description: matchedMeta
      ? `${matchedMeta.description} Step through ${matchedMeta.name} interactively with ${matchedMeta.timeComplexity} time and ${matchedMeta.spaceComplexity} space complexity tracking.`
      : "Interactive step-by-step DSA visualization and live execution debugger.",
    keywords: matchedMeta
      ? [matchedMeta.name, matchedMeta.category, ...matchedMeta.tags, "DSA visualizer", "AlgoLens"]
      : ["DSA visualizer", "AlgoLens"],
    canonicalPath: matchedMeta ? `/visualizer/${matchedMeta.id}` : `/visualizer/${routeTargetId}`,
    ogType: matchedMeta ? "article" : "website",
    ogImage: matchedMeta ? `/og/${matchedMeta.id}.png` : "/og-image.png",
    jsonLd:
      matchedMeta && typeof window !== "undefined"
        ? buildAlgorithmJsonLd(window.location.origin, matchedMeta)
        : [],
  });

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      useExecutionStore.getState().pause();
    };
  }, []);

  const handleBookmarkCurrentStep = () => {
    requireAuthAction("Bookmark execution step snapshot", async () => {
      const activeStep = steps[currentStepIndex];
      if (!activeStep || !algorithm) return;
      const saved = await addTraceBookmark({
        algorithmId: algorithm.id,
        stepIndex: currentStepIndex,
        stepSnapshot: {
          line: activeStep.line,
          functionName: activeStep.functionName,
          variables: activeStep.localVariables,
          explanation: activeStep.explanation,
        },
        note: `Step ${currentStepIndex + 1} (Line ${activeStep.line}): ${activeStep.explanation.slice(0, 120)}`,
      });
      if (saved) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setStepSavedToast(true);
        toastTimerRef.current = setTimeout(() => setStepSavedToast(false), 2000);
      }
    });
  };

  useEffect(() => {
    const alg = getAlgorithm(routeTargetId);
    if (!alg) {
      navigate("/explore");
      return;
    }
    loadAlgorithm(alg);
  }, [routeTargetId, loadAlgorithm, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!getAlgorithm(routeTargetId)) return;
    recordProgress(routeTargetId, { steps_explored: 1 });
  }, [routeTargetId, isAuthenticated, recordProgress]);

  // Challenge Mode Watcher
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

  // Keyboard controls (safely disabled inside modals, inactive tabs, inputs, or focused buttons)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeTab !== "ast") return;
      if (isBugLabOpen || isTutorOpen) return;
      if (useChallengeStore.getState().activeChallenge) return;
      if (useAuthStore.getState().authModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLTextAreaElement ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable ||
          target.closest('[role="dialog"], .monaco-find-widget'))
      ) {
        return;
      }

      if (e.key === " " && target?.closest('button, a, [role="button"]')) {
        return;
      }

      const store = useExecutionStore.getState();

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
          if (!store.hasStarted) {
            store.runAlgorithm();
          } else {
            store.isPlaying ? store.pause() : store.play();
          }
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            store.reset();
          }
          break;
      }
    },
    [activeTab, isBugLabOpen, isTutorOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!algorithm) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-slate-600">
        Loading algorithm...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] bg-transparent overflow-y-auto lg:overflow-hidden relative font-sans">
      {/* Background Blooms */}
      <div
        className="pointer-events-none absolute top-10 left-1/3 w-96 h-96 rounded-full blur-3xl -z-10"
        style={{ background: "rgba(99, 102, 241, 0.05)" }}
      />
      <div
        className="pointer-events-none absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl -z-10"
        style={{ background: "rgba(56, 189, 248, 0.05)" }}
      />

      {/* Top Header Breadcrumb HUD */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b z-10 shrink-0 min-h-12"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(20px) saturate(165%)",
          WebkitBackdropFilter: "blur(20px) saturate(165%)",
          borderColor: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 1px 0 rgba(99, 102, 241, 0.06)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/explore?category=${encodeURIComponent(algorithm.category)}`)}
            className="flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all backdrop-blur-md shadow-xs text-slate-700 hover:text-indigo-700 bg-white/80 border border-white/95 ring-1 ring-slate-200/70 hover:ring-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            <span>{algorithm.category}</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <h1 className="text-sm font-semibold tracking-tight text-slate-900 truncate max-w-[190px] sm:max-w-none">
            {algorithm.name}
          </h1>

          <div
            className="hidden sm:flex ml-2 items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold backdrop-blur-md"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.22)",
              color: "#4338CA",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>{formatBigO(algorithm.complexity.time)} Time</span>
            <span className="text-slate-400">|</span>
            <span style={{ color: "#0369A1" }}>{formatBigO(algorithm.complexity.space)} Space</span>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 max-w-full">
          <button
            type="button"
            onClick={() => {
              requireAuthAction("Save algorithm to your bookmarks", () => {
                if (resolvedBookmarkId) toggleBookmark(resolvedBookmarkId);
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border backdrop-blur-md cursor-pointer ${
              bookmarked
                ? "bg-indigo-50/90 text-indigo-700 border-indigo-200/80 shadow-xs"
                : "bg-white/75 hover:bg-white text-slate-700 border-white/90 ring-1 ring-slate-200/60"
            }`}
            title={bookmarked ? "Bookmarked (Click to remove)" : "Save to my bookmarks"}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${bookmarked ? "fill-indigo-600 text-indigo-600" : "text-slate-500"}`}
            />
            <span className="hidden sm:inline">{bookmarked ? "Saved" : "Bookmark"}</span>
          </button>

          <button
            type="button"
            onClick={toggleChallengeMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border backdrop-blur-md cursor-pointer ${
              isChallengeMode
                ? "bg-amber-50/90 text-amber-800 border-amber-300/80 shadow-xs"
                : "bg-white/75 hover:bg-white text-slate-700 border-white/90 ring-1 ring-slate-200/60"
            }`}
            title="Toggle Interactive Predict Next Step Quiz Mode"
          >
            <Trophy className={`w-3.5 h-3.5 ${isChallengeMode ? "text-amber-600" : "text-slate-500"}`} />
            <span>{isChallengeMode ? "Quiz Active" : "Quiz Mode"}</span>
            {isChallengeMode && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-amber-800 font-bold ml-0.5">
                {streak > 0 && <span>🔥{streak}</span>}
                <span className="text-indigo-700">{score}XP</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsBugLabOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border backdrop-blur-md bg-rose-50/85 hover:bg-rose-100/90 text-rose-800 border-rose-200/80 shadow-xs cursor-pointer"
            title="Inspect common student mistakes & boundary bugs"
          >
            <Bug className="w-3.5 h-3.5 text-rose-600" />
            <span>Bug Lab</span>
          </button>

          <button
            type="button"
            onClick={() =>
              requireAuthAction("Ask Gemini Socratic Step & Bug Tutor", () => {
                setIsTutorOpen(true);
              })
            }
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border backdrop-blur-md bg-violet-50/85 hover:bg-violet-100/90 text-violet-800 border-violet-200/80 shadow-xs cursor-pointer"
            title="Ask Gemini Socratic Tutor about the current execution step"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="hidden sm:inline">Tutor</span>
          </button>

          {steps.length > 0 && currentStepIndex >= 0 && (
            <button
              type="button"
              onClick={handleBookmarkCurrentStep}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all border backdrop-blur-md cursor-pointer ${stepSavedToast
                ? "bg-emerald-50/90 text-emerald-700 border-emerald-300/80"
                : "bg-white/75 hover:bg-white text-slate-700 border-white/90 ring-1 ring-slate-200/60"
                }`}
              title="Bookmark this execution step snapshot to your profile"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{stepSavedToast ? "Pinned!" : "Pin Step"}</span>
            </button>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 rounded-full glass-capsule-track text-xs font-semibold max-w-full overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveTab("ast")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ast"
                  ? "glass-capsule-active"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              AST Visualizer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("complexity")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "complexity"
                  ? "glass-capsule-active"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Complexity Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("benchmarks")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "benchmarks"
                  ? "glass-capsule-active"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Benchmarks
            </button>
          </div>
        </div>
      </div>

      {activeTab === "complexity" && <ComplexityMatrix algorithm={algorithm} />}
      {activeTab === "benchmarks" && <Benchmarks algorithm={algorithm} />}

      {/* Main 12-Column Spatial Grid Layout */}
      <main
        className="flex-1 p-3 grid grid-cols-12 gap-3 lg:overflow-hidden overflow-visible relative z-10 pb-16"
        style={{ display: activeTab === "ast" ? "grid" : "none" }}
      >
        {/* Left Column: Code Editor */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[280px] lg:min-h-0 panel rounded-3xl flex flex-col overflow-hidden">
            <CodeEditorPanel />
          </div>
          <div className="min-h-36 panel rounded-3xl shrink-0 flex flex-col">
            <InputEditor />
          </div>
        </section>

        {/* Center Column: Canvas */}
        <section className="col-span-12 lg:col-span-5 flex flex-col min-h-[420px] lg:min-h-0 panel rounded-3xl relative overflow-hidden">
          <div
            className="h-10 px-4 border-b flex items-center justify-between z-20 shrink-0 rounded-t-3xl"
            style={{
              background: "rgba(255, 255, 255, 0.56)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(226, 232, 240, 0.55)",
            }}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-700" />
              <span className="text-xs font-semibold text-indigo-700">AST Graph Canvas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-white/85 text-slate-600 border border-slate-200/80">
                Interactive
              </span>
            </div>
          </div>
          <div className="flex-1 relative rounded-b-3xl overflow-hidden bg-white/50">
            <VisualizerRouter />
          </div>
          <ExecutionControls />
        </section>

        {/* Right Stack: State & Telemetry */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0">
          <div className="min-h-[180px] lg:min-h-0 lg:h-[31%] panel rounded-3xl flex flex-col overflow-hidden">
            <CallStackPanel />
          </div>
          <div className="min-h-[190px] lg:min-h-0 lg:h-[35%] panel rounded-3xl flex flex-col overflow-hidden">
            <VariablesPanel />
          </div>
          <div className="min-h-[220px] lg:min-h-0 flex-1 panel-elevated rounded-3xl relative overflow-hidden flex flex-col">
            <ExplanationPanel />
          </div>
        </aside>
      </main>

      {/* Modals are portaled to document.body above navbar, right panels, and ExecutionControls */}
      <ChallengeModal />
      <BugLabModal isOpen={isBugLabOpen} onClose={() => setIsBugLabOpen(false)} />
      <SocraticTutorModal isOpen={isTutorOpen} onClose={() => setIsTutorOpen(false)} />
    </div>
  );
}

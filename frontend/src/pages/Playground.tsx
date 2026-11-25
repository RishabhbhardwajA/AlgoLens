import { useState, useEffect, useRef } from "react";
import { runCustomAlgorithmAsync, type CustomRunResult } from "@/engine/customCodeRunner";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { ArrayVisualizer } from "@/visualizers/ArrayVisualizer/ArrayVisualizer";
import { ExecutionControls } from "@/components/ExecutionControls/ExecutionControls";
import { VariablesPanel } from "@/components/VariablesPanel/VariablesPanel";
import { CallStackPanel } from "@/components/CallStack/CallStackPanel";
import { useAuthStore } from "@/store/useAuthStore";
import {
  runCode,
  traceCode,
  fetchCapabilities,
} from "@/services/executionApi";
import { convertTraceToExecutionSteps } from "@/utils/traceAdapter";
import type {
  ExecutionResult,
  LanguageCapability,
  TraceResult,
} from "@/types/multiLanguage";
import { MULTI_LANG_PRESETS } from "@/features/code-playground/presets";
import { SocraticTutorModal } from "@/components/SocraticTutor/SocraticTutorModal";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildToolJsonLd } from "@/utils/seoSchemas";
import {
  Code2,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Terminal,
  FileCode,
  Layers,
  Check,
  Award,
  Save,
  Cpu,
  Variable,
  Flame,
  Clock,
  HardDrive,
} from "lucide-react";

export default function Playground() {
  useDocumentMeta({
    title: "Multi-Language Sandbox & Java JDI Debugger | AlgoLens",
    description:
      "Execute Java, Python, C++, and JavaScript code online or step through live OpenJDK JDI traces with stack frames and variable visualization.",
    canonicalPath: "/playground",
    ogImage: "/og/playground.png",
    jsonLd: buildToolJsonLd(
      typeof window !== "undefined" ? window.location.origin : "",
      "/playground",
      "AlgoLens Multi-Language Sandbox & Java JDI Debugger",
      "Compile and step through Java programs with real OpenJDK JDI debugger events."
    ),
  });

  const { saveSnippet, requireAuthAction } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Language & Preset State
  const [selectedLanguage, setSelectedLanguage] = useState<string>("java");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("java_binarySearch");
  const [capabilities, setCapabilities] = useState<LanguageCapability[]>([]);

  // Code & Input
  const [code, setCode] = useState<string>(MULTI_LANG_PRESETS.java.java_binarySearch.code);
  const [rawArrayInput, setRawArrayInput] = useState<string>(MULTI_LANG_PRESETS.java.java_binarySearch.array);
  const [inputError, setInputError] = useState<string | null>(null);

  // Execution & Trace State
  const [isRunning, setIsRunning] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "terminal">("code");
  const [activeRightTab, setActiveRightTab] = useState<"visualizer" | "panels">("visualizer");
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  const { loadAlgorithm } = useExecutionStore();
  const currentStep = useCurrentStep();
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const totalSteps = useExecutionStore((s) => s.steps.length);
  const isFinalStep = totalSteps > 0 && currentStepIndex >= totalSteps - 1;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRequestTokenRef = useRef(0);

  // Load capabilities on mount
  useEffect(() => {
    fetchCapabilities().then((caps) => {
      setCapabilities(caps);
    });
  }, []);

  // When language changes, update presets and invalidate pending async requests
  const handleLanguageChange = (newLang: string) => {
    activeRequestTokenRef.current += 1;
    setIsRunning(false);
    setIsTracing(false);
    setSelectedLanguage(newLang);
    const presets = MULTI_LANG_PRESETS[newLang];
    if (presets) {
      const firstKey = Object.keys(presets)[0];
      setSelectedPresetKey(firstKey);
      setCode(presets[firstKey].code);
      setRawArrayInput(presets[firstKey].array);
    }
    setExecutionResult(null);
    setTraceResult(null);
  };

  const handleSelectPreset = (key: string) => {
    activeRequestTokenRef.current += 1;
    setIsRunning(false);
    setIsTracing(false);
    setSelectedPresetKey(key);
    const preset = MULTI_LANG_PRESETS[selectedLanguage]?.[key];
    if (preset) {
      setCode(preset.code);
      setRawArrayInput(preset.array);
      setInputError(null);
    }
  };

  const parseArrayInput = (input: string): number[] => {
    const trimmed = input.trim();
    const sanitized =
      trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;

    if (!sanitized.trim()) {
      return [1, 2, 3];
    }

    const parts = sanitized.split(",").map((s) => s.trim());
    const nums: number[] = [];

    for (const part of parts) {
      if (!part) continue;
      const num = Number(part);
      if (isNaN(num)) {
        throw new Error(`Invalid number: "${part}". Please enter only numeric values.`);
      }
      nums.push(num);
    }

    return nums;
  };

  // Run Mode Handler (Real backend multi-language execution)
  const handleRun = async () => {
    const requestToken = ++activeRequestTokenRef.current;
    setIsRunning(true);
    setInputError(null);
    try {
      const res = await runCode({
        language: selectedLanguage,
        sourceCode: code,
      });
      if (activeRequestTokenRef.current !== requestToken) return;
      setExecutionResult(res);
      setActiveTab("terminal");
    } catch (err: any) {
      if (activeRequestTokenRef.current !== requestToken) return;
      setExecutionResult({
        stdout: "",
        stderr: err.message || "Failed to execute code",
        compileOutput: "",
        status: "INTERNAL_ERROR",
        exitCode: 1,
      });
      setActiveTab("terminal");
    } finally {
      if (activeRequestTokenRef.current === requestToken) {
        setIsRunning(false);
      }
    }
  };

  // Trace Mode Handler (JDI for Java or Worker for JS)
  const handleTrace = async () => {
    const requestToken = ++activeRequestTokenRef.current;
    setIsTracing(true);
    setInputError(null);

    let parsedArr: number[] = [];
    try {
      parsedArr = parseArrayInput(rawArrayInput);
    } catch (err: any) {
      setInputError(err.message);
      setIsTracing(false);
      return;
    }

    try {
      if (selectedLanguage === "javascript") {
        // Fallback to in-browser sandboxed tracer for JS
        const result = await runCustomAlgorithmAsync(code, parsedArr, { timeoutMs: 2500 });
        if (activeRequestTokenRef.current !== requestToken) return;
        if (result.success && result.steps.length > 0) {
          const virtualAlgo: VisualizableAlgorithm<number[]> = {
            id: "custom-js-algo",
            name: MULTI_LANG_PRESETS.javascript[selectedPresetKey]?.name || "Custom JS",
            category: "Arrays",
            difficulty: "Medium",
            description: "Browser sandbox execution.",
            sourceCode: { javascript: code },
            language: "javascript",
            parseInput: () => parsedArr,
            validateInput: () => ({ valid: true }),
            execute: () => result.steps,
            initialVisualizationState: () => result.steps[0].visualizationState,
            complexity: { time: `${result.steps.length} ops`, space: "O(1)" },
            visualizationType: "array",
            defaultInput: rawArrayInput,
            tags: ["JavaScript", "Sandbox"],
          };
          loadAlgorithm(virtualAlgo);
          setActiveRightTab("visualizer");
        } else {
          const linePrefix = result.errorLine ? `Line ${result.errorLine}: ` : "";
          const failureMessage =
            `${linePrefix}${result.error || "JavaScript execution produced no traceable steps."}`;
          setInputError(failureMessage);
          setActiveTab("terminal");
          setExecutionResult({
            stdout: result.logs.join("\n"),
            stderr: failureMessage,
            compileOutput: "",
            status: "RUNTIME_ERROR",
            exitCode: 1,
          });
        }
        return;
      }

      // Backend Debugger Tracing (Java JDI)
      const trace = await traceCode({
        language: selectedLanguage,
        sourceCode: code,
        maxSteps: 1000,
      });
      if (activeRequestTokenRef.current !== requestToken) return;

      setTraceResult(trace);

      if (!trace.success) {
        setActiveTab("terminal");
        setExecutionResult({
          stdout: trace.stdout || "",
          stderr: trace.stderr || trace.error || "Debugger trace failed",
          compileOutput: trace.compilationOutput || "",
          status: trace.compilationOutput ? "COMPILATION_ERROR" : "RUNTIME_ERROR",
          exitCode: 1,
        });
        return;
      }

      const steps = convertTraceToExecutionSteps(trace, parsedArr);
      if (steps.length > 0) {
        const virtualAlgo: VisualizableAlgorithm<number[]> = {
          id: `trace-${selectedLanguage}`,
          name: MULTI_LANG_PRESETS[selectedLanguage]?.[selectedPresetKey]?.name || "Java Trace",
          category: "Arrays",
          difficulty: "Medium",
          description: `Live OpenJDK JDI Trace (${steps.length} debugger events).`,
          sourceCode: { [selectedLanguage]: code },
          language: selectedLanguage,
          parseInput: () => parsedArr,
          validateInput: () => ({ valid: true }),
          execute: () => steps,
          initialVisualizationState: () => steps[0].visualizationState,
          complexity: { time: `${steps.length} steps`, space: "O(1)" },
          visualizationType: "array",
          defaultInput: rawArrayInput,
          tags: ["Java", "JDI", "Tracer"],
        };
        loadAlgorithm(virtualAlgo);
        setActiveRightTab("visualizer");
      }
    } catch (err: any) {
      if (activeRequestTokenRef.current !== requestToken) return;
      setInputError(err.message || "Failed to trace code");
    } finally {
      if (activeRequestTokenRef.current === requestToken) {
        setIsTracing(false);
      }
    }
  };

  const handleSaveSnippet = () => {
    requireAuthAction("Save custom code snippet to your library", async () => {
      setIsSaving(true);
      const title =
        MULTI_LANG_PRESETS[selectedLanguage]?.[selectedPresetKey]?.name ||
        `${selectedLanguage.toUpperCase()} Snippet`;
      const ok = await saveSnippet({
        title,
        code,
        input_data: rawArrayInput,
        algorithm_category: "Arrays",
      });
      setIsSaving(false);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    });
  };

  // Check language capabilities
  const currentCapability = capabilities.find(
    (c) => c.language.toLowerCase() === selectedLanguage.toLowerCase()
  ) || {
    language: selectedLanguage,
    displayName: selectedLanguage.toUpperCase(),
    version: "Detected",
    supportsRun: true,
    supportsTrace: selectedLanguage === "java",
    limitations: [],
  };

  const lineCount = code.split("\n").length;
  const currentLine = currentStep?.line ?? null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] bg-transparent overflow-y-auto lg:overflow-hidden font-sans">
      {/* Top Banner / HUD */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 border-b z-10 shrink-0 min-h-14"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(20px) saturate(165%)",
          WebkitBackdropFilter: "blur(20px) saturate(165%)",
          borderColor: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 1px 0 rgba(99, 102, 241, 0.06)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                Multi-Language Execution & Tracing
              </h1>
              {currentCapability.supportsTrace ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  JDI Trace Ready
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50/90 text-amber-700 border border-amber-200/80">
                  Run-Only Mode
                </span>
              )}
            </div>
            <p className="hidden sm:block text-[11px] text-slate-500">
              Run arbitrary code or step through genuine Java debugger execution with stack frames and variable tracking.
            </p>
          </div>
        </div>

        {/* Language & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center p-1 rounded-full glass-capsule-track text-xs font-semibold">
            <button
              onClick={() => handleLanguageChange("java")}
              className={`px-3 py-1 rounded-full transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                selectedLanguage === "java"
                  ? "glass-capsule-active font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Java</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Trace Supported" />
            </button>
            <button
              onClick={() => handleLanguageChange("python")}
              className={`px-3 py-1 rounded-full transition-all text-xs cursor-pointer ${
                selectedLanguage === "python"
                  ? "glass-capsule-active font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => handleLanguageChange("cpp")}
              className={`px-3 py-1 rounded-full transition-all text-xs cursor-pointer ${
                selectedLanguage === "cpp"
                  ? "glass-capsule-active font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              C++
            </button>
            <button
              onClick={() => handleLanguageChange("javascript")}
              className={`px-3 py-1 rounded-full transition-all text-xs cursor-pointer ${
                selectedLanguage === "javascript"
                  ? "glass-capsule-active font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              JavaScript
            </button>
          </div>

          {/* Preset Selector */}
          <div className="hidden md:flex items-center p-1 rounded-full glass-capsule-track text-xs">
            {Object.entries(MULTI_LANG_PRESETS[selectedLanguage] || {}).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-2.5 py-1 rounded-full transition-all font-medium text-xs cursor-pointer ${
                  selectedPresetKey === key
                    ? "glass-capsule-active font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSnippet}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer ${
              saveSuccess
                ? "bg-emerald-50/90 text-emerald-700 border-emerald-300/80 shadow-xs"
                : "bg-white/75 hover:bg-white text-slate-700 border-white/90 ring-1 ring-slate-200/70"
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Socratic Tutor Button */}
          <button
            onClick={() =>
              requireAuthAction("Ask Gemini Socratic Step & Bug Tutor", () => {
                setIsTutorOpen(true);
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-50/85 hover:bg-violet-100/90 text-violet-700 border border-violet-200/80 backdrop-blur-md text-xs font-semibold transition-all cursor-pointer"
            title="Ask Gemini Socratic Tutor about the current trace or error"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>Socratic Tutor</span>
          </button>

          {/* Action 1: RUN Button */}
          <button
            onClick={() =>
              requireAuthAction("Execute custom code on AlgoLens Sandbox", () => handleRun())
            }
            disabled={isRunning || isTracing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Compile and run arbitrary code to view standard output and execution metrics"
          >
            {isRunning ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Run Code</span>
          </button>

          {/* Action 2: TRACE Button */}
          <button
            onClick={() =>
              requireAuthAction("Run Debugger Trace & Visualize", () => handleTrace())
            }
            disabled={isTracing || isRunning || (!currentCapability.supportsTrace && selectedLanguage !== "javascript")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer ${
              currentCapability.supportsTrace || selectedLanguage === "javascript"
                ? "bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 text-white shadow-indigo-600/25"
                : "bg-slate-200/80 text-slate-400 cursor-not-allowed shadow-none"
            }`}
            title={
              currentCapability.supportsTrace || selectedLanguage === "javascript"
                ? "Capture real debugger execution events and visualize in AlgoLens"
                : "Trace mode is currently supported for Java via OpenJDK JDI"
            }
          >
            {isTracing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Tracing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Trace & Visualize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 p-3 grid grid-cols-12 gap-3 lg:overflow-hidden">
        {/* Left Column: Code Editor & Execution Details (5 Cols) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-[360px] lg:min-h-0">
          {/* Input Array Setup */}
          <div className="p-3.5 rounded-3xl glass-surface shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                Input Array / Context:
              </span>
              <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded-full bg-white/75 border border-white/90">
                {selectedLanguage.toUpperCase()} • {currentCapability.version}
              </span>
            </div>
            <input
              type="text"
              value={rawArrayInput}
              onChange={(e) => setRawArrayInput(e.target.value)}
              placeholder="[2, 4, 6, 8, 10, 12, 14, 16]"
              className="px-3.5 py-2 text-xs font-mono rounded-xl glass-input text-slate-800 outline-none"
            />
            {inputError && (
              <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          {/* Editor & Console Tabs */}
          <div className="flex-1 panel rounded-3xl min-h-0 flex flex-col overflow-hidden">
            <div className="h-10 px-3.5 border-b border-slate-200/50 flex items-center justify-between bg-white/55 backdrop-blur-md shrink-0">
              <div className="flex items-center p-0.5 rounded-full glass-capsule-track gap-0.5">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                    activeTab === "code"
                      ? "glass-capsule-active font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Source Editor
                </button>
                <button
                  onClick={() => setActiveTab("terminal")}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "terminal"
                      ? "glass-capsule-active font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>Run Output</span>
                  {executionResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionResult.status === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentLine && (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 font-bold animate-pulse">
                    Exec: Line {currentLine}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">{lineCount} lines</span>
              </div>
            </div>

            {activeTab === "code" ? (
              <div className="flex-1 flex overflow-hidden bg-white/45">
                {/* Line Gutter with execution highlight */}
                <div className="w-10 py-3 bg-white/40 border-r border-slate-200/50 font-mono text-[11px] text-slate-400 text-right pr-2 select-none leading-relaxed">
                  {Array.from({ length: lineCount }, (_, i) => {
                    const lNum = i + 1;
                    const isActive = currentLine === lNum;
                    return (
                      <div
                        key={lNum}
                        className={`transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white font-bold rounded-l-full px-1 -mr-2 pr-3"
                            : ""
                        }`}
                      >
                        {lNum}
                      </div>
                    );
                  })}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 p-3 font-mono text-xs text-slate-800 bg-transparent resize-none focus:outline-none leading-relaxed selection:bg-indigo-100 scrollbar-thin"
                  spellCheck={false}
                />
              </div>
            ) : (
              /* Terminal / Output View */
              <div className="flex-1 p-3.5 font-mono text-xs bg-slate-950 text-slate-200 overflow-y-auto flex flex-col gap-2 scrollbar-thin">
                {executionResult ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            executionResult.status === "SUCCESS"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          Status: {executionResult.status}
                        </span>
                        {executionResult.isMock && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                            Mock Provider
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        {executionResult.timeMs !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {executionResult.timeMs}ms
                          </span>
                        )}
                        {executionResult.memoryKb !== undefined && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-slate-500" />
                            {Math.round(executionResult.memoryKb / 1024)}MB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compilation Errors */}
                    {executionResult.compileOutput && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 whitespace-pre-wrap text-[11px]">
                        <div className="font-bold text-[10px] text-rose-400 uppercase tracking-wider mb-1">
                          Compiler Output:
                        </div>
                        {executionResult.compileOutput}
                      </div>
                    )}

                    {/* Standard Output */}
                    {executionResult.stdout && (
                      <div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                          Standard Output:
                        </div>
                        <pre className="text-slate-100 whitespace-pre-wrap leading-relaxed bg-slate-900/80 p-2.5 rounded border border-slate-800">
                          {executionResult.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Standard Error / Runtime Exceptions */}
                    {executionResult.stderr && (
                      <div>
                        <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">
                          Standard Error:
                        </div>
                        <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed bg-rose-950/30 p-2.5 rounded border border-rose-900/50">
                          {executionResult.stderr}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-500 italic py-8 text-center flex flex-col items-center gap-2">
                    <Terminal className="w-6 h-6 text-slate-600" />
                    <span>No execution output yet. Click 'Run Code' to execute.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: AlgoLens Visualizer & Debugger State (7 Cols) */}
        <section className="col-span-12 lg:col-span-7 flex flex-col min-h-[460px] lg:min-h-0 panel rounded-3xl relative pb-16 overflow-hidden">
          <div className="h-10 px-4 border-b border-slate-200/50 flex items-center justify-between bg-white/55 backdrop-blur-md z-20 shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <div className="flex items-center p-0.5 rounded-full glass-capsule-track gap-0.5">
                <button
                  onClick={() => setActiveRightTab("visualizer")}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
                    activeRightTab === "visualizer"
                      ? "glass-capsule-active"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Array Visualizer
                </button>
                <button
                  onClick={() => setActiveRightTab("panels")}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                    activeRightTab === "panels"
                      ? "glass-capsule-active"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Call Stack & Variables</span>
                </button>
              </div>
              {totalSteps > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-200/80">
                  {totalSteps} Steps Captured
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Debugger Playback</span>
            </div>
          </div>

          {/* Current Step Explanation Header */}
          <div className="m-3 p-3.5 rounded-2xl bg-white/75 backdrop-blur-xl border border-white/90 ring-1 ring-indigo-500/[0.08] shadow-xs flex flex-col gap-1.5 z-20">
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  {isFinalStep ? "Execution Complete" : "Debugger State"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  (Step {Math.min(currentStepIndex + 1, totalSteps || 1)} of {totalSteps || 1})
                </span>
              </div>

              {currentStep?.line && (
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50/90 px-2.5 py-0.5 rounded-full border border-indigo-200/80 font-bold">
                  Line {currentStep.line}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-700 font-medium leading-relaxed min-h-[20px]">
              {currentStep?.explanation ||
                "Click 'Trace & Visualize' to step through real Java program execution."}
            </div>
          </div>

          {/* Main Visualizer or Variable/CallStack Panels */}
          {activeRightTab === "visualizer" ? (
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-white/55 backdrop-blur-md mx-3 mb-2 border border-white/90 ring-1 ring-slate-200/40 shadow-xs">
              <ArrayVisualizer />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 mx-3 mb-2 min-h-[260px] lg:min-h-0 lg:overflow-hidden">
              <div className="h-full min-h-[200px] overflow-hidden">
                <VariablesPanel />
              </div>
              <div className="h-full min-h-[200px] overflow-hidden">
                <CallStackPanel />
              </div>
            </div>
          )}

          {/* Execution Controls at bottom */}
          <ExecutionControls />
        </section>
      </div>

      {/* Gemini Socratic Tutor Modal */}
      <SocraticTutorModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        overrideCode={code}
        overrideAlgorithmId={selectedPresetKey}
      />
    </div>
  );
}

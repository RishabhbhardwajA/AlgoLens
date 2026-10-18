import { useState, useEffect, useRef } from "react";
import { runCustomAlgorithmAsync, type CustomRunResult } from "@/engine/customCodeRunner";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { ArrayVisualizer } from "@/visualizers/ArrayVisualizer/ArrayVisualizer";
import { ExecutionControls } from "@/components/ExecutionControls/ExecutionControls";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
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
  Dices,
  ChevronDown,
  Layers,
  Check,
  Award,
  Save,
} from "lucide-react";

const CODE_PRESETS: Record<
  string,
  { name: string; array: string; code: string; description: string }
> = {
  peakElement: {
    name: "Peak Element",
    array: "[1, 3, 20, 4, 1, 0]",
    description: "Binary search to find peak element where arr[i] > arr[i+1].",
    code: `// Find Peak Element using Binary Search
let low = 0;
let high = arr.length - 1;

while (low < high) {
  let mid = Math.floor((low + high) / 2);
  tracer.pointer("low", low);
  tracer.pointer("mid", mid);
  tracer.pointer("high", high);

  tracer.explain(\`Checking mid index \${mid} (val: \${arr[mid]}) against mid+1 (\${arr[mid + 1]})\`);

  if (tracer.compare(mid, mid + 1)) {
    // If mid > mid + 1, peak is on left side including mid
    tracer.explain("Left element is greater -> peak lies in left subarray");
    high = mid;
  } else {
    // If mid < mid + 1, peak is on right side
    tracer.explain("Right element is greater -> peak lies in right subarray");
    low = mid + 1;
  }
}

tracer.pointer("peak", low);
tracer.result(low, \`Peak element found at index \${low} with value \${arr[low]}!\`);
return low;`,
  },
  dutchFlag: {
    name: "Dutch National Flag",
    array: "[2, 0, 2, 1, 1, 0, 2, 1, 0, 1]",
    description: "3-way partition sorting 0s, 1s, and 2s in single O(N) pass.",
    code: `// Dutch National Flag (0s, 1s, 2s Sort)
let low = 0;
let mid = 0;
let high = arr.length - 1;

while (mid <= high) {
  tracer.pointer("low", low);
  tracer.pointer("mid", mid);
  tracer.pointer("high", high);

  if (arr[mid] === 0) {
    tracer.explain(\`arr[mid] is 0 -> Swapping with index \${low}\`);
    tracer.swap(low, mid);
    low++;
    mid++;
  } else if (arr[mid] === 1) {
    tracer.explain("arr[mid] is 1 -> In position, advancing mid");
    mid++;
  } else {
    tracer.explain(\`arr[mid] is 2 -> Swapping with high index \${high}\`);
    tracer.swap(mid, high);
    high--;
  }
}

tracer.result(arr, "Array sorted into [0s, 1s, 2s] in single O(N) pass!");
return arr;`,
  },
  bubbleSort: {
    name: "Bubble Sort",
    array: "[29, 10, 14, 37, 14, 2, 45, 18]",
    description: "Classic adjacent comparisons and bubbling of maximums.",
    code: `// Bubble Sort Implementation
for (let i = 0; i < arr.length; i++) {
  tracer.pointer("i", i);
  for (let j = 0; j < arr.length - i - 1; j++) {
    tracer.pointer("j", j);
    
    // Compare adjacent elements
    if (tracer.compare(j, j + 1)) {
      tracer.swap(j, j + 1);
    }
  }
}
tracer.result(arr, "Bubble Sort completed! Array is fully sorted.");
return arr;`,
  },
  binarySearch: {
    name: "Binary Search",
    array: "[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]",
    description: "Target search on sorted array in logarithmic time.",
    code: `// Binary Search (Seeking Target = 23)
const target = 23;
let low = 0;
let high = arr.length - 1;

while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  tracer.pointer("low", low);
  tracer.pointer("mid", mid);
  tracer.pointer("high", high);

  tracer.explain(\`Checking mid index \${mid} (val: \${arr[mid]})\`);

  if (arr[mid] === target) {
    tracer.pointer("found", mid);
    tracer.result(mid, \`Found target \${target} at index \${mid}!\`);
    return mid;
  } else if (arr[mid] < target) {
    low = mid + 1;
  } else {
    high = mid - 1;
  }
}

tracer.result(-1, "Target not found in array.");
return -1;`,
  },
  reverseArray: {
    name: "Two-Pointer Reverse",
    array: "[1, 3, 5, 7, 9, 11, 13]",
    description: "In-place array inversion using converging pointers.",
    code: `// Two-Pointer In-Place Reversal
let left = 0;
let right = arr.length - 1;

while (left < right) {
  tracer.pointer("left", left);
  tracer.pointer("right", right);
  tracer.explain(\`Swapping indices \${left} and \${right}\`);
  tracer.swap(left, right);
  left++;
  right--;
}
tracer.result(arr, "Array reversed successfully!");
return arr;`,
  },
};

export default function Playground() {
  const navigate = useNavigate();
  const { isAuthenticated, saveSnippet } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState("peakElement");
  const [code, setCode] = useState(CODE_PRESETS.peakElement.code);
  const [rawArrayInput, setRawArrayInput] = useState(CODE_PRESETS.peakElement.array);
  const [executionResult, setExecutionResult] = useState<CustomRunResult | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "console">("code");
  const [isRunning, setIsRunning] = useState(false);

  const { loadAlgorithm } = useExecutionStore();

  const handleSaveSnippet = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setIsSaving(true);
    const title = CODE_PRESETS[selectedPreset]?.name
      ? `${CODE_PRESETS[selectedPreset].name} (Sandbox)`
      : "Custom Algorithm";
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
  };
  const currentStep = useCurrentStep();
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const totalSteps = useExecutionStore((s) => s.steps.length);
  const isFinalStep = totalSteps > 0 && currentStepIndex >= totalSteps - 1;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    const preset = CODE_PRESETS[key];
    setCode(preset.code);
    setRawArrayInput(preset.array);
    setInputError(null);
  };

  const parseArrayInput = (input: string): number[] => {
    const trimmed = input.trim();
    const sanitized =
      trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;

    if (!sanitized.trim()) {
      throw new Error("Input array cannot be empty.");
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

    if (nums.length === 0) {
      throw new Error("Array must contain at least one valid number.");
    }
    if (nums.length > 20) {
      throw new Error("For optimal visualization, please provide 20 or fewer elements.");
    }

    return nums;
  };

  const handleRun = async () => {
    setInputError(null);
    let parsedArr: number[];

    try {
      parsedArr = parseArrayInput(rawArrayInput);
    } catch (err: unknown) {
      setInputError(err instanceof Error ? err.message : "Invalid array format");
      return;
    }

    setIsRunning(true);
    try {
      const result = await runCustomAlgorithmAsync(code, parsedArr, { timeoutMs: 2500 });
      setExecutionResult(result);

      if (result.success && result.steps.length > 0) {
        const virtualAlgo: VisualizableAlgorithm<number[]> = {
          id: "custom-algo",
          name: CODE_PRESETS[selectedPreset]?.name || "Custom Algorithm",
          category: "Arrays",
          difficulty: "Medium",
          description: "User written custom algorithm sandbox execution.",
          sourceCode: { javascript: code },
          language: "javascript",
          parseInput: () => parsedArr,
          validateInput: () => ({ valid: true }),
          execute: () => result.steps,
          initialVisualizationState: () => result.steps[0].visualizationState,
          complexity: {
            time: `${result.steps.length} ops`,
            space: "O(1)",
          },
          visualizationType: "array",
          defaultInput: rawArrayInput,
          tags: ["Custom", "Sandbox"],
        };

        loadAlgorithm(virtualAlgo);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Run initial preset on mount
  useEffect(() => {
    handleRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick array scenario generators
  const setScenario = (type: "random" | "reverse" | "nearly" | "duplicates") => {
    let arr: number[] = [];
    if (type === "random") {
      arr = Array.from({ length: 8 }, () => Math.floor(Math.random() * 80) + 5);
    } else if (type === "reverse") {
      arr = [50, 42, 35, 27, 19, 12, 8, 3];
    } else if (type === "nearly") {
      arr = [4, 8, 15, 12, 23, 28, 42];
    } else if (type === "duplicates") {
      arr = [10, 4, 10, 2, 7, 4, 10];
    }
    setRawArrayInput(JSON.stringify(arr));
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-transparent overflow-hidden font-sans">
      {/* Top Banner / HUD */}
      <div
        className="flex items-center justify-between px-6 py-2.5 border-b z-10 shrink-0 h-14"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(226, 232, 240, 0.8)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xs">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                BYOC Code Playground
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                Interactive Sandbox
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Write or customize code with tracer helpers and watch AlgoLens animate it live.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Templates:</span>
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            {Object.entries(CODE_PRESETS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${
                  selectedPreset === key
                    ? "bg-white text-indigo-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveSnippet}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ml-1 ${
              saveSuccess
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
            title="Save custom snippet to your AlgoLens account"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all ml-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run & Visualize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Code Editor & Input Setup (5 Cols) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0">
          {/* Array Input Bar */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                Input Array:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setScenario("random")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
                >
                  Random
                </button>
                <button
                  onClick={() => setScenario("reverse")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
                >
                  Reverse
                </button>
                <button
                  onClick={() => setScenario("nearly")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
                >
                  Nearly Sorted
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={rawArrayInput}
                onChange={(e) => setRawArrayInput(e.target.value)}
                placeholder="[29, 10, 14, 37, 14, 2, 45, 18]"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-800"
              />
            </div>

            {inputError && (
              <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          {/* Code Editor Panel with Line Numbers */}
          <div className="flex-1 panel min-h-0 flex flex-col overflow-hidden">
            <div className="h-9 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                    activeTab === "code"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  JavaScript Editor
                </button>
                <button
                  onClick={() => setActiveTab("console")}
                  className={`text-xs font-semibold px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                    activeTab === "console"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>Console Logs</span>
                  {executionResult?.logs && executionResult.logs.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] flex items-center justify-center font-bold">
                      {executionResult.logs.length}
                    </span>
                  )}
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-mono">
                {lineCount} lines
              </span>
            </div>

            {activeTab === "code" ? (
              <div className="flex-1 flex overflow-hidden bg-white">
                {/* Line Numbers Gutter */}
                <div className="w-9 py-3 bg-slate-50/60 border-r border-slate-100 font-mono text-[11px] text-slate-400 text-right pr-2 select-none leading-relaxed">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i + 1}>{i + 1}</div>
                  ))}
                </div>

                {/* Editor Textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 p-3 font-mono text-xs text-slate-800 bg-white resize-none focus:outline-none leading-relaxed selection:bg-indigo-100 scrollbar-thin"
                  spellCheck={false}
                />
              </div>
            ) : (
              /* Console Output Drawer */
              <div className="flex-1 p-3 font-mono text-xs bg-slate-900 text-slate-200 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                  Sandboxed Output Console:
                </div>
                {executionResult?.logs && executionResult.logs.length > 0 ? (
                  executionResult.logs.map((log, idx) => (
                    <div key={idx} className="text-slate-300">
                      <span className="text-slate-500 mr-2">[{idx + 1}]</span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic py-4 text-center">
                    No console logs produced. Use tracer.log("hello") to print values here.
                  </div>
                )}

                {executionResult?.returnValue !== undefined && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-emerald-400">
                    → Return Value: {typeof executionResult.returnValue === "object" ? JSON.stringify(executionResult.returnValue) : String(executionResult.returnValue)}
                  </div>
                )}

                {executionResult?.finalArray && (
                  <div className="pt-1 text-slate-300">
                    → Final Array: [{executionResult.finalArray.join(", ")}]
                  </div>
                )}
              </div>
            )}

            {/* Tracer API Cheatsheet Pill */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/90 text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
              <span className="font-sans font-bold text-slate-600 text-[11px]">Tracer API:</span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">
                tracer.compare(i, j)
              </span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">
                tracer.swap(i, j)
              </span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">
                tracer.pointer(name, idx)
              </span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">
                tracer.result(val, msg)
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {executionResult?.error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shrink-0 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[11px] mb-0.5">Execution Error</div>
                <div className="font-mono text-[11px] text-rose-700 whitespace-pre-wrap">
                  {executionResult.error}
                </div>
                {executionResult.errorLine && (
                  <div className="text-[10px] text-rose-500 mt-1">
                    Occurred at line ~{executionResult.errorLine}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: AlgoLens Array Visualizer, Live Step Explanation & Final Answer HUD */}
        <section className="col-span-12 lg:col-span-7 flex flex-col min-h-0 panel relative pb-16 bg-slate-50/40">
          <div className="h-9 px-3.5 border-b border-slate-100 flex items-center justify-between bg-white/90 z-20 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">Visualizer Output</span>
              {executionResult?.success && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {executionResult.steps.length} Steps
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Live Animation Engine</span>
            </div>
          </div>

          {/* LIVE STEP EXPLANATION & FINAL ANSWER CARD */}
          <div className="m-3 p-3 rounded-xl bg-white border border-indigo-100 shadow-xs flex flex-col gap-2 z-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  {isFinalStep ? "Final Result" : "Current Step Explanation"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({Math.min(currentStepIndex + 1, totalSteps || 1)}/{totalSteps || 1})
                </span>
              </div>

              {isFinalStep ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Algorithm Complete
                </span>
              ) : (
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                  Stepping...
                </span>
              )}
            </div>

            {/* Current Step Explanation Text */}
            <div className="text-xs text-slate-700 font-medium leading-relaxed min-h-[24px]">
              {currentStep?.explanation ||
                executionResult?.finalExplanation ||
                "Run algorithm to start live visualizer."}
            </div>

            {/* PROMINENT FINAL ANSWER BANNER */}
            {isFinalStep && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 mt-0.5 shadow-xs">
                <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-[11px] text-emerald-800 uppercase tracking-wider">
                    🎯 Final Answer / Output
                  </div>
                  <div className="text-xs font-bold text-emerald-950 mt-0.5 leading-snug">
                    {executionResult?.finalExplanation || currentStep?.explanation || "Execution finished!"}
                  </div>
                  {executionResult?.returnValue !== undefined && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-xs font-mono font-bold text-emerald-700 shadow-2xs">
                      <span>Result / Returned:</span>
                      <span className="text-indigo-600 font-extrabold">
                        {typeof executionResult.returnValue === "object"
                          ? JSON.stringify(executionResult.returnValue)
                          : String(executionResult.returnValue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Visualizer Canvas */}
          <div className="flex-1 relative rounded-b-xl overflow-hidden bg-white mx-3 mb-2 border border-slate-100 shadow-xs">
            <ArrayVisualizer />
          </div>

          {/* Reusable Execution Controls */}
          <ExecutionControls />
        </section>
      </div>
    </div>
  );
}

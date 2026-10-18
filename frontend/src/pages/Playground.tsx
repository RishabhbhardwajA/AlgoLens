import { useState, useEffect, useRef } from "react";
import { runCustomAlgorithmAsync, type CustomRunResult } from "@/engine/customCodeRunner";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { ArrayVisualizer } from "@/visualizers/ArrayVisualizer/ArrayVisualizer";
import { ExecutionControls } from "@/components/ExecutionControls/ExecutionControls";
import { VariablesPanel } from "@/components/VariablesPanel/VariablesPanel";
import { CallStackPanel } from "@/components/CallStack/CallStackPanel";
import { useNavigate } from "react-router-dom";
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

interface PresetItem {
  name: string;
  code: string;
  array: string;
  description: string;
}

const MULTI_LANG_PRESETS: Record<string, Record<string, PresetItem>> = {
  java: {
    java_binarySearch: {
      name: "Java: Binary Search",
      array: "[2, 4, 6, 8, 10, 12, 14, 16]",
      description: "Binary search in Java inspected via OpenJDK JDI debugger.",
      code: `public class Solution {
    public static int binarySearch(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] data = { 2, 4, 6, 8, 10, 12, 14, 16 };
        int target = 10;
        int result = binarySearch(data, target);
        System.out.println("Found target " + target + " at index: " + result);
    }
}`,
    },
    java_loopSum: {
      name: "Java: Array Loop & Sum",
      array: "[5, 10, 15, 20, 25]",
      description: "Array iteration and accumulator variable tracing.",
      code: `public class Solution {
    public static void main(String[] args) {
        int[] arr = { 5, 10, 15, 20, 25 };
        int sum = 0;
        for (int i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        System.out.println("Final Sum: " + sum);
    }
}`,
    },
    java_factorial: {
      name: "Java: Recursive Factorial",
      array: "[1, 2, 3, 4, 5]",
      description: "Recursive function call stack inspection.",
      code: `public class Solution {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int n = 4;
        int ans = factorial(n);
        System.out.println("Factorial of " + n + " = " + ans);
    }
}`,
    },
  },
  python: {
    py_twoSum: {
      name: "Python: Two Sum",
      array: "[2, 7, 11, 15]",
      description: "Two Sum hash map lookup in Python.",
      code: `def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []

nums = [2, 7, 11, 15]
target = 9
result = two_sum(nums, target)
print(f"Indices for target {target}: {result}")
`,
    },
    py_binarySearch: {
      name: "Python: Binary Search",
      array: "[1, 3, 5, 7, 9, 11]",
      description: "Binary search in Python.",
      code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

data = [1, 3, 5, 7, 9, 11]
target = 7
idx = binary_search(data, target)
print(f"Target {target} found at index {idx}")
`,
    },
  },
  cpp: {
    cpp_vector: {
      name: "C++: Vector Sum",
      array: "[10, 20, 30, 40]",
      description: "C++ standard library vector accumulation.",
      code: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = { 10, 20, 30, 40 };
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Vector sum: " << total << std::endl;
    return 0;
}
`,
    },
  },
  javascript: {
    peakElement: {
      name: "JS: Peak Element",
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
    tracer.explain("Left element is greater -> peak lies in left subarray");
    high = mid;
  } else {
    tracer.explain("Right element is greater -> peak lies in right subarray");
    low = mid + 1;
  }
}

tracer.pointer("peak", low);
tracer.result(low, \`Peak element found at index \${low} with value \${arr[low]}!\`);
return low;`,
    },
    bubbleSort: {
      name: "JS: Bubble Sort",
      array: "[29, 10, 14, 37, 14, 2, 45, 18]",
      description: "Classic adjacent comparisons and bubbling of maximums.",
      code: `// Bubble Sort Implementation
for (let i = 0; i < arr.length; i++) {
  tracer.pointer("i", i);
  for (let j = 0; j < arr.length - i - 1; j++) {
    tracer.pointer("j", j);
    if (tracer.compare(j, j + 1)) {
      tracer.swap(j, j + 1);
    }
  }
}
tracer.result(arr, "Bubble Sort completed! Array is fully sorted.");
return arr;`,
    },
  },
};

export default function Playground() {
  const navigate = useNavigate();
  const { isAuthenticated, saveSnippet } = useAuthStore();
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

  const { loadAlgorithm } = useExecutionStore();
  const currentStep = useCurrentStep();
  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const totalSteps = useExecutionStore((s) => s.steps.length);
  const isFinalStep = totalSteps > 0 && currentStepIndex >= totalSteps - 1;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load capabilities on mount
  useEffect(() => {
    fetchCapabilities().then((caps) => {
      setCapabilities(caps);
    });
  }, []);

  // When language changes, update presets
  const handleLanguageChange = (newLang: string) => {
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
    setIsRunning(true);
    setInputError(null);
    try {
      const res = await runCode({
        language: selectedLanguage,
        sourceCode: code,
      });
      setExecutionResult(res);
      setActiveTab("terminal");
    } catch (err: any) {
      setExecutionResult({
        stdout: "",
        stderr: err.message || "Failed to execute code",
        compileOutput: "",
        status: "INTERNAL_ERROR",
        exitCode: 1,
      });
      setActiveTab("terminal");
    } finally {
      setIsRunning(false);
    }
  };

  // Trace Mode Handler (JDI for Java or Worker for JS)
  const handleTrace = async () => {
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
        }
        return;
      }

      // Backend Debugger Tracing (Java JDI)
      const trace = await traceCode({
        language: selectedLanguage,
        sourceCode: code,
        maxSteps: 500,
      });

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
      setInputError(err.message || "Failed to trace code");
    } finally {
      setIsTracing(false);
    }
  };

  const handleSaveSnippet = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
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
    <div className="flex flex-col h-[calc(100vh-56px)] bg-transparent overflow-hidden font-sans">
      {/* Top Banner / HUD */}
      <div
        className="flex items-center justify-between px-6 py-2.5 border-b z-10 shrink-0 h-14"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
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
                Multi-Language Execution & Tracing
              </h1>
              {currentCapability.supportsTrace ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  JDI Trace Ready
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Run-Only Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Run arbitrary code or step through genuine Java debugger execution with stack frames and variable tracking.
            </p>
          </div>
        </div>

        {/* Language & Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => handleLanguageChange("java")}
              className={`px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1.5 ${
                selectedLanguage === "java"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Java</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Trace Supported" />
            </button>
            <button
              onClick={() => handleLanguageChange("python")}
              className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                selectedLanguage === "python"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => handleLanguageChange("cpp")}
              className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                selectedLanguage === "cpp"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              C++
            </button>
            <button
              onClick={() => handleLanguageChange("javascript")}
              className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                selectedLanguage === "javascript"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              JavaScript
            </button>
          </div>

          {/* Preset Selector */}
          <div className="hidden md:flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            {Object.entries(MULTI_LANG_PRESETS[selectedLanguage] || {}).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-2 py-1 rounded-md transition-all font-medium text-xs ${
                  selectedPresetKey === key
                    ? "bg-white text-indigo-700 shadow-xs font-semibold"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              saveSuccess
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
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

          {/* Action 1: RUN Button */}
          <button
            onClick={handleRun}
            disabled={isRunning || isTracing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
            onClick={handleTrace}
            disabled={isTracing || isRunning || (!currentCapability.supportsTrace && selectedLanguage !== "javascript")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
              currentCapability.supportsTrace || selectedLanguage === "javascript"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
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
      <div className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Code Editor & Execution Details (5 Cols) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0">
          {/* Input Array Setup */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                Input Array / Context:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedLanguage.toUpperCase()} • {currentCapability.version}
              </span>
            </div>
            <input
              type="text"
              value={rawArrayInput}
              onChange={(e) => setRawArrayInput(e.target.value)}
              placeholder="[2, 4, 6, 8, 10, 12, 14, 16]"
              className="px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-800"
            />
            {inputError && (
              <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          {/* Editor & Console Tabs */}
          <div className="flex-1 panel min-h-0 flex flex-col overflow-hidden bg-white">
            <div className="h-9 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                    activeTab === "code"
                      ? "bg-white text-indigo-700 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Source Editor
                </button>
                <button
                  onClick={() => setActiveTab("terminal")}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    activeTab === "terminal"
                      ? "bg-white text-indigo-700 shadow-xs font-bold"
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold animate-pulse">
                    Exec: Line {currentLine}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">{lineCount} lines</span>
              </div>
            </div>

            {activeTab === "code" ? (
              <div className="flex-1 flex overflow-hidden bg-white">
                {/* Line Gutter with execution highlight */}
                <div className="w-10 py-3 bg-slate-50/70 border-r border-slate-100 font-mono text-[11px] text-slate-400 text-right pr-2 select-none leading-relaxed">
                  {Array.from({ length: lineCount }, (_, i) => {
                    const lNum = i + 1;
                    const isActive = currentLine === lNum;
                    return (
                      <div
                        key={lNum}
                        className={`transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white font-bold rounded-l px-1 -mr-2 pr-3"
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
                  className="flex-1 p-3 font-mono text-xs text-slate-800 bg-white resize-none focus:outline-none leading-relaxed selection:bg-indigo-100 scrollbar-thin"
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
        <section className="col-span-12 lg:col-span-7 flex flex-col min-h-0 panel relative pb-16 bg-slate-50/40">
          <div className="h-9 px-3.5 border-b border-slate-100 flex items-center justify-between bg-white/90 z-20 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <button
                onClick={() => setActiveRightTab("visualizer")}
                className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                  activeRightTab === "visualizer"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Array Visualizer
              </button>
              <button
                onClick={() => setActiveRightTab("panels")}
                className={`text-xs font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeRightTab === "panels"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Call Stack & Variables</span>
              </button>
              {totalSteps > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {totalSteps} Steps Captured
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Debugger Playback</span>
            </div>
          </div>

          {/* Current Step Explanation Header */}
          <div className="m-3 p-3 rounded-xl bg-white border border-indigo-100 shadow-xs flex flex-col gap-1.5 z-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
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
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 font-bold">
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
            <div className="flex-1 relative rounded-b-xl overflow-hidden bg-white mx-3 mb-2 border border-slate-100 shadow-xs">
              <ArrayVisualizer />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-3 mx-3 mb-2 overflow-hidden">
              <div className="h-full overflow-hidden">
                <VariablesPanel />
              </div>
              <div className="h-full overflow-hidden">
                <CallStackPanel />
              </div>
            </div>
          )}

          {/* Execution Controls at bottom */}
          <ExecutionControls />
        </section>
      </div>
    </div>
  );
}

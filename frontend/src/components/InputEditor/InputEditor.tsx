import { useEffect, useRef, useState } from "react";
import { useExecutionStore } from "@/engine/useExecutionController";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/utils/cn";
import {
  generateAdversarialEdgeCases,
  type AdversarialEdgeCase,
} from "@/services/geminiApi";
import {
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  Dices,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

export function InputEditor() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const rawInput = useExecutionStore((s) => s.rawInput);
  const setRawInput = useExecutionStore((s) => s.setRawInput);
  const runAlgorithm = useExecutionStore((s) => s.runAlgorithm);
  const requireAuthAction = useAuthStore((s) => s.requireAuthAction);

  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  const [edgeCasesOpen, setEdgeCasesOpen] = useState(false);
  const [loadingEdgeCases, setLoadingEdgeCases] = useState(false);
  const [edgeCaseError, setEdgeCaseError] = useState<string | null>(null);
  const [edgeCaseSource, setEdgeCaseSource] = useState<"gemini" | "fallback" | null>(null);
  const [edgeCases, setEdgeCases] = useState<AdversarialEdgeCase[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    reqIdRef.current += 1;
    setError(null);
    setValid(false);
    setEdgeCasesOpen(false);
    setEdgeCases([]);
    setEdgeCaseError(null);
    setEdgeCaseSource(null);
    setLoadingEdgeCases(false);
  }, [algorithm?.id]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!algorithm) return null;

  const validate = (value: string): boolean => {
    try {
      const parsed = algorithm.parseInput(value);
      const result = algorithm.validateInput(parsed);
      if (result.valid) {
        setError(null);
        setValid(true);
        return true;
      }
      setError(result.error ?? "Invalid input");
      setValid(false);
      return false;
    } catch {
      setError("Could not parse input");
      setValid(false);
      return false;
    }
  };

  const handleChange = (value: string) => {
    setRawInput(value);
    validate(value);
  };

  const handleRun = () => {
    if (!validate(rawInput)) return;

    const isCustomInput = rawInput.trim() !== algorithm.defaultInput.trim();
    if (isCustomInput) {
      requireAuthAction("Visualize custom algorithm input", () => {
        runAlgorithm();
      });
      return;
    }

    runAlgorithm();
  };

  const handleRandomize = () => {
    let rand = algorithm.defaultInput;
    const cat = algorithm.category;

    if (cat === "Sorting") {
      const arr = Array.from({ length: 8 }, () => Math.floor(Math.random() * 95) + 5);
      rand = JSON.stringify(arr);
    } else if (cat === "Arrays" || cat === "Two Pointer") {
      if (algorithm.id === "valid-palindrome") {
        const samples = ["A man, a plan, a canal: Panama", "race a car", "level", "Was it a car or a cat I saw?"];
        rand = samples[Math.floor(Math.random() * samples.length)];
      } else if (algorithm.id === "reverse-string") {
        const samples = [
          ["h", "e", "l", "l", "o"],
          ["a", "l", "g", "o", "r", "i", "t", "h", "m"],
          ["r", "e", "a", "c", "t"],
        ];
        rand = JSON.stringify(samples[Math.floor(Math.random() * samples.length)]);
      } else if (algorithm.id === "move-zeroes") {
        const arr = Array.from({ length: 7 }, () =>
          Math.random() < 0.35 ? 0 : Math.floor(Math.random() * 19) + 1
        );
        rand = JSON.stringify(arr);
      } else if (algorithm.id === "squares-of-sorted-array" || algorithm.id === "remove-duplicates") {
        const arr = Array.from({ length: 7 }, () => Math.floor(Math.random() * 21) - 8).sort(
          (a, b) => a - b
        );
        rand = JSON.stringify(arr);
      } else if (algorithm.defaultInput.includes("target")) {
        const unsorted = algorithm.id === "linear-search";
        const arr = Array.from({ length: 7 }, () => Math.floor(Math.random() * 25) + 1);
        if (!unsorted) arr.sort((a, b) => a - b);
        const target =
          algorithm.id === "two-sum-ii"
            ? arr[0] + arr[arr.length - 1]
            : arr[Math.floor(Math.random() * arr.length)] + (Math.random() > 0.7 ? 1 : 0);
        rand = JSON.stringify({ array: arr, target });
      } else {
        const arr = Array.from({ length: 7 }, () => Math.floor(Math.random() * 45) + 2);
        rand = JSON.stringify(arr);
      }
    } else if (cat === "Trees") {
      if (algorithm.id === "bst-search") {
        const bsts = [
          { tree: "[4,2,7,1,3,null,9]", target: Math.random() > 0.4 ? 3 : 5 },
          { tree: "[8,3,10,1,6,null,14]", target: Math.random() > 0.4 ? 6 : 9 },
          { tree: "[15,10,20,8,12,17,25]", target: Math.random() > 0.4 ? 17 : 19 },
        ];
        rand = JSON.stringify(bsts[Math.floor(Math.random() * bsts.length)]);
      } else {
        const size = Math.floor(Math.random() * 5) + 3;
        const arr: Array<number | null> = [];
        for (let i = 0; i < size; i++) {
          arr.push(Math.random() > 0.2 ? Math.floor(Math.random() * 20) + 1 : null);
        }
        if (arr[0] === null) arr[0] = 5;

        if (algorithm.defaultInput.includes('"mode"')) {
          const modes = ["inorder", "preorder", "postorder"] as const;
          rand = JSON.stringify({
            tree: JSON.stringify(arr),
            mode: modes[Math.floor(Math.random() * modes.length)],
          });
        } else {
          rand = JSON.stringify(arr);
        }
      }
    } else if (cat === "Recursion") {
      if (algorithm.id === "fibonacci") {
        rand = String(Math.floor(Math.random() * 4) + 3);
      } else {
        rand = String(Math.floor(Math.random() * 4) + 3);
      }
    } else if (cat === "Linked List") {
      const len = Math.floor(Math.random() * 3) + 4;
      const values = Array.from({ length: len }, () => Math.floor(Math.random() * 20) + 1);
      if (algorithm.id === "detect-cycle") {
        rand = JSON.stringify({ values, cyclePos: Math.floor(Math.random() * (len - 1)) });
      } else {
        rand = JSON.stringify(values);
      }
    } else if (cat === "Dynamic Programming") {
      rand = JSON.stringify({ n: Math.floor(Math.random() * 5) + 3 });
    } else if (cat === "Graphs") {
      const walls = [
        [0, 2],
        [1, 2],
        [2, Math.floor(Math.random() * 3) + 2],
      ];
      rand = JSON.stringify({ rows: 5, cols: 7, start: [0, 0], end: [4, 6], walls });
    }

    handleChange(rand);
  };

  const handleLoadEdgeCases = async () => {
    if (edgeCasesOpen) {
      abortRef.current?.abort();
      setEdgeCasesOpen(false);
      return;
    }

    requireAuthAction("Generate Gemini adversarial edge cases", async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++reqIdRef.current;

      setEdgeCasesOpen(true);
      setLoadingEdgeCases(true);
      setEdgeCaseError(null);
      try {
        const resolvedCode =
          typeof algorithm.sourceCode === "string"
            ? algorithm.sourceCode
            : algorithm.sourceCode?.[algorithm.language] || "";
        const res = await generateAdversarialEdgeCases({
          algorithmId: algorithm.id,
          algorithmCategory: algorithm.category,
          code: resolvedCode,
          defaultInput: algorithm.defaultInput,
          signal: controller.signal,
        });
        if (reqIdRef.current !== reqId) return;
        setEdgeCases(res.cases);
        // Normalize "deterministic-fallback" → "fallback" for state type
        setEdgeCaseSource(res.source === "gemini" ? "gemini" : "fallback");
      } catch (err: unknown) {
        if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) return;
        if (reqIdRef.current !== reqId) return;
        setEdgeCases([]);
        setEdgeCaseError(err instanceof Error ? err.message : "Could not generate edge cases.");
      } finally {
        if (reqIdRef.current === reqId) {
          setLoadingEdgeCases(false);
        }
      }
    });
  };

  const handleApplyEdgeCase = (inputStr: string) => {
    setRawInput(inputStr);
    const isValid = validate(inputStr);
    setEdgeCasesOpen(false);
    if (isValid) {
      setTimeout(() => useExecutionStore.getState().runAlgorithm(), 0);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 shrink-0 relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          <span className="panel-label">Input</span>
        </div>
        <button
          type="button"
          onClick={handleLoadEdgeCases}
          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50/90 hover:bg-violet-100 text-violet-800 border border-violet-200/80 backdrop-blur-sm flex items-center gap-1 transition-colors cursor-pointer"
          title="Generate Gemini Adversarial Edge Cases"
        >
          <Sparkles className="w-3 h-3" />
          Edge Cases
        </button>
      </div>

      {/* Adversarial Edge Cases Overlay Drawer */}
      {edgeCasesOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/95 ring-1 ring-violet-500/15 shadow-[0_20px_48px_-10px_rgba(99,102,241,0.22)] p-3 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Adversarial Edge Cases</span>
              {edgeCaseSource && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {edgeCaseSource === "gemini" ? "Gemini" : "Preset"}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setEdgeCasesOpen(false)}
              aria-label="Close edge cases drawer"
              className="text-slate-500 hover:text-slate-800 cursor-pointer p-1 rounded-full hover:bg-slate-100/70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {loadingEdgeCases ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              Generating tricky edge cases...
            </div>
          ) : edgeCaseError ? (
            <p className="text-[11px] text-rose-700 py-2 font-medium">{edgeCaseError}</p>
          ) : edgeCases.length === 0 ? (
            <p className="text-[11px] text-slate-600 py-2">No edge cases available.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {edgeCases.map((ec) => (
                <button
                  type="button"
                  key={ec.id}
                  onClick={() => handleApplyEdgeCase(ec.input)}
                  className="text-left p-2.5 rounded-xl border border-white/90 ring-1 ring-slate-200/60 bg-white/75 hover:ring-violet-300 hover:bg-violet-50/70 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-800">{ec.title}</span>
                    <span className="text-[10px] font-mono text-violet-700 font-semibold shrink-0">
                      Run →
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-700 truncate mt-0.5">
                    {ec.input}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                    {ec.adversarialReason}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        value={rawInput}
        aria-label="Algorithm input JSON"
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRun();
        }}
        rows={2}
        className={cn(
          "w-full resize-none rounded-xl border glass-input px-3 py-2",
          "font-mono text-xs text-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          "placeholder:text-slate-500",
          error
            ? "border-red-400 focus:border-red-500"
            : valid
            ? "border-emerald-400 focus:border-emerald-500"
            : "border-white/90 ring-1 ring-slate-200/70 focus:border-indigo-400"
        )}
        placeholder={algorithm.defaultInput}
        spellCheck={false}
      />

      {error && (
        <div className="flex items-start gap-1.5 text-rose-700 text-[11px] font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {valid && !error && (
        <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Valid input</span>
        </div>
      )}

      <div className="flex gap-2 w-full mt-0.5">
        <button
          type="button"
          onClick={handleRandomize}
          aria-label="Generate Random Input"
          title="Generate Random Input"
          className="shrink-0 p-2 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-indigo-700 transition-colors border border-white/90 ring-1 ring-slate-200/70 shadow-xs cursor-pointer"
        >
          <Dices className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={Boolean(error)}
          className={cn(
            "flex-1 py-1.5 rounded-full text-sm font-semibold transition-all border cursor-pointer",
            error
              ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
              : "bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 text-white border-transparent shadow-md shadow-indigo-500/25"
          )}
        >
          Run ⌘↵
        </button>
      </div>
    </div>
  );
}

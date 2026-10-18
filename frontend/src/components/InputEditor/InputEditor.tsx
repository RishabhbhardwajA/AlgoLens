import { useState } from "react";
import { useExecutionStore } from "@/engine/useExecutionController";
import { cn } from "@/utils/cn";
import { SlidersHorizontal, AlertCircle, CheckCircle2, Dices } from "lucide-react";

export function InputEditor() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const rawInput = useExecutionStore((s) => s.rawInput);
  const setRawInput = useExecutionStore((s) => s.setRawInput);
  const runAlgorithm = useExecutionStore((s) => s.runAlgorithm);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  if (!algorithm) return null;

  const validate = (value: string) => {
    try {
      const parsed = algorithm.parseInput(value);
      const result = algorithm.validateInput(parsed);
      if (result.valid) {
        setError(null);
        setValid(true);
      } else {
        setError(result.error ?? "Invalid input");
        setValid(false);
      }
    } catch {
      setError("Could not parse input");
      setValid(false);
    }
  };

  const handleChange = (value: string) => {
    setRawInput(value);
    validate(value);
  };

  const handleRun = () => {
    validate(rawInput);
    if (!error) runAlgorithm();
  };

  const handleRandomize = () => {
    let rand = algorithm.defaultInput;
    const cat = algorithm.category;
    
    if (cat === "Sorting") {
      const arr = Array.from({length: 8}, () => Math.floor(Math.random() * 100));
      rand = JSON.stringify(arr);
    } else if (cat === "Arrays" || cat === "Two Pointer") {
      // Typically needs array + target or just array
      if (algorithm.defaultInput.includes("target")) {
        const arr = Array.from({length: 7}, () => Math.floor(Math.random() * 20)).sort((a,b) => a-b);
        const target = arr[Math.floor(Math.random() * arr.length)] + (Math.random() > 0.5 ? 0 : 1);
        rand = JSON.stringify({ array: arr, target });
      } else {
        const arr = Array.from({length: 7}, () => Math.floor(Math.random() * 50));
        rand = JSON.stringify(arr);
      }
    } else if (cat === "Trees") {
      // generate random tree array representation
      const size = Math.floor(Math.random() * 5) + 3;
      const arr = [];
      for (let i=0; i<size; i++) {
        arr.push(Math.random() > 0.2 ? Math.floor(Math.random() * 20) : null);
      }
      // ensure root isn't null
      if (arr[0] === null) arr[0] = 5;
      
      if (algorithm.defaultInput.includes("tree")) {
        rand = JSON.stringify({ tree: JSON.stringify(arr), mode: "inorder" });
      } else if (algorithm.id === "bst-search") {
        rand = JSON.stringify({ tree: "[4,2,7,1,3,null,9]", target: Math.random() > 0.5 ? 7 : 5 });
      } else {
        rand = JSON.stringify(arr);
      }
    } else if (cat === "Recursion") {
      if (algorithm.id === "fibonacci" || algorithm.id === "factorial") {
        rand = String(Math.floor(Math.random() * 5) + 3);
      }
    }
    
    handleChange(rand);
  };

  return (
    <div className="flex flex-col gap-2 p-3 shrink-0 h-full">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
        <span className="panel-label">Input</span>
      </div>

      <textarea
        value={rawInput}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRun();
        }}
        rows={2}
        className={cn(
          "w-full flex-1 resize-none rounded-lg border bg-slate-50 px-3 py-2",
          "font-mono text-xs text-slate-800 outline-none transition-colors shadow-inner",
          "placeholder:text-slate-400",
          error
            ? "border-red-400 focus:border-red-500"
            : valid
            ? "border-emerald-400 focus:border-emerald-500"
            : "border-slate-200 focus:border-indigo-400"
        )}
        placeholder={algorithm.defaultInput}
        spellCheck={false}
      />

      {error && (
        <div className="flex items-start gap-1.5 text-red-600 text-[11px] font-medium">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {valid && !error && (
        <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Valid input
        </div>
      )}

      <div className="flex gap-2 w-full mt-1">
        <button
          onClick={handleRandomize}
          title="Generate Random Input"
          className="flex-shrink-0 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
        >
          <Dices className="w-4 h-4" />
        </button>
        <button
          onClick={handleRun}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all border",
            error
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-sm hover:shadow-md"
          )}
        >
          Run ⌘↵
        </button>
      </div>
    </div>
  );
}

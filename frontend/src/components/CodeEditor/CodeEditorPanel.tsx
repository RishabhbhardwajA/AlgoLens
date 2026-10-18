import { useEffect, useRef, useCallback, useState } from "react";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { Code2, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

const LANG_MAP: Record<string, string> = {
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
};

export function CodeEditorPanel() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStep = useCurrentStep();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [activeLang, setActiveLang] = useState<string>("typescript");

  // Sync active language when algorithm changes
  useEffect(() => {
    if (algorithm) {
      if (typeof algorithm.sourceCode === "object" && algorithm.sourceCode["typescript"]) {
        setActiveLang("typescript");
      } else {
        setActiveLang(algorithm.language);
      }
    }
  }, [algorithm]);

  const highlightLine = useCallback(
    (lineNumber: number) => {
      const ed = editorRef.current;
      const monaco = monacoRef.current;
      if (!ed || !monaco) return;

      // Clear old decorations
      decorationsRef.current = ed.deltaDecorations(decorationsRef.current, []);

      if (lineNumber <= 0) return;

      // Apply highlight decoration
      decorationsRef.current = ed.deltaDecorations([], [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: "code-line-active",
            linesDecorationsClassName: "active-line-gutter",
            overviewRuler: {
              color: "#6366f1",
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        },
      ]);

      // Scroll to line
      ed.revealLineInCenterIfOutsideViewport(lineNumber);
    },
    []
  );

  useEffect(() => {
    if (currentStep) {
      highlightLine(currentStep.line);
    } else {
      // Clear decorations
      if (editorRef.current) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );
      }
    }
  }, [currentStep, highlightLine]);

  if (!algorithm) {
    return (
      <div className="flex flex-col h-full panel shadow-xl">
        <PanelHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          No algorithm selected
        </div>
      </div>
    );
  }

  const isMultiLang = algorithm && typeof algorithm.sourceCode === "object";
  const sourceCodeStr = isMultiLang 
    ? (algorithm.sourceCode as Record<string, string>)[activeLang] 
    : (algorithm.sourceCode as string);
  
  // Disable line highlighting if not viewing the executed language (usually TS)
  const isExecutingLang = !isMultiLang || activeLang === "typescript" || activeLang === algorithm.language;

  return (
    <div className="flex flex-col h-full panel shadow-sm overflow-hidden rounded-xl bg-white/80">
      <PanelHeader 
        activeLang={activeLang} 
        setActiveLang={setActiveLang}
        availableLangs={isMultiLang ? Object.keys(algorithm.sourceCode as object) : [algorithm.language]}
      />
      {currentStep && isExecutingLang && (
        <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 text-[11px] font-mono text-indigo-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Line {currentStep.line} — {currentStep.functionName}()
        </div>
      )}
      <div className="flex-1 overflow-hidden relative" style={{ background: "#FAFAFA" }}>
        <MonacoEditor
          height="100%"
          language={activeLang === "cpp" ? "cpp" : activeLang}
          value={sourceCodeStr}
          theme="algolens-light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            folding: false,
            lineDecorationsWidth: 8,
            overviewRulerLanes: 1,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "hidden",
              horizontal: "auto",
              useShadows: false,
            },
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "none",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            contextmenu: false,
          }}
          onMount={(ed, monaco) => {
            editorRef.current = ed;
            monacoRef.current = monaco;

            // Custom light theme
            monaco.editor.defineTheme("algolens-light", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#00000000",
                "editor.lineHighlightBackground": "#00000000",
                "editor.lineHighlightBorder": "#00000000",
                "editorLineNumber.foreground": "#94A3B8",
                "editorLineNumber.activeForeground": "#6366F1",
                "editorGutter.background": "#00000000",
              },
            });
            monaco.editor.setTheme("algolens-light");

            // Initial highlight if applicable
            if (currentStep && isExecutingLang) highlightLine(currentStep.line);
          }}
        />
      </div>
      
      {/* Editor Status Strip */}
      <div className="h-6 px-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest text-slate-500">
        <div className="flex items-center space-x-3">
          <span className="text-indigo-600">{LANG_MAP[activeLang] || activeLang}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", isExecutingLang ? "bg-indigo-500" : "bg-slate-300")}></span>
          <span>{isExecutingLang ? "AST Synced" : "Read Only"}</span>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ 
  activeLang, 
  setActiveLang, 
  availableLangs 
}: { 
  activeLang?: string; 
  setActiveLang?: (l: string) => void;
  availableLangs?: string[];
}) {
  return (
    <div className="h-9 px-3 bg-white/90 border-b border-slate-200 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.4)]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]"></span>
        </div>
        
        {availableLangs && setActiveLang && activeLang && (
          <div className="flex items-center gap-1 ml-2">
            {availableLangs.map(l => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase transition-all duration-200",
                  activeLang === l 
                    ? "bg-slate-100 text-indigo-700 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"
                )}
              >
                {LANG_MAP[l] || l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

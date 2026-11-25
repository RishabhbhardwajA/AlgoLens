import { useEffect, useRef, useCallback, useState } from "react";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { cn } from "@/utils/cn";

const LANG_MAP: Record<string, string> = {
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
};

function defineAlgoLensTheme(monaco: Monaco) {
  monaco.editor.defineTheme("algolens-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#00000000",
      "editor.lineHighlightBackground": "#00000000",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#64748B",
      "editorLineNumber.activeForeground": "#4648D4",
      "editorGutter.background": "#00000000",
    },
  });
}

export function CodeEditorPanel() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStep = useCurrentStep();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [activeLang, setActiveLang] = useState<string>("typescript");

  useEffect(() => {
    if (algorithm) {
      if (typeof algorithm.sourceCode === "object" && algorithm.sourceCode["typescript"]) {
        setActiveLang("typescript");
      } else {
        setActiveLang(algorithm.language);
      }
    }
  }, [algorithm]);

  const isMultiLang = Boolean(algorithm && typeof algorithm.sourceCode === "object");
  const isExecutingLang = Boolean(
    algorithm && (!isMultiLang || activeLang === "typescript" || activeLang === algorithm.language)
  );

  const highlightLine = useCallback((lineNumber: number) => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, []);
    if (lineNumber <= 0) return;

    const lineCount = ed.getModel()?.getLineCount() ?? lineNumber;
    const safeLine = Math.min(Math.max(1, lineNumber), Math.max(1, lineCount));

    decorationsRef.current = ed.deltaDecorations([], [
      {
        range: new monaco.Range(safeLine, 1, safeLine, 1),
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

    ed.revealLineInCenterIfOutsideViewport(safeLine);
  }, []);

  useEffect(() => {
    if (currentStep && isExecutingLang) {
      highlightLine(currentStep.line);
    } else if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [currentStep, isExecutingLang, activeLang, highlightLine]);

  if (!algorithm) {
    return (
      <div className="flex flex-col h-full panel rounded-3xl overflow-hidden shadow-xl">
        <PanelHeader />
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
          No algorithm selected
        </div>
      </div>
    );
  }

  const sourceCodeStr = isMultiLang
    ? (algorithm.sourceCode as Record<string, string>)[activeLang]
    : (algorithm.sourceCode as string);

  return (
    <div className="flex flex-col h-full panel rounded-3xl overflow-hidden">
      <PanelHeader
        activeLang={activeLang}
        setActiveLang={setActiveLang}
        availableLangs={isMultiLang ? Object.keys(algorithm.sourceCode as object) : [algorithm.language]}
      />
      {currentStep && isExecutingLang && (
        <div className="px-3.5 py-1.5 bg-indigo-50/75 backdrop-blur-sm border-b border-indigo-200/50 text-[11px] font-mono text-indigo-800 font-semibold flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Line {currentStep.line} — {currentStep.functionName}()
        </div>
      )}
      <div className="flex-1 overflow-hidden relative bg-white/45 min-h-0">
        <AppErrorBoundary compact resetKey={`${algorithm.id}:${activeLang}`} title="Code view failed">
          <MonacoEditor
            height="100%"
            language={activeLang === "cpp" ? "cpp" : activeLang}
            value={sourceCodeStr}
            theme="algolens-light"
            beforeMount={defineAlgoLensTheme}
            loading={
              <StaticCodeFallback
                sourceCode={sourceCodeStr}
                activeLine={currentStep?.line}
                isExecuting={isExecutingLang}
              />
            }
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
                vertical: "auto",
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
              defineAlgoLensTheme(monaco);
              monaco.editor.setTheme("algolens-light");
              if (currentStep && isExecutingLang) highlightLine(currentStep.line);
            }}
          />
        </AppErrorBoundary>
      </div>

      {/* Editor Status Strip */}
      <div className="h-7 px-3.5 bg-white/60 backdrop-blur-md border-t border-slate-200/50 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest text-slate-600 shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-indigo-700">{LANG_MAP[activeLang] || activeLang}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-600">
          <span
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              isExecutingLang ? "bg-indigo-500" : "bg-slate-400"
            )}
          />
          <span>{isExecutingLang ? "AST Synced" : "Read Only"}</span>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  activeLang,
  setActiveLang,
  availableLangs,
}: {
  activeLang?: string;
  setActiveLang?: (l: string) => void;
  availableLangs?: string[];
}) {
  return (
    <div className="h-10 px-3.5 bg-white/55 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between shrink-0 overflow-x-auto scrollbar-hide">
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.4)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
        </div>

        {availableLangs && setActiveLang && activeLang && (
          <div className="flex items-center gap-0.5 p-0.5 rounded-full glass-capsule-track ml-1">
            {availableLangs.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => setActiveLang(l)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer whitespace-nowrap",
                  activeLang === l ? "glass-capsule-active" : "text-slate-600 hover:text-slate-900"
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

function StaticCodeFallback({
  sourceCode,
  activeLine,
  isExecuting,
}: {
  sourceCode: string;
  activeLine?: number;
  isExecuting?: boolean;
}) {
  const lines = (sourceCode || "").split("\n");
  return (
    <div className="w-full h-full overflow-auto font-mono text-[12px] leading-[20px] p-2 bg-white/45 select-text">
      {lines.map((lineText, idx) => {
        const lineNum = idx + 1;
        const isActive = isExecuting && activeLine === lineNum;
        return (
          <div
            key={lineNum}
            className={cn(
              "flex items-center min-h-[20px] rounded-xs px-1 font-mono transition-colors",
              isActive
                ? "bg-indigo-100/90 text-indigo-900 font-bold border-l-2 border-indigo-600 pl-1"
                : "text-slate-700 hover:bg-slate-100/60"
            )}
          >
            <span className="w-8 text-right pr-3 text-slate-600 select-none text-[11px] shrink-0">
              {lineNum}
            </span>
            <span className="whitespace-pre font-mono">{lineText || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

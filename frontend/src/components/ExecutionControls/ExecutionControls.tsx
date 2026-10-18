import { useEffect, useState } from "react";
import { useExecutionStore } from "@/engine/useExecutionController";
import { audioEngine } from "@/engine/audioEngine";
import { cn } from "@/utils/cn";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function ExecutionControls() {
  const {
    steps,
    currentStepIndex,
    isPlaying,
    speed,
    hasStarted,
    play,
    pause,
    next,
    prev,
    reset,
    jumpTo,
    setSpeed,
    runAlgorithm,
    algorithm,
    error,
    clearError,
  } = useExecutionStore();

  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= totalSteps - 1;
  const progress = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;

  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!soundEnabled || currentStepIndex < 0 || !steps[currentStepIndex]) return;

    if (currentStepIndex === totalSteps - 1) {
      audioEngine.playChime();
    } else {
      const step = steps[currentStepIndex];
      if (step.event.type === "CALL" || step.event.type === "PUSH") {
        audioEngine.playHum();
      } else {
        audioEngine.playClick();
      }
    }
  }, [currentStepIndex, steps, totalSteps, soundEnabled]);

  if (!algorithm) return null;

  return (
    <>
      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 shadow-lg backdrop-blur-md">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={clearError} className="p-1 hover:bg-red-100 rounded transition-colors">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
      <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.12)] max-w-[95%] overflow-x-auto scrollbar-hide">
        {/* Timeline Navigation Buttons */}
      <div className="flex items-center space-x-2">
        <ControlButton
          onClick={() => jumpTo(0)}
          disabled={!hasStarted || isFirstStep}
          title="Jump to start"
        >
          <SkipBack className="w-4 h-4" />
        </ControlButton>
        <ControlButton
          onClick={prev}
          disabled={!hasStarted || isFirstStep}
          title="Previous step (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </ControlButton>

        {/* Vibrant Play/Pause Quantum Button */}
        {!hasStarted ? (
          <button
            onClick={runAlgorithm}
            className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 transition-all"
            title="Run Algorithm"
          >
            <Play className="w-5 h-5 fill-white ml-1" />
          </button>
        ) : (
          <button
            onClick={isPlaying ? pause : play}
            disabled={isLastStep && !isPlaying}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95",
              isPlaying
                ? "bg-amber-500 text-white"
                : "bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            )}
            title="Toggle Execution (Spacebar)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-1" />
            )}
          </button>
        )}

        <ControlButton
          onClick={next}
          disabled={!hasStarted || isLastStep}
          title="Next step (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </ControlButton>
        
        <ControlButton
          onClick={() => jumpTo(totalSteps - 1)}
          disabled={!hasStarted || isLastStep}
          title="Jump to end"
        >
          <SkipForward className="w-4 h-4" />
        </ControlButton>
      </div>

      <div className="h-4 w-[1px] bg-slate-200"></div>

      {/* Scrubber Progress Bar & Step Counter */}
      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center space-x-1 font-sans text-[10px] uppercase tracking-wider text-indigo-600 w-[50px]">
          <span className="font-bold">{hasStarted ? currentStepIndex + 1 : 0}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-400 font-medium">{totalSteps}</span>
        </div>
        
        {/* Scrubber Track with Interactive Handle */}
        <div 
          className="relative w-24 sm:w-32 lg:w-28 xl:w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer group shrink-0"
          onClick={(e) => {
            if (!hasStarted) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const fraction = (e.clientX - rect.left) / rect.width;
            jumpTo(Math.round(fraction * (totalSteps - 1)));
          }}
        >
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
          {hasStarted && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-600 shadow-md border-2 border-white group-hover:scale-125 transition-transform"
              style={{ left: `${progress}%` }}
            />
          )}
        </div>
      </div>

      <div className="h-4 w-[1px] bg-slate-200"></div>

      {/* Execution Speed Selector */}
      <div className="flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors",
              speed === s
                ? "bg-indigo-100 text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {s}x
          </button>
        ))}
      </div>

        {/* Sound Toggle */}
        <div className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />
        <ControlButton
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            audioEngine.toggle(next);
          }}
          disabled={false}
          title={soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </ControlButton>
      </footer>
    </>
  );
}

function ControlButton({
  onClick,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-95",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

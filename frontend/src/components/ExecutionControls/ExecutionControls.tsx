import { useEffect, useState } from "react";
import { useExecutionStore } from "@/engine/useExecutionController";
import { audioEngine } from "@/engine/audioEngine";
import { cn } from "@/utils/cn";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
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

  const [soundEnabled, setSoundEnabled] = useState(() => audioEngine.isEnabled());

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

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(nextSpeed);
  };

  return (
    <>
      {error && (
        <div
          role="alert"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 bg-rose-50/95 text-rose-800 px-4 py-2 rounded-2xl border border-rose-200/90 shadow-xl backdrop-blur-xl max-w-[92%]"
        >
          <span className="text-xs sm:text-sm font-medium">{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss execution error"
            className="p-1 hover:bg-rose-100/80 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}
      <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 rounded-full bg-white/85 backdrop-blur-2xl border border-white/95 ring-1 ring-indigo-500/[0.08] shadow-[0_14px_38px_-6px_rgba(99,102,241,0.16),0_4px_12px_-2px_rgba(19,27,46,0.05)] max-w-[96%] overflow-x-auto scrollbar-hide">
        {/* Timeline Navigation Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </ControlButton>

          {!hasStarted ? (
            <button
              type="button"
              onClick={runAlgorithm}
              aria-label="Run Algorithm"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Run Algorithm"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isPlaying ? pause : play}
              disabled={isLastStep && !isPlaying}
              aria-label={isPlaying ? "Pause execution" : "Play execution"}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 cursor-pointer shrink-0",
                isPlaying
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              )}
              title="Toggle Execution (Spacebar)"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
              )}
            </button>
          )}

          <ControlButton
            onClick={next}
            disabled={!hasStarted || isLastStep}
            title="Next step"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </ControlButton>

          <ControlButton
            onClick={() => jumpTo(totalSteps - 1)}
            disabled={!hasStarted || isLastStep}
            title="Jump to end"
          >
            <SkipForward className="w-4 h-4" />
          </ControlButton>
        </div>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Scrubber Progress Bar & Step Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-0.5 font-sans text-[10px] uppercase tracking-wider text-indigo-700 min-w-[44px]">
            <span className="font-bold">{hasStarted ? currentStepIndex + 1 : 0}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-600 font-medium">{totalSteps}</span>
          </div>

          <div
            role="slider"
            tabIndex={0}
            aria-label="Execution step scrubber"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, totalSteps - 1)}
            aria-valuenow={Math.max(0, currentStepIndex)}
            onKeyDown={(e) => {
              if (!hasStarted || totalSteps <= 0) return;
              if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                prev();
              }
            }}
            className="relative w-16 sm:w-28 xl:w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={(e) => {
              if (!hasStarted || totalSteps <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              const targetIndex =
                totalSteps === 1
                  ? 0
                  : Math.min(totalSteps - 1, Math.max(0, Math.round(fraction * (totalSteps - 1))));
              jumpTo(targetIndex);
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

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Mobile Speed Cycle Pill (< sm) */}
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x, click to cycle`}
          className="sm:hidden px-2.5 py-1 rounded-full glass-capsule-track text-[10px] font-bold text-indigo-700 cursor-pointer shrink-0 whitespace-nowrap"
          title="Cycle playback speed"
        >
          {speed}x
        </button>

        {/* Desktop Execution Speed Selector (sm+) */}
        <div className="hidden sm:flex items-center p-0.5 rounded-full glass-capsule-track text-[10px] uppercase font-bold tracking-wider shrink-0">
          {SPEEDS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "px-2 py-0.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                speed === s ? "glass-capsule-active" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Sound Toggle */}
        <ControlButton
          onClick={() => {
            const nextEnabled = !soundEnabled;
            setSoundEnabled(nextEnabled);
            audioEngine.toggle(nextEnabled);
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-95 cursor-pointer shrink-0",
        "disabled:opacity-35 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

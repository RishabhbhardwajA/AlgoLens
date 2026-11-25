import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useChallengeStore } from "@/engine/useChallengeStore";
import { useExecutionStore } from "@/engine/useExecutionController";
import { useAuthStore } from "@/store/useAuthStore";
import { audioEngine } from "@/engine/audioEngine";
import { ModalPortal } from "@/components/common/ModalPortal";
import {
  Sparkles,
  Trophy,
  Flame,
  CheckCircle,
  XCircle,
  ArrowRight,
  HelpCircle,
  Volume2,
  VolumeX,
  Keyboard,
  X,
} from "lucide-react";

export function ChallengeModal() {
  const {
    isChallengeMode,
    setChallengeMode,
    activeChallenge,
    userAnswer,
    submitAnswer,
    skipChallenge,
    streak,
    score,
  } = useChallengeStore();

  const currentStepIndex = useExecutionStore((s) => s.currentStepIndex);
  const algorithmId = useExecutionStore((s) => s.algorithmId);
  const nextStep = useExecutionStore((s) => s.next);
  const recordChallengeAttempt = useAuthStore((s) => s.recordChallengeAttempt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [soundOn, setSoundOn] = useState(() => audioEngine.isEnabled());
  const [showXPBurst, setShowXPBurst] = useState(false);
  const xpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    };
  }, []);

  const handleToggleSound = () => {
    const newState = audioEngine.toggle();
    setSoundOn(newState);
  };

  const handleOptionClick = useCallback(
    (idx: number) => {
      if (userAnswer || !activeChallenge) return;
      const res = submitAnswer(idx);
      if (isAuthenticated && algorithmId) {
        void recordChallengeAttempt({
          algorithmId,
          stepIndex: currentStepIndex,
          challengeType: activeChallenge.type,
          selectedOption: activeChallenge.options[idx] ?? String(idx),
          correctOption:
            activeChallenge.options[activeChallenge.correctIndex] ??
            String(activeChallenge.correctIndex),
          isCorrect: res.isCorrect,
          xpEarned: res.xpEarned,
        });
      }
      if (res.isCorrect) {
        audioEngine.playChime();
        if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
        setShowXPBurst(true);
        xpTimerRef.current = setTimeout(() => setShowXPBurst(false), 1200);
      } else {
        audioEngine.playIncorrect();
      }
    },
    [
      userAnswer,
      activeChallenge,
      submitAnswer,
      isAuthenticated,
      algorithmId,
      recordChallengeAttempt,
      currentStepIndex,
    ]
  );

  const handleContinue = useCallback(() => {
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    setShowXPBurst(false);
    skipChallenge(currentStepIndex);
    nextStep();
  }, [skipChallenge, currentStepIndex, nextStep]);

  const handleSkip = useCallback(() => {
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    setShowXPBurst(false);
    skipChallenge(currentStepIndex);
    nextStep();
  }, [skipChallenge, currentStepIndex, nextStep]);

  const handleTurnOffQuiz = () => {
    setChallengeMode(false);
  };

  const isOpen = Boolean(isChallengeMode && activeChallenge);

  useEffect(() => {
    if (!isOpen || !activeChallenge) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleSkip();
        return;
      }

      if (!userAnswer) {
        const lower = e.key.toLowerCase();
        if (e.key === "1" || lower === "a") {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleOptionClick(0);
        } else if (e.key === "2" || lower === "b") {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleOptionClick(1);
        } else if ((e.key === "3" || lower === "c") && activeChallenge.options.length > 2) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleOptionClick(2);
        } else if ((e.key === "4" || lower === "d") && activeChallenge.options.length > 3) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleOptionClick(3);
        }
      } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, activeChallenge, userAnswer, handleOptionClick, handleContinue, handleSkip]);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={handleSkip}
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabel="Predict Next Step Challenge"
      dialogClassName="w-full max-w-md bg-white/92 backdrop-blur-2xl rounded-3xl p-5 border border-white/95 ring-1 ring-indigo-500/10 flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto"
      dialogStyle={{
        boxShadow: "0 24px 56px -12px rgba(99, 102, 241, 0.22), 0 4px 12px rgba(15, 23, 42, 0.05)",
      }}
    >
      {activeChallenge && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />

          {showXPBurst && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -24, scale: 1.15 }}
              exit={{ opacity: 0 }}
              className="absolute top-8 right-16 z-50 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{userAnswer?.xpEarned ?? activeChallenge.xp} XP</span>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200/70 text-indigo-600 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wider uppercase text-indigo-700">
                  Challenge Point
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate">Predict Next Step</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={soundOn ? "Mute sound effects" : "Unmute sound effects"}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors cursor-pointer"
                title={soundOn ? "Mute sound effects" : "Unmute sound effects"}
              >
                {soundOn ? (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {streak > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{streak}</span>
                </div>
              )}

              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold font-mono">
                <Trophy className="w-3 h-3 text-indigo-600" />
                <span>{score} XP</span>
              </div>

              <button
                type="button"
                onClick={handleSkip}
                aria-label="Skip question"
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors ml-0.5 cursor-pointer"
                title="Skip this question (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-sm font-semibold text-slate-900 leading-snug">
            {activeChallenge.question}
          </div>

          {activeChallenge.contextHint && (
            <div className="text-[11px] text-slate-700 bg-white/75 backdrop-blur-sm p-3 rounded-2xl border border-white/90 ring-1 ring-slate-200/60 font-sans">
              <span className="font-semibold text-slate-800">Interview Hint:</span>{" "}
              {activeChallenge.contextHint}
            </div>
          )}

          {/* Options */}
          <div className="flex flex-col gap-2">
            {activeChallenge.options.map((opt, idx) => {
              const isSelected = userAnswer?.selectedIndex === idx;
              const isCorrectAnswer = idx === activeChallenge.correctIndex;

              let btnStyle =
                "bg-white/75 hover:bg-indigo-50/75 hover:border-indigo-200 text-slate-800 border-white/90 ring-1 ring-slate-200/60";

              if (userAnswer) {
                if (isCorrectAnswer) {
                  btnStyle =
                    "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-xs ring-1 ring-emerald-300";
                } else if (isSelected) {
                  btnStyle = "bg-rose-50 border-rose-300 text-rose-800 line-through";
                } else {
                  btnStyle = "bg-white/55 border-slate-200/70 text-slate-500 opacity-70";
                }
              }

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={userAnswer !== null}
                  onClick={() => handleOptionClick(idx)}
                  className={`w-full p-2.5 rounded-2xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0 shadow-xs">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {userAnswer && isCorrectAnswer && (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {userAnswer && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {userAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 pt-2 border-t border-slate-200/50"
            >
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2 backdrop-blur-sm ${
                  userAnswer.isCorrect
                    ? "bg-emerald-50/90 text-emerald-900 border border-emerald-200/80"
                    : "bg-white/75 text-slate-800 border border-slate-200/80"
                }`}
              >
                {userAnswer.isCorrect ? (
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-[11px] mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span>
                      {userAnswer.isCorrect
                        ? `Correct! +${userAnswer.xpEarned} XP`
                        : "Interview Learning Point"}
                    </span>
                    {userAnswer.isCorrect && streak > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {streak}x Combo!
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-700">
                    {activeChallenge.explanation}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/50 font-mono text-indigo-100 hidden sm:inline">
                    Space
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/50">
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-600">
                <Keyboard className="w-3 h-3 text-slate-500" />
                Press 1–{activeChallenge.options.length} or Esc
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTurnOffQuiz}
                  className="text-[11px] text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                  title="Turn off quiz mode"
                >
                  Turn off Quiz
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
                >
                  Skip question →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ModalPortal>
  );
}

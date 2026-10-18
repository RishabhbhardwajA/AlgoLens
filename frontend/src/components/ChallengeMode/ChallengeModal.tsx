import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChallengeStore } from "@/engine/useChallengeStore";
import { useExecutionStore } from "@/engine/useExecutionController";
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
  PowerOff,
} from "lucide-react";
import {
  playCorrectChime,
  playIncorrectSound,
  toggleSound,
  isSoundEnabled,
} from "@/utils/soundEffects";

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
  const nextStep = useExecutionStore((s) => s.next);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showXPBurst, setShowXPBurst] = useState(false);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  const handleOptionClick = (idx: number) => {
    if (userAnswer) return; // Prevent double submit
    const res = submitAnswer(idx);
    if (res.isCorrect) {
      playCorrectChime();
      setShowXPBurst(true);
      setTimeout(() => setShowXPBurst(false), 1200);
    } else {
      playIncorrectSound();
    }
  };

  const handleContinue = () => {
    skipChallenge(currentStepIndex);
    nextStep();
  };

  const handleSkip = () => {
    // Safely record step as skipped so it never pops up again for this step, and advance
    skipChallenge(currentStepIndex);
    nextStep();
  };

  const handleTurnOffQuiz = () => {
    setChallengeMode(false);
  };

  // Keyboard navigation: 1-4 or A-D to select, Space or Enter to continue, Esc to skip
  useEffect(() => {
    if (!isChallengeMode || !activeChallenge) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
        return;
      }

      if (!userAnswer) {
        if (e.key === "1" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          handleOptionClick(0);
        } else if (e.key === "2" || e.key.toLowerCase() === "b") {
          e.preventDefault();
          handleOptionClick(1);
        } else if (e.key === "3" || e.key.toLowerCase() === "c") {
          if (activeChallenge.options.length > 2) {
            e.preventDefault();
            handleOptionClick(2);
          }
        } else if (e.key === "4" || e.key.toLowerCase() === "d") {
          if (activeChallenge.options.length > 3) {
            e.preventDefault();
            handleOptionClick(3);
          }
        }
      } else {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();
          handleContinue();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChallengeMode, activeChallenge, userAnswer, currentStepIndex]);

  if (!isChallengeMode || !activeChallenge) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-[3px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-indigo-100/90 flex flex-col gap-4 relative overflow-hidden"
          style={{
            boxShadow:
              "0 20px 45px -12px rgba(99, 102, 241, 0.2), 0 0 1px 1px rgba(226, 232, 240, 0.8)",
          }}
        >
          {/* Subtle Ambient Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />

          {/* Floating XP Burst particle */}
          {showXPBurst && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -24, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute top-8 right-16 z-50 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{activeChallenge.xp} XP</span>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <HelpCircle className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-indigo-600">
                  Challenge Point
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Predict Next Step
                </div>
              </div>
            </div>

            {/* Score, Streak, Sound Mute & Close X Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSound}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                title={soundOn ? "Mute sound effects" : "Unmute sound effects"}
              >
                {soundOn ? (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {streak > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                  <span>{streak}</span>
                </div>
              )}

              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono">
                <Trophy className="w-3 h-3 text-indigo-500" />
                <span>{score} XP</span>
              </div>

              {/* Close Button */}
              <button
                onClick={handleSkip}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5"
                title="Skip this question (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Question Body */}
          <div className="text-sm font-semibold text-slate-900 leading-snug">
            {activeChallenge.question}
          </div>

          {activeChallenge.contextHint && (
            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans">
              💡 <span className="font-semibold text-slate-700">Interview Hint:</span>{" "}
              {activeChallenge.contextHint}
            </div>
          )}

          {/* Interactive Options */}
          <div className="flex flex-col gap-2">
            {activeChallenge.options.map((opt, idx) => {
              const isSelected = userAnswer?.selectedIndex === idx;
              const isCorrectAnswer = idx === activeChallenge.correctIndex;

              let btnStyle =
                "bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-slate-700 border-slate-200";

              if (userAnswer) {
                if (isCorrectAnswer) {
                  btnStyle =
                    "bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold shadow-xs ring-1 ring-emerald-300";
                } else if (isSelected) {
                  btnStyle = "bg-rose-50 border-rose-300 text-rose-800 line-through";
                } else {
                  btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={userAnswer !== null}
                  onClick={() => handleOptionClick(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0 shadow-xs">
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

          {/* Feedback & Continue */}
          {userAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 pt-2 border-t border-slate-100"
            >
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  userAnswer.isCorrect
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-slate-50 text-slate-800 border border-slate-200"
                }`}
              >
                {userAnswer.isCorrect ? (
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <span className="text-amber-500 font-bold shrink-0">ℹ️</span>
                )}
                <div>
                  <div className="font-bold text-[11px] mb-0.5 flex items-center gap-1.5">
                    <span>
                      {userAnswer.isCorrect ? "Correct! +100 XP" : "Interview Learning Point"}
                    </span>
                    {userAnswer.isCorrect && streak > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                        {streak}x Combo!
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-600">
                    {activeChallenge.explanation}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Skip
                </button>

                <button
                  onClick={handleContinue}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <span>Continue</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-500/50 font-mono text-indigo-100 hidden sm:inline">
                    Space
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {!userAnswer && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <Keyboard className="w-3 h-3 text-slate-400" />
                Press 1, 2 or Esc
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTurnOffQuiz}
                  className="text-[11px] text-slate-400 hover:text-amber-700 transition-colors"
                  title="Turn off quiz mode"
                >
                  Turn off Quiz
                </button>

                <button
                  onClick={handleSkip}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Skip question →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

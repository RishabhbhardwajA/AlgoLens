import { Link } from "react-router-dom";
import type { AlgorithmMeta } from "@/data/algorithmMeta";
import { cn } from "@/utils/cn";
import { Clock, MemoryStick, ArrowRight } from "lucide-react";

const DIFFICULTY_STYLES = {
  Easy: { bg: "rgba(16, 185, 129, 0.12)", text: "#047857", border: "rgba(16, 185, 129, 0.25)" },
  Medium: { bg: "rgba(245, 158, 11, 0.12)", text: "#B45309", border: "rgba(245, 158, 11, 0.25)" },
  Hard: { bg: "rgba(239, 68, 68, 0.12)", text: "#B91C1C", border: "rgba(239, 68, 68, 0.25)" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Arrays": "#4338CA",
  "Two Pointer": "#0369A1",
  "Sorting": "#B45309",
  "Trees": "#047857",
  "Recursion": "#6D28D9",
  "Linked List": "#4338CA",
  "Stack": "#6D28D9",
  "Queue": "#047857",
  "Graphs": "#047857",
  "Dynamic Programming": "#BE123C",
};

interface AlgorithmCardProps {
  algorithm: AlgorithmMeta;
}

export function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const cardClassName = cn(
    "panel rounded-3xl p-5 flex flex-col gap-4 group transition-all duration-300 relative overflow-hidden border border-white/90 text-left",
    algorithm.implemented
      ? "cursor-pointer hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_16px_36px_-8px_rgba(99,102,241,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      : "opacity-55 cursor-not-allowed"
  );

  const innerContent = (
    <>
      {algorithm.implemented && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(56, 189, 248, 0.03) 100%)",
          }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold transition-colors" style={{ color: "#0F172A" }}>
            {algorithm.name}
          </h3>
          <span
            className="text-[11px] font-semibold"
            style={{ color: CATEGORY_COLORS[algorithm.category] ?? "#475569" }}
          >
            {algorithm.category}
          </span>
        </div>
        <span
          className="shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-sm"
          style={{
            background: DIFFICULTY_STYLES[algorithm.difficulty].bg,
            color: DIFFICULTY_STYLES[algorithm.difficulty].text,
            borderColor: DIFFICULTY_STYLES[algorithm.difficulty].border,
          }}
        >
          {algorithm.difficulty}
        </span>
      </div>

      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#475569" }}>
        {algorithm.description}
      </p>

      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1" style={{ color: "#475569" }}>
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span className="font-mono">{algorithm.timeComplexity}</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: "#475569" }}>
          <MemoryStick className="w-3 h-3" aria-hidden="true" />
          <span className="font-mono">{algorithm.spaceComplexity}</span>
        </div>
      </div>

      {algorithm.implemented ? (
        <div className="flex items-center gap-1.5 text-[11px] font-bold transition-all mt-auto px-3 py-1.5 rounded-full w-fit tracking-widest uppercase text-indigo-700 bg-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white">
          Visualize
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </div>
      ) : (
        <div className="text-[11px] font-bold tracking-widest uppercase mt-auto" style={{ color: "#475569" }}>
          Coming soon
        </div>
      )}
    </>
  );

  if (!algorithm.implemented) {
    return (
      <div className={cardClassName} aria-disabled="true">
        {innerContent}
      </div>
    );
  }

  return (
    <Link to={`/visualizer/${algorithm.id}`} className={cardClassName}>
      {innerContent}
    </Link>
  );
}

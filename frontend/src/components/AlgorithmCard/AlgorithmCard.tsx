import { useNavigate } from "react-router-dom";
import type { AlgorithmMeta } from "@/data/algorithmMeta";
import { cn } from "@/utils/cn";
import { Clock, MemoryStick, ArrowRight } from "lucide-react";

const DIFFICULTY_STYLES = {
  Easy: { bg: "rgba(16, 185, 129, 0.1)", text: "#059669", border: "rgba(16, 185, 129, 0.2)" },
  Medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#D97706", border: "rgba(245, 158, 11, 0.2)" },
  Hard: { bg: "rgba(239, 68, 68, 0.1)", text: "#DC2626", border: "rgba(239, 68, 68, 0.2)" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Arrays": "#6366F1", // Indigo
  "Two Pointer": "#38BDF8", // Sky blue
  "Sorting": "#F59E0B", // Amber
  "Trees": "#10B981", // Emerald
  "Recursion": "#8B5CF6", // Violet
  "Linked List": "#6366F1",
  "Stack": "#8B5CF6",
  "Queue": "#10B981",
  "Graphs": "#10B981",
  "Dynamic Programming": "#F43F5E", // Rose
};

interface AlgorithmCardProps {
  algorithm: AlgorithmMeta;
}

export function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => algorithm.implemented && navigate(`/visualizer/${algorithm.id}`)}
      className={cn(
        "panel p-5 flex flex-col gap-4 group transition-all duration-300 relative overflow-hidden",
        algorithm.implemented
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)]"
          : "opacity-50 cursor-not-allowed"
      )}
      style={algorithm.implemented ? { borderColor: "rgba(226, 232, 240, 0.9)" } : {}}
      onMouseEnter={e => {
        if (algorithm.implemented) {
          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
        }
      }}
      onMouseLeave={e => {
        if (algorithm.implemented) {
          e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.9)";
        }
      }}
    >
      {/* Background glow on hover */}
      {algorithm.implemented && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
             style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, transparent 100%)" }} />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold transition-colors" style={{ color: "#0F172A" }}>
            {algorithm.name}
          </h3>
          <span className="text-[11px] font-medium" style={{ color: CATEGORY_COLORS[algorithm.category] ?? "#64748B" }}>
            {algorithm.category}
          </span>
        </div>
        <span
          className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border"
          style={{
            background: DIFFICULTY_STYLES[algorithm.difficulty].bg,
            color: DIFFICULTY_STYLES[algorithm.difficulty].text,
            borderColor: DIFFICULTY_STYLES[algorithm.difficulty].border,
          }}
        >
          {algorithm.difficulty}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#64748B" }}>
        {algorithm.description}
      </p>

      {/* Complexity */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
          <Clock className="w-3 h-3" />
          <span className="font-mono">{algorithm.timeComplexity}</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: "#94A3B8" }}>
          <MemoryStick className="w-3 h-3" />
          <span className="font-mono">{algorithm.spaceComplexity}</span>
        </div>
      </div>

      {/* CTA */}
      {algorithm.implemented && (
        <div
          className="flex items-center gap-1.5 text-[11px] font-bold transition-all mt-auto px-3 py-1.5 rounded-full w-fit tracking-widest uppercase"
          style={{
            color: "#6366F1",
            background: "rgba(99, 102, 241, 0.08)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#6366F1";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
            e.currentTarget.style.color = "#6366F1";
          }}
        >
          Visualize
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {!algorithm.implemented && (
        <div className="text-[11px] font-bold tracking-widest uppercase mt-auto" style={{ color: "#94A3B8" }}>
          Coming soon
        </div>
      )}
    </div>
  );
}

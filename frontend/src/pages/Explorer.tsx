import { useState, useMemo } from "react";
import { AlgorithmCard } from "@/components/AlgorithmCard/AlgorithmCard";
import { ALGORITHM_META, CATEGORIES, type AlgorithmMeta } from "@/data/algorithmMeta";
import { Search } from "lucide-react";
import type { AlgorithmCategory, Difficulty } from "@/engine/executionTypes";
import { cn } from "@/utils/cn";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function Explorer() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AlgorithmCategory | "All">("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "All">("All");

  const filtered = useMemo(() => {
    return ALGORITHM_META.filter((alg: AlgorithmMeta) => {
      const matchesSearch =
        !search ||
        alg.name.toLowerCase().includes(search.toLowerCase()) ||
        alg.description.toLowerCase().includes(search.toLowerCase()) ||
        alg.tags.some((t) => t.includes(search.toLowerCase()));

      const matchesCategory =
        selectedCategory === "All" || alg.category === selectedCategory;

      const matchesDifficulty =
        selectedDifficulty === "All" || alg.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [search, selectedCategory, selectedDifficulty]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent">
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4"
            style={{
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#6366F1"
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Library
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: "#0F172A", letterSpacing: "-0.03em" }}
          >
            Algorithm Explorer
          </h1>
          <p className="font-medium text-lg max-w-2xl" style={{ color: "#475569" }}>
            {ALGORITHM_META.length} algorithms indexed · {ALGORITHM_META.filter((a) => a.implemented).length} simulated
          </p>
        </div>

      {/* Filters */}
      <div
        className="flex flex-col gap-6 mb-12 p-6 rounded-2xl shadow-sm"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          backdropFilter: "blur(12px)"
        }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search algorithms by name, category, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
            style={{
              background: "#F8FAFF",
              borderColor: "rgba(226, 232, 240, 0.9)",
              color: "#0F172A"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#6366F1";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.9)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {(["All", ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as AlgorithmCategory | "All")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border"
                )}
                style={{
                  background: selectedCategory === cat ? "rgba(99, 102, 241, 0.08)" : "#FFFFFF",
                  borderColor: selectedCategory === cat ? "rgba(99, 102, 241, 0.3)" : "rgba(226, 232, 240, 0.9)",
                  color: selectedCategory === cat ? "#6366F1" : "#64748B",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div className="flex gap-2">
            {(["All", ...DIFFICULTIES] as const).map((d) => {
              const isActive = selectedDifficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d as Difficulty | "All")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all shadow-sm"
                  )}
                  style={{
                    background: isActive 
                      ? (d === "Easy" ? "#ECFDF5" : d === "Medium" ? "#FFFBEB" : d === "Hard" ? "#FEF2F2" : "#F1F5F9")
                      : "#FFFFFF",
                    borderColor: isActive 
                      ? (d === "Easy" ? "#6EE7B7" : d === "Medium" ? "#FCD34D" : d === "Hard" ? "#FCA5A5" : "#94A3B8")
                      : (d === "Easy" ? "#A7F3D0" : d === "Medium" ? "#FDE68A" : d === "Hard" ? "#FECACA" : "rgba(226, 232, 240, 0.9)"),
                    color: isActive
                      ? (d === "Easy" ? "#059669" : d === "Medium" ? "#D97706" : d === "Hard" ? "#DC2626" : "#0F172A")
                      : (d === "Easy" ? "#10B981" : d === "Medium" ? "#F59E0B" : d === "Hard" ? "#EF4444" : "#64748B")
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6 flex items-center space-x-2">
        <div className="h-px flex-1" style={{ background: "rgba(226, 232, 240, 0.8)" }}></div>
        <div className="text-[10px] font-mono tracking-widest uppercase font-bold px-4" style={{ color: "#94A3B8" }}>
          {filtered.length} Match{filtered.length !== 1 ? "es" : ""} Found
        </div>
        <div className="h-px flex-1" style={{ background: "rgba(226, 232, 240, 0.8)" }}></div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((alg) => (
            <AlgorithmCard key={alg.id} algorithm={alg} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
          >
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "#0F172A" }}>No algorithms found</h3>
          <p style={{ color: "#64748B" }}>Try adjusting your filters or search query.</p>
        </div>
      )}
      </div>
    </div>
  );
}

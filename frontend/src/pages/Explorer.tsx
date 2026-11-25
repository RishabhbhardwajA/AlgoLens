import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AlgorithmCard } from "@/components/AlgorithmCard/AlgorithmCard";
import { ALGORITHM_META, CATEGORIES, type AlgorithmMeta } from "@/data/algorithmMeta";
import { Search } from "lucide-react";
import type { AlgorithmCategory, Difficulty } from "@/engine/executionTypes";
import { cn } from "@/utils/cn";
import { Footer } from "@/components/Footer/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildExplorerJsonLd } from "@/utils/seoSchemas";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  useDocumentMeta({
    title: `Algorithm Explorer — ${ALGORITHM_META.length} Interactive DSA Visualizers | AlgoLens`,
    description:
      "Browse interactive algorithm visualizers across Arrays, Two Pointers, Sorting, Binary Trees, Recursion, Linked Lists, Graphs, and Dynamic Programming.",
    keywords: [
      "algorithm explorer",
      "DSA visualizer library",
      "binary search",
      "merge sort",
      "tree traversal",
      "BFS",
    ],
    canonicalPath: "/explore",
    ogImage: "/og/explore.png",
    jsonLd: buildExplorerJsonLd(typeof window !== "undefined" ? window.location.origin : ""),
  });

  const initialQuery = searchParams.get("q") ?? "";
  const rawCat = searchParams.get("category");
  const initialCategory: AlgorithmCategory | "All" =
    rawCat && CATEGORIES.includes(rawCat as AlgorithmCategory)
      ? (rawCat as AlgorithmCategory)
      : "All";

  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<AlgorithmCategory | "All">(initialCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "All">("All");

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const cat = searchParams.get("category");
    setSearch(q);
    setSelectedCategory(
      cat && CATEGORIES.includes(cat as AlgorithmCategory) ? (cat as AlgorithmCategory) : "All"
    );
  }, [searchParams]);

  const updateUrlFilters = (nextSearch: string, nextCat: AlgorithmCategory | "All") => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextSearch.trim()) nextParams.set("q", nextSearch);
    else nextParams.delete("q");
    if (nextCat !== "All") nextParams.set("category", nextCat);
    else nextParams.delete("category");
    setSearchParams(nextParams, { replace: true });
  };

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
        className="flex flex-col gap-6 mb-12 p-6 rounded-3xl"
        style={{
          background: "rgba(255, 255, 255, 0.68)",
          border: "1px solid rgba(255, 255, 255, 0.9)",
          boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.07), 0 12px 32px -6px rgba(99, 102, 241, 0.07)",
          backdropFilter: "blur(24px) saturate(165%)",
          WebkitBackdropFilter: "blur(24px) saturate(165%)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search algorithms"
            placeholder="Search algorithms by name, category, or tag..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              updateUrlFilters(e.target.value, selectedCategory);
            }}
            className="w-full pl-11 pr-4 py-3 rounded-full border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all glass-input"
            style={{
              background: "rgba(255, 255, 255, 0.72)",
              borderColor: "rgba(255, 255, 255, 0.92)",
              boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(203, 213, 225, 0.65)",
              color: "#0F172A"
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {(["All", ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  const next = cat as AlgorithmCategory | "All";
                  setSelectedCategory(next);
                  updateUrlFilters(search, next);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                )}
                style={{
                  background: selectedCategory === cat ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.75)",
                  borderColor: selectedCategory === cat ? "rgba(99, 102, 241, 0.35)" : "rgba(255, 255, 255, 0.92)",
                  boxShadow: selectedCategory === cat ? "0 2px 8px rgba(99, 102, 241, 0.12)" : "0 0 0 1px rgba(203, 213, 225, 0.55)",
                  color: selectedCategory === cat ? "#4338CA" : "#475569",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div className="flex flex-wrap gap-2">
            {(["All", ...DIFFICULTIES] as const).map((d) => {
              const isActive = selectedDifficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d as Difficulty | "All")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all backdrop-blur-md shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  )}
                  style={{
                    background: isActive 
                      ? (d === "Easy" ? "rgba(236, 253, 245, 0.95)" : d === "Medium" ? "rgba(255, 251, 235, 0.95)" : d === "Hard" ? "rgba(254, 242, 242, 0.95)" : "rgba(241, 245, 249, 0.95)")
                      : "rgba(255, 255, 255, 0.75)",
                    borderColor: isActive 
                      ? (d === "Easy" ? "#6EE7B7" : d === "Medium" ? "#FCD34D" : d === "Hard" ? "#FCA5A5" : "#94A3B8")
                      : (d === "Easy" ? "#A7F3D0" : d === "Medium" ? "#FDE68A" : d === "Hard" ? "#FECACA" : "rgba(203, 213, 225, 0.7)"),
                    color: isActive
                      ? (d === "Easy" ? "#047857" : d === "Medium" ? "#B45309" : d === "Hard" ? "#B91C1C" : "#0F172A")
                      : (d === "Easy" ? "#047857" : d === "Medium" ? "#B45309" : d === "Hard" ? "#B91C1C" : "#475569")
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
        <div className="text-[10px] font-mono tracking-widest uppercase font-bold px-4" style={{ color: "#475569" }}>
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
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-xl shadow-sm"
            style={{ background: "rgba(255, 255, 255, 0.78)", border: "1px solid rgba(255, 255, 255, 0.92)" }}
          >
            <Search className="w-6 h-6 text-slate-500" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "#0F172A" }}>No algorithms found</h3>
          <p style={{ color: "#475569" }}>Try adjusting your filters or search query.</p>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
}

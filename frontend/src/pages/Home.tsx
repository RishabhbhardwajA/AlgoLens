import { Link } from "react-router-dom";
import { ArrowRight, Play, Zap, GitBranch, Layers, Network, Boxes, ChevronRight } from "lucide-react";
import { Footer } from "@/components/Footer/Footer";
import { ALGORITHM_META } from "@/data/algorithmMeta";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildHomeJsonLd } from "@/utils/seoSchemas";

const countByCategories = (cats: string[]) =>
  ALGORITHM_META.filter((alg) => cats.includes(alg.category)).length;

const CATEGORIES = [
  {
    icon: Boxes,
    title: "Two Pointers & Arrays",
    to: "/explore?category=Two%20Pointer",
    description: "Binary Search, Two Sum II, Container Water, Move Zeroes",
    complexity: "O(N)",
    count: countByCategories(["Arrays", "Two Pointer"]),
    color: "#B45309",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.22)",
  },
  {
    icon: GitBranch,
    title: "Binary Trees & BST",
    to: "/explore?category=Trees",
    description: "Level Order, Tree Traversals, Invert Tree, BST Search",
    complexity: "O(log N)",
    count: countByCategories(["Trees"]),
    color: "#047857",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.22)",
  },
  {
    icon: Layers,
    title: "Sorting Algorithms",
    to: "/explore?category=Sorting",
    description: "Merge Sort, Insertion Sort, Bubble Sort",
    complexity: "O(N log N)",
    count: countByCategories(["Sorting"]),
    color: "#4338CA",
    bg: "rgba(99, 102, 241, 0.08)",
    border: "rgba(99, 102, 241, 0.22)",
  },
  {
    icon: Network,
    title: "Linked Lists & Graphs",
    to: "/explore?category=Linked%20List",
    description: "Reverse Linked List, Floyd's Cycle, BFS Graph Traversal",
    complexity: "O(V + E)",
    count: countByCategories(["Linked List", "Graphs"]),
    color: "#0369A1",
    bg: "rgba(56, 189, 248, 0.09)",
    border: "rgba(56, 189, 248, 0.24)",
  },
  {
    icon: Zap,
    title: "Recursion & Call Stack",
    to: "/explore?category=Recursion",
    description: "Fibonacci Call Tree, Factorial Stack Frame",
    complexity: "O(2^N)",
    count: countByCategories(["Recursion"]),
    color: "#6D28D9",
    bg: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.22)",
  },
  {
    icon: Zap,
    title: "Dynamic Programming",
    to: "/explore?category=Dynamic%20Programming",
    description: "Climbing Stairs — Recursion Tree to O(N) DP Tabulation",
    complexity: "O(N)",
    count: countByCategories(["Dynamic Programming"]),
    color: "#BE123C",
    bg: "rgba(244, 63, 94, 0.08)",
    border: "rgba(244, 63, 94, 0.22)",
  },
];

const STATS = [
  { value: String(ALGORITHM_META.length), label: "Interactive Visualizers" },
  { value: "100%", label: "Step-by-Step Playback" },
  { value: "BYOC", label: "Custom Code Sandbox" },
  { value: "Free", label: "For College Students" },
];

export default function Home() {
  useDocumentMeta({
    title: "AlgoLens — Interactive DSA Visualizer & Step-by-Step Debugger",
    description:
      "See algorithms think in real-time. Step through Data Structures and Algorithms with synchronized code, live memory models, OpenJDK JDI traces, and Socratic AI tutoring.",
    keywords: [
      "DSA visualizer",
      "algorithm visualization",
      "data structures and algorithms",
      "Java JDI trace",
      "step by step debugger",
      "AlgoLens",
    ],
    canonicalPath: "/",
    ogImage: "/og-image.png",
    jsonLd: buildHomeJsonLd(typeof window !== "undefined" ? window.location.origin : ""),
  });

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ color: "#131B2E" }}>

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden px-6">
        {/* Vibrant pastel chromatic glass-refraction blooms behind hero */}
        <div className="absolute top-[16%] left-[18%] w-[460px] h-[460px] rounded-full pointer-events-none blur-[90px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 72%)" }} />
        <div className="absolute top-[12%] right-[12%] w-[460px] h-[460px] rounded-full pointer-events-none blur-[95px]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(99,102,241,0.14) 50%, transparent 75%)" }} />
        <div className="absolute bottom-[10%] right-[22%] w-[380px] h-[380px] rounded-full pointer-events-none blur-[95px]"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(167,139,250,0.14) 55%, transparent 78%)" }} />

        <div className="relative z-10 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Announcement chip — Frosted Crystal Capsule */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-[11px] font-semibold font-mono backdrop-blur-xl"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.62) 0%, rgba(224, 242, 254, 0.34) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.9)",
                color: "#0284C7",
                boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.25), inset 0 1.5px 1px rgba(255, 255, 255, 0.95), 0 8px 22px -4px rgba(56, 189, 248, 0.16)",
              }}>
              <Zap className="w-3 h-3" />
              ✨ Real-Time AST Diffing now live →
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
              style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
              See algorithms<br />
              <span style={{
                background: "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                think in real-time.
              </span>
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-md" style={{ color: "#475569" }}>
              Deconstruct complex data structures with frame-by-frame visual execution,
              interactive memory models, and synchronized multi-language code stepping.
            </p>

            <div className="flex flex-wrap gap-3.5 mb-10">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(70, 72, 212, 0.9) 0%, rgba(99, 102, 241, 0.8) 100%)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  boxShadow: "0 12px 28px -4px rgba(70, 72, 212, 0.42), inset 0 1.5px 1px rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(49, 46, 129, 0.25)",
                }}
              >
                <Play className="w-4 h-4" />
                Start Visualizing Free
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.56) 0%, rgba(255, 255, 255, 0.26) 100%)",
                  color: "#131B2E",
                  border: "1px solid rgba(255, 255, 255, 0.88)",
                  boxShadow: "inset 0 1.5px 1px rgba(255, 255, 255, 0.96), 0 0 0 1px rgba(99, 102, 241, 0.12), 0 10px 26px -6px rgba(99, 102, 241, 0.16)",
                  backdropFilter: "blur(22px) saturate(185%)",
                  WebkitBackdropFilter: "blur(22px) saturate(185%)",
                }}
              >
                Explore All {ALGORITHM_META.length} Algorithms
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-2.5 text-sm" style={{ color: "#475569" }}>
              <div className="flex -space-x-1.5">
                {["rgba(99,102,241,0.88)", "rgba(56,189,248,0.88)", "rgba(16,185,129,0.88)", "rgba(245,158,11,0.88)"].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white/90 backdrop-blur-sm"
                    style={{
                      background: c,
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), 0 2px 6px rgba(15,23,42,0.12)",
                    }} />
                ))}
              </div>
              <span>Trusted by <strong style={{ color: "#0F172A" }}>50,000+</strong> engineers & CS students</span>
            </div>
          </div>

          {/* Right — floating frosted crystal visualizer card */}
          <div className="relative hidden lg:block">
            {/* Soft gradient prism halo tucked directly under the glass card for vivid refraction */}
            <div
              className="absolute -inset-6 rounded-[2.5rem] pointer-events-none blur-2xl opacity-75"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.24), transparent 55%), radial-gradient(circle at 82% 78%, rgba(56, 189, 248, 0.24), transparent 55%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.10), transparent 65%)",
              }}
            />
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.52) 0%, rgba(248, 250, 255, 0.28) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.86)",
                boxShadow: "inset 0 1.5px 1.5px rgba(255, 255, 255, 0.96), 0 0 0 1px rgba(99, 102, 241, 0.12), 0 24px 56px -10px rgba(99, 102, 241, 0.22), 0 6px 16px rgba(15, 23, 42, 0.05)",
                backdropFilter: "blur(28px) saturate(200%)",
                WebkitBackdropFilter: "blur(28px) saturate(200%)",
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.65)",
                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.22) 100%)",
                  backdropFilter: "blur(14px)",
                }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
                </div>
                <span className="text-[11px] font-mono font-semibold" style={{ color: "#4648D4" }}>
                  Quicksort (Lomuto) — Step 7 / 24
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold backdrop-blur-md"
                  style={{
                    color: "#059669",
                    background: "rgba(16,185,129,0.14)",
                    border: "1px solid rgba(255,255,255,0.78)",
                    boxShadow: "0 0 0 1px rgba(16,185,129,0.22), inset 0 1px 0 rgba(255,255,255,0.7)",
                    borderRadius: 9999,
                    padding: "2px 9px",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  LIVE SANDBOX
                </div>
              </div>

              {/* Array bars mockup — Frosted Glass Prisms */}
              <div className="px-6 py-5">
                <div className="flex items-end gap-1.5 h-28 mb-4">
                  {[40, 70, 20, 90, 35, 60, 80, 25, 55, 45].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-xl transition-all duration-300 backdrop-blur-md"
                      style={{
                        height: `${h}%`,
                        background: i === 3
                          ? "linear-gradient(180deg, rgba(99,102,241,0.88) 0%, rgba(70,72,212,0.68) 100%)"
                          : i < 4
                          ? "linear-gradient(180deg, rgba(56,189,248,0.58) 0%, rgba(56,189,248,0.28) 100%)"
                          : i === 7
                          ? "linear-gradient(180deg, rgba(56,189,248,0.88) 0%, rgba(14,165,233,0.64) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(226,232,240,0.40) 100%)",
                        border: i === 3 || i === 7 ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.88)",
                        boxShadow: i === 3
                          ? "inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 16px -4px rgba(99,102,241,0.35)"
                          : i === 7
                          ? "inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 16px -4px rgba(56,189,248,0.35)"
                          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 6px rgba(15,23,42,0.04)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 text-[10px] font-mono font-semibold mb-4">
                  {[
                    { label: "pivot", color: "#4648D4", bg: "rgba(99, 102, 241, 0.14)" },
                    { label: "i = 3", color: "#0284C7", bg: "rgba(56, 189, 248, 0.16)" },
                    { label: "j = 7", color: "#059669", bg: "rgba(16, 185, 129, 0.15)" },
                  ].map(({ label, color, bg }) => (
                    <span key={label} className="px-2.5 py-0.5 rounded-full backdrop-blur-md"
                      style={{
                        background: bg,
                        color,
                        border: "1px solid rgba(255,255,255,0.82)",
                        boxShadow: `0 0 0 1px ${color}25, inset 0 1px 0 rgba(255,255,255,0.75)`,
                      }}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className="rounded-2xl p-3.5 text-[11px] font-mono leading-relaxed backdrop-blur-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.24) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.8)",
                    boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(99, 102, 241, 0.05)",
                  }}>
                  <span style={{ color: "#64748B" }}>{"// Partition: swap arr[i] and arr[j]"}</span><br />
                  <span style={{ color: "#4648D4" }}>{"if "}</span>
                  <span style={{ color: "#0F172A" }}>{"(arr[j] <= pivot) {"}</span><br />
                  <span style={{ color: "#0F172A" }}>{"  swap(arr, ++i, j);"}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] backdrop-blur-sm"
                    style={{
                      background: "rgba(99,102,241,0.16)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      color: "#4648D4",
                    }}>← active</span>
                </div>
              </div>
            </div>

            {/* Floating complexity crystal badge */}
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-full font-mono text-sm font-bold backdrop-blur-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(238,242,255,0.34) 100%)",
                border: "1px solid rgba(255,255,255,0.92)",
                boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.98), 0 0 0 1px rgba(99,102,241,0.18), 0 12px 30px -4px rgba(99,102,241,0.24)",
                backdropFilter: "blur(24px) saturate(200%)",
                WebkitBackdropFilter: "blur(24px) saturate(200%)",
                color: "#4338CA",
              }}>
              O(N log N) avg
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-8 px-6 backdrop-blur-xl"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0.34) 100%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.85)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: "#0F172A" }}>{value}</div>
              <div className="text-[13px]" style={{ color: "#475569" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Algorithm categories ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              Master every paradigm through visual mental models
            </h2>
            <p style={{ color: "#475569" }}>Interactive step-by-step execution for every major algorithm category</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map(({ icon: Icon, title, to, description, complexity, count, color, bg, border }) => (
              <Link
                key={title}
                to={to}
                className="group p-6 rounded-3xl transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.56) 0%, rgba(255, 255, 255, 0.30) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.88)",
                  boxShadow: "inset 0 1.5px 1px rgba(255, 255, 255, 0.95), 0 0 0 1px rgba(99, 102, 241, 0.08), 0 14px 34px -6px rgba(99, 102, 241, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)",
                  backdropFilter: "blur(24px) saturate(185%)",
                  WebkitBackdropFilter: "blur(24px) saturate(185%)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = border;
                  (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 1.5px 1px rgba(255, 255, 255, 0.98), 0 16px 38px -6px rgba(99, 102, 241, 0.16), 0 0 0 1px ${border}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.88)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1.5px 1px rgba(255, 255, 255, 0.95), 0 0 0 1px rgba(99, 102, 241, 0.08), 0 14px 34px -6px rgba(99, 102, 241, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)";
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xs"
                    style={{ background: bg, border: `1px solid ${border}` }}>
                    <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: bg, color, border: `1px solid ${border}` }}>
                    {complexity}
                  </span>
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5" style={{ color: "#0F172A" }}>{title}</h3>
                <p className="text-[13px] mb-4" style={{ color: "#475569" }}>{description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium" style={{ color: "#475569" }}>
                    {count} {count === 1 ? "algorithm" : "algorithms"}
                  </span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color }} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Play, Zap, GitBranch, Layers, Network, Binary, Boxes, ChevronRight } from "lucide-react";

const CATEGORIES = [
  {
    icon: Boxes,
    title: "Two Pointers & Arrays",
    description: "Binary Search, Two Sum II, Container Water, Move Zeroes",
    complexity: "O(N)",
    count: 9,
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.06)",
    border: "rgba(245, 158, 11, 0.15)",
  },
  {
    icon: GitBranch,
    title: "Binary Trees & BST",
    description: "Level Order, Tree Traversals, Invert Tree, BST Search",
    complexity: "O(log N)",
    count: 5,
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.06)",
    border: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: Layers,
    title: "Sorting Algorithms",
    description: "Merge Sort, Insertion Sort, Bubble Sort",
    complexity: "O(N log N)",
    count: 3,
    color: "#6366F1",
    bg: "rgba(99, 102, 241, 0.06)",
    border: "rgba(99, 102, 241, 0.15)",
  },
  {
    icon: Network,
    title: "Linked Lists & Graphs",
    description: "Reverse Linked List, Floyd's Cycle, BFS Graph Traversal",
    complexity: "O(V + E)",
    count: 3,
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.06)",
    border: "rgba(56, 189, 248, 0.15)",
  },
  {
    icon: Zap,
    title: "Recursion & Call Stack",
    description: "Fibonacci Call Tree, Factorial Stack Frame",
    complexity: "O(2^N)",
    count: 2,
    color: "#EC4899",
    bg: "rgba(236, 72, 153, 0.06)",
    border: "rgba(236, 72, 153, 0.15)",
  },
];

const STATS = [
  { value: "22", label: "Interactive Visualizers" },
  { value: "100%", label: "Step-by-Step Playback" },
  { value: "BYOC", label: "Custom Code Sandbox" },
  { value: "Free", label: "For College Students" },
];

export default function Home() {
  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ color: "#131B2E" }}>

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden px-6">
        {/* Subtle radial glow blobs */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Announcement chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-[11px] font-semibold font-mono"
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                color: "#0284C7",
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

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "#6366F1",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <Play className="w-4 h-4" />
                Start Visualizing Free
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-slate-50"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  color: "#0F172A",
                  border: "1px solid rgba(226, 232, 240, 0.9)",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                }}
              >
                Explore 140+ Algorithms
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-2 text-sm" style={{ color: "#64748B" }}>
              <div className="flex -space-x-1">
                {["#6366F1", "#38BDF8", "#10B981", "#F59E0B"].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ background: c }} />
                ))}
              </div>
              <span>Trusted by <strong style={{ color: "#0F172A" }}>50,000+</strong> engineers & CS students</span>
            </div>
          </div>

          {/* Right — floating visualizer card */}
          <div className="relative hidden lg:block">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                boxShadow: "0 8px 40px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(226, 232, 240, 0.7)", background: "rgba(250, 248, 255, 0.8)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[11px] font-mono font-semibold" style={{ color: "#6366F1" }}>
                  Quicksort (Lomuto) — Step 7 / 24
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold"
                  style={{ color: "#10B981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 9999, padding: "2px 8px" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  LIVE SANDBOX
                </div>
              </div>

              {/* Array bars mockup */}
              <div className="px-6 py-5">
                <div className="flex items-end gap-1.5 h-28 mb-4">
                  {[40, 70, 20, 90, 35, 60, 80, 25, 55, 45].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md transition-all duration-300"
                      style={{
                        height: `${h}%`,
                        background: i === 3
                          ? "#6366F1"
                          : i < 4
                          ? "rgba(56, 189, 248, 0.5)"
                          : i === 7
                          ? "#38BDF8"
                          : "rgba(226, 232, 240, 0.8)",
                        border: i === 3 ? "none" : "1px solid rgba(99,102,241,0.1)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 text-[10px] font-mono font-semibold mb-4">
                  {[
                    { label: "pivot", color: "#6366F1" },
                    { label: "i = 3", color: "#38BDF8" },
                    { label: "j = 7", color: "#10B981" },
                  ].map(({ label, color }) => (
                    <span key={label} className="px-2 py-0.5 rounded-full"
                      style={{ background: color + "15", color, border: `1px solid ${color}30` }}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className="rounded-lg p-3 text-[11px] font-mono leading-relaxed"
                  style={{ background: "rgba(241, 245, 249, 0.7)", border: "1px solid rgba(226, 232, 240, 0.7)" }}>
                  <span style={{ color: "#64748B" }}>{"// Partition: swap arr[i] and arr[j]"}</span><br />
                  <span style={{ color: "#6366F1" }}>{"if "}</span>
                  <span style={{ color: "#0F172A" }}>{"(arr[j] <= pivot) {"}</span><br />
                  <span style={{ color: "#0F172A" }}>{"  swap(arr, ++i, j);"}</span>
                  <span className="ml-2 px-1 rounded text-[10px]"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>← active</span>
                </div>
              </div>
            </div>

            {/* Floating complexity badge */}
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-xl font-mono text-sm font-bold"
              style={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(99,102,241,0.2)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.15)",
                color: "#6366F1",
              }}>
              O(N log N) avg
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-8 px-6" style={{ borderTop: "1px solid rgba(226, 232, 240, 0.6)", borderBottom: "1px solid rgba(226, 232, 240, 0.6)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: "#0F172A" }}>{value}</div>
              <div className="text-[13px]" style={{ color: "#64748B" }}>{label}</div>
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
            <p style={{ color: "#64748B" }}>Interactive step-by-step execution for every major algorithm category</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map(({ icon: Icon, title, description, complexity, count, color, bg, border }) => (
              <Link
                key={title}
                to="/explore"
                className="group p-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  border: `1px solid rgba(226, 232, 240, 0.8)`,
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = border;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(15, 23, 42, 0.06), 0 0 0 1px ${border}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(226, 232, 240, 0.8)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)";
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: bg, border: `1px solid ${border}` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: bg, color, border: `1px solid ${border}` }}>
                    {complexity}
                  </span>
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5" style={{ color: "#0F172A" }}>{title}</h3>
                <p className="text-[13px] mb-4" style={{ color: "#64748B" }}>{description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>{count} algorithms</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6" style={{ borderTop: "1px solid rgba(226, 232, 240, 0.6)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366F1, #38BDF8)" }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>AlgoLens</span>
          </div>
          <p className="text-[12px]" style={{ color: "#94A3B8" }}>
            © 2026 AlgoLens — Visualize. Understand. Master.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold"
            style={{ color: "#10B981" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}

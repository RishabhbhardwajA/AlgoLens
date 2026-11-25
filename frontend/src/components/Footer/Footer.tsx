import { Link } from "react-router-dom";
import { Logo } from "@/components/common/Logo";

const FOOTER_LINKS = [
  { to: "/explore", label: "Explore Algorithms" },
  { to: "/visualizer/binary-search", label: "Binary Search" },
  { to: "/visualizer/merge-sort", label: "Merge Sort" },
  { to: "/playground", label: "Java JDI Sandbox" },
  { to: "/race", label: "Big-O Race" },
  { to: "/builder", label: "Graph Builder" },
];

export function Footer() {
  return (
    <footer
      className="py-10 px-6 bg-white/55 backdrop-blur-2xl"
      style={{ borderTop: "1px solid rgba(255, 255, 255, 0.85)", boxShadow: "0 -1px 0 rgba(99, 102, 241, 0.06)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo linkHome variant="full" size="sm" tone="light" showSubtitle />

          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-white/75 px-3 py-1 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-50/75 border border-emerald-200/70 backdrop-blur-sm"
            style={{ color: "#059669" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            All systems operational
          </div>
        </div>

        <div className="text-center md:text-left border-t border-slate-200/50 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-[12px]" style={{ color: "#475569" }}>
            © 2026 AlgoLens — Visualize. Understand. Master.
          </p>
          <p className="text-[11px] text-slate-600">
            Interactive Data Structures, Algorithms &amp; Java JDI Debugger Stepping
          </p>
        </div>
      </div>
    </footer>
  );
}

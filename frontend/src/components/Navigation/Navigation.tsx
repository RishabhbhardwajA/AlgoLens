import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { Activity, User as UserIcon, Bookmark, Code2, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Problems" },
  { href: "/playground", label: "Code Sandbox" },
  { href: "/builder", label: "Graph Builder" },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header
      className="flex justify-between items-center w-full px-6 h-14 z-50 sticky top-0 left-0"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(99, 102, 241, 0.04)",
      }}
    >
      <div className="flex items-center gap-6 flex-1">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #6366F1, #38BDF8)",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
            }}
          >
            <Activity className="w-4 h-4 text-white relative z-10" />
          </div>
          <span className="text-xl font-bold tracking-tight font-sans" style={{ color: "#131B2E" }}>
            AlgoLens
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              color: "#6366F1",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            v2.5
          </span>
        </Link>

        <div className="h-4 w-px hidden md:block" style={{ background: "rgba(226, 232, 240, 0.9)" }} />

        {/* Nav items */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "font-medium text-[13px] transition-all duration-150 py-1.5 px-3 rounded-lg",
                  isActive
                    ? "text-indigo-600 bg-indigo-50 font-semibold"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
                style={
                  isActive
                    ? { color: "#4648D4", background: "rgba(99, 102, 241, 0.08)" }
                    : {}
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right side Authentication Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Live badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span
            className="text-[10px] font-bold tracking-widest uppercase font-mono"
            style={{ color: "#059669" }}
          >
            Live Stepping
          </span>
        </div>

        {isAuthenticated && user ? (
          /* Logged In User Menu */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold font-sans"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #38BDF8)",
                }}
              >
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                {user.name.split(" ")[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{
                  boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Profile & Statistics</span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bookmarked Algorithms</span>
                  </Link>

                  <Link
                    to="/playground"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Code Sandbox</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Logged Out Buttons */
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              }}
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

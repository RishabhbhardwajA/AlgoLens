import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { User as UserIcon, Bookmark, Code2, LogOut, ChevronDown, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Logo } from "@/components/common/Logo";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Problems" },
  { href: "/playground", label: "Code Sandbox" },
  { href: "/race", label: "Big-O Race" },
  { href: "/builder", label: "Graph Builder" },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close dropdown & mobile drawer on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (
        mobileMenuOpen &&
        mobileDrawerRef.current &&
        !mobileDrawerRef.current.contains(target) &&
        !mobileToggleRef.current?.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="w-full px-2 sm:px-5 h-14 flex items-center z-50 sticky top-0 left-0 bg-transparent pointer-events-none">
      <div
        className="pointer-events-auto flex justify-between items-center w-full h-11 px-3 sm:px-5 rounded-full transition-all gap-2"
        style={{
          background: "rgba(255, 255, 255, 0.78)",
          backdropFilter: "blur(24px) saturate(175%)",
          WebkitBackdropFilter: "blur(24px) saturate(175%)",
          border: "1px solid rgba(255, 255, 255, 0.92)",
          boxShadow:
            "0 0 0 1px rgba(99, 102, 241, 0.08), 0 10px 30px -6px rgba(99, 102, 241, 0.12), 0 2px 8px -1px rgba(19, 27, 46, 0.04)",
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Logo linkHome variant="full" size="sm" tone="light" />
            <span
              className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full font-mono backdrop-blur-sm whitespace-nowrap"
              style={{
                background: "rgba(238, 154, 44, 0.12)",
                color: "#9A3412",
                border: "1px solid rgba(238, 154, 44, 0.3)",
              }}
            >
              v2.5
            </span>
          </div>

          <div
            className="h-4 w-px hidden lg:block shrink-0"
            style={{ background: "rgba(203, 213, 225, 0.55)" }}
          />

          {/* Nav items — Floating Segmented Capsule Bar (lg+ to prevent 768px wrapping) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-0.5 p-1 rounded-full glass-capsule-track shrink-0"
          >
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive =
                href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    "font-medium text-[12.5px] transition-all duration-200 py-1 px-3 rounded-full whitespace-nowrap shrink-0",
                    isActive
                      ? "glass-capsule-active font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side Authentication Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live badge */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm whitespace-nowrap"
            style={{
              background: "rgba(16, 185, 129, 0.10)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span
              className="text-[10px] font-bold tracking-widest uppercase font-mono"
              style={{ color: "#047857" }}
            >
              Live Stepping
            </span>
          </div>

          {isAuthenticated && user ? (
            /* Logged In User Menu */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-white/80 hover:bg-white border border-white/90 ring-1 ring-slate-200/70 shadow-xs transition-all cursor-pointer"
              >
                {user.avatar_url && !avatarLoadError ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarLoadError(true)}
                    className="w-6 h-6 rounded-full object-cover border border-indigo-200"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold font-sans shadow-xs"
                    style={{
                      background: "linear-gradient(135deg, #6366F1, #38BDF8)",
                    }}
                  >
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2.5 w-60 rounded-3xl bg-white/92 backdrop-blur-2xl border border-white/95 ring-1 ring-indigo-500/[0.08] py-2 z-50 transition-all"
                  style={{
                    boxShadow:
                      "0 18px 42px -8px rgba(99, 102, 241, 0.16), 0 4px 12px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div className="px-4 py-2.5 border-b border-slate-200/50">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-600 truncate">{user.email}</p>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/profile?tab=overview"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Profile & Statistics</span>
                    </Link>

                    <Link
                      to="/profile?tab=analytics"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bookmarks & Activity</span>
                    </Link>

                    <Link
                      to="/playground"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 transition-colors"
                    >
                      <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Code Sandbox</span>
                    </Link>
                  </div>

                  <div className="p-1.5 pt-1 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50/80 transition-colors cursor-pointer text-left"
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
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                to="/login"
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white/80 transition-all whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                style={{
                  background: "linear-gradient(135deg, #4648D4, #6366F1)",
                  boxShadow: "0 4px 12px rgba(70, 72, 212, 0.28)",
                }}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile / Tablet Menu Toggle */}
          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-1.5 rounded-full text-slate-700 hover:text-slate-900 hover:bg-white/80 transition-colors cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          ref={mobileDrawerRef}
          className="pointer-events-auto lg:hidden absolute top-14 inset-x-3 mt-1.5 bg-white/92 backdrop-blur-2xl border border-white/95 ring-1 ring-indigo-500/[0.08] shadow-2xl rounded-3xl px-4 py-3.5 flex flex-col gap-1.5 z-50 max-h-[calc(100vh-4.5rem)] overflow-y-auto"
        >
          <div className="pb-2.5 mb-1 border-b border-slate-200/50 flex items-center justify-between">
            <Logo linkHome variant="full" size="xs" tone="light" showSubtitle />
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
              v2.5
            </span>
          </div>
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium py-2 px-3.5 rounded-full transition-colors",
                  isActive
                    ? "bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-200/60"
                    : "text-slate-700 hover:bg-white/80 hover:text-slate-900"
                )}
              >
                {label}
              </Link>
            );
          })}
          {!isAuthenticated && (
            <div className="sm:hidden pt-2 mt-1 border-t border-slate-200/50 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-full text-xs font-semibold text-slate-700 bg-slate-100/80 hover:bg-slate-200/80"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-full text-xs font-semibold text-white bg-indigo-600"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

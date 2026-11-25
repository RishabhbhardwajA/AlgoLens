import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import {
  Bookmark,
  CheckCircle,
  Code2,
  Trophy,
  User as UserIcon,
  Lock,
  LogOut,
  Calendar,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  Pin,
  Target,
  Brain,
} from "lucide-react";

export default function Profile() {
  useDocumentMeta({
    title: "Profile & Progress | AlgoLens",
    description: "Manage your AlgoLens learning progress, bookmarks, snippets, and account preferences.",
    canonicalPath: "/profile",
    noIndex: true,
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    bookmarks,
    progress,
    snippets,
    challengeStats,
    traceBookmarks,
    weakTopics,
    logout,
    updateProfile,
    changePassword,
    fetchBookmarks,
    fetchProgress,
    fetchSnippets,
    fetchChallengeStats,
    fetchTraceBookmarks,
    fetchWeakTopics,
    removeTraceBookmark,
    deleteSnippet,
    toggleBookmark,
  } = useAuthStore();

  type ProfileTab = "overview" | "traces" | "analytics" | "snippets" | "settings";
  const VALID_TABS: readonly ProfileTab[] = ["overview", "traces", "analytics", "snippets", "settings"];
  const rawTab = searchParams.get("tab") as ProfileTab | null;
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    rawTab && VALID_TABS.includes(rawTab) ? rawTab : "overview"
  );
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    const nextTab = searchParams.get("tab") as ProfileTab | null;
    if (nextTab && VALID_TABS.includes(nextTab)) {
      setActiveTab(nextTab);
    } else if (!nextTab) {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const selectTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  // Profile Edit Form State
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passMsg, setPassMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  useEffect(() => {
    fetchBookmarks();
    fetchProgress();
    fetchSnippets();
    fetchChallengeStats();
    fetchTraceBookmarks();
    fetchWeakTopics();
  }, []);

  useEffect(() => {
    setAvatarLoadError(false);
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsUpdatingProfile(true);

    const ok = await updateProfile({ name, bio });
    setIsUpdatingProfile(false);
    if (ok) {
      setProfileMsg({ text: "Profile details updated successfully!" });
    } else {
      const storeErr = useAuthStore.getState().error;
      setProfileMsg({ text: storeErr || "Failed to update profile.", error: true });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPassMsg({
        text: "New password must be at least 8 characters and include letters and numbers.",
        error: true,
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassMsg({ text: "New passwords do not match.", error: true });
      return;
    }

    setIsUpdatingPass(true);
    const ok = await changePassword(currentPassword, newPassword);
    setIsUpdatingPass(false);

    if (ok) {
      setPassMsg({ text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      const storeErr = useAuthStore.getState().error;
      setPassMsg({ text: storeErr || "Failed to change password.", error: true });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header Card */}
      <div
        className="rounded-3xl p-6 md:p-8 mb-8 backdrop-blur-2xl relative overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          border: "1px solid rgba(255, 255, 255, 0.92)",
          boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.08), 0 16px 40px -8px rgba(99, 102, 241, 0.12)",
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            {user?.avatar_url && !avatarLoadError ? (
              <img
                src={user.avatar_url}
                alt={user.name || "User avatar"}
                onError={() => setAvatarLoadError(true)}
                className="w-18 h-18 rounded-2xl object-cover shadow-md shadow-indigo-500/20 border border-white/90 shrink-0"
              />
            ) : (
              <div
                className="w-18 h-18 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-sans shadow-md shadow-indigo-500/20 shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #38BDF8)",
                }}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AL"}
              </div>
            )}

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50/90 text-indigo-700 border border-indigo-200/80">
                  {user?.role === "student" ? "DSA Scholar" : user?.role}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">{user?.email}</p>
              {user?.bio && <p className="text-sm text-slate-700 mt-2 max-w-lg">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-rose-600 bg-rose-50/85 hover:bg-rose-100 border border-rose-200/80 backdrop-blur-sm transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/50">
          <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/90 ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Bookmark className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bookmarked
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{bookmarks.length}</div>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/90 ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {progress.filter((p) => p.completed === 1).length}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/90 ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 text-sky-600 mb-1">
              <Code2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Code Snippets
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{snippets.length}</div>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/90 ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Prediction Accuracy
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {challengeStats && challengeStats.totalAttempts > 0
                ? `${challengeStats.accuracyPercent}%`
                : progress.filter((p) => p.quiz_score > 0).length > 0
                ? `${Math.round(
                    progress.reduce((acc, curr) => acc + curr.quiz_score, 0) /
                      progress.filter((p) => p.quiz_score > 0).length
                  )}%`
                : "—"}
            </div>
            {challengeStats && challengeStats.totalAttempts > 0 && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                {challengeStats.totalCorrect}/{challengeStats.totalAttempts} predictions ({challengeStats.totalXp} XP)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs — Responsive Glass Capsule Bar */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1.5 mb-6 rounded-2xl sm:rounded-full glass-capsule-track">
        <button
          onClick={() => selectTab("overview")}
          className={`py-1.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "glass-capsule-active"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          Bookmarked Algorithms ({bookmarks.length})
        </button>
        <button
          onClick={() => selectTab("traces")}
          className={`py-1.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "traces"
              ? "glass-capsule-active"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          Pinned Traces ({traceBookmarks.length})
        </button>
        <button
          onClick={() => selectTab("analytics")}
          className={`py-1.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "glass-capsule-active"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          Weak-Topic Diagnostics ({weakTopics.length})
        </button>
        <button
          onClick={() => selectTab("snippets")}
          className={`py-1.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "snippets"
              ? "glass-capsule-active"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          Saved Snippets ({snippets.length})
        </button>
        <button
          onClick={() => selectTab("settings")}
          className={`py-1.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "settings"
              ? "glass-capsule-active"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          Account Settings
        </button>
      </div>

      {/* Tab 1: Bookmarked Algorithms */}
      {activeTab === "overview" && (
        <div>
          {bookmarks.length === 0 ? (
            <div className="glass-surface rounded-3xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50/90 border border-indigo-200/70 text-indigo-600 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No bookmarked algorithms yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Explore the algorithm library and click the bookmark icon on any problem to review it later.
              </p>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] text-white text-xs font-semibold shadow-md shadow-indigo-500/25 hover:opacity-95 transition-all"
              >
                Browse Algorithm Library
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((algoId) => (
                <div
                  key={algoId}
                  className="glass-surface p-5 rounded-3xl hover:shadow-lg hover:shadow-indigo-500/[0.08] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold uppercase text-indigo-600 bg-indigo-50/90 border border-indigo-200/70 px-2.5 py-0.5 rounded-full">
                        Algorithm
                      </span>
                      <button
                        onClick={() => toggleBookmark(algoId)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50/70 transition-colors cursor-pointer"
                        title="Remove bookmark"
                      >
                        <Bookmark className="w-4 h-4 fill-indigo-600 text-indigo-600 hover:fill-rose-600 hover:text-rose-600" />
                      </button>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 capitalize">
                      {algoId.replace(/-/g, " ")}
                    </h4>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <Link
                      to={`/visualizer/${algoId}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
                    >
                      <span>Open Visualizer</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pinned Execution Traces */}
      {activeTab === "traces" && (
        <div>
          {traceBookmarks.length === 0 ? (
            <div className="glass-surface rounded-3xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50/90 border border-violet-200/70 text-violet-600 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Pin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No pinned trace steps yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Click "Pin Step" inside any Visualizer playback to save tricky variable snapshots for later review.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {traceBookmarks.map((tb) => {
                let parsedSnap: any = {};
                try {
                  parsedSnap = JSON.parse(tb.step_snapshot);
                } catch {}
                return (
                  <div
                    key={tb.id}
                    className="glass-surface p-5 rounded-3xl flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-violet-50/90 text-violet-700 border border-violet-200/80">
                          {tb.algorithm_id} • Step #{tb.step_index + 1}
                        </span>
                        <button
                          onClick={() => removeTraceBookmark(tb.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50/70 cursor-pointer"
                          title="Delete pinned step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs font-medium text-slate-800">{tb.note}</p>
                      {parsedSnap?.variables && (
                        <pre className="mt-2 p-3 rounded-2xl bg-slate-900/95 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-28 border border-slate-800">
                          {JSON.stringify(parsedSnap.variables, null, 2)}
                        </pre>
                      )}
                    </div>
                    <Link
                      to={`/visualizer/${tb.algorithm_id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <span>Replay in Visualizer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Weak-Topic Diagnostics */}
      {activeTab === "analytics" && (
        <div>
          {weakTopics.length === 0 ? (
            <div className="glass-surface rounded-3xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/70 text-amber-600 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No challenge diagnostics yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Enable Quiz Mode while stepping through algorithms to receive personalized topic diagnostics and practice recommendations.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {weakTopics.map((wt, i) => (
                <div
                  key={`${wt.algorithmId}-${wt.topic}-${i}`}
                  className="glass-surface p-5 rounded-3xl flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">{wt.topic}</h4>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        wt.accuracyPercent >= 80
                          ? "bg-emerald-50/90 text-emerald-700 border border-emerald-200/80"
                          : wt.accuracyPercent >= 50
                          ? "bg-amber-50/90 text-amber-700 border border-amber-200/80"
                          : "bg-rose-50/90 text-rose-700 border border-rose-200/80"
                      }`}
                    >
                      {wt.accuracyPercent}% Accuracy
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Algorithm: <span className="font-semibold text-slate-700">{wt.algorithmId}</span>{" "}
                    • {wt.attempts} attempts ({wt.mistakes} mistakes)
                  </div>
                  <p className="text-xs text-slate-700 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/90 ring-1 ring-slate-200/50 leading-relaxed">
                    {wt.recommendation}
                  </p>
                  <Link
                    to={`/visualizer/${wt.algorithmId}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Practice {wt.algorithmId.replace(/-/g, " ")}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Saved Snippets */}
      {activeTab === "snippets" && (
        <div>
          {snippets.length === 0 ? (
            <div className="glass-surface rounded-3xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50/90 border border-sky-200/70 text-sky-600 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No saved code snippets</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Write custom algorithms in the Code Sandbox and click "Save Snippet" to preserve your work.
              </p>
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] text-white text-xs font-semibold shadow-md shadow-indigo-500/25 hover:opacity-95 transition-all"
              >
                Go to Code Sandbox
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="glass-surface p-5 rounded-3xl hover:shadow-lg hover:shadow-indigo-500/[0.06] transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{snip.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Saved on {new Date(snip.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteSnippet(snip.id)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
                        title="Delete snippet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <pre className="bg-slate-900/95 text-slate-200 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto max-h-36 border border-slate-800">
                    <code>{snip.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account Settings */}
      {activeTab === "settings" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Details */}
          <div className="glass-surface p-6 rounded-3xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <span>Update Profile</span>
            </h3>

            {profileMsg && (
              <div
                className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 backdrop-blur-sm ${
                  profileMsg.error
                    ? "bg-rose-50/90 text-rose-700 border border-rose-200"
                    : "bg-emerald-50/90 text-emerald-700 border border-emerald-200"
                }`}
              >
                {profileMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Bio / Learning Goals
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="e.g. Aiming for Google SWE Summer 2027 internship"
                  className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isUpdatingProfile ? "Saving Profile..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          {user?.auth_provider === "google" ? (
            <div className="glass-surface p-6 rounded-3xl flex flex-col justify-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Google-Managed Sign-In</span>
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your account authenticates exclusively via Google OAuth, so there is no local password stored for this profile.
              </p>
            </div>
          ) : (
            <div className="glass-surface p-6 rounded-3xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Change Password</span>
              </h3>

              {passMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 backdrop-blur-sm ${
                    passMsg.error
                      ? "bg-rose-50/90 text-rose-700 border border-rose-200"
                      : "bg-emerald-50/90 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {passMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, letters + numbers"
                    className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2 glass-input rounded-xl text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPass}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#4648D4] to-[#6366F1] hover:opacity-95 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {isUpdatingPass ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
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
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const {
    user,
    stats,
    bookmarks,
    progress,
    snippets,
    logout,
    updateProfile,
    changePassword,
    fetchBookmarks,
    fetchProgress,
    fetchSnippets,
    deleteSnippet,
    toggleBookmark,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"overview" | "snippets" | "settings">("overview");

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
  }, []);

  useEffect(() => {
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
      setProfileMsg({ text: "Failed to update profile.", error: true });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 8) {
      setPassMsg({ text: "New password must be at least 8 characters.", error: true });
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
      setPassMsg({ text: "Current password was incorrect.", error: true });
    }
  };

  const handleLogout = () => {
    logout();
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
        className="rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-xl relative overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 4px 20px -4px rgba(99, 102, 241, 0.08)",
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar circle */}
            <div
              className="w-18 h-18 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-sans shadow-md"
              style={{
                background: "linear-gradient(135deg, #6366F1, #38BDF8)",
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "AL"}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                  {user?.role === "student" ? "DSA Scholar" : user?.role}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
              {user?.bio && <p className="text-sm text-slate-600 mt-2 max-w-lg">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Bookmark className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bookmarked
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{bookmarks.length}</div>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
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

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2 text-sky-600 mb-1">
              <Code2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Code Snippets
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{snippets.length}</div>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg Quiz Score
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {progress.filter((p) => p.quiz_score > 0).length > 0
                ? `${Math.round(
                    progress.reduce((acc, curr) => acc + curr.quiz_score, 0) /
                      progress.filter((p) => p.quiz_score > 0).length
                  )}%`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Bookmarked Algorithms ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab("snippets")}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === "snippets"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Saved Snippets ({snippets.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === "settings"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Account Settings
        </button>
      </div>

      {/* Tab 1: Bookmarked Algorithms */}
      {activeTab === "overview" && (
        <div>
          {bookmarks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No bookmarked algorithms yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Explore the algorithm library and click the bookmark icon on any problem to review it later.
              </p>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
              >
                Browse Algorithm Library
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((algoId) => (
                <div
                  key={algoId}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Algorithm
                      </span>
                      <button
                        onClick={() => toggleBookmark(algoId)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Remove bookmark"
                      >
                        <Bookmark className="w-4 h-4 fill-indigo-600 text-indigo-600 hover:fill-rose-600 hover:text-rose-600" />
                      </button>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 capitalize">
                      {algoId.replace(/-/g, " ")}
                    </h4>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
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

      {/* Tab 2: Saved Snippets */}
      {activeTab === "snippets" && (
        <div>
          {snippets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No saved code snippets</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Write custom algorithms in the Code Sandbox and click "Save Snippet" to preserve your work.
              </p>
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
              >
                Go to Code Sandbox
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:shadow-sm transition-all"
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete snippet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-36">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <span>Update Profile</span>
            </h3>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                  profileMsg.error
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
              >
                {isUpdatingProfile ? "Saving Profile..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Change Password</span>
            </h3>

            {passMsg && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                  passMsg.error
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPass}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
              >
                {isUpdatingPass ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

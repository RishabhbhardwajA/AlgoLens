import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/services/api";
import { Logo } from "@/components/common/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  useDocumentMeta({
    title: "Reset Password | AlgoLens",
    description: "Reset your AlgoLens password using your registered email token.",
    canonicalPath: "/forgot-password",
    noIndex: true,
  });
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSuccessMessage(res.message);
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token.trim()) {
      setError("Please enter the reset token.");
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must be at least 8 characters and include both letters and numbers.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(token.trim(), newPassword);
      setSuccessMessage(res.message);
      setStep("request");
      setToken("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-3xl p-8 backdrop-blur-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.76)",
            border: "1px solid rgba(255, 255, 255, 0.94)",
            boxShadow:
              "0 0 0 1px rgba(99, 102, 241, 0.08), 0 18px 48px -10px rgba(99, 102, 241, 0.14), 0 2px 8px rgba(15, 23, 42, 0.04)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo linkHome variant="full" size="md" tone="light" showSubtitle />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === "request"
                ? "Enter your email to receive a secure password reset token."
                : "Enter the reset token and your new password."}
            </p>
          </div>

          {/* Success / Error Messages */}
          {error && (
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-4 text-sm backdrop-blur-sm"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#DC2626",
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-4 text-sm backdrop-blur-sm"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                color: "#059669",
              }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === "reset" && (
            <div className="p-3.5 mb-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 backdrop-blur-sm">
              <p className="font-semibold">Check your email for your reset token</p>
              <p className="mt-1 text-[11px] text-indigo-700">
                Paste the reset token sent to your inbox (or printed in the backend server console during local development).
              </p>
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
                style={{
                  background: "linear-gradient(135deg, #4648D4, #6366F1)",
                  boxShadow: "0 6px 18px rgba(70, 72, 212, 0.3)",
                }}
              >
                {isLoading ? "Generating Token..." : "Send Reset Token"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Reset Token
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, letters + numbers"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setStep("request");
                  }}
                  className="px-4 py-2.5 rounded-full text-xs font-medium text-slate-700 bg-white/75 hover:bg-white border border-white/90 ring-1 ring-slate-200/70 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #4648D4, #6366F1)",
                    boxShadow: "0 6px 18px rgba(70, 72, 212, 0.3)",
                  }}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-6 text-xs text-slate-500">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

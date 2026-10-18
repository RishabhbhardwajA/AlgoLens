import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/services/api";
import { Activity, Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [demoToken, setDemoToken] = useState<string | null>(null);

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
      if (res.demoResetToken) {
        setDemoToken(res.demoResetToken);
        setToken(res.demoResetToken);
      }
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
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(token.trim(), newPassword);
      setSuccessMessage(res.message);
      setStep("request");
      setDemoToken(null);
      setToken("");
      setNewPassword("");
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
          className="rounded-2xl p-8 backdrop-blur-xl"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 10px 40px -10px rgba(99, 102, 241, 0.1), 0 1px 3px rgba(15, 23, 42, 0.05)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 group cursor-pointer">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #38BDF8)",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
                }}
              >
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                AlgoLens
              </span>
            </Link>
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
              className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 text-sm"
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
              className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 text-sm"
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

          {demoToken && step === "reset" && (
            <div className="p-3 mb-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
              <span className="font-semibold">Demo token generated:</span>
              <p className="font-mono text-[11px] break-all mt-1 bg-white p-1.5 rounded border border-indigo-100">
                {demoToken}
              </p>
              <p className="mt-1 text-[11px] text-indigo-700">Token has been auto-filled into the field below.</p>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
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

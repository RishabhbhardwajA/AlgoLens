import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RotateCw,
  ArrowLeft,
} from "lucide-react";

interface AuthFormPanelProps {
  initialMode?: "login" | "register";
  isModal?: boolean;
  onSuccessRedirect?: () => void;
}

export function AuthFormPanel({
  initialMode = "login",
  isModal = false,
  onSuccessRedirect,
}: AuthFormPanelProps) {
  const {
    login,
    register,
    verifyOtp,
    resendOtp,
    clearPendingOtp,
    completeAuthAndResume,
    pendingOtpEmail,
    otpCooldownSeconds,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register" | "otp">(
    pendingOtpEmail ? "otp" : initialMode
  );

  // Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState(pendingOtpEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // 6-digit OTP Boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const oauthPopupRef = useRef<Window | null>(null);
  const popupPollTimerRef = useRef<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(otpCooldownSeconds || 0);
  const [googlePending, setGooglePending] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (pendingOtpEmail) {
      setEmail(pendingOtpEmail);
      setMode("otp");
    } else {
      setMode(initialMode);
    }
  }, [pendingOtpEmail, initialMode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Listen for Google OAuth Popup Completion Message
  useEffect(() => {
    const trustedOrigins = new Set<string>([window.location.origin]);
    const metaEnv = (import.meta as ImportMeta & {
      env?: { VITE_API_URL?: string; DEV?: boolean };
    }).env;
    const configuredApi = metaEnv?.VITE_API_URL;
    if (configuredApi) {
      try {
        trustedOrigins.add(new URL(configuredApi, window.location.origin).origin);
      } catch {
        // Ignore invalid optional env URL
      }
    }
    if (metaEnv?.DEV) {
      trustedOrigins.add("http://localhost:5000");
      trustedOrigins.add("http://127.0.0.1:5000");
    }

    const clearPopupPoll = () => {
      if (popupPollTimerRef.current !== null) {
        window.clearInterval(popupPollTimerRef.current);
        popupPollTimerRef.current = null;
      }
    };

    const handleOAuthMessage = async (event: MessageEvent) => {
      if (!trustedOrigins.has(event.origin)) return;
      if (!oauthPopupRef.current || event.source !== oauthPopupRef.current) return;
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "ALGOLENS_OAUTH_SUCCESS") {
        clearPopupPoll();
        oauthPopupRef.current = null;
        setGooglePending(false);
        await completeAuthAndResume();
        if (onSuccessRedirect) onSuccessRedirect();
      } else if (event.data.type === "ALGOLENS_OAUTH_ERROR") {
        clearPopupPoll();
        oauthPopupRef.current = null;
        setGooglePending(false);
        setValidationError(event.data.message || "Google Sign-In failed.");
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      clearPopupPoll();
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, [completeAuthAndResume, onSuccessRedirect]);

  const handleModeSwitch = (nextMode: "login" | "register") => {
    clearError();
    setValidationError("");
    setInfoMessage("");
    setMode(nextMode);
  };

  const handleGoogleContinue = () => {
    clearError();
    setValidationError("");
    setGooglePending(true);

    if (popupPollTimerRef.current !== null) {
      window.clearInterval(popupPollTimerRef.current);
      popupPollTimerRef.current = null;
    }

    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `/api/auth/google?mode=popup&origin=${encodeURIComponent(window.location.origin)}`,
      "AlgoLensGoogleAuth",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup || popup.closed) {
      oauthPopupRef.current = null;
      setGooglePending(false);
      setValidationError(
        "Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again."
      );
      return;
    }

    oauthPopupRef.current = popup;
    popupPollTimerRef.current = window.setInterval(() => {
      if (!oauthPopupRef.current || oauthPopupRef.current.closed) {
        if (popupPollTimerRef.current !== null) {
          window.clearInterval(popupPollTimerRef.current);
          popupPollTimerRef.current = null;
        }
        oauthPopupRef.current = null;
        setGooglePending(false);
      }
    }, 500);
  };

  // Live password strength helpers
  const hasMinLen = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 ? password === confirmPassword : true;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    if (!email.trim()) {
      setValidationError("Please enter your email address.");
      return;
    }
    if (!password) {
      setValidationError("Please enter your password.");
      return;
    }

    const ok = await login(email.trim(), password);
    if (ok && onSuccessRedirect) {
      onSuccessRedirect();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    if (name.trim().length < 2) {
      setValidationError("Name must be at least 2 characters long.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!hasMinLen || !hasLetter || !hasNumber) {
      setValidationError("Password must be at least 8 characters with both letters and numbers.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    const res = await register(name.trim(), email.trim(), password, confirmPassword);
    if (res.ok && res.requiresOtp) {
      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setMode("otp");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } else if (res.ok && onSuccessRedirect) {
      onSuccessRedirect();
    }
  };

  const handleOtpDigitChange = (index: number, rawVal: string) => {
    const clean = rawVal.replace(/\D/g, "");
    if (!clean) {
      const copy = [...otpDigits];
      copy[index] = "";
      setOtpDigits(copy);
      return;
    }

    // Support pasting full 6-digit code
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split("");
      const filled = ["", "", "", "", "", ""];
      chars.forEach((c, idx) => {
        filled[idx] = c;
      });
      setOtpDigits(filled);
      const nextFocus = Math.min(chars.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const copy = [...otpDigits];
    copy[index] = clean;
    setOtpDigits(copy);
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setValidationError("Please enter the complete 6-digit verification code.");
      return;
    }
    const ok = await verifyOtp(email.trim(), code);
    if (ok && onSuccessRedirect) {
      onSuccessRedirect();
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || !email) return;
    clearError();
    setValidationError("");
    const res = await resendOtp(email);
    if (res.ok) {
      setCooldown(res.cooldownSeconds ?? 60);
      setInfoMessage("A fresh 6-digit verification code has been sent.");
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Primary CTA: Continue with Google */}
      {mode !== "otp" && (
        <>
          <button
            type="button"
            onClick={handleGoogleContinue}
            disabled={isLoading || googlePending}
            className="w-full py-2.5 px-4 rounded-full bg-white/85 hover:bg-white border border-white/95 ring-1 ring-slate-200/80 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2.5 shadow-xs transition-all hover:ring-indigo-300 cursor-pointer disabled:opacity-60"
          >
            {/* Multi-color Google G Logo SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.08.72-2.46 1.15-4.23 1.15-3.25 0-6-2.19-6.98-5.14H1.02v3.14C3.04 21.15 7.2 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.02 14c-.25-.74-.39-1.53-.39-2.34s.14-1.6.39-2.34V6.18H1.02A11.98 11.98 0 0 0 0 11.66c0 1.93.46 3.76 1.02 5.48L5.02 14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.2 0 3.04 2.85 1.02 7.01l4 3.14C6 6.94 8.75 4.75 12 4.75Z"
              />
            </svg>
            <span>{googlePending ? "Waiting for Google..." : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="h-px flex-1 bg-slate-200/75" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-slate-200/75" />
          </div>

          {/* Mode Tabs — Capsule Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-full glass-capsule-track text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeSwitch("login")}
              className={`py-1.5 rounded-full transition-all cursor-pointer ${
                mode === "login"
                  ? "glass-capsule-active"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("register")}
              className={`py-1.5 rounded-full transition-all cursor-pointer ${
                mode === "register"
                  ? "glass-capsule-active"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>
        </>
      )}

      {/* Error & Info Banners */}
      {(error || validationError) && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#DC2626",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{validationError || error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* FORM 1: SIGN IN */}
      {mode === "login" && (
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              {!isModal && (
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 cursor-pointer shadow-md"
            style={{
              background: "linear-gradient(135deg, #4648D4, #6366F1)",
              boxShadow: "0 6px 18px rgba(70, 72, 212, 0.3)",
            }}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* FORM 2: CREATE ACCOUNT (Email + Password + Confirm Password) */}
      {mode === "register" && (
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ chars, letters & numbers"
                className="w-full pl-10 pr-10 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-1.5 text-[11px] flex gap-3 px-1">
                <span className={hasMinLen ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                  ✓ 8+ chars
                </span>
                <span
                  className={hasLetter && hasNumber ? "text-emerald-600 font-semibold" : "text-slate-400"}
                >
                  ✓ Letters & numbers
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full pl-10 pr-10 py-2.5 glass-input rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                  !passwordsMatch
                    ? "!border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                    : ""
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!passwordsMatch && (
              <p className="text-xs text-rose-600 mt-1 font-medium">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !passwordsMatch}
            className="w-full py-2.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 cursor-pointer shadow-md"
            style={{
              background: "linear-gradient(135deg, #4648D4, #6366F1)",
              boxShadow: "0 6px 18px rgba(70, 72, 212, 0.3)",
            }}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Continue & Verify Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* FORM 3: 6-DIGIT EMAIL OTP VERIFICATION STEP */}
      {mode === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50/75 backdrop-blur-md border border-indigo-200/80 text-center">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm shadow-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Enter 6-Digit Verification Code</h3>
            <p className="text-xs text-slate-600 mt-1">
              Sent to <strong className="text-slate-800">{email}</strong>. Expires in 10 minutes.
            </p>
          </div>

          {/* 6-Box OTP Grid */}
          <div className="flex justify-center gap-2">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpInputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                aria-label={`Verification digit ${idx + 1}`}
                className="w-11 h-12 text-center text-lg font-mono font-bold rounded-xl glass-input border-2 border-slate-300/80 text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join("").length !== 6}
            className="w-full py-2.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            style={{
              background: "linear-gradient(135deg, #4648D4, #6366F1)",
              boxShadow: "0 6px 18px rgba(70, 72, 212, 0.3)",
            }}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                clearPendingOtp();
                setMode("register");
              }}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Edit Email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0}
              className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

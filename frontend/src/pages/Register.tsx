import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthFormPanel } from "@/components/Auth/AuthFormPanel";
import { Logo } from "@/components/common/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { mapOAuthErrorMessage } from "@/utils/oauthErrors";

export default function Register() {
  useDocumentMeta({
    title: "Create Free Account | AlgoLens",
    description: "Create an AlgoLens account to unlock Java JDI tracing, Gemini Socratic tutoring, and progress tracking.",
    canonicalPath: "/register",
    noIndex: true,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const oauthError = new URLSearchParams(location.search).get("oauthError");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient radial blooms */}
      <div
        className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)" }}
      />

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
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo linkHome variant="full" size="md" tone="light" showSubtitle />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Create Free Account</h1>
            <p className="text-xs text-slate-500 mt-1">
              Start mastering DSA with live JDI traces, predictions, and Gemini tutoring.
            </p>
          </div>

          {oauthError && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-700 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{mapOAuthErrorMessage(oauthError)}</span>
            </div>
          )}

          <AuthFormPanel
            initialMode="register"
            onSuccessRedirect={() => navigate("/", { replace: true })}
          />
        </div>
      </div>
    </div>
  );
}

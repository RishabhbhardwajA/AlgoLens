import { useAuthStore } from "@/store/useAuthStore";
import { AuthFormPanel } from "./AuthFormPanel";
import { Logo } from "@/components/common/Logo";
import { ModalPortal } from "@/components/common/ModalPortal";
import { X, Lock } from "lucide-react";

export function AuthModal() {
  const { authModalOpen, authModalMode, authModalReason, closeAuthModal } = useAuthStore();

  return (
    <ModalPortal
      isOpen={authModalOpen}
      onClose={closeAuthModal}
      ariaLabel="Sign in to Continue"
      backdropClassName="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/25 backdrop-blur-md"
      dialogClassName="w-full max-w-md bg-white/92 backdrop-blur-2xl rounded-3xl border border-white/95 ring-1 ring-indigo-500/10 shadow-[0_24px_60px_-12px_rgba(99,102,241,0.22)] relative max-h-[90vh] overflow-y-auto"
    >
      <button
        type="button"
        onClick={closeAuthModal}
        aria-label="Close sign in dialog"
        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors cursor-pointer z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-6 pb-2 text-center">
        <div className="flex justify-center mb-3">
          <Logo variant="icon" size="md" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Sign in to Continue</h2>
        {authModalReason && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 text-xs font-semibold backdrop-blur-sm">
            <Lock className="w-3 h-3" />
            <span>{authModalReason}</span>
          </div>
        )}
        <p className="text-[11px] text-slate-600 mt-1.5">
          Your unsaved code & custom inputs stay safe—your action runs automatically once signed in.
        </p>
      </div>

      <div className="p-6 pt-3">
        <AuthFormPanel
          initialMode={authModalMode === "register" ? "register" : "login"}
          isModal
        />
      </div>
    </ModalPortal>
  );
}

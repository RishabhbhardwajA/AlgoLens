import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface ModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  ariaLabel: string;
  backdropClassName?: string;
  dialogClassName?: string;
  dialogStyle?: React.CSSProperties;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Portals modals to document.body above navbar and frosted-panel stacking contexts,
 * preserving AnimatePresence exit transitions, Escape dismissal, and dialog ARIA attributes.
 */
export function ModalPortal({
  isOpen,
  onClose,
  ariaLabel,
  backdropClassName = "fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-slate-900/25 backdrop-blur-md",
  dialogClassName = "w-full max-w-lg bg-white/92 backdrop-blur-2xl rounded-3xl border border-white/95 ring-1 ring-indigo-500/10 shadow-[0_24px_60px_-12px_rgba(99,102,241,0.22)] flex flex-col max-h-[90vh] overflow-hidden",
  dialogStyle,
  closeOnEscape = true,
  closeOnBackdrop = true,
  children,
}: ModalPortalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, closeOnEscape, onClose]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={backdropClassName}
          onMouseDown={(e) => {
            if (closeOnBackdrop && onClose && e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={dialogClassName}
            style={dialogStyle}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return modalContent;
  }
  return createPortal(modalContent, document.body);
}

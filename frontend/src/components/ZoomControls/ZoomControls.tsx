import { useZoomStore } from "@/engine/useZoomStore";
import { Plus, Minus } from "lucide-react";

interface ZoomControlsProps {
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function ZoomControls({
  className = "",
  position = "top-left",
}: ZoomControlsProps) {
  const { zoom, pan, zoomIn, zoomOut, fitView } = useZoomStore();

  const positionClasses = {
    "top-left": "absolute top-3 left-3",
    "top-right": "absolute top-3 right-3",
    "bottom-left": "absolute bottom-16 left-3",
    "bottom-right": "absolute bottom-16 right-3",
  };

  const isTransformed = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

  return (
    <div
      className={`z-30 flex flex-col items-center bg-white border border-slate-200/90 rounded-lg shadow-xs overflow-hidden select-none ${
        position ? positionClasses[position] : ""
      } ${className}`}
      style={{
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.06), 0 0 1px rgba(15, 23, 42, 0.1)",
      }}
      data-no-pan="true"
    >
      {/* Zoom In (+) */}
      <button
        type="button"
        onClick={zoomIn}
        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100"
        title="Zoom In (+)"
        aria-label="Zoom In"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      {/* Zoom Out (−) */}
      <button
        type="button"
        onClick={zoomOut}
        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100"
        title="Zoom Out (−)"
        aria-label="Zoom Out"
      >
        <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      {/* Fit View / Full View ([ ]) */}
      <button
        type="button"
        onClick={fitView}
        className={`w-7 h-7 flex items-center justify-center transition-colors ${
          isTransformed
            ? "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
        title={
          isTransformed
            ? `Fit View / Center All Nodes (${Math.round(zoom * 100)}%)`
            : "Fit View (Full Nodes View)"
        }
        aria-label="Fit View"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" />
        </svg>
      </button>
    </div>
  );
}

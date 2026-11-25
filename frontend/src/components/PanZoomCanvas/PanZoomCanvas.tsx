import { useRef, useEffect, useCallback, type ReactNode } from "react";
import { useZoomStore } from "@/engine/useZoomStore";
import { ZoomControls } from "@/components/ZoomControls/ZoomControls";
import { cn } from "@/utils/cn";

export interface PanZoomCanvasProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  showControls?: boolean;
  controlsPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  controlsClassName?: string;
  extraControls?: ReactNode;
  fitPadding?: number;
  minZoom?: number;
  maxZoom?: number;
  showDotGrid?: boolean;
}

export function PanZoomCanvas({
  children,
  className = "",
  contentClassName = "",
  contentStyle,
  showControls = true,
  controlsPosition = "top-left",
  controlsClassName = "",
  extraControls,
  fitPadding = 64,
  minZoom = 0.35,
  maxZoom = 2.5,
  showDotGrid = true,
}: PanZoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    pan,
    isDragging,
    setPan,
    setZoom,
    setIsDragging,
    registerFitView,
  } = useZoomStore();

  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const isMouseDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const calculateFitView = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const contentWidth = content.scrollWidth || content.offsetWidth || 500;
    const contentHeight = content.scrollHeight || content.offsetHeight || 250;

    const availWidth = Math.max(containerRect.width - fitPadding * 2, 80);
    const availHeight = Math.max(containerRect.height - fitPadding * 2, 80);

    if (contentWidth > 0 && contentHeight > 0) {
      const scaleX = availWidth / contentWidth;
      const scaleY = availHeight / contentHeight;
      let idealScale = Math.min(scaleX, scaleY);
      idealScale = Math.min(1.15, Math.max(minZoom, +idealScale.toFixed(2)));
      setZoom(idealScale);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [fitPadding, minZoom, setPan, setZoom]);

  useEffect(() => {
    return registerFitView(calculateFitView);
  }, [calculateFitView, registerFitView]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, input, select, textarea, a, [role="button"], [data-no-pan], .nodrag'
      )
    ) {
      return;
    }

    isMouseDownRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
    hasMovedRef.current = false;
  };

  // Bind global mouse listeners once (independent of pan pixel updates)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (!hasMovedRef.current && Math.hypot(dx, dy) > 3) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }

      if (hasMovedRef.current) {
        setPan({
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy,
        });
      }
    };

    const handleMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setIsDragging, setPan]);

  // Attach native non-passive wheel listener for Ctrl/Meta zoom without console warnings
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        setZoom(Math.min(maxZoom, Math.max(minZoom, +(zoomRef.current + delta).toFixed(2))));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX * 0.7),
          y: Math.round(prev.y - e.deltaY * 0.7),
        }));
      }
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [maxZoom, minZoom, setPan, setZoom]);

  // Two-finger / intentional touch pan without hijacking mobile vertical page scroll
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    isMouseDownRef.current = true;
    dragStartRef.current = { x: midX, y: midY };
    panStartRef.current = { ...panRef.current };
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMouseDownRef.current || e.touches.length !== 2) return;
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const dx = midX - dragStartRef.current.x;
    const dy = midY - dragStartRef.current.y;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, input, select, textarea, a, [role="button"], [data-no-pan], .nodrag'
      )
    ) {
      return;
    }
    calculateFitView();
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative w-full h-full overflow-hidden select-none flex items-center justify-center touch-pan-y",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      style={{
        backgroundImage: showDotGrid
          ? "radial-gradient(rgba(99, 102, 241, 0.16) 1.25px, transparent 1.25px)"
          : undefined,
        backgroundSize: "24px 24px",
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {showControls && (
        <ZoomControls position={controlsPosition} className={controlsClassName} />
      )}

      {extraControls}

      <div
        ref={contentRef}
        className={cn(
          "inline-flex items-center justify-center min-w-max transition-transform",
          contentClassName
        )}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.2, 0, 0, 1)",
          willChange: "transform",
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

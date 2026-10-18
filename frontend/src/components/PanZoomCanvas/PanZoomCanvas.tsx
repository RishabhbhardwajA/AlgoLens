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

  const isMouseDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Calculate and apply Fit View: centers content and scales it to fit completely within the container
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

      // Clamp between minZoom and 1.15 so small content is not overly enlarged
      idealScale = Math.min(1.15, Math.max(minZoom, +idealScale.toFixed(2)));

      setZoom(idealScale);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [fitPadding, minZoom, setPan, setZoom]);

  // Register fitView with the store so ZoomControls triggers it
  useEffect(() => {
    return registerFitView(calculateFitView);
  }, [calculateFitView, registerFitView]);

  // Mouse Drag / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary left-click

    const target = e.target as HTMLElement | null;
    // Don't drag if clicking buttons, inputs, links or non-draggable interactive items
    if (
      target?.closest(
        'button, input, select, textarea, a, [role="button"], [data-no-pan], .nodrag'
      )
    ) {
      return;
    }

    isMouseDownRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    hasMovedRef.current = false;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (!hasMovedRef.current) {
        if (Math.hypot(dx, dy) > 3) {
          hasMovedRef.current = true;
          setIsDragging(true);
        }
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
  }, [pan, setIsDragging, setPan]);

  // Touch Support (tablets/mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, input, select, textarea, a, [role="button"], [data-no-pan], .nodrag'
      )
    ) {
      return;
    }

    const touch = e.touches[0];
    isMouseDownRef.current = true;
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    panStartRef.current = { ...pan };
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMouseDownRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;

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

  // Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with ctrl/cmd + wheel or pinch
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      setZoom(Math.min(maxZoom, Math.max(minZoom, +(zoom + delta).toFixed(2))));
    } else {
      // Natural trackpad/wheel pan
      setPan((prev) => ({
        x: Math.round(prev.x - e.deltaX * 0.7),
        y: Math.round(prev.y - e.deltaY * 0.7),
      }));
    }
  };

  // Double click canvas to fit view
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
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative w-full h-full overflow-hidden select-none flex items-center justify-center",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      style={{
        backgroundImage: showDotGrid
          ? "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)"
          : undefined,
        backgroundSize: "24px 24px",
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Zoom In/Out/Fit controls */}
      {showControls && (
        <ZoomControls
          position={controlsPosition}
          className={controlsClassName}
        />
      )}

      {/* Optional extra controls/legend overlay */}
      {extraControls}

      {/* Movable & Scalable Content Container */}
      <div
        ref={contentRef}
        className={cn(
          "inline-flex items-center justify-center min-w-max transition-transform",
          contentClassName
        )}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.2, 0, 0, 1)",
          willChange: "transform",
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

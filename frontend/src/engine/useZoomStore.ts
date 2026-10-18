import { create } from "zustand";

interface ZoomPanState {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  fitViewHandler: (() => void) | null;

  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (z: number) => void;
  setPan: (
    pan:
      | { x: number; y: number }
      | ((prev: { x: number; y: number }) => { x: number; y: number })
  ) => void;
  resetPan: () => void;
  setIsDragging: (d: boolean) => void;

  // Fit View support
  registerFitView: (handler: () => void) => () => void;
  fitView: () => void;
}

export const useZoomStore = create<ZoomPanState>((set, get) => ({
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  isDragging: false,
  fitViewHandler: null,

  zoomIn: () =>
    set((s) => ({
      zoom: Math.min(2.5, +(s.zoom + 0.15).toFixed(2)),
    })),

  zoomOut: () =>
    set((s) => ({
      zoom: Math.max(0.35, +(s.zoom - 0.15).toFixed(2)),
    })),

  resetZoom: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),

  setZoom: (z: number) =>
    set({ zoom: Math.min(2.5, Math.max(0.35, +z.toFixed(2))) }),

  setPan: (pan) =>
    set((s) => ({
      pan: typeof pan === "function" ? pan(s.pan) : pan,
    })),

  resetPan: () => set({ pan: { x: 0, y: 0 } }),

  setIsDragging: (isDragging: boolean) => set({ isDragging }),

  registerFitView: (handler: () => void) => {
    set({ fitViewHandler: handler });
    return () => {
      if (get().fitViewHandler === handler) {
        set({ fitViewHandler: null });
      }
    };
  },

  fitView: () => {
    const handler = get().fitViewHandler;
    if (handler) {
      handler();
    } else {
      set({ zoom: 1.0, pan: { x: 0, y: 0 } });
    }
  },
}));

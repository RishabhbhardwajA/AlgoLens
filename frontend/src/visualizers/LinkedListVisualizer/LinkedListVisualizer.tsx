import { useLayoutEffect, useRef, useState } from "react";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import type { LinkedListNodeState } from "@/engine/executionTypes";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Zap } from "lucide-react";

export function LinkedListVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStep = useCurrentStep();
  const listRowRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [cycleArc, setCycleArc] = useState<{
    startX: number;
    endX: number;
    y: number;
    peakY: number;
  } | null>(null);

  const currentState = currentStep?.visualizationState;
  const llState = currentState?.type === "linked-list" ? currentState : null;
  const nodes = llState?.nodes ?? [];
  const cycleTargetId = llState?.cycleTargetId ?? null;
  const statePointers = llState?.pointers;

  useLayoutEffect(() => {
    if (!cycleTargetId || nodes.length === 0 || !listRowRef.current) {
      setCycleArc(null);
      return;
    }

    const tailNode = nodes[nodes.length - 1];
    const targetEl = nodeRefs.current[cycleTargetId];
    const tailEl = nodeRefs.current[tailNode.id];
    const rowEl = listRowRef.current;

    if (!targetEl || !tailEl) {
      setCycleArc(null);
      return;
    }

    const rowRect = rowEl.getBoundingClientRect();
    const tailRect = tailEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Compute unscaled local coordinates relative to listRowRef
    const scale = rowEl.offsetWidth > 0 ? rowRect.width / rowEl.offsetWidth : 1;
    const startX = (tailRect.left - rowRect.left + tailRect.width * 0.72) / scale;
    const endX = (targetRect.left - rowRect.left + targetRect.width * 0.5) / scale;
    const y = (tailRect.top - rowRect.top) / scale;
    const peakY = y - Math.min(72, Math.max(36, Math.abs(startX - endX) * 0.22));

    setCycleArc({ startX, endX, y, peakY });
  }, [cycleTargetId, nodes]);

  if (!algorithm || algorithm.visualizationType !== "linked-list") return null;

  if (!llState) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
        Run algorithm to view Linked List visualization.
      </div>
    );
  }

  const pointerStyles: Record<string, { bg: string; text: string; border: string }> = {
    prev: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
    curr: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300" },
    next: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300" },
    slow: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
    fast: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-300" },
    head: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  };

  const getNodeBorder = (node: LinkedListNodeState) => {
    if (node.state === "current") return "border-amber-400 ring-2 ring-amber-300 shadow-md shadow-amber-200/50";
    if (node.state === "found") return "border-emerald-500 ring-2 ring-emerald-300 shadow-md shadow-emerald-200/50";
    if (node.state === "visited") return "border-indigo-300 bg-indigo-50/30";
    return "border-slate-200 shadow-xs";
  };

  const collisionNode = nodes.find(
    (n) => n.pointers?.includes("slow") && n.pointers?.includes("fast")
  );

  const firstPointsToNull = nodes.length > 0 && nodes[0].nextId === null;
  const showLeftNull = statePointers?.prev === null || firstPointsToNull;
  const lastNode = nodes[nodes.length - 1];
  const lastNodeIsNullTail = !cycleTargetId && (!lastNode || lastNode.nextId === null || lastNode.nextId === undefined);

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-4 pb-20 select-none relative bg-transparent overflow-hidden gap-2">
      {/* TOP COMPACT LEGEND BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 rounded-2xl sm:rounded-full glass-surface text-xs shrink-0 z-20">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800">Pointers:</span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>prev</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>curr</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>next</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>slow</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>fast</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
          <span className="flex items-center gap-1">
            <span className="text-indigo-700 font-bold">──►</span> Forward Link
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-700 font-bold">◄──</span> Rewired Link
          </span>
        </div>
      </div>

      {/* Cycle Detection Notification Banner (in-flow so it never overlaps legends/controls) */}
      {collisionNode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-center z-20 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current animate-pulse" />
          <span>Cycle Detected! Slow & Fast pointers met at Node [{String(collisionNode.value)}]</span>
        </motion.div>
      )}

      {/* Main Pan-Zoom Infinite Canvas */}
      <PanZoomCanvas
        className="flex-1 w-full min-h-0"
        controlsPosition="top-left"
        controlsClassName="!top-3 !left-3"
        contentClassName="relative flex flex-col items-center justify-center min-w-max px-8 py-14"
      >
        <div ref={listRowRef} className="flex items-center relative">
          {/* Dynamic Cycle Loop Overhead Arch (Tail -> Target Node) */}
          {cycleTargetId && cycleArc && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="cycleArrow"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#7C3AED" />
                </marker>
              </defs>
              <path
                d={`M ${cycleArc.startX},${cycleArc.y + 34} C ${cycleArc.startX},${cycleArc.peakY} ${cycleArc.endX},${cycleArc.peakY} ${cycleArc.endX},${cycleArc.y + 28}`}
                fill="transparent"
                stroke="#7C3AED"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                markerEnd="url(#cycleArrow)"
              />
              <foreignObject
                x={Math.min(cycleArc.startX, cycleArc.endX) + Math.abs(cycleArc.startX - cycleArc.endX) / 2 - 90}
                y={cycleArc.peakY - 20}
                width="180"
                height="24"
              >
                <div className="flex justify-center">
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold font-mono border border-violet-300 whitespace-nowrap shadow-xs">
                    Cycle Loop ⟲ (Node {cycleTargetId})
                  </span>
                </div>
              </foreignObject>
            </svg>
          )}

          {/* Left NULL Anchor for Reverse Linked List */}
          {showLeftNull && (
            <div className="flex items-center mr-2">
              <div className="flex flex-col items-center">
                <div className="mb-2 h-6 flex items-center">
                  {statePointers?.prev === null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 shadow-xs">
                      prev
                    </span>
                  )}
                </div>
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 flex items-center justify-center font-mono text-xs font-bold text-slate-600">
                  NULL
                </div>
              </div>
              {firstPointsToNull && (
                <div className="w-12 ml-2 flex items-center text-amber-600 font-bold">
                  <ArrowLeft className="w-4 h-4 -mr-1.5" />
                  <div className="h-0.5 w-8 bg-amber-500 rounded" />
                </div>
              )}
            </div>
          )}

          {/* Nodes Sequence */}
          <div className="flex items-center gap-3">
            {nodes.map((node, index) => {
              const nextNode = nodes[index + 1];
              const prevNode = nodes[index - 1];

              const pointsToNext =
                node.nextId === nextNode?.id ||
                (node.nextId === undefined && index < nodes.length - 1);
              const pointsToPrev = node.nextId === prevNode?.id;
              const pointsToNull = node.nextId === null;

              return (
                <div key={node.id} className="flex items-center">
                  {/* Node Container */}
                  <div
                    ref={(el) => {
                      nodeRefs.current[node.id] = el;
                    }}
                    className="flex flex-col items-center relative"
                  >
                    {/* Floating Pointer Tags */}
                    <div className="h-7 mb-2 flex items-center gap-1">
                      <AnimatePresence>
                        {node.pointers && node.pointers.length > 0 ? (
                          node.pointers.map((ptr) => {
                            const style = pointerStyles[ptr] || pointerStyles.curr;
                            return (
                              <motion.span
                                key={ptr}
                                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs flex items-center gap-0.5 ${style.bg} ${style.text} ${style.border}`}
                              >
                                <span>{ptr}</span>
                              </motion.span>
                            );
                          })
                        ) : (
                          <span className="invisible text-[10px]">placeholder</span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Dual-Cell Linked List Node Card */}
                    <motion.div
                      animate={{
                        scale: node.state === "current" ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-stretch rounded-2xl border-2 bg-white/75 backdrop-blur-xl overflow-hidden ${getNodeBorder(
                        node
                      )}`}
                      style={{
                        boxShadow:
                          node.state === "current"
                            ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 25px -5px rgba(245, 158, 11, 0.28)"
                            : "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px rgba(99, 102, 241, 0.08)",
                      }}
                    >
                      <div className="min-w-12 px-2 h-14 flex items-center justify-center font-bold text-base text-slate-800 bg-white/45">
                        {String(node.value)}
                      </div>

                      <div className="w-px bg-slate-200/80" />

                      <div className="w-8 h-14 flex items-center justify-center bg-slate-50/40 text-slate-500">
                        <div
                          className={`w-3 h-3 rounded-full border-2 ${
                            pointsToPrev
                              ? "bg-amber-400 border-amber-500"
                              : pointsToNull
                              ? "bg-rose-400 border-rose-500"
                              : "bg-indigo-500 border-indigo-600"
                          }`}
                          title={`points to: ${node.nextId ?? "NULL"}`}
                        />
                      </div>
                    </motion.div>

                    <div className="mt-1.5 text-[10px] font-mono text-slate-500 font-medium">
                      node-{node.id}
                    </div>
                  </div>

                  {/* Connecting Pointer Arrow Between Nodes */}
                  {index < nodes.length - 1 && (
                    <div className="w-14 mx-1 flex flex-col items-center justify-center relative">
                      {pointsToNext ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center text-indigo-600"
                        >
                          <div className="h-0.5 w-9 bg-indigo-500 rounded" />
                          <ArrowRight className="w-4 h-4 -ml-1.5" />
                        </motion.div>
                      ) : pointsToPrev ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center text-amber-600 font-bold"
                        >
                          <ArrowLeft className="w-4 h-4 -mr-1.5" />
                          <div className="h-0.5 w-9 bg-amber-500 rounded" />
                        </motion.div>
                      ) : (
                        <div className="h-0.5 w-8 border-b-2 border-dashed border-slate-300" />
                      )}
                    </div>
                  )}

                  {/* Tail Pointer: Only show terminal NULL when list actually ends in NULL (not cyclic & not reversed away from NULL) */}
                  {index === nodes.length - 1 && lastNodeIsNullTail && (
                    <div className="flex items-center ml-2">
                      <div className="flex items-center text-slate-500 mr-3">
                        <div className="h-0.5 w-8 bg-slate-400" />
                        <ArrowRight className="w-4 h-4 -ml-1.5 text-slate-500" />
                      </div>
                      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 flex items-center justify-center font-mono text-xs font-bold text-slate-600 shadow-xs">
                        NULL
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PanZoomCanvas>
    </div>
  );
}

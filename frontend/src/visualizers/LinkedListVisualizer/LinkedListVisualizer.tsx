import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import { PanZoomCanvas } from "@/components/PanZoomCanvas/PanZoomCanvas";
import type { LinkedListNodeState } from "@/engine/executionTypes";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Zap } from "lucide-react";

export function LinkedListVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const currentStep = useCurrentStep();

  if (!algorithm || algorithm.visualizationType !== "linked-list") return null;

  const currentState = currentStep?.visualizationState;

  if (!currentState || currentState.type !== "linked-list") {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
        Run algorithm to view Linked List visualization.
      </div>
    );
  }

  const { nodes, cycleTargetId, pointers: statePointers } = currentState;

  // Pointer color mapping
  const pointerStyles: Record<string, { bg: string; text: string; border: string }> = {
    prev: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
    curr: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300" },
    next: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300" },
    slow: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
    fast: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-300" },
    head: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  };

  // Node background styling
  const getNodeBorder = (node: LinkedListNodeState) => {
    if (node.state === "current") return "border-amber-400 ring-2 ring-amber-300 shadow-md shadow-amber-200/50";
    if (node.state === "found") return "border-emerald-500 ring-2 ring-emerald-300 shadow-md shadow-emerald-200/50";
    if (node.state === "visited") return "border-indigo-300 bg-indigo-50/30";
    return "border-slate-200 shadow-xs";
  };

  // Check if slow & fast pointers collide
  const collisionNode = nodes.find(
    (n) => n.pointers?.includes("slow") && n.pointers?.includes("fast")
  );

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 pb-20 select-none relative bg-gradient-to-b from-white via-slate-50/30 to-white overflow-hidden">
      {/* TOP COMPACT LEGEND BAR - Placed at top so it NEVER overlaps with bottom playback controls */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-1.5 rounded-lg bg-white/95 border border-slate-200/90 shadow-xs text-xs shrink-0 z-20">
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
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

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="text-indigo-600 font-bold">──►</span> Forward Link
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-600 font-bold">◄──</span> Rewired Link
          </span>
        </div>
      </div>

      {/* Cycle Detection Notification Banner */}
      {collisionNode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current animate-pulse" />
          <span>Cycle Detected! Slow & Fast pointers met at Node [{String(collisionNode.value)}]</span>
        </motion.div>
      )}

      {/* Main Pan-Zoom Infinite Canvas with Hand Drag & Auto Fit View */}
      <PanZoomCanvas
        className="flex-1 w-full min-h-0"
        controlsPosition="top-left"
        controlsClassName="!top-3 !left-3"
        contentClassName="relative flex flex-col items-center justify-center min-w-max px-8 py-10"
      >
        <div className="flex items-center">
        {/* If 'prev' is currently null, show NULL on the far left for Reverse Linked List */}
        {statePointers?.prev === null && (
          <div className="flex flex-col items-center mr-6">
            <div className="mb-2 h-6 flex items-center">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 shadow-xs">
                prev
              </span>
            </div>
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
              NULL
            </div>
          </div>
        )}

        {/* Nodes Sequence */}
        <div className="flex items-center gap-3">
          {nodes.map((node, index) => {
            const nextNode = nodes[index + 1];
            const prevNode = nodes[index - 1];

            // Determine pointer direction
            const pointsToNext = node.nextId === nextNode?.id || (node.nextId === undefined && index < nodes.length - 1);
            const pointsToPrev = node.nextId === prevNode?.id;
            const pointsToNull = node.nextId === null;

            return (
              <div key={node.id} className="flex items-center">
                {/* Node Container */}
                <div className="flex flex-col items-center relative">
                  {/* Floating Pointer Tags (Above Node) */}
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
                    className={`flex items-stretch rounded-xl border-2 bg-white overflow-hidden ${getNodeBorder(
                      node
                    )}`}
                    style={{
                      boxShadow:
                        node.state === "current"
                          ? "0 10px 25px -5px rgba(245, 158, 11, 0.25)"
                          : "0 2px 8px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    {/* Left Cell: Data Value */}
                    <div className="w-12 h-14 flex items-center justify-center font-bold text-base text-slate-800 bg-white">
                      {String(node.value)}
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-slate-200" />

                    {/* Right Cell: Next Pointer Anchor */}
                    <div className="w-8 h-14 flex items-center justify-center bg-slate-50/80 text-slate-400">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          pointsToPrev
                            ? "bg-amber-400 border-amber-500"
                            : pointsToNull
                            ? "bg-rose-300 border-rose-400"
                            : "bg-indigo-500 border-indigo-600"
                        }`}
                        title={`points to: ${node.nextId ?? "NULL"}`}
                      />
                    </div>
                  </motion.div>

                  {/* Node Address / Subtext */}
                  <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                    node-{node.id}
                  </div>
                </div>

                {/* Connecting Pointer Arrow Between Nodes */}
                {index < nodes.length - 1 && (
                  <div className="w-14 mx-1 flex flex-col items-center justify-center relative">
                    {pointsToNext ? (
                      /* Forward Pointer (Normal ──►) */
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center text-indigo-500"
                      >
                        <div className="h-0.5 w-9 bg-indigo-500 rounded" />
                        <ArrowRight className="w-4 h-4 -ml-1.5" />
                      </motion.div>
                    ) : pointsToPrev ? (
                      /* Reversed Pointer (◄── Rewired) */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center text-amber-500 font-bold"
                      >
                        <ArrowLeft className="w-4 h-4 -mr-1.5" />
                        <div className="h-0.5 w-9 bg-amber-500 rounded" />
                      </motion.div>
                    ) : (
                      /* Severed / Null Pointer */
                      <div className="h-0.5 w-8 border-b-2 border-dashed border-slate-300" />
                    )}
                  </div>
                )}

                {/* Tail Node Pointer: NULL or Cycle */}
                {index === nodes.length - 1 && (
                  <div className="flex items-center ml-2">
                    {pointsToPrev ? (
                      /* Reversed tail */
                      <div className="w-12 flex items-center text-amber-500 mr-2">
                        <ArrowLeft className="w-4 h-4 -mr-1" />
                        <div className="h-0.5 w-8 bg-amber-500" />
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-400 mr-3">
                        <div className="h-0.5 w-8 bg-slate-300" />
                        <ArrowRight className="w-4 h-4 -ml-1.5 text-slate-400" />
                      </div>
                    )}

                    {/* NULL Terminal Box */}
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center font-mono text-xs font-bold text-slate-400 shadow-xs">
                      NULL
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* Overhead Curved Arch for Cycle (Tail -> Target Node) */}
        {cycleTargetId && (
          <div className="absolute -top-6 left-1/4 right-1/4 h-16 pointer-events-none z-20 flex items-center justify-center">
            <svg className="w-full h-full overflow-visible">
              <defs>
                <marker
                  id="cycleArrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#8B5CF6" />
                </marker>
              </defs>
              <path
                d="M 580,25 C 500,-35 240,-35 160,20"
                fill="transparent"
                stroke="#8B5CF6"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                markerEnd="url(#cycleArrow)"
              />
            </svg>
            <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold font-mono border border-violet-300">
              Cycle Loop ⟲ (Tail ➔ Node {cycleTargetId})
            </div>
          </div>
        )}
      </PanZoomCanvas>
    </div>
  );
}

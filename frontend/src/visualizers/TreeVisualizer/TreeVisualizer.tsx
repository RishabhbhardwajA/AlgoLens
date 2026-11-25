import { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import type { TreeNodeState } from "@/engine/executionTypes";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

interface TreeNodeData {
  value: number | string | null;
  state: TreeNodeState["state"];
  returnValue?: unknown;
}

function TreeNodeComponent({ data }: { data: TreeNodeData }) {
  const { value, state, returnValue } = data;
  const isNull = value === null;

  const stateClasses: Record<string, string> = {
    default:
      "border-white/90 bg-white/75 backdrop-blur-xl text-slate-700 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_4px_12px_rgba(99,102,241,0.08)]",
    current:
      "border-amber-400/90 bg-amber-50/85 backdrop-blur-xl text-amber-800 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_0_24px_rgba(251,191,36,0.45)]",
    visited:
      "border-emerald-400/90 bg-emerald-50/80 backdrop-blur-xl text-emerald-800 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_0_16px_rgba(52,211,153,0.28)]",
    comparing:
      "border-amber-400/90 bg-white/85 backdrop-blur-xl text-amber-700",
    found:
      "border-emerald-500/90 bg-emerald-100/85 backdrop-blur-xl text-emerald-900 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_0_24px_rgba(16,185,129,0.45)]",
    eliminated:
      "border-slate-300/80 bg-slate-100/65 backdrop-blur-sm text-slate-500 opacity-65",
    returning:
      "border-violet-500/90 bg-violet-50/85 backdrop-blur-xl text-violet-800 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_0_16px_rgba(139,92,246,0.35)]",
    "pointer-left": "border-sky-400/90 bg-sky-50/85 backdrop-blur-xl text-sky-800",
    "pointer-right": "border-violet-400/90 bg-violet-50/85 backdrop-blur-xl text-violet-800",
    "pointer-mid": "border-amber-400/90 bg-amber-50/85 backdrop-blur-xl text-amber-800",
  };

  if (isNull) {
    const nullActiveClass =
      state === "current"
        ? "border-amber-500 text-amber-700 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
        : state === "visited"
        ? "border-slate-400 text-slate-600"
        : "border-slate-300 text-slate-400";

    return (
      <div className="relative flex flex-col items-center nodrag">
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <motion.div
          animate={{ scale: state === "current" ? 1.1 : 1 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "w-8 h-8 rounded-full border-[1.5px] border-dashed flex items-center justify-center",
            "font-sans text-xs font-bold transition-all duration-300 bg-white/70",
            nullActiveClass
          )}
        >
          ∅
        </motion.div>
        {state === "current" && (
          <span className="absolute -bottom-5 text-[9px] font-mono text-amber-700 whitespace-nowrap font-semibold">
            null
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center nodrag">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      {returnValue !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-100/95 backdrop-blur-md border border-violet-300 text-[11px] font-bold text-violet-800 whitespace-nowrap z-20 shadow-md flex items-center gap-1"
        >
          <span className="text-[9px] text-violet-600">RET</span>
          <span>{String(returnValue)}</span>
        </motion.div>
      )}

      <motion.div
        animate={{ scale: state === "current" ? 1.1 : 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "min-w-[48px] h-12 px-3 rounded-full border-2 flex items-center justify-center relative whitespace-nowrap",
          "font-sans text-sm font-bold transition-all duration-300",
          stateClasses[state] ?? stateClasses.default
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/55 to-transparent rounded-full pointer-events-none" />
        {value ?? "∅"}
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  treeNode: TreeNodeComponent,
};

function computeLayout(treeNodes: TreeNodeState[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  let maxDepth = 0;
  let maxLabelLen = 1;
  for (const n of treeNodes) {
    if ((n.depth ?? 0) > maxDepth) maxDepth = n.depth ?? 0;
    const len = n.value !== null && n.value !== undefined ? String(n.value).length : 1;
    if (len > maxLabelLen) maxLabelLen = len;
  }

  // Cap exponential explosion on deep/skewed trees while giving array pills ample width
  const effectiveDepth = Math.min(maxDepth, 5);
  const baseHGap = maxLabelLen > 5 ? Math.min(165, 96 + maxLabelLen * 6) : 104;
  const vGap = 122;

  for (const n of treeNodes) {
    const depth = n.depth ?? 0;
    const pos = n.position ?? 0;
    const countAtDepth = Math.pow(2, Math.min(depth, 10));
    const levelWidthMultiplier = Math.pow(2, Math.max(0, effectiveDepth - depth));
    const x = (pos - (countAtDepth - 1) / 2) * (baseHGap * levelWidthMultiplier * 0.72);
    const y = depth * vGap;
    positions.set(n.id, { x, y });
  }

  return positions;
}

function TreeCanvasInner({
  rfNodes,
  rfEdges,
  onNodesChange,
  onEdgesChange,
  nodeCount,
}: {
  rfNodes: Node<TreeNodeData>[];
  rfEdges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  nodeCount: number;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) return;
    const timer = requestAnimationFrame(() => {
      fitView({ padding: 0.38, maxZoom: 1.4, duration: 220 });
    });
    return () => cancelAnimationFrame(timer);
  }, [nodeCount, fitView]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.4, maxZoom: 1.4 }}
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      zoomOnScroll={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.2}
        color="rgba(99, 102, 241, 0.22)"
      />
      <Controls position="top-left" showFitView showZoom showInteractive={false} />
    </ReactFlow>
  );
}

export function TreeVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const rawInput = useExecutionStore((s) => s.rawInput);
  const currentStep = useCurrentStep();

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  const initialFallback = useMemo(() => {
    if (hasStarted || !algorithm?.initialVisualizationState) return null;
    try {
      const parsed = algorithm.parseInput(rawInput);
      if (!algorithm.validateInput(parsed).valid) return null;
      return algorithm.initialVisualizationState(parsed);
    } catch {
      return null;
    }
  }, [hasStarted, algorithm, rawInput]);

  const vizState = currentStep?.visualizationState ?? initialFallback;
  const treeState = vizState?.type === "tree" ? vizState : null;

  useEffect(() => {
    if (!treeState) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const positions = computeLayout(treeState.nodes);

    const nodes: Node<TreeNodeData>[] = treeState.nodes.map((n) => ({
      id: n.id,
      type: "treeNode",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: {
        value: n.value,
        state: n.state,
        returnValue: n.returnValue,
      },
      draggable: false,
    }));

    const edges: Edge[] = treeState.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.state === "active",
      style: {
        stroke:
          e.state === "active"
            ? "#F59E0B"
            : e.state === "traversed"
            ? "#10B981"
            : "#CBD5E1",
        strokeWidth: e.state === "active" ? 3 : e.state === "traversed" ? 2.5 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.state === "active" ? "#F59E0B" : e.state === "traversed" ? "#10B981" : "#CBD5E1",
        width: 14,
        height: 14,
      },
      label: e.label,
      labelStyle: {
        fill: e.state === "active" ? "#B45309" : e.state === "traversed" ? "#047857" : "#475569",
        fontWeight: "bold",
        fontSize: 11,
      },
      labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.92, stroke: "#E2E8F0", strokeWidth: 1 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
    }));

    setNodes(nodes);
    setEdges(edges);
  }, [treeState, setNodes, setEdges]);

  if (!algorithm || algorithm.visualizationType !== "tree") return null;

  if (!treeState) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        {hasStarted ? "Step through to see the tree" : "Press Run to visualize the tree"}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        <TreeCanvasInner
          rfNodes={rfNodes}
          rfEdges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeCount={rfNodes.length}
        />
      </ReactFlowProvider>

      {/* Legend */}
      <div className="hidden sm:flex absolute top-3 right-3 flex-col gap-1.5 glass-surface rounded-2xl px-3.5 py-2.5 z-10">
        {([
          ["border-amber-400 bg-amber-400", "Current"],
          ["border-emerald-400 bg-emerald-400", "Visited"],
          ["border-emerald-600 bg-emerald-600", "Found Target"],
          ["border-violet-500 bg-violet-500", "Returning"],
          ["border-slate-300 bg-slate-200", "Eliminated"],
          ["border-slate-300 bg-white", "Unvisited"],
        ] as [string, string][]).map(([cls, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full border-2", cls)} />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

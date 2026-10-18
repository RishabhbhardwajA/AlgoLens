import { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useExecutionStore, useCurrentStep } from "@/engine/useExecutionController";
import type { TreeNodeState } from "@/engine/executionTypes";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

// ---- Custom Tree Node ----
interface TreeNodeData {
  value: number | string | null;
  state: TreeNodeState["state"];
  returnValue?: unknown;
}

import { Handle, Position } from "reactflow";

function TreeNodeComponent({ data }: { data: TreeNodeData }) {
  const { value, state, returnValue } = data;
  const isNull = value === null;

  const stateClasses: Record<string, string> = {
    default: "border-slate-200 bg-white text-slate-500 shadow-sm",
    current: "border-amber-400 bg-amber-50 text-amber-600 shadow-[0_0_24px_rgba(251,191,36,0.5)]",
    visited: "border-emerald-400 bg-emerald-50 text-emerald-600 shadow-[0_0_16px_rgba(52,211,153,0.3)]",
    comparing: "border-amber-300 bg-white text-amber-500",
    found: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_24px_rgba(16,185,129,0.5)]",
    eliminated: "border-slate-200 bg-slate-100 text-slate-400",
    returning: "border-violet-500 bg-violet-50 text-violet-700 shadow-[0_0_16px_rgba(139,92,246,0.4)]",
    "pointer-left": "border-blue-400 bg-blue-50 text-blue-600",
    "pointer-right": "border-violet-400 bg-violet-50 text-violet-600",
    "pointer-mid": "border-amber-400 bg-amber-50 text-amber-600",
  };

  // Null node — shown as a small dashed circle in grey
  if (isNull) {
    const nullActiveClass =
      state === "current" ? "border-amber-400 text-amber-500 shadow-[0_0_16px_rgba(251,191,36,0.4)]" :
      state === "visited" ? "border-slate-300 text-slate-400" :
      "border-slate-200 text-slate-300";

    return (
      <div className="relative flex flex-col items-center nodrag">
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <motion.div
          animate={{ scale: state === "current" ? 1.1 : 1 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "w-8 h-8 rounded-full border-[1.5px] border-dashed flex items-center justify-center",
            "font-sans text-xs font-bold transition-all duration-300 bg-white/60",
            nullActiveClass
          )}
        >
          ∅
        </motion.div>
        {state === "current" && (
          <span className="absolute -bottom-5 text-[9px] font-mono text-amber-500/80 whitespace-nowrap">null</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center nodrag">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      {/* Return value badge */}
      {returnValue !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -top-11 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-violet-100 border border-violet-300 text-xs font-bold text-violet-700 whitespace-nowrap z-20 shadow-lg flex items-center gap-1"
        >
          <span className="text-[10px] text-violet-500">RET</span>
          <span>{String(returnValue)}</span>
        </motion.div>
      )}

      {/* Node circle */}
      <motion.div
        animate={{ scale: state === "current" ? 1.15 : 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "min-w-[48px] h-12 px-3 rounded-full border-[2.5px] flex items-center justify-center relative",
          "font-sans text-sm font-bold transition-all duration-300",
          stateClasses[state] ?? stateClasses.default
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-full pointer-events-none" />
        {value ?? "∅"}
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}


const nodeTypes: NodeTypes = {
  treeNode: TreeNodeComponent,
};

// ---- Simple layout computation ----
const H_GAP = 80;
const V_GAP = 80;

function computeLayout(treeNodes: TreeNodeState[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Find max depth to calculate width scaling
  let maxDepth = 0;
  for (const n of treeNodes) {
    if ((n.depth ?? 0) > maxDepth) maxDepth = n.depth ?? 0;
  }

  for (const n of treeNodes) {
    const depth = n.depth ?? 0;
    const pos = n.position ?? 0; // This is the 0-indexed position within a full binary tree level
    
    // In a full binary tree at `depth`, there are 2^depth nodes.
    const countAtDepth = Math.pow(2, depth);
    // Base gap scaled by how much horizontal space the subtrees need
    const levelWidthMultiplier = Math.pow(2, Math.max(0, maxDepth - depth)); 
    
    const x = (pos - (countAtDepth - 1) / 2) * (H_GAP * levelWidthMultiplier * 0.75);
    const y = depth * V_GAP;
    
    positions.set(n.id, { x, y });
  }

  return positions;
}

// ---- Tree Visualizer ----
export function TreeVisualizer() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const currentStep = useCurrentStep();

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  const vizState = currentStep?.visualizationState;
  const treeState = vizState?.type === "tree" ? vizState : null;

  useEffect(() => {
    if (!treeState) return;

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
            ? "#F59E0B" // amber-500
            : e.state === "traversed"
            ? "#10B981" // emerald-500
            : "#CBD5E1", // slate-300
        strokeWidth: e.state === "active" ? 3 : e.state === "traversed" ? 2.5 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.state === "active" ? "#F59E0B" : e.state === "traversed" ? "#10B981" : "#CBD5E1",
        width: 14,
        height: 14,
      },
      label: e.label,
      labelStyle: { fill: e.state === "active" ? "#F59E0B" : e.state === "traversed" ? "#10B981" : "#94A3B8", fontWeight: "bold", fontSize: 12 },
      labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9, stroke: "#E2E8F0", strokeWidth: 1 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
    }));

    setNodes(nodes);
    setEdges(edges);
  }, [treeState, setNodes, setEdges]);

  if (!algorithm || algorithm.visualizationType !== "tree") return null;

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Press Run to visualize the tree
      </div>
    );
  }

  if (!treeState) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Step through to see the tree
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5, maxZoom: 1.5 }}
        minZoom={0.3}
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
          gap={28}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          position="top-left"
          showFitView
          showZoom
          showInteractive={false}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm z-10">
        {([
          ["border-amber-400 bg-amber-400", "Current Node (Amber)"],
          ["border-emerald-400 bg-emerald-400", "Visited (Emerald)"],
          ["border-emerald-400 bg-emerald-400", "Traversed Edge (Emerald)"],
          ["border-violet-500 bg-violet-500", "Returning (Violet)"],
          ["border-slate-200 bg-white", "Unvisited"],
        ] as [string, string][]).map(([cls, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full border-2", cls)} />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

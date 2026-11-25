import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  GitFork,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Route,
  Share2,
  AlertTriangle,
  Info,
  CircleDot,
  Target,
  LayoutGrid,
  Weight,
  Layers,
} from "lucide-react";
import { audioEngine } from "@/engine/audioEngine";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { buildToolJsonLd } from "@/utils/seoSchemas";

// --- Custom Interactive Graph Node ---
interface CustomGraphNodeData {
  label: string;
  state: "default" | "current" | "visited" | "queued" | "path";
  distance?: number;
  isStart?: boolean;
  isTarget?: boolean;
}

function CustomGraphNode({ data }: { data: CustomGraphNodeData }) {
  const { label, state, distance, isStart, isTarget } = data;

  const stateColors: Record<string, string> = {
    default: "border-slate-300 bg-white text-slate-700 shadow-xs",
    current:
      "border-amber-400 bg-amber-50 text-amber-800 shadow-[0_0_20px_rgba(251,191,36,0.6)] ring-2 ring-amber-300",
    visited:
      "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_0_15px_rgba(52,211,153,0.3)]",
    queued:
      "border-sky-400 bg-sky-50 text-sky-800 shadow-[0_0_15px_rgba(56,189,248,0.3)]",
    path:
      "border-violet-500 bg-violet-50 text-violet-900 shadow-[0_0_24px_rgba(139,92,246,0.5)] ring-2 ring-violet-300",
  };

  return (
    <div className="relative flex flex-col items-center">
      <Handle
        id="t-top"
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-slate-400 border-2 border-white"
      />
      <Handle
        id="s-bottom"
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-slate-400 border-2 border-white"
      />
      <Handle
        id="t-left"
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-slate-400 border-2 border-white"
      />
      <Handle
        id="s-right"
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-slate-400 border-2 border-white"
      />

      {/* Start / Target Badges */}
      {isStart && (
        <span className="absolute -top-3 -left-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold shadow-xs z-10">
          S
        </span>
      )}
      {isTarget && (
        <span className="absolute -top-3 -right-2 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold shadow-xs z-10">
          T
        </span>
      )}

      <div
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${
          stateColors[state] || stateColors.default
        }`}
      >
        {label}
      </div>

      {distance !== undefined && distance < Infinity && (
        <span className="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[9px] font-bold shadow-xs">
          d={distance}
        </span>
      )}
    </div>
  );
}

const nodeTypes = {
  customNode: CustomGraphNode,
};

// --- Presets ---
const PRESETS = {
  weightedGraph: {
    nodes: [
      { id: "A", type: "customNode", position: { x: 100, y: 150 }, data: { label: "A", state: "default" } },
      { id: "B", type: "customNode", position: { x: 260, y: 60 }, data: { label: "B", state: "default" } },
      { id: "C", type: "customNode", position: { x: 260, y: 240 }, data: { label: "C", state: "default" } },
      { id: "D", type: "customNode", position: { x: 440, y: 60 }, data: { label: "D", state: "default" } },
      { id: "E", type: "customNode", position: { x: 440, y: 240 }, data: { label: "E", state: "default" } },
      { id: "F", type: "customNode", position: { x: 600, y: 150 }, data: { label: "F", state: "default" } },
    ],
    edges: [
      { id: "eA-B", source: "A", target: "B", markerEnd: { type: MarkerType.ArrowClosed }, label: "4" },
      { id: "eA-C", source: "A", target: "C", markerEnd: { type: MarkerType.ArrowClosed }, label: "2" },
      { id: "eB-D", source: "B", target: "D", markerEnd: { type: MarkerType.ArrowClosed }, label: "5" },
      { id: "eC-B", source: "C", target: "B", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "eC-E", source: "C", target: "E", markerEnd: { type: MarkerType.ArrowClosed }, label: "3" },
      { id: "eB-E", source: "B", target: "E", markerEnd: { type: MarkerType.ArrowClosed }, label: "2" },
      { id: "eD-F", source: "D", target: "F", markerEnd: { type: MarkerType.ArrowClosed }, label: "3" },
      { id: "eE-F", source: "E", target: "F", markerEnd: { type: MarkerType.ArrowClosed }, label: "4" },
    ],
  },
  binaryTree: {
    nodes: [
      { id: "1", type: "customNode", position: { x: 300, y: 50 }, data: { label: "1", state: "default" } },
      { id: "2", type: "customNode", position: { x: 180, y: 150 }, data: { label: "2", state: "default" } },
      { id: "3", type: "customNode", position: { x: 420, y: 150 }, data: { label: "3", state: "default" } },
      { id: "4", type: "customNode", position: { x: 120, y: 250 }, data: { label: "4", state: "default" } },
      { id: "5", type: "customNode", position: { x: 240, y: 250 }, data: { label: "5", state: "default" } },
      { id: "6", type: "customNode", position: { x: 360, y: 250 }, data: { label: "6", state: "default" } },
      { id: "7", type: "customNode", position: { x: 480, y: 250 }, data: { label: "7", state: "default" } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "e1-3", source: "1", target: "3", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "e2-5", source: "2", target: "5", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "e3-6", source: "3", target: "6", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "e3-7", source: "3", target: "7", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
    ],
  },
  cycleGraph: {
    nodes: [
      { id: "A", type: "customNode", position: { x: 200, y: 60 }, data: { label: "A", state: "default" } },
      { id: "B", type: "customNode", position: { x: 380, y: 60 }, data: { label: "B", state: "default" } },
      { id: "C", type: "customNode", position: { x: 460, y: 200 }, data: { label: "C", state: "default" } },
      { id: "D", type: "customNode", position: { x: 290, y: 300 }, data: { label: "D", state: "default" } },
      { id: "E", type: "customNode", position: { x: 120, y: 200 }, data: { label: "E", state: "default" } },
    ],
    edges: [
      { id: "eA-B", source: "A", target: "B", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "eB-C", source: "B", target: "C", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "eC-D", source: "C", target: "D", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "eD-E", source: "D", target: "E", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
      { id: "eE-A", source: "E", target: "A", markerEnd: { type: MarkerType.ArrowClosed }, label: "1" },
    ],
  },
};

interface GraphStep {
  currentNodeId: string;
  visitedNodes: string[];
  queuedNodes: string[];
  activeEdgeId?: string;
  distances?: Record<string, number>;
  path?: string[];
  pathEdgeIds?: string[];
  explanation: string;
}

export default function GraphBuilder() {
  useDocumentMeta({
    title: "Interactive Graph Builder — BFS, DFS & Dijkstra Visualizer | AlgoLens",
    description:
      "Build custom directed and weighted graphs interactively and step through BFS, DFS, and Dijkstra shortest-path algorithms live.",
    canonicalPath: "/builder",
    ogImage: "/og/builder.png",
    jsonLd: buildToolJsonLd(
      typeof window !== "undefined" ? window.location.origin : "",
      "/builder",
      "AlgoLens Interactive Graph & Tree Builder",
      "Interactive BFS, DFS, and Dijkstra shortest-path visualizer."
    ),
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(PRESETS.weightedGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(PRESETS.weightedGraph.edges);

  const [selectedAlgo, setSelectedAlgo] = useState<"bfs" | "dfs" | "dijkstra">("bfs");
  const [startNodeId, setStartNodeId] = useState<string>("A");
  const [targetNodeId, setTargetNodeId] = useState<string>("F");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const nodeCounterRef = useRef(0);

  // Playback execution state
  const [steps, setSteps] = useState<GraphStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Synchronize startNodeId & targetNodeId whenever nodes change (including length === 1)
  useEffect(() => {
    if (nodes.length === 0) return;
    if (!nodes.some((n) => n.id === startNodeId)) {
      setStartNodeId(nodes[0].id);
    }
    if (!nodes.some((n) => n.id === targetNodeId)) {
      setTargetNodeId(nodes[nodes.length - 1].id);
    }
  }, [nodes, startNodeId, targetNodeId]);

  // Connect edges by dragging handles
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) {
        setErrorNotice("Self-loops are not permitted in simple traversal.");
        return;
      }
      setErrorNotice(null);
      setIsPlaying(false);
      setSteps([]);
      setCurrentStepIdx(0);
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            label: "1",
            style: { stroke: "#6366F1", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Add a new node with guaranteed unique ID
  const handleAddNode = () => {
    const existingIds = new Set(nodes.map((n) => n.id));
    let label = "";
    while (true) {
      const idx = nodeCounterRef.current++;
      const candidate =
        String.fromCharCode(65 + (idx % 26)) + (idx >= 26 ? String(Math.floor(idx / 26)) : "");
      if (!existingIds.has(candidate)) {
        label = candidate;
        break;
      }
    }

    const newNode: Node = {
      id: label,
      type: "customNode",
      position: {
        x: 150 + ((nodes.length * 50) % 400),
        y: 100 + ((nodes.length * 40) % 300),
      },
      data: { label, state: "default" },
    };
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(0);
    setNodes((nds) => [...nds, newNode]);
    setErrorNotice(null);
  };

  // Delete selected node
  const handleDeleteNode = (id: string) => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(0);
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Auto-arrange layout: Circular
  const handleCircularLayout = () => {
    if (nodes.length === 0) return;
    const centerX = 350;
    const centerY = 200;
    const radius = Math.min(180, 50 + nodes.length * 18);
    const angleStep = (2 * Math.PI) / nodes.length;

    setNodes((nds) =>
      nds.map((node, i) => ({
        ...node,
        position: {
          x: Math.round(centerX + radius * Math.cos(i * angleStep)),
          y: Math.round(centerY + radius * Math.sin(i * angleStep)),
        },
      }))
    );
  };

  // Change weight of an edge (supports 0+)
  const handleChangeEdgeWeight = (edgeId: string, delta: number) => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(0);
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          const parsed = Number(edge.label);
          const currentWeight = Number.isFinite(parsed) ? parsed : 1;
          const newWeight = Math.max(0, currentWeight + delta);
          return { ...edge, label: String(newWeight) };
        }
        return edge;
      })
    );
  };

  // Load a preset graph
  const handleLoadPreset = (key: keyof typeof PRESETS) => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(0);
    setErrorNotice(null);
    nodeCounterRef.current = 0;
    setNodes(PRESETS[key].nodes);
    setEdges(PRESETS[key].edges);
    setStartNodeId(PRESETS[key].nodes[0].id);
    setTargetNodeId(PRESETS[key].nodes[PRESETS[key].nodes.length - 1].id);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  // Clear canvas
  const handleClear = () => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(0);
    nodeCounterRef.current = 0;
    setNodes([]);
    setEdges([]);
    setErrorNotice(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  // --- Step Generators ---
  const generateSteps = (): GraphStep[] => {
    if (nodes.length === 0) {
      setErrorNotice("Canvas is empty. Add at least one node to visualize.");
      return [];
    }

    if (!nodes.some((n) => n.id === startNodeId)) {
      setErrorNotice("Invalid starting node. Please select a valid start node.");
      return [];
    }

    if (selectedAlgo === "dijkstra" && !nodes.some((n) => n.id === targetNodeId)) {
      setErrorNotice("Invalid target node. Please select a valid target node.");
      return [];
    }

    const adj: Record<string, { to: string; weight: number; edgeId: string }[]> = {};
    nodes.forEach((n) => {
      adj[n.id] = [];
    });

    for (const e of edges) {
      const raw = e.label === undefined || e.label === null || String(e.label).trim() === "" ? 1 : Number(e.label);
      const weight = Number.isFinite(raw) ? raw : 1;
      if (selectedAlgo === "dijkstra" && weight < 0) {
        setErrorNotice("Dijkstra does not support negative edge weights.");
        return [];
      }
      if (adj[e.source]) {
        adj[e.source].push({ to: e.target, weight, edgeId: e.id });
      }
    }

    const generated: GraphStep[] = [];

    if (selectedAlgo === "bfs") {
      const queue: string[] = [startNodeId];
      const visited = new Set<string>([startNodeId]);

      generated.push({
        currentNodeId: startNodeId,
        visitedNodes: [startNodeId],
        queuedNodes: [startNodeId],
        explanation: `Starting Breadth-First Search from node ${startNodeId}.`,
      });

      while (queue.length > 0) {
        const u = queue.shift()!;
        const neighbors = adj[u] || [];

        generated.push({
          currentNodeId: u,
          visitedNodes: Array.from(visited),
          queuedNodes: [...queue],
          explanation: `Visiting node ${u} and examining all outbound adjacent neighbors.`,
        });

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.to)) {
            visited.add(neighbor.to);
            queue.push(neighbor.to);

            generated.push({
              currentNodeId: u,
              visitedNodes: Array.from(visited),
              queuedNodes: [...queue],
              activeEdgeId: neighbor.edgeId,
              explanation: `Discovered unvisited neighbor ${neighbor.to} via edge (${u} → ${neighbor.to}). Enqueuing.`,
            });
          }
        }
      }

      generated.push({
        currentNodeId: "",
        visitedNodes: Array.from(visited),
        queuedNodes: [],
        explanation: `BFS traversal completed! Visited all ${visited.size} reachable nodes.`,
      });
    } else if (selectedAlgo === "dfs") {
      const visited = new Set<string>();

      function dfsVisit(u: string) {
        visited.add(u);
        generated.push({
          currentNodeId: u,
          visitedNodes: Array.from(visited),
          queuedNodes: [],
          explanation: `DFS visiting node ${u}. Recursing deeper down this branch.`,
        });

        const neighbors = adj[u] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.to)) {
            generated.push({
              currentNodeId: u,
              visitedNodes: Array.from(visited),
              queuedNodes: [],
              activeEdgeId: neighbor.edgeId,
              explanation: `Traversing edge (${u} → ${neighbor.to}) down new recursion frame.`,
            });
            dfsVisit(neighbor.to);
          }
        }
      }

      dfsVisit(startNodeId);

      generated.push({
        currentNodeId: "",
        visitedNodes: Array.from(visited),
        queuedNodes: [],
        explanation: `DFS completed! Unwound call stack for all branches.`,
      });
    } else if (selectedAlgo === "dijkstra") {
      const dist: Record<string, number> = {};
      const prev: Record<string, string | null> = {};
      const prevEdge: Record<string, string | null> = {};
      const unvisited = new Set<string>();

      nodes.forEach((n) => {
        dist[n.id] = Infinity;
        prev[n.id] = null;
        prevEdge[n.id] = null;
        unvisited.add(n.id);
      });
      dist[startNodeId] = 0;

      generated.push({
        currentNodeId: startNodeId,
        visitedNodes: [],
        queuedNodes: [],
        distances: { ...dist },
        explanation: `Dijkstra initialized: distance to start ${startNodeId} is 0; all other nodes set to ∞.`,
      });

      while (unvisited.size > 0) {
        let current: string | null = null;
        let minDist = Infinity;
        for (const u of unvisited) {
          if (dist[u] < minDist) {
            minDist = dist[u];
            current = u;
          }
        }

        if (!current || minDist === Infinity) break;

        unvisited.delete(current);

        generated.push({
          currentNodeId: current,
          visitedNodes: nodes.map((n) => n.id).filter((id) => !unvisited.has(id)),
          queuedNodes: [],
          distances: { ...dist },
          explanation: `Selected node ${current} with minimum tentative distance (${dist[current]}). Relaxing neighbors.`,
        });

        if (current === targetNodeId) break;

        const neighbors = adj[current] || [];
        for (const edge of neighbors) {
          if (unvisited.has(edge.to)) {
            const oldDist = dist[edge.to];
            const newDist = dist[current] + edge.weight;
            if (newDist < oldDist) {
              dist[edge.to] = newDist;
              prev[edge.to] = current;
              prevEdge[edge.to] = edge.edgeId;

              generated.push({
                currentNodeId: current,
                visitedNodes: nodes.map((n) => n.id).filter((id) => !unvisited.has(id)),
                queuedNodes: [],
                activeEdgeId: edge.edgeId,
                distances: { ...dist },
                explanation: `Relaxed edge (${current} → ${edge.to}): updated distance to ${edge.to} from ${
                  oldDist === Infinity ? "∞" : oldDist
                } to ${newDist}.`,
              });
            }
          }
        }
      }

      const path: string[] = [];
      const pathEdgeIds: string[] = [];
      let curr: string | null = targetNodeId;
      let guard = nodes.length + 1;
      while (curr != null && guard-- > 0) {
        path.unshift(curr);
        const edgeId = prevEdge[curr];
        if (edgeId) pathEdgeIds.unshift(edgeId);
        curr = prev[curr] ?? null;
      }

      const pathFound = path.length > 0 && path[0] === startNodeId;

      generated.push({
        currentNodeId: pathFound ? targetNodeId : "",
        visitedNodes: nodes.map((n) => n.id).filter((id) => !unvisited.has(id)),
        queuedNodes: [],
        distances: { ...dist },
        path: pathFound ? path : [],
        pathEdgeIds: pathFound ? pathEdgeIds : [],
        explanation: pathFound
          ? `Shortest path to ${targetNodeId} found: [${path.join(" → ")}] with total distance ${dist[targetNodeId]}!`
          : `No reachable path from ${startNodeId} to ${targetNodeId}.`,
      });
    }

    return generated;
  };

  const handleRunAlgorithm = () => {
    setErrorNotice(null);
    const newSteps = generateSteps();
    if (newSteps.length > 0) {
      setSteps(newSteps);
      setCurrentStepIdx(0);
      setIsPlaying(true);
    }
  };

  // Sync visualization state to ReactFlow nodes & edges based on current step
  useEffect(() => {
    const showTarget = selectedAlgo === "dijkstra";

    if (steps.length === 0 || currentStepIdx >= steps.length) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isStart: node.id === startNodeId,
            isTarget: showTarget && node.id === targetNodeId,
            state: "default",
            distance: undefined,
          },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: { stroke: "#CBD5E1", strokeWidth: 1.5 },
        }))
      );
      return;
    }

    const step = steps[currentStepIdx];
    audioEngine.playTick(520);

    setNodes((nds) =>
      nds.map((node) => {
        let state: CustomGraphNodeData["state"] = "default";

        if (step.path && step.path.includes(node.id)) {
          state = "path";
        } else if (node.id === step.currentNodeId) {
          state = "current";
        } else if (step.visitedNodes?.includes(node.id)) {
          state = "visited";
        } else if (step.queuedNodes?.includes(node.id)) {
          state = "queued";
        }

        const distance = step.distances ? step.distances[node.id] : undefined;

        return {
          ...node,
          data: {
            ...node.data,
            state,
            distance,
            isStart: node.id === startNodeId,
            isTarget: showTarget && node.id === targetNodeId,
          },
        };
      })
    );

    setEdges((eds) =>
      eds.map((edge) => {
        const isPathEdge = step.pathEdgeIds
          ? step.pathEdgeIds.includes(edge.id)
          : Boolean(
              step.path &&
                step.path.some((nodeId, idx) => {
                  if (idx === step.path!.length - 1) return false;
                  return edge.source === nodeId && edge.target === step.path![idx + 1];
                })
            );

        const isActive = edge.id === step.activeEdgeId;

        return {
          ...edge,
          style: {
            stroke: isPathEdge ? "#8B5CF6" : isActive ? "#F59E0B" : "#CBD5E1",
            strokeWidth: isPathEdge ? 3.5 : isActive ? 2.5 : 1.5,
          },
        };
      })
    );
  }, [steps, currentStepIdx, setNodes, setEdges, startNodeId, targetNodeId, selectedAlgo]);

  // Stop autoplay cleanly when reaching last step
  useEffect(() => {
    if (isPlaying && steps.length > 0 && currentStepIdx >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStepIdx, steps.length]);

  // Autoplay ticker (pure updater)
  useEffect(() => {
    if (!isPlaying || steps.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentStepIdx((idx) => (idx >= steps.length - 1 ? idx : idx + 1));
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length, playbackSpeed]);

  const activeStep = steps[currentStepIdx];

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] bg-transparent overflow-y-auto lg:overflow-hidden font-sans">
      {/* Top Banner & Control HUD */}
      <div
        className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-6 py-2.5 border-b z-10 shrink-0 min-h-14"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(20px) saturate(165%)",
          WebkitBackdropFilter: "blur(20px) saturate(165%)",
          borderColor: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 1px 0 rgba(99, 102, 241, 0.06)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                Interactive Graph & Tree Builder
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50/90 text-violet-700 border border-violet-200/80 whitespace-nowrap">
                Custom Canvas
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-600">
              Draw custom nodes and edges, then run BFS, DFS, or Dijkstra live.
            </p>
          </div>
        </div>

        {/* Toolbar & Algorithm Chooser */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center p-1 rounded-full glass-capsule-track text-xs overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => handleLoadPreset("weightedGraph")}
              className="px-2.5 py-1 rounded-full text-slate-700 hover:text-indigo-700 hover:bg-white/80 font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              Weighted Graph
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset("binaryTree")}
              className="px-2.5 py-1 rounded-full text-slate-700 hover:text-indigo-700 hover:bg-white/80 font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              Binary Tree
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset("cycleGraph")}
              className="px-2.5 py-1 rounded-full text-slate-700 hover:text-indigo-700 hover:bg-white/80 font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              Cycle
            </button>
          </div>

          {/* Algorithm Picker */}
          <div className="flex items-center p-1 rounded-full glass-capsule-track text-xs">
            {(["bfs", "dfs", "dijkstra"] as const).map((algo) => (
              <button
                type="button"
                key={algo}
                onClick={() => {
                  setIsPlaying(false);
                  setSelectedAlgo(algo);
                  setSteps([]);
                  setCurrentStepIdx(0);
                }}
                className={`px-3 py-1 rounded-full uppercase font-bold text-[11px] transition-all cursor-pointer ${
                  selectedAlgo === algo
                    ? "glass-capsule-active text-violet-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {algo}
              </button>
            ))}
          </div>

          {/* Start / Target Pickers */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold text-[11px]">Start:</span>
            <select
              value={startNodeId}
              aria-label="Start node"
              onChange={(e) => {
                setIsPlaying(false);
                setSteps([]);
                setCurrentStepIdx(0);
                setStartNodeId(e.target.value);
              }}
              className="px-2.5 py-1 rounded-full glass-input font-mono font-bold text-xs outline-none cursor-pointer"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>

            {selectedAlgo === "dijkstra" && (
              <>
                <span className="font-semibold text-[11px] ml-1">Target:</span>
                <select
                  value={targetNodeId}
                  aria-label="Target node"
                  onChange={(e) => {
                    setIsPlaying(false);
                    setSteps([]);
                    setCurrentStepIdx(0);
                    setTargetNodeId(e.target.value);
                  }}
                  className="px-2.5 py-1 rounded-full glass-input font-mono font-bold text-xs outline-none cursor-pointer"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleAddNode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/90 ring-1 ring-slate-200/70 bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold backdrop-blur-md shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Node</span>
          </button>

          <button
            type="button"
            onClick={handleRunAlgorithm}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-violet-600/25 transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run {selectedAlgo.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Main Builder & Canvas Area */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* Canvas Center (9 Cols) */}
        <div className="col-span-12 lg:col-span-9 panel rounded-3xl flex flex-col relative overflow-hidden min-h-[420px] lg:min-h-0">
          {/* Canvas Top Bar */}
          <div className="h-10 px-4 border-b border-slate-200/50 flex items-center justify-between bg-white/55 backdrop-blur-md z-20 shrink-0">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Route className="w-4 h-4 text-violet-600" />
                <span>Canvas</span>
              </span>

              {/* Quick Metrics */}
              <span className="text-[11px] font-mono text-slate-500 px-2.5 py-0.5 rounded-full bg-white/75 border border-white/90">
                |V| = {nodes.length} &nbsp;|&nbsp; |E| = {edges.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCircularLayout}
                className="px-3 py-1 rounded-full bg-white/75 hover:bg-white border border-white/90 ring-1 ring-slate-200/60 text-slate-600 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                title="Arrange nodes in a circular layout"
              >
                <CircleDot className="w-3 h-3 text-indigo-600" />
                <span>Circular Layout</span>
              </button>

              <button
                onClick={handleClear}
                className="text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50/75 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium transition-colors ml-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Context Action Bar when a Node is Clicked */}
          {selectedNodeId && (
            <div className="absolute top-12 left-4 z-30 flex items-center gap-1.5 p-1.5 bg-white/88 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/95 ring-1 ring-indigo-500/10 text-xs">
              <span className="font-bold text-slate-700 px-2">Node {selectedNodeId}:</span>
              <button
                onClick={() => {
                  setStartNodeId(selectedNodeId);
                  setSelectedNodeId(null);
                }}
                className="px-2.5 py-1 rounded-full bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Set as Start (S)
              </button>
              <button
                onClick={() => {
                  setTargetNodeId(selectedNodeId);
                  setSelectedNodeId(null);
                }}
                className="px-2.5 py-1 rounded-full bg-rose-50/90 hover:bg-rose-100 text-rose-800 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Set as Target (T)
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNodeId)}
                className="px-2.5 py-1 rounded-full bg-slate-100/80 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Context Action Bar when an Edge is Clicked */}
          {selectedEdgeId && (
            <div className="absolute top-12 right-4 z-30 flex items-center gap-1.5 p-1.5 bg-white/88 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/95 ring-1 ring-indigo-500/10 text-xs">
              <span className="font-bold text-slate-700 px-2 flex items-center gap-1">
                <Weight className="w-3 h-3 text-indigo-600" />
                Edge Weight:
              </span>
              <button
                onClick={() => handleChangeEdgeWeight(selectedEdgeId, -1)}
                className="w-6 h-6 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-700 px-1">
                {edges.find((e) => e.id === selectedEdgeId)?.label || "1"}
              </span>
              <button
                onClick={() => handleChangeEdgeWeight(selectedEdgeId, 1)}
                className="w-6 h-6 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                +
              </button>
              <button
                onClick={() => {
                  setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
                  setSelectedEdgeId(null);
                }}
                className="ml-2 text-rose-600 hover:underline text-[11px] pr-1 cursor-pointer"
              >
                Delete Edge
              </button>
            </div>
          )}

          {/* Error Notice Banner */}
          {errorNotice && (
            <div className="absolute top-12 left-4 right-4 z-30 p-3 rounded-2xl bg-amber-50/95 backdrop-blur-xl border border-amber-200/80 text-xs text-amber-800 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorNotice(null)}
                className="text-[11px] text-amber-800 font-bold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ReactFlow Canvas */}
          <div className="flex-1 relative bg-white/45 min-h-[300px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => {
                setSelectedNodeId((curr) => (curr === node.id ? null : node.id));
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId((curr) => (curr === edge.id ? null : edge.id));
                setSelectedNodeId(null);
              }}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="rgba(99, 102, 241, 0.22)" />
              <Controls position="bottom-left" />
            </ReactFlow>
          </div>

          {/* Playback Controls Footer */}
          {steps.length > 0 && (
            <div className="min-h-14 px-3 sm:px-4 py-2 border-t border-slate-200/50 bg-white/78 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause traversal" : "Play traversal"}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 hover:opacity-95 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx((i) => Math.max(0, i - 1));
                  }}
                  disabled={currentStepIdx === 0}
                  className="px-3 py-1 rounded-full border border-white/90 ring-1 ring-slate-200/70 bg-white/80 text-xs text-slate-700 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  Prev
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx((i) => Math.min(steps.length - 1, i + 1));
                  }}
                  disabled={currentStepIdx >= steps.length - 1}
                  className="px-3 py-1 rounded-full border border-white/90 ring-1 ring-slate-200/70 bg-white/80 text-xs text-slate-700 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx(0);
                  }}
                  aria-label="Reset to start"
                  className="p-1.5 rounded-full hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Reset to Start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrubber */}
              <div className="flex-1 min-w-[140px] max-w-sm mx-2 sm:mx-6 flex items-center gap-2">
                <input
                  type="range"
                  aria-label="Graph playback step"
                  min={0}
                  max={steps.length - 1}
                  value={currentStepIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStepIdx(Number(e.target.value));
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-600 font-semibold shrink-0">
                  {currentStepIdx + 1}/{steps.length}
                </span>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono shrink-0">
                <span>Speed:</span>
                <select
                  aria-label="Graph playback speed"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="rounded-full glass-input px-2.5 py-0.5 text-xs outline-none cursor-pointer"
                >
                  <option value={1400}>0.5x</option>
                  <option value={800}>1.0x</option>
                  <option value={400}>2.0x</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Telemetry Stack (3 Cols) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0">
          {/* Step Explanation Card */}
          <div className="panel rounded-3xl p-4 flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Step Explanation</span>
            </div>
            <div className="text-xs text-slate-700 leading-relaxed min-h-[50px]">
              {activeStep?.explanation ||
                "Press Run to start visualizing your custom graph traversal."}
            </div>
          </div>

          {/* Graph State Telemetry */}
          <div className="flex-1 panel rounded-3xl p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="font-bold text-xs text-slate-800 border-b border-slate-200/50 pb-2 flex items-center justify-between">
              <span>Execution Telemetry</span>
              <span className="text-[10px] font-mono text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50/80">
                {selectedAlgo.toUpperCase()}
              </span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-400" />
                <span>Current Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400" />
                <span>Visited Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-100 border border-sky-400" />
                <span>In Queue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-violet-100 border border-violet-400" />
                <span>Shortest Path</span>
              </div>
            </div>

            {/* Visited List */}
            {activeStep?.visitedNodes && (
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-500 text-[11px]">
                  Visited Nodes:
                </span>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {activeStep.visitedNodes.length === 0 ? (
                    <span className="text-slate-400">None yet</span>
                  ) : (
                    activeStep.visitedNodes.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-0.5 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-200/80"
                      >
                        {id}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Queue / Stack List */}
            {activeStep?.queuedNodes && activeStep.queuedNodes.length > 0 && (
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-500 text-[11px]">Queue:</span>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {activeStep.queuedNodes.map((id, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-sky-50/90 text-sky-700 border border-sky-200/80"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Shortest Path Result */}
            {activeStep?.path && activeStep.path.length > 0 && (
              <div className="p-3 rounded-2xl bg-violet-50/75 backdrop-blur-md border border-violet-200/70 text-xs flex flex-col gap-1">
                <span className="font-bold text-violet-800 text-[11px]">
                  Optimal Shortest Path:
                </span>
                <div className="font-mono font-bold text-violet-900 text-sm">
                  {activeStep.path.join(" → ")}
                </div>
              </div>
            )}

            {/* Dijkstra Distance Table */}
            {activeStep?.distances && (
              <div className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-slate-500 text-[11px]">
                  Distance Table:
                </span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {Object.entries(activeStep.distances).map(([nodeId, d]) => (
                    <div
                      key={nodeId}
                      className="p-1.5 rounded-xl bg-white/70 border border-white/90 ring-1 ring-slate-200/60 text-center"
                    >
                      <span className="text-slate-500">{nodeId}:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {d === Infinity ? "∞" : d}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

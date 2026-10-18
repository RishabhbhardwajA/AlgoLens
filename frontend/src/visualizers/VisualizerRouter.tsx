import { useExecutionStore } from "@/engine/useExecutionController";
import { ArrayVisualizer } from "@/visualizers/ArrayVisualizer/ArrayVisualizer";
import { TreeVisualizer } from "@/visualizers/TreeVisualizer/TreeVisualizer";
import { GridVisualizer } from "@/visualizers/GridVisualizer/GridVisualizer";
import { LinkedListVisualizer } from "@/visualizers/LinkedListVisualizer/LinkedListVisualizer";

/**
 * Dynamically renders the correct visualizer based on the current algorithm's visualizationType.
 * This is the single entry point for all visualizers in the Visualizer page.
 */
export function VisualizerRouter() {
  const algorithm = useExecutionStore((s) => s.algorithm);

  if (!algorithm) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Select an algorithm to begin
      </div>
    );
  }

  switch (algorithm.visualizationType) {
    case "array":
      return <ArrayVisualizer />;
    case "tree":
      return <TreeVisualizer />;
    case "grid":
      return <GridVisualizer />;
    case "linked-list":
      return <LinkedListVisualizer />;
    case "none":
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
          <div className="text-4xl opacity-30">🔁</div>
          <p className="text-sm">Recursion visualization — see the Call Stack panel below</p>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
          Visualizer coming soon for this algorithm type
        </div>
      );
  }
}

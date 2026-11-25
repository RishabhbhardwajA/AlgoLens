import { Component, type ReactNode } from "react";
import { useExecutionStore } from "@/engine/useExecutionController";
import { ArrayVisualizer } from "@/visualizers/ArrayVisualizer/ArrayVisualizer";
import { TreeVisualizer } from "@/visualizers/TreeVisualizer/TreeVisualizer";
import { GridVisualizer } from "@/visualizers/GridVisualizer/GridVisualizer";
import { LinkedListVisualizer } from "@/visualizers/LinkedListVisualizer/LinkedListVisualizer";

interface VisualizerErrorBoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface VisualizerErrorBoundaryState {
  hasError: boolean;
}

class VisualizerErrorBoundary extends Component<
  VisualizerErrorBoundaryProps,
  VisualizerErrorBoundaryState
> {
  state: VisualizerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): VisualizerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: VisualizerErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 text-xs font-mono">
          <p className="font-semibold text-rose-600 mb-1">Unable to render visualization state.</p>
          <p>Check your input format and click Run to re-render.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Dynamically renders the correct visualizer based on the current algorithm's visualizationType.
 * This is the single entry point for all visualizers in the Visualizer page.
 */
export function VisualizerRouter() {
  const algorithm = useExecutionStore((s) => s.algorithm);
  const rawInput = useExecutionStore((s) => s.rawInput);
  const hasStarted = useExecutionStore((s) => s.hasStarted);
  const stepsCount = useExecutionStore((s) => s.steps.length);

  if (!algorithm) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Select an algorithm to begin
      </div>
    );
  }

  let content: ReactNode;
  switch (algorithm.visualizationType) {
    case "array":
      content = <ArrayVisualizer />;
      break;
    case "tree":
      content = <TreeVisualizer />;
      break;
    case "grid":
      content = <GridVisualizer />;
      break;
    case "linked-list":
      content = <LinkedListVisualizer />;
      break;
    case "none":
      content = (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600 px-4 text-center">
          <div className="text-4xl opacity-35">🔁</div>
          <p className="text-sm font-medium">
            Recursion trace — inspect frames and variables in the Call Stack panel
          </p>
        </div>
      );
      break;
    default:
      content = (
        <div className="flex items-center justify-center h-full text-slate-600 text-sm">
          Visualizer unavailable for this algorithm type
        </div>
      );
  }

  return (
    <VisualizerErrorBoundary resetKey={`${algorithm.id}:${rawInput}:${hasStarted}:${stepsCount}`}>
      {content}
    </VisualizerErrorBoundary>
  );
}

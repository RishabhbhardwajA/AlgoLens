import type { ExecutionStep, VisualizableAlgorithm, StructuredExplanation } from "@/engine/executionTypes";

/**
 * Returns a standardized 3-part structured explanation:
 * 1. What happened?
 * 2. Why did it happen?
 * 3. What condition or invariant explains the decision?
 */
export function getStructuredExplanation(
  step: ExecutionStep | null | undefined,
  algorithm: VisualizableAlgorithm | null | undefined
): StructuredExplanation {
  if (!step) {
    return {
      what: "Execution is not started or has reset.",
      why: "Awaiting user trigger to start stepping through algorithm instructions.",
      invariant: "All data structures and pointers are at their initial configuration.",
    };
  }

  // 1. If step already contains author-defined structured explanation, return it
  if (step.structuredExplanation) {
    return step.structuredExplanation;
  }

  // 2. Derive structured explanation systematically from event and explanation text
  const event = step.event;
  const rawExplanation = step.explanation || "";

  switch (event.type) {
    case "UPDATE": {
      const variable = event.variable;
      const oldVal = event.oldValue !== undefined ? String(event.oldValue) : "initial";
      const newVal = String(event.newValue);
      return {
        what: `Updated variable "${variable}" to ${newVal} (previous: ${oldVal}) on Line ${step.line}.`,
        why: rawExplanation.split("\n")[0] || `Executing assignment instruction for ${variable}.`,
        invariant: `Variable state transition guarantees monotonicity and consistency for this execution step.`,
      };
    }

    case "COMPARE": {
      const left = String(event.left ?? "left");
      const right = String(event.right ?? "right");
      const op = event.operator;
      const result = event.result;
      return {
        what: `Evaluated comparison: ${left} ${op} ${right} → result is ${result ? "TRUE" : "FALSE"} (Line ${step.line}).`,
        why: result
          ? `Branch condition met. Execution proceeds along the active condition path.`
          : `Branch condition evaluated to false. Execution skips to the alternate branch.`,
        invariant: `Read-only evaluation preserves array and variable immutability.`,
      };
    }

    case "POINTER_MOVE": {
      return {
        what: `Moved pointer "${event.pointer}" from index ${event.from} to ${event.to} (Line ${step.line}).`,
        why: rawExplanation.split("\n")[0] || `Pruning the search window based on current condition.`,
        invariant: `Remaining candidate solutions are strictly confined within the updated pointer boundaries.`,
      };
    }

    case "SWAP": {
      return {
        what: `Swapped elements at indices ${event.indices[0]} and ${event.indices[1]} (Line ${step.line}).`,
        why: `Elements were out of sorted order or partitioned across the pivot.`,
        invariant: `Multiset of elements is preserved; partition order is progressively restored.`,
      };
    }

    case "CALL": {
      const fn = event.functionName;
      return {
        what: `Pushed new activation frame for ${fn}() onto the call stack (depth ${step.depth ?? 0}).`,
        why: `Breaking down problem into a smaller independent sub-problem.`,
        invariant: `Caller frame variables remain suspended in stack memory until child resolves.`,
      };
    }

    case "RETURN": {
      return {
        what: `Function returned ${String(event.value)} to caller and popped stack frame (Line ${step.line}).`,
        why: `Subproblem resolution complete.`,
        invariant: `Result satisfies the base case or combines subproblem solutions.`,
      };
    }

    case "FOUND": {
      return {
        what: `Target element located at index ${event.index !== undefined ? event.index : "match"} (Line ${step.line}).`,
        why: `Inspected element matches search query criteria.`,
        invariant: `Search terminating successfully without further inspections needed.`,
      };
    }

    case "NOT_FOUND": {
      return {
        what: `Target element not found in array (Line ${step.line}).`,
        why: `Search space exhausted.`,
        invariant: `Guaranteed absence of target in the given input.`,
      };
    }

    default: {
      return {
        what: rawExplanation.split("\n")[0] || `Executed instruction at Line ${step.line}.`,
        why: rawExplanation.split("\n\n")[1] || `Executing sequential algorithmic logic for ${algorithm?.name || "algorithm"}.`,
        invariant: `Algorithm state remains sound and consistent with specification invariants.`,
      };
    }
  }
}

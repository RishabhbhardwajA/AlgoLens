import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type FibInput = number;

export const fibonacci: VisualizableAlgorithm<FibInput> = {
  id: "fibonacci",
  name: "Fibonacci",
  category: "Recursion",
  difficulty: "Easy",
  description: "Compute Fibonacci(n) using naive recursion to visualize exponential call tree.",

  sourceCode: {
    typescript: `function fib(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;

  const left = fib(n - 1);
  const right = fib(n - 2);

  return left + right;
}`,
    python: `def fib(n):
    if n <= 0: return 0
    if n == 1: return 1
    
    left = fib(n - 1)
    right = fib(n - 2)
    
    return left + right`,
    java: `class Solution {
    public int fib(int n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;
        
        int left = fib(n - 1);
        int right = fib(n - 2);
        
        return left + right;
    }
}`,
    cpp: `class Solution {
public:
    int fib(int n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;
        
        int left = fib(n - 1);
        int right = fib(n - 2);
        
        return left + right;
    }
};`
  },

  language: "typescript",
  defaultInput: "6",

  parseInput(raw: unknown): FibInput {
    if (typeof raw === "string") return parseInt(raw.trim(), 10);
    return raw as number;
  },

  validateInput(input: FibInput) {
    if (isNaN(input) || input < 0) return { valid: false, error: "n must be a non-negative integer" };
    if (input > 10) return { valid: false, error: "n must be ≤ 10 (to keep the visualization manageable)" };
    return { valid: true };
  },

  initialVisualizationState(): VisualizationState {
    return { type: "tree", nodes: [], edges: [] };
  },

  complexity: {
    time: "O(2ⁿ)",
    space: "O(n)",
    timeDescription: "Each call spawns two recursive calls",
    spaceDescription: "Maximum call stack depth is n",
  },
  visualizationType: "tree",
  tags: ["recursion", "fibonacci"],

  execute(input: FibInput): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];
    const callStack: CallFrame[] = [];
    let frameId = 0;

    interface FibNode {
      id: string;
      n: number;
      result: number | null;
      left?: FibNode;
      right?: FibNode;
      state: "default" | "current" | "visited" | "returning";
    }

    let rootNode: FibNode | null = null;

    function buildTreeState(currentId: string | null): VisualizationState {
      if (!rootNode) return { type: "tree", nodes: [], edges: [] };
      const nodes: import("@/engine/executionTypes").TreeNodeState[] = [];
      const edges: import("@/engine/executionTypes").TreeEdgeState[] = [];

      function traverse(node: FibNode, depth: number, position: number, parentId: string | null, side: string) {
        nodes.push({
          id: node.id,
          value: node.n,
          state: node.id === currentId ? "current" : node.state,
          returnValue: node.result !== null ? node.result : undefined,
          depth,
          position,
        });
        if (parentId) {
          edges.push({
            id: `${parentId}-${node.id}`,
            source: parentId,
            target: node.id,
            state: (node.state === "visited" || node.state === "returning" || node.result !== null) ? "traversed" : "default",
            label: side,
          });
        }
        if (node.left) traverse(node.left, depth + 1, position * 2, node.id, "L");
        if (node.right) traverse(node.right, depth + 1, position * 2 + 1, node.id, "R");
      }
      traverse(rootNode, 0, 0, null, "");
      return { type: "tree", nodes, edges, currentNodeId: currentId ?? undefined };
    }

    function recurse(n: number, depth: number, parentNode: FibNode | null, side: "left" | "right"): number {
      const fId = `fib-${frameId++}`;
      const cf = frame(fId, "fib", { n }, { n }, 1);
      callStack.push(cf);
      
      const node: FibNode = { id: fId, n, result: null, state: "current" };
      if (!rootNode) rootNode = node;
      else if (parentNode) parentNode[side] = node;

      // CALL step
      steps.push(
        step().line(n <= 0 ? 3 : n === 1 ? 4 : 7)
          .fn("fib")
          .event({ type: "CALL", functionName: "fib", args: { n }, line: 1 })
          .callStack([...callStack])
          .variables({ n })
          .viz(buildTreeState(fId))
          .explain(
            n <= 0 ? `fib(${n}) — Base case: n ≤ 0. Return 0.`
            : n === 1 ? `fib(1) — Base case: n === 1. Return 1.`
            : `fib(${n}) — Recursive case.\nWill compute fib(${n - 1}) + fib(${n - 2}).`
          )
          .depth(depth).recursive(depth > 0).build()
      );

      if (n <= 0) {
        node.result = 0;
        node.state = "returning";
        steps.push(step().line(3).fn("fib").event({ type: "RETURN", functionName: "fib", value: 0, line: 3 }).callStack([...callStack]).variables({ n, returns: 0 }).viz(buildTreeState(fId)).explain(`fib(${n}): Base case → return 0`).depth(depth).returns(0).build());
        node.state = "visited";
        callStack.pop();
        return 0;
      }

      if (n === 1) {
        node.result = 1;
        node.state = "returning";
        steps.push(step().line(4).fn("fib").event({ type: "RETURN", functionName: "fib", value: 1, line: 4 }).callStack([...callStack]).variables({ n, returns: 1 }).viz(buildTreeState(fId)).explain(`fib(1): Base case → return 1`).depth(depth).returns(1).build());
        node.state = "visited";
        callStack.pop();
        return 1;
      }

      // Recurse left: fib(n-1)
      steps.push(step().line(7).fn("fib").event({ type: "CALL", functionName: "fib", args: { n: n - 1 }, line: 7 }).callStack([...callStack]).variables({ n, left: "computing..." }).viz(buildTreeState(fId)).explain(`fib(${n}): Computing fib(${n - 1})...`).depth(depth).build());
      node.state = "visited";
      const left = recurse(n - 1, depth + 1, node, "left");
      node.state = "current";

      // Recurse right: fib(n-2)
      steps.push(step().line(8).fn("fib").event({ type: "CALL", functionName: "fib", args: { n: n - 2 }, line: 8 }).callStack([...callStack]).variables({ n, left, right: "computing..." }).viz(buildTreeState(fId)).explain(`fib(${n}): fib(${n - 1}) = ${left}. Now computing fib(${n - 2})...`).depth(depth).build());
      node.state = "visited";
      const right = recurse(n - 2, depth + 1, node, "right");
      node.state = "current";

      const result = left + right;
      node.result = result;
      node.state = "returning";

      steps.push(
        step().line(10).fn("fib")
          .event({ type: "RETURN", functionName: "fib", value: result, line: 10 })
          .callStack([...callStack])
          .variables({ n, left, right, result })
          .viz(buildTreeState(fId))
          .explain(`fib(${n}) = fib(${n - 1}) + fib(${n - 2})\n= ${left} + ${right}\n= ${result}`)
          .depth(depth).returns(result).build()
      );

      node.state = "visited";
      callStack.pop();
      return result;
    }

    const answer = recurse(input, 0, null, "left");

    steps.push(
      step().line(10).fn("fib")
        .event({ type: "RETURN", functionName: "fib", value: answer, line: 10 })
        .callStack([])
        .variables({ n: input, result: answer })
        .viz(buildTreeState(null))
        .explain(`Fibonacci(${input}) = ${answer}\n\nTotal recursive calls made: ${frameId}`)
        .returns(answer).build()
    );

    return steps;
  },
};

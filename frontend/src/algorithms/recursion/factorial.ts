import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  CallFrame,
  VisualizationState,
} from "@/engine/executionTypes";

type FactorialInput = number;

function buildViz(n: number, callDepth: number, known: Map<number, number>): VisualizationState {
  // Use an array viz where each slot represents factorial(k) for k=0..n
  const elements = [];
  for (let k = 0; k <= n; k++) {
    const val = known.get(k);
    elements.push({
      value: val !== undefined ? val : (k === callDepth ? -1 : 0), // -1 = currently computing
      index: k,
      label: `${k}!`,
      state: (val !== undefined
        ? "found"
        : k === callDepth
        ? "current"
        : k < callDepth
        ? "comparing"
        : "default") as import("@/engine/executionTypes").ElementState,
    });
  }
  return { type: "array", elements };
}

export const factorial: VisualizableAlgorithm<FactorialInput> = {
  id: "factorial",
  name: "Factorial",
  category: "Recursion",
  difficulty: "Easy",
  description: "Compute n! using tail recursion. Visualizes the call stack unfolding and results bubbling back up.",

  sourceCode: {
    typescript: `function factorial(n: number): number {
  // Base case
  if (n <= 1) return 1;

  // Recursive case: n * factorial(n-1)
  return n * factorial(n - 1);
}`,
    python: `def factorial(n):
    # Base case
    if n <= 1:
        return 1
    
    # Recursive case
    return n * factorial(n - 1)`,
    java: `class Solution {
    public long factorial(int n) {
        // Base case
        if (n <= 1) return 1;
        
        // Recursive case
        return (long) n * factorial(n - 1);
    }
}`,
    cpp: `class Solution {
public:
    long long factorial(int n) {
        // Base case
        if (n <= 1) return 1;
        
        // Recursive case
        return (long long) n * factorial(n - 1);
    }
};`
  },

  language: "typescript",
  defaultInput: "5",

  parseInput(raw: unknown): FactorialInput {
    const n = typeof raw === "string" ? parseInt(raw.trim(), 10) : Number(raw);
    return n;
  },

  validateInput(input: FactorialInput) {
    if (isNaN(input) || !Number.isInteger(input)) return { valid: false, error: "Input must be an integer" };
    if (input < 0) return { valid: false, error: "Input must be non-negative" };
    if (input > 10) return { valid: false, error: "Input must be <= 10 (to keep the visualization readable)" };
    return { valid: true };
  },

  initialVisualizationState(input: FactorialInput): VisualizationState {
    return buildViz(input, 0, new Map());
  },

  complexity: {
    time: "O(n)",
    space: "O(n)",
    timeDescription: "n recursive calls are made",
    spaceDescription: "O(n) call stack depth",
  },
  visualizationType: "array",
  tags: ["recursion", "math", "factorial", "base-case"],

  execute(input: FactorialInput): ExecutionStep[] {
    resetStepCounter();
    const n = input;
    const steps: ExecutionStep[] = [];
    const callStack: CallFrame[] = [];
    const known = new Map<number, number>();
    let frameId = 0;

    function recurse(k: number): number {
      const fId = `fact-${frameId++}`;
      const cf = frame(fId, "factorial", { n: k }, { n: k }, 1);
      callStack.push(cf);

      steps.push(
        step()
          .line(k <= 1 ? 3 : 6)
          .fn("factorial")
          .event({ type: "CALL", functionName: "factorial", args: { n: k }, line: 1 })
          .callStack([...callStack])
          .variables({ n: k })
          .viz(buildViz(n, k, new Map(known)))
          .explain(k <= 1
            ? `factorial(${k}) — BASE CASE!\nn <= 1, so return 1.`
            : `factorial(${k}) called at depth ${n - k + 1}.\n\nNeed to compute: ${k} × factorial(${k - 1})\n\nWaiting for factorial(${k - 1}) to return...`)
          .depth(n - k)
          .recursive(k < n)
          .build()
      );

      let result: number;
      if (k <= 1) {
        result = 1;
      } else {
        const sub = recurse(k - 1);
        result = k * sub;
      }

      known.set(k, result);

      steps.push(
        step()
          .line(6)
          .fn("factorial")
          .event({ type: "RETURN", functionName: "factorial", value: result, line: 6 })
          .callStack([...callStack])
          .variables({ n: k, returns: result })
          .viz(buildViz(n, k, new Map(known)))
          .explain(k <= 1
            ? `Return 1 (base case).`
            : `factorial(${k - 1}) returned ${k <= 1 ? 1 : result / k}.\n\nNow computing: ${k} × ${result / k} = ${result}.\n\nReturn ${result}.`)
          .depth(n - k)
          .returns(result)
          .build()
      );

      callStack.pop();
      return result;
    }

    const answer = recurse(n);

    steps.push(
      step()
        .line(7)
        .fn("factorial")
        .event({ type: "RETURN", functionName: "factorial", value: answer, line: 7 })
        .callStack([])
        .variables({ result: answer })
        .viz(buildViz(n, -1, new Map(known)))
        .explain(`Done! ${n}! = ${answer}`)
        .build()
    );

    return steps;
  },
};

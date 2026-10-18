import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type LinearSearchInput = { array: number[]; target: number };

function buildState(arr: number[], currentIdx: number | null, found: number | null): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (found !== null && index === found) state = "found";
    else if (currentIdx !== null && index < currentIdx && found === null) state = "eliminated";
    else if (currentIdx !== null && index === currentIdx) state = "current";

    return { value, index, state, label: index === found ? "✓" : undefined };
  });

  return { type: "array", elements };
}

export const linearSearch: VisualizableAlgorithm<LinearSearchInput> = {
  id: "linear-search",
  name: "Linear Search",
  category: "Arrays",
  difficulty: "Easy",
  description: "Scan each element sequentially until the target is found.",

  sourceCode: {
    typescript: `function linearSearch(arr: number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}`,
    python: `def linearSearch(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1`,
    java: `class Solution {
    public int linearSearch(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }
}`,
    cpp: `class Solution {
public:
    int linearSearch(vector<int>& arr, int target) {
        for (int i = 0; i < arr.size(); i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify({ array: [4, 2, 7, 1, 9, 3, 6], target: 9 }),

  parseInput(raw: unknown): LinearSearchInput {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return { array: parsed.array, target: parsed.target };
    }
    return raw as LinearSearchInput;
  },

  validateInput(input: LinearSearchInput) {
    if (!Array.isArray(input.array) || input.array.length === 0)
      return { valid: false, error: "Array must be non-empty" };
    if (typeof input.target !== "number")
      return { valid: false, error: "Target must be a number" };
    return { valid: true };
  },

  initialVisualizationState(input: LinearSearchInput): VisualizationState {
    return buildState(input.array, null, null);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "In the worst case, we check every element",
    spaceDescription: "Only one index variable",
  },
  visualizationType: "array",
  tags: ["array", "search", "linear"],

  execute(input: LinearSearchInput): ExecutionStep[] {
    resetStepCounter();
    const { array: arr, target } = input;
    const steps: ExecutionStep[] = [];

    const sf = (i: number): CallFrame =>
      frame("ls-0", "linearSearch", { arr, target }, { i, target }, 1);

    for (let i = 0; i < arr.length; i++) {
      // Visit step
      steps.push(
        step()
          .line(3)
          .fn("linearSearch")
          .event({ type: "COMPARE", left: arr[i], right: target, operator: "===", result: arr[i] === target, line: 3 })
          .callStack([sf(i)])
          .variables({ i, current: arr[i], target })
          .viz(buildState(arr, i, null))
          .explain(
            `Checking index ${i}.\n\narr[${i}] = ${arr[i]}\ntarget = ${target}\n\n${
              arr[i] === target
                ? "They match! Target found."
                : `${arr[i]} ≠ ${target} — continue.`
            }`
          )
          .build()
      );

      if (arr[i] === target) {
        steps.push(
          step()
            .line(4)
            .fn("linearSearch")
            .event({ type: "FOUND", target, index: i, line: 4 })
            .callStack([sf(i)])
            .variables({ i, current: arr[i], target })
            .viz(buildState(arr, null, i))
            .explain(`Found target ${target} at index ${i}. Return ${i}.`)
            .returns(i)
            .build()
        );
        return steps;
      }
    }

    steps.push(
      step()
        .line(7)
        .fn("linearSearch")
        .event({ type: "NOT_FOUND", target, line: 7 })
        .callStack([sf(arr.length)])
        .variables({ target })
        .viz(buildState(arr, null, null))
        .explain(`Scanned all ${arr.length} elements. Target ${target} not found. Return -1.`)
        .returns(-1)
        .build()
    );

    return steps;
  },
};

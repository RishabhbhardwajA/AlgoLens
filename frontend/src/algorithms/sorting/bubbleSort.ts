import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { resolveSourceLine } from "@/utils/sourceLineMapper";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
} from "@/engine/executionTypes";

const TS_SOURCE = `function bubbleSort(arr: number[]): number[] {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}`;

function buildState(
  arr: number[],
  comparing: [number, number] | null,
  swapped: [number, number] | null,
  sortedFrom: number
): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (index >= sortedFrom) state = "visited";
    if (comparing && (index === comparing[0] || index === comparing[1])) state = "comparing";
    if (swapped && (index === swapped[0] || index === swapped[1])) state = "current";

    return { value, index, state };
  });

  return { type: "array", elements };
}

export const bubbleSort: VisualizableAlgorithm<number[]> = {
  id: "bubble-sort",
  name: "Bubble Sort",
  category: "Sorting",
  difficulty: "Easy",
  description: "Repeatedly swap adjacent elements until the array is sorted.",

  sourceCode: {
    typescript: TS_SOURCE,
    python: `def bubbleSort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`,
    java: `class Solution {
    public int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
        return arr;
    }
}`,
    cpp: `class Solution {
public:
    vector<int> bubbleSort(vector<int>& arr) {
        int n = arr.size();
        for (int i = 0; i < n - 1; i++) {
            bool swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    swap(arr[j], arr[j + 1]);
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
        return arr;
    }
};`,
  },

  language: "typescript",
  defaultInput: JSON.stringify([64, 34, 25, 12, 22, 11, 90]),

  parseInput(raw: unknown): number[] {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as number[];
  },

  validateInput(input: number[]) {
    if (!Array.isArray(input)) {
      return { valid: false, error: "Input must be an array of numbers" };
    }
    if (!input.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { valid: false, error: "All elements must be finite numbers" };
    }
    if (input.length > 50) {
      return { valid: false, error: "Array length cannot exceed 50 elements" };
    }
    return { valid: true };
  },

  initialVisualizationState(input: number[]): VisualizationState {
    const safe = Array.isArray(input) ? [...input] : [];
    return buildState(safe, null, null, safe.length);
  },

  complexity: {
    time: "O(n²)",
    space: "O(1)",
    timeDescription: "Two nested loops over n elements",
    spaceDescription: "Sorting is done in-place",
  },
  visualizationType: "array",
  tags: ["sort", "comparison", "in-place"],

  execute(input: number[]): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];
    const n = arr.length;

    const lineCompare = resolveSourceLine(TS_SOURCE, "if (arr[j] > arr[j + 1])", 6);
    const lineSwap = resolveSourceLine(TS_SOURCE, "[arr[j], arr[j + 1]] =", 7);
    const lineBreak = resolveSourceLine(TS_SOURCE, "if (!swapped) break;", 11);
    const lineReturn = resolveSourceLine(TS_SOURCE, "return arr;", 13);

    const sf = (i: number, j: number, activeLine: number) =>
      frame("bs-0", "bubbleSort", { arr: [...input] }, { i, j, n }, activeLine);

    if (n <= 1) {
      steps.push(
        step()
          .line(lineReturn)
          .fn("bubbleSort")
          .event({ type: "RETURN", functionName: "bubbleSort", value: [...arr], line: lineReturn })
          .callStack([])
          .variables({ result: JSON.stringify(arr), n })
          .viz(buildState([...arr], null, null, 0))
          .explain(
            n === 0
              ? "Empty array is trivially sorted. Returning []."
              : `Single element [${arr[0]}] is already sorted.`
          )
          .returns([...arr])
          .build()
      );
      return steps;
    }

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;

      for (let j = 0; j < n - 1 - i; j++) {
        steps.push(
          step()
            .line(lineCompare)
            .fn("bubbleSort")
            .event({
              type: "COMPARE",
              left: arr[j],
              right: arr[j + 1],
              operator: ">",
              result: arr[j] > arr[j + 1],
              indices: [j, j + 1],
              line: lineCompare,
            })
            .callStack([sf(i, j, lineCompare)])
            .variables({ i, j, "arr[j]": arr[j], "arr[j+1]": arr[j + 1], swapped })
            .viz(buildState([...arr], [j, j + 1], null, n - i))
            .explain(
              `Pass ${i + 1}, comparing indices ${j} and ${j + 1}: arr[${j}] = ${arr[j]}, arr[${j + 1}] = ${arr[j + 1]} — ${
                arr[j] > arr[j + 1]
                  ? `${arr[j]} > ${arr[j + 1]} → Swap!`
                  : `${arr[j]} ≤ ${arr[j + 1]} → No swap needed.`
              }`
            )
            .build()
        );

        if (arr[j] > arr[j + 1]) {
          const oldJ = arr[j];
          const oldJ1 = arr[j + 1];
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          swapped = true;

          steps.push(
            step()
              .line(lineSwap)
              .fn("bubbleSort")
              .event({ type: "SWAP", indices: [j, j + 1], array: [...arr], line: lineSwap })
              .callStack([sf(i, j, lineSwap)])
              .variables({ i, j, swapped: true, "swapped pair": `${oldJ} ↔ ${oldJ1}` })
              .viz(buildState([...arr], null, [j, j + 1], n - i))
              .explain(`Swapped arr[${j}] and arr[${j + 1}] (${oldJ} ↔ ${oldJ1}). Larger element bubbles toward the end.`)
              .build()
          );
        }
      }

      if (!swapped) {
        steps.push(
          step()
            .line(lineBreak)
            .fn("bubbleSort")
            .event({ type: "STEP", description: "No swaps in this pass — array is sorted", line: lineBreak })
            .callStack([sf(i, Math.max(0, n - 1 - i), lineBreak)])
            .variables({ i, swapped: false })
            .viz(buildState([...arr], null, null, 0))
            .explain(`Pass ${i + 1}: No swaps occurred. The array is already sorted — early exit!`)
            .build()
        );
        break;
      }
    }

    steps.push(
      step()
        .line(lineReturn)
        .fn("bubbleSort")
        .event({ type: "RETURN", functionName: "bubbleSort", value: [...arr], line: lineReturn })
        .callStack([])
        .variables({ result: JSON.stringify(arr) })
        .viz(buildState([...arr], null, null, 0))
        .explain(`Sorting complete! Result: [${arr.join(", ")}]`)
        .returns([...arr])
        .build()
    );

    return steps;
  },
};

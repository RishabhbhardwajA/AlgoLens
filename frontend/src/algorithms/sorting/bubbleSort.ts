import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
} from "@/engine/executionTypes";

function buildState(arr: number[], comparing: [number, number] | null, swapped: [number, number] | null, sorted: number): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (index >= sorted) state = "visited"; // already sorted portion
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
    typescript: `function bubbleSort(arr: number[]): number[] {
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
}`,
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
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([64, 34, 25, 12, 22, 11, 90]),

  parseInput(raw: unknown): number[] {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as number[];
  },

  validateInput(input: number[]) {
    if (!Array.isArray(input) || input.length < 2)
      return { valid: false, error: "Array must have at least 2 elements" };
    return { valid: true };
  },

  initialVisualizationState(input: number[]): VisualizationState {
    return buildState([...input], null, null, input.length);
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

    const sf = (i: number, j: number) =>
      frame("bs-0", "bubbleSort", { arr: [...input] }, { i, j, n }, 1);

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;

      for (let j = 0; j < n - 1 - i; j++) {
        // Compare step
        steps.push(
          step()
            .line(8)
            .fn("bubbleSort")
            .event({ type: "COMPARE", left: arr[j], right: arr[j + 1], operator: ">", result: arr[j] > arr[j + 1], line: 8 })
            .callStack([sf(i, j)])
            .variables({ i, j, "arr[j]": arr[j], "arr[j+1]": arr[j + 1], swapped })
            .viz(buildState([...arr], [j, j + 1], null, n - 1 - i + 1))
            .explain(
              `Pass ${i + 1}, comparing indices ${j} and ${j + 1}.\n\narr[${j}] = ${arr[j]}, arr[${j + 1}] = ${arr[j + 1]}\n\n${
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
              .line(9)
              .fn("bubbleSort")
              .event({ type: "SWAP", indices: [j, j + 1], array: [...arr], line: 9 })
              .callStack([sf(i, j)])
              .variables({ i, j, swapped: true, "swapped pair": `${oldJ} ↔ ${oldJ1}` })
              .viz(buildState([...arr], null, [j, j + 1], n - 1 - i + 1))
              .explain(`Swapped arr[${j}] and arr[${j + 1}].\n\n${oldJ} ↔ ${oldJ1}\n\nLarger element bubbles toward the end.`)
              .build()
          );
        }
      }

      if (!swapped) {
        steps.push(
          step()
            .line(14)
            .fn("bubbleSort")
            .event({ type: "STEP", description: "No swaps in this pass — array is sorted", line: 14 })
            .callStack([sf(i, n - 1 - i)])
            .variables({ i, swapped: false })
            .viz(buildState([...arr], null, null, 0))
            .explain(`Pass ${i + 1}: No swaps occurred.\n\nThe array is already sorted. Early exit.`)
            .build()
        );
        break;
      }
    }

    // Final state
    steps.push(
      step()
        .line(17)
        .fn("bubbleSort")
        .event({ type: "RETURN", functionName: "bubbleSort", value: [...arr], line: 17 })
        .callStack([])
        .variables({ result: JSON.stringify(arr) })
        .viz(buildState([...arr], null, null, 0))
        .explain(`Sorting complete!\n\nResult: [${arr.join(", ")}]`)
        .returns([...arr])
        .build()
    );

    return steps;
  },
};

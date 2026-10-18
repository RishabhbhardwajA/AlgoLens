import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
} from "@/engine/executionTypes";

function buildState(arr: number[], key: number | null, keyIdx: number, j: number | null): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (index < keyIdx) state = "visited"; // sorted portion
    if (j !== null && index === j + 1) state = "current"; // key position
    if (j !== null && index === j) state = "comparing";

    return { value, index, state };
  });

  return { type: "array", elements };
}

export const insertionSort: VisualizableAlgorithm<number[]> = {
  id: "insertion-sort",
  name: "Insertion Sort",
  category: "Sorting",
  difficulty: "Easy",
  description: "Build the sorted array by inserting each element into its correct position.",

  sourceCode: {
    typescript: `function insertionSort(arr: number[]): number[] {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}`,
    python: `def insertionSort(arr):
    n = len(arr)
    for i in range(1, n):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
    java: `class Solution {
    public int[] insertionSort(int[] arr) {
        int n = arr.length;
        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }
}`,
    cpp: `class Solution {
public:
    vector<int> insertionSort(vector<int>& arr) {
        int n = arr.size();
        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([12, 11, 13, 5, 6]),

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
    return buildState([...input], null, 1, null);
  },

  complexity: {
    time: "O(n²)",
    space: "O(1)",
    timeDescription: "Each element may need to shift through the sorted portion",
    spaceDescription: "In-place sorting",
  },
  visualizationType: "array",
  tags: ["sort", "comparison", "in-place"],

  execute(input: number[]): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];
    const n = arr.length;

    for (let i = 1; i < n; i++) {
      const key = arr[i];
      let j = i - 1;

      steps.push(
        step()
          .line(5)
          .fn("insertionSort")
          .event({ type: "UPDATE", variable: "key", oldValue: undefined, newValue: key, line: 5 })
          .callStack([frame("is-0", "insertionSort", { arr: [...input] }, { i, key, j }, 1)])
          .variables({ i, key, j, "sorted portion": `[${arr.slice(0, i).join(", ")}]` })
          .viz(buildState([...arr], key, i, null))
          .explain(`Pick key = arr[${i}] = ${key}.\n\nWill insert it into the sorted portion [${arr.slice(0, i).join(", ")}].`)
          .build()
      );

      while (j >= 0 && arr[j] > key) {
        steps.push(
          step()
            .line(9)
            .fn("insertionSort")
            .event({ type: "COMPARE", left: arr[j], right: key, operator: ">", result: true, line: 9 })
            .callStack([frame("is-0", "insertionSort", { arr: [...input] }, { i, key, j }, 1)])
            .variables({ i, key, j, "arr[j]": arr[j] })
            .viz(buildState([...arr], key, i, j))
            .explain(`arr[${j}] = ${arr[j]} > key ${key}.\nShift arr[${j}] one position right.`)
            .build()
        );

        arr[j + 1] = arr[j];
        j--;

        steps.push(
          step()
            .line(10)
            .fn("insertionSort")
            .event({ type: "UPDATE", variable: `arr[${j + 2}]`, oldValue: arr[j + 2], newValue: arr[j + 1], line: 10 })
            .callStack([frame("is-0", "insertionSort", { arr: [...input] }, { i, key, j }, 1)])
            .variables({ i, key, j, array: JSON.stringify(arr) })
            .viz(buildState([...arr], key, i, j))
            .explain(`Shifted. Array: [${arr.join(", ")}]\nNow check arr[${j}].`)
            .build()
        );
      }

      arr[j + 1] = key;

      steps.push(
        step()
          .line(13)
          .fn("insertionSort")
          .event({ type: "UPDATE", variable: `arr[${j + 1}]`, oldValue: undefined, newValue: key, line: 13 })
          .callStack([frame("is-0", "insertionSort", { arr: [...input] }, { i, key, j }, 1)])
          .variables({ i, key, insertedAt: j + 1 })
          .viz(buildState([...arr], null, i + 1, null))
          .explain(`Insert key ${key} at index ${j + 1}.\n\nSorted portion: [${arr.slice(0, i + 1).join(", ")}]`)
          .build()
      );
    }

    steps.push(
      step()
        .line(16)
        .fn("insertionSort")
        .event({ type: "RETURN", functionName: "insertionSort", value: [...arr], line: 16 })
        .callStack([])
        .variables({ result: JSON.stringify(arr) })
        .viz(buildState([...arr], null, arr.length, null))
        .explain(`Sorting complete!\n\nResult: [${arr.join(", ")}]`)
        .returns([...arr])
        .build()
    );

    return steps;
  },
};

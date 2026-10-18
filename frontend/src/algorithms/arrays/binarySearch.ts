import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { resolveSourceLine, getAlgorithmSource } from "@/utils/sourceLineMapper";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type BinarySearchInput = { array: number[]; target: number };

function buildArrayState(
  arr: number[],
  left: number,
  right: number,
  mid: number | null,
  found: number | null
): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (found !== null && index === found) state = "found";
    else if (index < left || index > right) state = "eliminated";
    else if (mid !== null && index === mid) state = "current";
    else if (index === left) state = "pointer-left";
    else if (index === right) state = "pointer-right";

    return {
      value,
      index,
      state,
      label:
        found !== null && index === found
          ? "✓"
          : index === left && mid !== left
          ? "L"
          : index === right && mid !== right
          ? "R"
          : mid !== null && index === mid
          ? "mid"
          : undefined,
    };
  });

  const pointers: Record<string, number> = {};
  if (left >= 0) pointers["left"] = left;
  if (right >= 0) pointers["right"] = right;
  if (mid !== null) pointers["mid"] = mid;

  return { type: "array", elements, pointers };
}

export const binarySearch: VisualizableAlgorithm<BinarySearchInput> = {
  id: "binary-search",
  name: "Binary Search",
  category: "Arrays",
  difficulty: "Easy",
  description:
    "Eliminate half the search space at each step using a sorted array.",

  sourceCode: {
    typescript: `function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}`,
    python: `def binarySearch(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
            
    return -1`,
    java: `class Solution {
    public int binarySearch(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        
        return -1;
    }
}`,
    cpp: `class Solution {
public:
    int binarySearch(vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        
        return -1;
    }
};`
  },

  language: "typescript",

  defaultInput: JSON.stringify({ array: [1, 3, 5, 7, 9, 11, 13, 17, 19, 23], target: 13 }),

  parseInput(raw: unknown): BinarySearchInput {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return { array: parsed.array, target: parsed.target };
    }
    return raw as BinarySearchInput;
  },

  validateInput(input: BinarySearchInput) {
    if (!Array.isArray(input.array) || input.array.length === 0)
      return { valid: false, error: "Array must be non-empty" };
    if (typeof input.target !== "number")
      return { valid: false, error: "Target must be a number" };
    return { valid: true };
  },

  initialVisualizationState(input: BinarySearchInput): VisualizationState {
    return buildArrayState(input.array, 0, input.array.length - 1, null, null);
  },

  complexity: {
    time: "O(log n)",
    space: "O(1)",
    timeDescription: "Each iteration halves the search space",
    spaceDescription: "Only three pointers needed",
  },

  visualizationType: "array",
  tags: ["array", "search", "divide-and-conquer"],

  execute(input: BinarySearchInput): ExecutionStep[] {
    resetStepCounter();
    const { array: arr, target } = input;
    const steps: ExecutionStep[] = [];

    const src = getAlgorithmSource(binarySearch.sourceCode, binarySearch.language);
    const lineInit = resolveSourceLine(src, "let left = 0;", 2);
    const lineMid = resolveSourceLine(src, "const mid = Math.floor", 6);
    const lineFound = resolveSourceLine(src, "if (arr[mid] === target)", 8);
    const lineSearchRight = resolveSourceLine(src, "else if (arr[mid] < target)", 9);
    const lineSearchLeft = resolveSourceLine(src, "else right = mid - 1", 10);
    const lineNotFound = resolveSourceLine(src, "return -1;", 13);

    let left = 0;
    let right = arr.length - 1;

    const stackFrame = (): CallFrame =>
      frame("bs-0", "binarySearch", { arr, target }, { left, right }, lineInit);

    // Step: initialize
    steps.push(
      step()
        .line(lineInit)
        .fn("binarySearch")
        .event({ type: "UPDATE", variable: "left", oldValue: undefined, newValue: 0, line: lineInit })
        .callStack([stackFrame()])
        .variables({ left, right, target })
        .viz(buildArrayState(arr, left, right, null, null))
        .explain(
          `Initialize pointers.\n\nleft = 0 (first element)\nright = ${arr.length - 1} (last element)\n\nSearch window spans full array [0...${arr.length - 1}].`
        )
        .structured(
          `Initialized search pointers left = 0 and right = ${arr.length - 1}.`,
          `The complete sorted array arr[0...${arr.length - 1}] is our initial candidate search window.`,
          `If target exists in arr, it must satisfy left <= target_index <= right.`
        )
        .build()
    );

    let iteration = 0;

    while (left <= right) {
      iteration++;
      const mid = Math.floor((left + right) / 2);

      // Step: compute mid
      steps.push(
        step()
          .line(lineMid)
          .fn("binarySearch")
          .event({ type: "UPDATE", variable: "mid", oldValue: undefined, newValue: mid, line: lineMid })
          .callStack([stackFrame()])
          .variables({ left, right, mid, target })
          .viz(buildArrayState(arr, left, right, mid, null))
          .explain(
            `Iteration ${iteration}: Compute mid.\n\nmid = ⌊(${left} + ${right}) / 2⌋ = ${mid}\narr[${mid}] = ${arr[mid]}\ntarget = ${target}\nSearching indices [${left}...${right}].`
          )
          .structured(
            `Calculated middle index mid = Math.floor((${left} + ${right}) / 2) = ${mid}, where arr[mid] = ${arr[mid]}.`,
            `Loop condition left (${left}) <= right (${right}) is true. Evaluating midpoint partitions search space in half.`,
            `Subarray arr[0...${left - 1}] < target and arr[${right + 1}...${arr.length - 1}] > target.`
          )
          .build()
      );

      if (arr[mid] === target) {
        // Step: found
        steps.push(
          step()
            .line(lineFound)
            .fn("binarySearch")
            .event({ type: "FOUND", target, index: mid, line: lineFound })
            .callStack([stackFrame()])
            .variables({ left, right, mid, target })
            .viz(buildArrayState(arr, left, right, mid, mid))
            .explain(
              `Found! arr[${mid}] = ${arr[mid]} matches target ${target}.\n\nReturn index ${mid}.`
            )
            .structured(
              `Found target! arr[${mid}] (${arr[mid]}) === target (${target}). Returning index ${mid}.`,
              `The middle element matches target query. No further iterations needed.`,
              `Target confirmed at index ${mid} in O(log N) comparisons.`
            )
            .returns(mid)
            .build()
        );
        return steps;
      } else if (arr[mid] < target) {
        // Step: search right
        const newLeft = mid + 1;
        steps.push(
          step()
            .line(lineSearchRight)
            .fn("binarySearch")
            .event({ type: "POINTER_MOVE", pointer: "left", from: left, to: newLeft, line: lineSearchRight })
            .callStack([stackFrame()])
            .variables({ left, right, mid, target })
            .viz(buildArrayState(arr, left, right, mid, null))
            .explain(
              `arr[${mid}] = ${arr[mid]} < target ${target}.\n\nTarget must be in RIGHT half.\nMove left pointer: left = mid + 1 = ${newLeft}.`
            )
            .structured(
              `arr[mid] (${arr[mid]}) < target (${target}). Updated left = mid + 1 = ${newLeft}.`,
              `Because array is sorted in ascending order, all elements at indices <= ${mid} are strictly smaller than target and eliminated.`,
              `Target cannot exist at indices <= ${mid}. Candidate search window shrinks to [${newLeft}, ${right}].`
            )
            .build()
        );
        left = newLeft;
      } else {
        // Step: search left
        const newRight = mid - 1;
        steps.push(
          step()
            .line(lineSearchLeft)
            .fn("binarySearch")
            .event({ type: "POINTER_MOVE", pointer: "right", from: right, to: newRight, line: lineSearchLeft })
            .callStack([stackFrame()])
            .variables({ left, right, mid, target })
            .viz(buildArrayState(arr, left, right, mid, null))
            .explain(
              `arr[${mid}] = ${arr[mid]} > target ${target}.\n\nTarget must be in LEFT half.\nMove right pointer: right = mid - 1 = ${newRight}.`
            )
            .structured(
              `arr[mid] (${arr[mid]}) > target (${target}). Updated right = mid - 1 = ${newRight}.`,
              `Because array is sorted in ascending order, all elements at indices >= ${mid} are strictly greater than target and eliminated.`,
              `Target cannot exist at indices >= ${mid}. Candidate search window shrinks to [${left}, ${newRight}].`
            )
            .build()
        );
        right = newRight;
      }
    }

    // Step: not found
    steps.push(
      step()
        .line(lineNotFound)
        .fn("binarySearch")
        .event({ type: "NOT_FOUND", target, line: lineNotFound })
        .callStack([stackFrame()])
        .variables({ left, right, target })
        .viz(buildArrayState(arr, -1, -1, null, null))
        .explain(`left (${left}) > right (${right}).\n\nSearch space is empty — target ${target} is not in array.\nReturn -1.`)
        .structured(
          `Pointers crossed (left = ${left} > right = ${right}). Returned -1.`,
          `Search interval [${left}, ${right}] is empty. Entire array examined without match.`,
          `Guaranteed that target ${target} does not exist in arr.`
        )
        .returns(-1)
        .build()
    );

    return steps;
  },
};

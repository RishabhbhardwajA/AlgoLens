import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { resolveSourceLine, getAlgorithmSource } from "@/utils/sourceLineMapper";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type TwoSumInput = { array: number[]; target: number };

function buildState(arr: number[], left: number, right: number, sum: number | null, found: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (found && (index === left || index === right)) state = "found";
    else if (index === left) state = "pointer-left";
    else if (index === right) state = "pointer-right";
    else if (index < left || index > right) state = "eliminated";

    return {
      value,
      index,
      state,
      label: index === left ? "L" : index === right ? "R" : undefined,
    };
  });

  return { type: "array", elements, pointers: { left, right } };
}

export const twoSumII: VisualizableAlgorithm<TwoSumInput> = {
  id: "two-sum-ii",
  name: "Two Sum II",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Find two numbers in a sorted array that sum to a target.",

  sourceCode: {
    typescript: `function twoSum(arr: number[], target: number): [number, number] {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];

    if (sum === target) return [left, right];
    else if (sum < target) left++;
    else right--;
  }

  return [-1, -1];
}`,
    python: `def twoSum(arr, target):
    left, right = 0, len(arr) - 1
    
    while left < right:
        curr_sum = arr[left] + arr[right]
        if curr_sum == target:
            return [left, right]
        elif curr_sum < target:
            left += 1
        else:
            right -= 1
            
    return [-1, -1]`,
    java: `class Solution {
    public int[] twoSum(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        
        while (left < right) {
            int sum = arr[left] + arr[right];
            if (sum == target) return new int[]{left, right};
            else if (sum < target) left++;
            else right--;
        }
        
        return new int[]{-1, -1};
    }
}`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        
        while (left < right) {
            int sum = arr[left] + arr[right];
            if (sum == target) return {left, right};
            else if (sum < target) left++;
            else right--;
        }
        
        return {-1, -1};
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify({ array: [2, 3, 4, 6, 8, 10, 13], target: 14 }),

  parseInput(raw: unknown): TwoSumInput {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return { array: parsed.array, target: parsed.target };
    }
    return raw as TwoSumInput;
  },

  validateInput(input: TwoSumInput) {
    if (!Array.isArray(input.array) || input.array.length < 2)
      return { valid: false, error: "Array must have at least 2 elements" };
    const sorted = [...input.array].sort((a, b) => a - b);
    if (JSON.stringify(sorted) !== JSON.stringify(input.array))
      return { valid: false, error: "Array must be sorted in ascending order" };
    return { valid: true };
  },

  initialVisualizationState(input: TwoSumInput): VisualizationState {
    return buildState(input.array, 0, input.array.length - 1, null, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "Each element is visited at most once",
    spaceDescription: "Only two pointers",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "sorted"],

  execute(input: TwoSumInput): ExecutionStep[] {
    resetStepCounter();
    const { array: arr, target } = input;
    const steps: ExecutionStep[] = [];

    const src = getAlgorithmSource(twoSumII.sourceCode, twoSumII.language);
    const lineInit = resolveSourceLine(src, "let left = 0;", 2);
    const lineSum = resolveSourceLine(src, "const sum =", 4);
    const lineFound = resolveSourceLine(src, "if (sum === target)", 6);
    const lineLeftMove = resolveSourceLine(src, "else if (sum < target)", 7);
    const lineRightMove = resolveSourceLine(src, "else right--;", 8);
    const lineNotFound = resolveSourceLine(src, "return [-1, -1];", 11);

    let left = 0;
    let right = arr.length - 1;

    const sf = (): CallFrame =>
      frame("tp-0", "twoSum", { arr, target }, { left, right }, lineInit);

    // Step: initialize
    steps.push(
      step()
        .line(lineInit)
        .fn("twoSum")
        .event({ type: "UPDATE", variable: "left/right", oldValue: undefined, newValue: [left, right], line: lineInit })
        .callStack([sf()])
        .variables({ left, right, target })
        .viz(buildState(arr, left, right, null, false))
        .explain(`Initialize two pointers.\n\nleft = 0 → arr[0] = ${arr[0]}\nright = ${arr.length - 1} → arr[${arr.length - 1}] = ${arr[arr.length - 1]}\n\nArray is sorted, so we can use two pointers converging inward.`)
        .structured(
          `Initialized pointers left = 0 and right = ${arr.length - 1}.`,
          `In a sorted array, the minimum sum is arr[0] + arr[1] and maximum is arr[n-2] + arr[n-1]. Starting at both ends allows monotonic pruning.`,
          `The target pair (i, j) must satisfy left <= i < j <= right.`
        )
        .build()
    );

    while (left < right) {
      const sum = arr[left] + arr[right];

      // Step: compute sum
      steps.push(
        step()
          .line(lineSum)
          .fn("twoSum")
          .event({ type: "COMPARE", left: sum, right: target, operator: "===", result: sum === target, line: lineSum })
          .callStack([sf()])
          .variables({ left, right, sum, target, "arr[left]": arr[left], "arr[right]": arr[right] })
          .viz(buildState(arr, left, right, sum, false))
          .explain(
            `Compute sum.\n\narr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum}\ntarget = ${target}\n\n${
              sum === target
                ? "Sum equals target! Pair found."
                : sum < target
                ? `Sum ${sum} < target ${target}.\nNeed a larger sum → move left pointer right.`
                : `Sum ${sum} > target ${target}.\nNeed a smaller sum → move right pointer left.`
            }`
          )
          .structured(
            `Computed sum = arr[${left}] (${arr[left]}) + arr[${right}] (${arr[right]}) = ${sum}.`,
            `Evaluating current outermost pair against target ${target}.`,
            `All pairs (i, j) with i < ${left} or j > ${right} have already been evaluated and eliminated.`
          )
          .build()
      );

      if (sum === target) {
        // Step: found
        steps.push(
          step()
            .line(lineFound)
            .fn("twoSum")
            .event({ type: "FOUND", target: [left, right], line: lineFound })
            .callStack([sf()])
            .variables({ left, right, sum, target })
            .viz(buildState(arr, left, right, sum, true))
            .explain(`Found! arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${target}.\nReturn [${left}, ${right}].`)
            .structured(
              `sum (${sum}) === target (${target}). Returned pair [${left}, ${right}].`,
              `The sum of current boundary elements exactly matches target query.`,
              `Solution found in linear O(N) time with O(1) auxiliary space.`
            )
            .returns([left, right])
            .build()
        );
        return steps;
      } else if (sum < target) {
        // Step: move left
        const nextLeft = left + 1;
        steps.push(
          step()
            .line(lineLeftMove)
            .fn("twoSum")
            .event({ type: "POINTER_MOVE", pointer: "left", from: left, to: nextLeft, line: lineLeftMove })
            .callStack([sf()])
            .variables({ left, right, sum, target })
            .viz(buildState(arr, left, right, sum, false))
            .explain(`sum (${sum}) < target (${target}).\nMove left forward: left = ${nextLeft}.`)
            .structured(
              `sum (${sum}) < target (${target}). Advanced left from ${left} to ${nextLeft}.`,
              `Sum is too small. Because arr is sorted, arr[${left}] cannot pair with any remaining candidate <= arr[${right}] to reach target.`,
              `Index ${left} eliminated. Remaining candidate window is [${nextLeft}, ${right}].`
            )
            .build()
        );
        left = nextLeft;
      } else {
        // Step: move right
        const nextRight = right - 1;
        steps.push(
          step()
            .line(lineRightMove)
            .fn("twoSum")
            .event({ type: "POINTER_MOVE", pointer: "right", from: right, to: nextRight, line: lineRightMove })
            .callStack([sf()])
            .variables({ left, right, sum, target })
            .viz(buildState(arr, left, right, sum, false))
            .explain(`sum (${sum}) > target (${target}).\nMove right backward: right = ${nextRight}.`)
            .structured(
              `sum (${sum}) > target (${target}). Decremented right from ${right} to ${nextRight}.`,
              `Sum is too large. Because arr is sorted, arr[${right}] cannot pair with any remaining candidate >= arr[${left}] to reach target.`,
              `Index ${right} eliminated. Remaining candidate window is [${left}, ${nextRight}].`
            )
            .build()
        );
        right = nextRight;
      }
    }

    // Step: not found
    steps.push(
      step()
        .line(lineNotFound)
        .fn("twoSum")
        .event({ type: "NOT_FOUND", target, line: lineNotFound })
        .callStack([sf()])
        .variables({ left, right, target })
        .viz(buildState(arr, left, right, null, false))
        .explain(`left (${left}) >= right (${right}). Pointers crossed. No pair sums to ${target}. Return [-1, -1].`)
        .structured(
          `Pointers crossed (left = ${left} >= right = ${right}). Returned [-1, -1].`,
          `All possible valid pairs have been systematically evaluated or eliminated.`,
          `Guaranteed that no two elements in arr sum to ${target}.`
        )
        .returns([-1, -1])
        .build()
    );

    return steps;
  },
};

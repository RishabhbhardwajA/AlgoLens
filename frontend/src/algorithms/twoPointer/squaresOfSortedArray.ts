import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type SquaresInput = number[];

function buildState(arr: number[], left: number, right: number, resultArr: number[], pos: number, complete: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) state = "eliminated";
    else if (index === left) state = "pointer-left";
    else if (index === right) state = "pointer-right";
    else if (index < left || index > right) state = "visited";

    return {
      value,
      index,
      state,
      label: index === left ? "L" : index === right ? "R" : undefined,
    };
  });

  const resElements: ArrayElement[] = resultArr.map((value, index) => {
    return {
      value,
      index,
      state: index > pos ? "found" : "default",
    };
  });

  return { type: "array", elements: [...elements, { value: NaN, index: -1, state: "default", label: "RESULT →" } as any, ...resElements], pointers: { left, right } };
}

export const squaresOfSortedArray: VisualizableAlgorithm<SquaresInput> = {
  id: "squares-of-sorted-array",
  name: "Squares of Sorted Array",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Given an integer array sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.",
  
  sourceCode: {
    typescript: `function sortedSquares(nums: number[]): number[] {
  const n = nums.length;
  const result = new Array(n);
  let left = 0;
  let right = n - 1;
  let pos = n - 1;

  while (left <= right) {
    const leftSquare = nums[left] ** 2;
    const rightSquare = nums[right] ** 2;

    if (leftSquare > rightSquare) {
      result[pos] = leftSquare;
      left++;
    } else {
      result[pos] = rightSquare;
      right--;
    }
    pos--;
  }

  return result;
}`,
    python: `def sortedSquares(nums):
    n = len(nums)
    result = [0] * n
    left, right, pos = 0, n - 1, n - 1
    
    while left <= right:
        leftSquare = nums[left] ** 2
        rightSquare = nums[right] ** 2
        
        if leftSquare > rightSquare:
            result[pos] = leftSquare
            left += 1
        else:
            result[pos] = rightSquare
            right -= 1
        pos -= 1
        
    return result`,
    java: `class Solution {
    public int[] sortedSquares(int[] nums) {
        int n = nums.length;
        int[] result = new int[n];
        int left = 0, right = n - 1, pos = n - 1;
        
        while (left <= right) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            
            if (leftSquare > rightSquare) {
                result[pos] = leftSquare;
                left++;
            } else {
                result[pos] = rightSquare;
                right--;
            }
            pos--;
        }
        
        return result;
    }
}`,
    cpp: `class Solution {
public:
    vector<int> sortedSquares(vector<int>& nums) {
        int n = nums.size();
        vector<int> result(n);
        int left = 0, right = n - 1, pos = n - 1;
        
        while (left <= right) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            
            if (leftSquare > rightSquare) {
                result[pos] = leftSquare;
                left++;
            } else {
                result[pos] = rightSquare;
                right--;
            }
            pos--;
        }
        
        return result;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([-4, -1, 0, 3, 10]),

  parseInput(raw: unknown): SquaresInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as SquaresInput;
  },

  validateInput(input: SquaresInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: SquaresInput): VisualizationState {
    return buildState([...input], 0, input.length - 1, new Array(input.length).fill(0), input.length - 1, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(n)",
    timeDescription: "O(n) using two pointers",
    spaceDescription: "O(n) for the result array",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "math", "sorted"],

  execute(input: SquaresInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const n = arr.length;
    const result = new Array(n).fill(0);
    const steps: ExecutionStep[] = [];

    let left = 0;
    let right = n - 1;
    let pos = n - 1;

    const sf = (): CallFrame =>
      frame("tp-0", "sortedSquares", { nums: arr }, { left, right, pos, result }, 1);

    while (left <= right) {
      const leftSquare = arr[left] ** 2;
      const rightSquare = arr[right] ** 2;

      steps.push(
        step()
          .line(9)
          .fn("sortedSquares")
          .event({ type: "HIGHLIGHT", targets: [left, right], line: 9 })
          .callStack([sf()])
          .variables({ left, right, pos, leftSquare, rightSquare })
          .viz(buildState([...arr], left, right, [...result], pos, false))
          .explain(`Compare squares:\\nLeft (\${arr[left]})^2 = \${leftSquare}\\nRight (\${arr[right]})^2 = \${rightSquare}`)
          .build()
      );

      if (leftSquare > rightSquare) {
        result[pos] = leftSquare;
        
        steps.push(
          step()
            .line(12)
            .fn("sortedSquares")
            .event({ type: "STEP", description: "Write left square", line: 12 })
            .callStack([sf()])
            .variables({ left, right, pos, leftSquare, rightSquare })
            .viz(buildState([...arr], left, right, [...result], pos, false))
            .explain(`Left square (\${leftSquare}) is larger. Place at position \${pos}.`)
            .build()
        );

        left++;
      } else {
        result[pos] = rightSquare;

        steps.push(
          step()
            .line(15)
            .fn("sortedSquares")
            .event({ type: "STEP", description: "Write right square", line: 15 })
            .callStack([sf()])
            .variables({ left, right, pos, leftSquare, rightSquare })
            .viz(buildState([...arr], left, right, [...result], pos, false))
            .explain(`Right square (\${rightSquare}) is larger or equal. Place at position \${pos}.`)
            .build()
        );

        right--;
      }
      pos--;
    }

    steps.push(
      step()
        .line(21)
        .fn("sortedSquares")
        .event({ type: "RETURN", functionName: "sortedSquares", value: result, line: 21 })
        .callStack([])
        .variables({ result })
        .viz(buildState([...arr], -1, -1, [...result], -1, true))
        .explain(`Finished.\\nResult: [\${result.join(", ")}]`)
        .build()
    );

    return steps;
  },
};

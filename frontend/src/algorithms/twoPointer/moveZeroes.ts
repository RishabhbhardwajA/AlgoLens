import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type MoveZeroesInput = number[];

function buildState(arr: number[], left: number, right: number, complete: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) state = value === 0 ? "eliminated" : "found";
    else if (index === left) state = "pointer-left";
    else if (index === right) state = "pointer-right";
    else if (index < left) state = "visited";

    return {
      value,
      index,
      state,
      label: index === left ? "L" : index === right ? "R" : undefined,
    };
  });

  return { type: "array", elements, pointers: { left, right } };
}

export const moveZeroes: VisualizableAlgorithm<MoveZeroesInput> = {
  id: "move-zeroes",
  name: "Move Zeroes",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Move all zeroes in an array to the end while maintaining the relative order of non-zero elements.",
  
  sourceCode: {
    typescript: `function moveZeroes(nums: number[]): void {
  let left = 0; // Tracks the position for the next non-zero element

  for (let right = 0; right < nums.length; right++) {
    if (nums[right] !== 0) {
      // Swap elements
      const temp = nums[left];
      nums[left] = nums[right];
      nums[right] = temp;
      
      left++;
    }
  }
}`,
    python: `def moveZeroes(nums):
    left = 0
    
    for right in range(len(nums)):
        if nums[right] != 0:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1`,
    java: `class Solution {
    public void moveZeroes(int[] nums) {
        int left = 0;
        
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] != 0) {
                int temp = nums[left];
                nums[left] = nums[right];
                nums[right] = temp;
                left++;
            }
        }
    }
}`,
    cpp: `class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int left = 0;
        
        for (int right = 0; right < nums.size(); right++) {
            if (nums[right] != 0) {
                swap(nums[left], nums[right]);
                left++;
            }
        }
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([0, 1, 0, 3, 12]),

  parseInput(raw: unknown): MoveZeroesInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as MoveZeroesInput;
  },

  validateInput(input: MoveZeroesInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: MoveZeroesInput): VisualizationState {
    return buildState([...input], 0, 0, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "Each element is checked exactly once.",
    spaceDescription: "Swapped in-place, no extra memory",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "in-place"],

  execute(input: MoveZeroesInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];

    let left = 0;

    const sf = (right: number): CallFrame =>
      frame("tp-0", "moveZeroes", { nums: arr }, { left, right }, 1);

    for (let right = 0; right < arr.length; right++) {
      steps.push(
        step()
          .line(4)
          .fn("moveZeroes")
          .event({ type: "HIGHLIGHT", targets: [right], line: 4 })
          .callStack([sf(right)])
          .variables({ left, right, nums: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false))
          .explain(`Checking element at right = \${right} (value = \${arr[right]}).\\nIs \${arr[right]} !== 0?`)
          .build()
      );

      if (arr[right] !== 0) {
        steps.push(
          step()
            .line(6)
            .fn("moveZeroes")
            .event({ type: "STEP", description: "Value is non-zero, swap", line: 6 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Yes, \${arr[right]} !== 0.\\nSwapping nums[left] and nums[right].`)
            .build()
        );

        const temp = arr[left];
        arr[left] = arr[right];
        arr[right] = temp;

        steps.push(
          step()
            .line(7)
            .fn("moveZeroes")
            .event({ type: "SWAP", indices: [left, right], array: [...arr], line: 7 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Swapped values. Array is now: [\${arr.join(",")}]`)
            .build()
        );

        left++;

        steps.push(
          step()
            .line(9)
            .fn("moveZeroes")
            .event({ type: "STEP", description: "Advance left pointer", line: 9 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Incremented left to \${left}. It now points to the next available spot for a non-zero.`)
            .build()
        );
      } else {
        steps.push(
          step()
            .line(4)
            .fn("moveZeroes")
            .event({ type: "STEP", description: "Value is zero, skip", line: 4 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Value is 0. Do nothing, just advance right pointer.`)
            .build()
        );
      }
    }

    steps.push(
      step()
        .line(13)
        .fn("moveZeroes")
        .event({ type: "RETURN", functionName: "moveZeroes", value: undefined, line: 13 })
        .callStack([])
        .variables({ nums: JSON.stringify(arr) })
        .viz(buildState([...arr], -1, -1, true))
        .explain(`Loop finished.\\n\\nAll zeroes moved to the end!`)
        .build()
    );

    return steps;
  },
};

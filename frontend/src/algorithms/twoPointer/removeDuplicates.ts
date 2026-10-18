import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type RemoveDuplicatesInput = number[];

function buildState(arr: number[], left: number, right: number, complete: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) state = index < left ? "found" : "eliminated";
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

export const removeDuplicates: VisualizableAlgorithm<RemoveDuplicatesInput> = {
  id: "remove-duplicates",
  name: "Remove Duplicates",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Remove duplicates from a sorted array in-place, returning the new length.",
  
  sourceCode: {
    typescript: `function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;
  let left = 1;

  for (let right = 1; right < nums.length; right++) {
    if (nums[right] !== nums[right - 1]) {
      nums[left] = nums[right];
      left++;
    }
  }
  return left;
}`,
    python: `def removeDuplicates(nums):
    if not nums: return 0
    left = 1
    
    for right in range(1, len(nums)):
        if nums[right] != nums[right - 1]:
            nums[left] = nums[right]
            left += 1
            
    return left`,
    java: `class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int left = 1;
        
        for (int right = 1; right < nums.length; right++) {
            if (nums[right] != nums[right - 1]) {
                nums[left] = nums[right];
                left++;
            }
        }
        return left;
    }
}`,
    cpp: `class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) return 0;
        int left = 1;
        
        for (int right = 1; right < nums.size(); right++) {
            if (nums[right] != nums[right - 1]) {
                nums[left] = nums[right];
                left++;
            }
        }
        return left;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([0, 0, 1, 1, 1, 2, 2, 3, 3, 4]),

  parseInput(raw: unknown): RemoveDuplicatesInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as RemoveDuplicatesInput;
  },

  validateInput(input: RemoveDuplicatesInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: RemoveDuplicatesInput): VisualizationState {
    return buildState([...input], 1, 1, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "Array traversed once.",
    spaceDescription: "Modified in-place.",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "in-place", "sorted"],

  execute(input: RemoveDuplicatesInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];

    if (arr.length === 0) {
      steps.push(
        step().line(2).fn("removeDuplicates").event({ type: "RETURN", functionName: "removeDuplicates", value: 0, line: 2 })
        .callStack([]).variables({}).viz(buildState([], 0, 0, true)).explain("Empty array.").build()
      );
      return steps;
    }

    let left = 1;

    const sf = (right: number): CallFrame =>
      frame("tp-0", "removeDuplicates", { nums: arr }, { left, right }, 1);

    for (let right = 1; right < arr.length; right++) {
      steps.push(
        step()
          .line(5)
          .fn("removeDuplicates")
          .event({ type: "HIGHLIGHT", targets: [right, right - 1], line: 5 })
          .callStack([sf(right)])
          .variables({ left, right, nums: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false))
          .explain(`Checking element at right = \${right} (value = \${arr[right]}).\\nIs it different from previous element \${arr[right - 1]}?`)
          .build()
      );

      if (arr[right] !== arr[right - 1]) {
        arr[left] = arr[right];

        steps.push(
          step()
            .line(6)
            .fn("removeDuplicates")
            .event({ type: "STEP", description: "Write unique value", line: 6 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Yes, \${arr[right]} is a new unique value.\\nWrite it at left index \${left}.`)
            .build()
        );

        left++;

        steps.push(
          step()
            .line(7)
            .fn("removeDuplicates")
            .event({ type: "STEP", description: "Advance left pointer", line: 7 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Advance left pointer to \${left}.`)
            .build()
        );
      } else {
        steps.push(
          step()
            .line(5)
            .fn("removeDuplicates")
            .event({ type: "STEP", description: "Value is duplicate, skip", line: 5 })
            .callStack([sf(right)])
            .variables({ left, right, nums: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, false))
            .explain(`Value is a duplicate. Do nothing, just advance right pointer.`)
            .build()
        );
      }
    }

    steps.push(
      step()
        .line(10)
        .fn("removeDuplicates")
        .event({ type: "RETURN", functionName: "removeDuplicates", value: left, line: 10 })
        .callStack([])
        .variables({ nums: JSON.stringify(arr) })
        .viz(buildState([...arr], left, arr.length, true))
        .explain(`Finished.\\n\\nNew length is \${left}. The first \${left} elements are unique.`)
        .build()
    );

    return steps;
  },
};

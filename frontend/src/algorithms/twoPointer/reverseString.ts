import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type ReverseStringInput = string[];

function buildState(arr: string[], left: number, right: number, complete: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) state = "found";
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

  return { type: "array", elements, pointers: { left, right } };
}

export const reverseString: VisualizableAlgorithm<ReverseStringInput> = {
  id: "reverse-string",
  name: "Reverse String",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Reverse an array of characters in-place using two pointers.",
  
  sourceCode: {
    typescript: `function reverseString(s: string[]): void {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    // Swap characters
    const temp = s[left];
    s[left] = s[right];
    s[right] = temp;

    // Move pointers inward
    left++;
    right--;
  }
}`,
    python: `def reverseString(s):
    left = 0
    right = len(s) - 1
    
    while left < right:
        # Swap characters
        s[left], s[right] = s[right], s[left]
        
        # Move pointers inward
        left += 1
        right -= 1`,
    java: `class Solution {
    public void reverseString(char[] s) {
        int left = 0;
        int right = s.length - 1;
        
        while (left < right) {
            // Swap characters
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            
            // Move pointers inward
            left++;
            right--;
        }
    }
}`,
    cpp: `class Solution {
public:
    void reverseString(vector<char>& s) {
        int left = 0;
        int right = s.size() - 1;
        
        while (left < right) {
            // Swap characters
            swap(s[left], s[right]);
            
            // Move pointers inward
            left++;
            right--;
        }
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify(["h", "e", "l", "l", "o"]),

  parseInput(raw: unknown): ReverseStringInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as ReverseStringInput;
  },

  validateInput(input: ReverseStringInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: ReverseStringInput): VisualizationState {
    return buildState([...input], 0, input.length - 1, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "N/2 swaps are performed",
    spaceDescription: "Swapped in-place, no extra memory",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "string", "in-place"],

  execute(input: ReverseStringInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];

    let left = 0;
    let right = arr.length - 1;

    const sf = (): CallFrame =>
      frame("tp-0", "reverseString", { s: arr }, { left, right }, 1);

    steps.push(
      step()
        .line(2)
        .fn("reverseString")
        .event({ type: "STEP", description: "Initialize pointers", line: 2 })
        .callStack([sf()])
        .variables({ left, right, s: JSON.stringify(arr) })
        .viz(buildState([...arr], left, right, false))
        .explain(`Initialize left pointer at start (0) and right pointer at end (\${right}).`)
        .build()
    );

    while (left < right) {
      steps.push(
        step()
          .line(4)
          .fn("reverseString")
          .event({ type: "HIGHLIGHT", targets: [left, right], line: 4 })
          .callStack([sf()])
          .variables({ left, right, s: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false))
          .explain(`Left (\${left}) < Right (\${right}). Proceed to swap '\${arr[left]}' and '\${arr[right]}'.`)
          .build()
      );

      const temp = arr[left];
      arr[left] = arr[right];
      arr[right] = temp;

      steps.push(
        step()
          .line(6)
          .fn("reverseString")
          .event({ type: "SWAP", indices: [left, right], array: [...arr], line: 6 })
          .callStack([sf()])
          .variables({ left, right, temp, s: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false))
          .explain(`Swapped '\${temp}' and '\${arr[left]}'. Array is now: [\${arr.join(",")}]`)
          .build()
      );

      left++;
      right--;

      steps.push(
        step()
          .line(11)
          .fn("reverseString")
          .event({ type: "STEP", description: "Move pointers", line: 11 })
          .callStack([sf()])
          .variables({ left, right, s: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false))
          .explain(`Moved pointers inward: left = \${left}, right = \${right}`)
          .build()
      );
    }

    steps.push(
      step()
        .line(14)
        .fn("reverseString")
        .event({ type: "RETURN", functionName: "reverseString", value: undefined, line: 14 })
        .callStack([])
        .variables({ s: JSON.stringify(arr) })
        .viz(buildState([...arr], -1, -1, true))
        .explain(`Pointers crossed (left >= right).\\n\\nString reversal is complete!`)
        .build()
    );

    return steps;
  },
};

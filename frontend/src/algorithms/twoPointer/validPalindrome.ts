import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type PalindromeInput = string[];

function buildState(arr: string[], left: number, right: number, complete: boolean, isPalindrome: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) state = isPalindrome ? "found" : "eliminated";
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

export const validPalindrome: VisualizableAlgorithm<PalindromeInput> = {
  id: "valid-palindrome",
  name: "Valid Palindrome",
  category: "Two Pointer",
  difficulty: "Easy",
  description: "Check if a string is a palindrome using two pointers.",
  
  sourceCode: {
    typescript: `function isPalindrome(s: string[]): boolean {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    if (s[left] !== s[right]) {
      return false; // Mismatch found
    }
    left++;
    right--;
  }

  return true; // All characters matched
}`,
    python: `def isPalindrome(s):
    left, right = 0, len(s) - 1
    
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
        
    return True`,
    java: `class Solution {
    public boolean isPalindrome(char[] s) {
        int left = 0, right = s.length - 1;
        
        while (left < right) {
            if (s[left] != s[right]) {
                return false;
            }
            left++;
            right--;
        }
        
        return true;
    }
}`,
    cpp: `class Solution {
public:
    bool isPalindrome(vector<char>& s) {
        int left = 0, right = s.size() - 1;
        
        while (left < right) {
            if (s[left] != s[right]) {
                return false;
            }
            left++;
            right--;
        }
        
        return true;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify("racecar".split("")),

  parseInput(raw: unknown): PalindromeInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as PalindromeInput;
  },

  validateInput(input: PalindromeInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: PalindromeInput): VisualizationState {
    return buildState([...input], 0, input.length - 1, false, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "O(n) where n is length of string",
    spaceDescription: "O(1) extra space",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "string", "easy"],

  execute(input: PalindromeInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];

    let left = 0;
    let right = arr.length - 1;

    const sf = (): CallFrame =>
      frame("tp-0", "isPalindrome", { s: arr }, { left, right }, 1);

    while (left < right) {
      steps.push(
        step()
          .line(5)
          .fn("isPalindrome")
          .event({ type: "HIGHLIGHT", targets: [left, right], line: 5 })
          .callStack([sf()])
          .variables({ left, right, s: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false, false))
          .explain(`Compare characters at left (\${arr[left]}) and right (\${arr[right]}).`)
          .build()
      );

      if (arr[left] !== arr[right]) {
        steps.push(
          step()
            .line(6)
            .fn("isPalindrome")
            .event({ type: "RETURN", functionName: "isPalindrome", value: false, line: 6 })
            .callStack([])
            .variables({ s: JSON.stringify(arr) })
            .viz(buildState([...arr], left, right, true, false))
            .explain(`Mismatch found: '\${arr[left]}' != '\${arr[right]}'.\\nNot a palindrome.`)
            .build()
        );
        return steps;
      }

      left++;
      right--;
      
      steps.push(
        step()
          .line(8)
          .fn("isPalindrome")
          .event({ type: "STEP", description: "Move pointers", line: 8 })
          .callStack([sf()])
          .variables({ left, right, s: JSON.stringify(arr) })
          .viz(buildState([...arr], left, right, false, false))
          .explain(`Characters match. Move pointers inward.`)
          .build()
      );
    }

    steps.push(
      step()
        .line(12)
        .fn("isPalindrome")
        .event({ type: "RETURN", functionName: "isPalindrome", value: true, line: 12 })
        .callStack([])
        .variables({ s: JSON.stringify(arr) })
        .viz(buildState([...arr], -1, -1, true, true))
        .explain(`Pointers crossed. All characters matched!\\nIt is a valid palindrome.`)
        .build()
    );

    return steps;
  },
};

import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type ContainerInput = number[];

function buildState(arr: number[], left: number, right: number, maxL: number, maxR: number, complete: boolean): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => {
    let state: ArrayElement["state"] = "default";
    if (complete) {
      state = (index === maxL || index === maxR) ? "found" : "eliminated";
    } else {
      if (index === left) state = "pointer-left";
      else if (index === right) state = "pointer-right";
      else if (index < left || index > right) state = "visited";
    }

    return {
      value,
      index,
      state,
      label: index === left ? "L" : index === right ? "R" : undefined,
    };
  });

  return { type: "array", elements, pointers: { left, right } };
}

export const containerWithMostWater: VisualizableAlgorithm<ContainerInput> = {
  id: "container-with-most-water",
  name: "Container With Most Water",
  category: "Two Pointer",
  difficulty: "Medium",
  description: "Find two lines that together with the x-axis form a container, such that the container contains the most water.",
  
  sourceCode: {
    typescript: `function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;

  while (left < right) {
    const width = right - left;
    const currentHeight = Math.min(height[left], height[right]);
    const area = width * currentHeight;
    
    maxArea = Math.max(maxArea, area);

    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return maxArea;
}`,
    python: `def maxArea(height):
    left, right = 0, len(height) - 1
    max_area = 0
    
    while left < right:
        width = right - left
        current_height = min(height[left], height[right])
        max_area = max(max_area, width * current_height)
        
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
            
    return max_area`,
    java: `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1;
        int maxArea = 0;
        
        while (left < right) {
            int currentHeight = Math.min(height[left], height[right]);
            maxArea = Math.max(maxArea, (right - left) * currentHeight);
            
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        
        return maxArea;
    }
}`,
    cpp: `class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0, right = height.size() - 1;
        int maxArea = 0;
        
        while (left < right) {
            int currentHeight = min(height[left], height[right]);
            maxArea = max(maxArea, (right - left) * currentHeight);
            
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        
        return maxArea;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([1, 8, 6, 2, 5, 4, 8, 3, 7]),

  parseInput(raw: unknown): ContainerInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as ContainerInput;
  },

  validateInput(input: ContainerInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be an array" };
    return { valid: true };
  },

  initialVisualizationState(input: ContainerInput): VisualizationState {
    return buildState([...input], 0, input.length - 1, -1, -1, false);
  },

  complexity: {
    time: "O(n)",
    space: "O(1)",
    timeDescription: "O(n) using two pointers",
    spaceDescription: "O(1) extra space",
  },
  visualizationType: "array",
  tags: ["two-pointer", "array", "greedy", "medium"],

  execute(input: ContainerInput): ExecutionStep[] {
    resetStepCounter();
    const arr = [...input];
    const steps: ExecutionStep[] = [];

    let left = 0;
    let right = arr.length - 1;
    let maxArea = 0;
    let maxL = left;
    let maxR = right;

    const sf = (): CallFrame =>
      frame("tp-0", "maxArea", { height: arr }, { left, right, maxArea }, 1);

    while (left < right) {
      const width = right - left;
      const currentHeight = Math.min(arr[left], arr[right]);
      const area = width * currentHeight;
      
      if (area > maxArea) {
        maxL = left;
        maxR = right;
      }
      
      maxArea = Math.max(maxArea, area);

      steps.push(
        step()
          .line(9)
          .fn("maxArea")
          .event({ type: "HIGHLIGHT", targets: [left, right], line: 9 })
          .callStack([sf()])
          .variables({ left, right, width, currentHeight, area, maxArea })
          .viz(buildState([...arr], left, right, maxL, maxR, false))
          .explain(`Left: \${arr[left]}, Right: \${arr[right]}\\nWidth = \${width}, Min Height = \${currentHeight}\\nArea = \${area}. Max Area so far = \${maxArea}`)
          .build()
      );

      if (arr[left] < arr[right]) {
        steps.push(
          step()
            .line(13)
            .fn("maxArea")
            .event({ type: "STEP", description: "Move left pointer", line: 13 })
            .callStack([sf()])
            .variables({ left, right, maxArea })
            .viz(buildState([...arr], left, right, maxL, maxR, false))
            .explain(`height[left] < height[right]. To find a taller line, move the shorter one (left).`)
            .build()
        );
        left++;
      } else {
        steps.push(
          step()
            .line(15)
            .fn("maxArea")
            .event({ type: "STEP", description: "Move right pointer", line: 15 })
            .callStack([sf()])
            .variables({ left, right, maxArea })
            .viz(buildState([...arr], left, right, maxL, maxR, false))
            .explain(`height[right] <= height[left]. To find a taller line, move the shorter one (right).`)
            .build()
        );
        right--;
      }
    }

    steps.push(
      step()
        .line(19)
        .fn("maxArea")
        .event({ type: "RETURN", functionName: "maxArea", value: maxArea, line: 19 })
        .callStack([])
        .variables({ maxArea })
        .viz(buildState([...arr], -1, -1, maxL, maxR, true))
        .explain(`Finished.\\n\\nMax Area is \${maxArea}, formed by lines at indices \${maxL} and \${maxR}.`)
        .build()
    );

    return steps;
  },
};

import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
} from "@/engine/executionTypes";

type MergeSortInput = number[];

function buildState(arr: number[], highlights: { [index: number]: "current" | "comparing" | "found" | "visited" | "default" }): VisualizationState {
  const elements: ArrayElement[] = arr.map((value, index) => ({
    value,
    index,
    state: highlights[index] ?? "default",
  }));
  return { type: "array", elements };
}

export const mergeSort: VisualizableAlgorithm<MergeSortInput> = {
  id: "merge-sort",
  name: "Merge Sort",
  category: "Sorting",
  difficulty: "Medium",
  description: "Divide and conquer sorting algorithm that recursively splits the array in half, sorts each half, then merges them back.",

  sourceCode: {
    typescript: `function mergeSort(arr: number[]): number[] {
  // Base case: already sorted
  if (arr.length <= 1) return arr;

  // Split in half
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  // Merge the two sorted halves
  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return [...result, ...left.slice(i), ...right.slice(j)];
}`,
    python: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
    java: `class Solution {
    public int[] mergeSort(int[] arr) {
        if (arr.length <= 1) return arr;
        
        int mid = arr.length / 2;
        int[] left = mergeSort(Arrays.copyOfRange(arr, 0, mid));
        int[] right = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));
        
        return merge(left, right);
    }
    
    private int[] merge(int[] left, int[] right) {
        int[] result = new int[left.length + right.length];
        int i = 0, j = 0, k = 0;
        
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) result[k++] = left[i++];
            else result[k++] = right[j++];
        }
        
        while (i < left.length) result[k++] = left[i++];
        while (j < right.length) result[k++] = right[j++];
        return result;
    }
}`,
    cpp: `class Solution {
public:
    vector<int> mergeSort(vector<int>& arr) {
        if (arr.size() <= 1) return arr;
        
        int mid = arr.size() / 2;
        vector<int> left(arr.begin(), arr.begin() + mid);
        vector<int> right(arr.begin() + mid, arr.end());
        
        left = mergeSort(left);
        right = mergeSort(right);
        
        return merge(left, right);
    }
    
    vector<int> merge(vector<int>& left, vector<int>& right) {
        vector<int> result;
        int i = 0, j = 0;
        
        while (i < left.size() && j < right.size()) {
            if (left[i] <= right[j]) result.push_back(left[i++]);
            else result.push_back(right[j++]);
        }
        
        while (i < left.size()) result.push_back(left[i++]);
        while (j < right.size()) result.push_back(right[j++]);
        return result;
    }
};`
  },

  language: "typescript",
  defaultInput: JSON.stringify([38, 27, 43, 3, 9, 82, 10]),

  parseInput(raw: unknown): MergeSortInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as MergeSortInput;
  },

  validateInput(input: MergeSortInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be a number array" };
    if (input.length < 2) return { valid: false, error: "Array must have at least 2 elements" };
    return { valid: true };
  },

  initialVisualizationState(input: MergeSortInput): VisualizationState {
    return buildState([...input], {});
  },

  complexity: {
    time: "O(n log n)",
    space: "O(n)",
    timeDescription: "Divides array log n times, merges O(n) each time",
    spaceDescription: "O(n) auxiliary space for merging",
  },
  visualizationType: "tree",
  tags: ["sort", "recursion", "divide-and-conquer", "stable"],

  execute(input: MergeSortInput): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];
    let frameId = 0;
    const callStack: CallFrame[] = [];

    const nodes: import("@/engine/executionTypes").TreeNodeState[] = [];
    const edges: import("@/engine/executionTypes").TreeEdgeState[] = [];

    interface MergeNode {
      id: string;
      arr: number[];
      result: number[] | null;
      state: import("@/engine/executionTypes").TreeNodeState["state"];
      left?: MergeNode;
      right?: MergeNode;
    }

    let rootNode: MergeNode | null = null;
    let currentId: string | null = null;

    function buildTreeState(currId: string | null): VisualizationState {
      nodes.length = 0;
      edges.length = 0;
      if (!rootNode) return { type: "tree", nodes, edges };

      function traverse(node: MergeNode, depth: number, position: number, parentId: string | null, side: string) {
        // Display the sorted result if returning, otherwise the input array
        const displayArr = node.result !== null ? node.result : node.arr;
        const valStr = `[${displayArr.join(",")}]`;

        nodes.push({
          id: node.id,
          value: valStr,
          state: node.state,
          depth,
          position,
          returnValue: node.result !== null ? `[${node.result.join(",")}]` : undefined
        });

        if (parentId) {
          edges.push({
            id: `${parentId}->${node.id}`,
            source: parentId,
            target: node.id,
            state: currId === node.id ? "active" : (node.state === "visited" || node.state === "returning" || node.state === "found" ? "traversed" : "default"),
            label: side,
          });
        }
        if (node.left) traverse(node.left, depth + 1, position * 2, node.id, "L");
        if (node.right) traverse(node.right, depth + 1, position * 2 + 1, node.id, "R");
      }
      traverse(rootNode, 0, 0, null, "");
      return { type: "tree", nodes: [...nodes], edges: [...edges], currentNodeId: currId ?? undefined };
    }

    function mergeSortRecursive(arr: number[], depth: number, parentNode: MergeNode | null, side: "left" | "right"): number[] {
      const fId = `ms-${frameId++}`;
      const cf = frame(fId, "mergeSort", { arr: JSON.stringify(arr) }, { length: arr.length }, 1);
      callStack.push(cf);
      
      const node: MergeNode = { id: fId, arr, result: null, state: "current" };
      if (!rootNode) rootNode = node;
      else if (parentNode) parentNode[side] = node;

      steps.push(
        step()
          .line(arr.length <= 1 ? 2 : 5)
          .fn("mergeSort")
          .event({ type: "CALL", functionName: "mergeSort", args: { arr: JSON.stringify(arr) }, line: 1 })
          .callStack([...callStack])
          .variables({ arr: JSON.stringify(arr), depth, length: arr.length })
          .viz(buildTreeState(fId))
          .explain(arr.length <= 1
            ? `Base case: subarray [${arr.join(",")}] has ${arr.length} element. Already sorted.\nReturn directly.`
            : `mergeSort([${arr.join(",")}]) — depth ${depth}.\n\nSplit at mid = ${Math.floor(arr.length / 2)}.`)
          .depth(depth)
          .recursive(depth > 0)
          .build()
      );

      if (arr.length <= 1) {
        node.result = [...arr];
        node.state = "returning";
        steps.push(
          step()
            .line(3)
            .fn("mergeSort")
            .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(arr), line: 3 })
            .callStack([...callStack])
            .variables({ arr: JSON.stringify(arr), returns: JSON.stringify(arr) })
            .viz(buildTreeState(fId))
            .explain(`[${arr.join(",")}] : Base case → return [${arr.join(",")}]`)
            .depth(depth)
            .returns(arr)
            .build()
        );
        node.state = "visited";
        callStack.pop();
        return arr;
      }

      const mid = Math.floor(arr.length / 2);
      node.state = "visited";
      const left = mergeSortRecursive(arr.slice(0, mid), depth + 1, node, "left");
      node.state = "visited";
      const right = mergeSortRecursive(arr.slice(mid), depth + 1, node, "right");

      node.state = "current";

      // Merge step
      const merged: number[] = [];
      let i = 0, j = 0;
      while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) merged.push(left[i++]);
        else merged.push(right[j++]);
      }
      while (i < left.length) merged.push(left[i++]);
      while (j < right.length) merged.push(right[j++]);

      node.result = merged;
      node.state = "returning";

      steps.push(
        step()
          .line(10)
          .fn("mergeSort")
          .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(merged), line: 10 })
          .callStack([...callStack])
          .variables({ left: JSON.stringify(left), right: JSON.stringify(right), merged: JSON.stringify(merged) })
          .viz(buildTreeState(fId))
          .explain(`Merge complete at depth ${depth}!\nMerged [${left.join(",")}] + [${right.join(",")}] → [${merged.join(",")}]`)
          .depth(depth)
          .build()
      );

      node.state = "found";
      callStack.pop();
      return merged;
    }

    const finalResult = mergeSortRecursive([...input], 0, null, "left");

    steps.push(
      step()
        .line(11)
        .fn("mergeSort")
        .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(finalResult), line: 11 })
        .callStack([])
        .variables({ result: JSON.stringify(finalResult) })
        .viz(buildTreeState(null))
        .explain(`Merge Sort complete!\n\nFinal sorted array: [${finalResult.join(", ")}]`)
        .build()
    );

    return steps;
  },
};

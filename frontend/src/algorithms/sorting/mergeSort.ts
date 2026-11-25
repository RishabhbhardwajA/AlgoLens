import { resetStepCounter, step, frame } from "@/engine/stepBuilder";
import { resolveSourceLine } from "@/utils/sourceLineMapper";
import type {
  VisualizableAlgorithm,
  ExecutionStep,
  ArrayElement,
  VisualizationState,
  CallFrame,
  TreeNodeState,
  TreeEdgeState,
} from "@/engine/executionTypes";

type MergeSortInput = number[];

const TS_SOURCE = `function mergeSort(arr: number[]): number[] {
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
}`;

function buildArraySnapshot(
  arr: number[],
  highlights: { [index: number]: ArrayElement["state"] }
): ArrayElement[] {
  return arr.map((value, index) => ({
    value,
    index,
    state: highlights[index] ?? "default",
  }));
}

export const mergeSort: VisualizableAlgorithm<MergeSortInput> = {
  id: "merge-sort",
  name: "Merge Sort",
  category: "Sorting",
  difficulty: "Medium",
  description:
    "Divide and conquer sorting algorithm that recursively splits the array in half, sorts each half, then merges them back.",

  sourceCode: {
    typescript: TS_SOURCE,
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
};`,
  },

  language: "typescript",
  defaultInput: JSON.stringify([38, 27, 43, 3, 9, 82, 10]),

  parseInput(raw: unknown): MergeSortInput {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as MergeSortInput;
  },

  validateInput(input: MergeSortInput) {
    if (!Array.isArray(input)) return { valid: false, error: "Input must be a number array" };
    if (input.length === 0) return { valid: false, error: "Array must have at least 1 element" };
    if (!input.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { valid: false, error: "All elements must be finite numbers" };
    }
    if (input.length > 32) return { valid: false, error: "Array size cannot exceed 32 elements" };
    return { valid: true };
  },

  initialVisualizationState(input: MergeSortInput): VisualizationState {
    const safeArr = Array.isArray(input) ? [...input] : [];
    return {
      type: "tree",
      nodes: [
        {
          id: "ms-0",
          value: `[${safeArr.join(",")}]`,
          state: "default",
          depth: 0,
          position: 0,
        },
      ],
      edges: [],
      arraySnapshot: buildArraySnapshot(safeArr, {}),
    };
  },

  complexity: {
    time: "O(n log n)",
    space: "O(n)",
    timeDescription: "Divides array log n times, merges O(n) each level",
    spaceDescription: "O(n) merge buffers + O(log n) recursion stack frames",
  },
  visualizationType: "tree",
  tags: ["sort", "recursion", "divide-and-conquer", "stable"],

  execute(input: MergeSortInput): ExecutionStep[] {
    resetStepCounter();
    const steps: ExecutionStep[] = [];
    const workingArr = [...input];
    let frameId = 0;
    const callStack: CallFrame[] = [];

    const lineBase = resolveSourceLine(TS_SOURCE, "if (arr.length <= 1)", 3);
    const lineSplit = resolveSourceLine(TS_SOURCE, "const mid = Math.floor", 6);
    const lineCallLeft = resolveSourceLine(TS_SOURCE, "const left = mergeSort", 7);
    const lineCallRight = resolveSourceLine(TS_SOURCE, "const right = mergeSort", 8);
    const lineMergeCall = resolveSourceLine(TS_SOURCE, "return merge(left, right)", 11);
    const lineMergeCompare = resolveSourceLine(TS_SOURCE, "if (left[i] <= right[j])", 19);
    const lineMergeWriteLeft = resolveSourceLine(TS_SOURCE, "result.push(left[i++])", 20);
    const lineMergeWriteRight = resolveSourceLine(TS_SOURCE, "result.push(right[j++])", 22);
    const lineMergeReturn = resolveSourceLine(TS_SOURCE, "return [...result", 26);

    interface MergeNode {
      id: string;
      arr: number[];
      result: number[] | null;
      state: TreeNodeState["state"];
      left?: MergeNode;
      right?: MergeNode;
    }

    let rootNode: MergeNode | null = null;

    function buildTreeState(
      currId: string | null,
      arraySnapshot: ArrayElement[]
    ): VisualizationState {
      const nodes: TreeNodeState[] = [];
      const edges: TreeEdgeState[] = [];
      if (!rootNode) return { type: "tree", nodes, edges, arraySnapshot };

      function traverse(
        node: MergeNode,
        depth: number,
        position: number,
        parentId: string | null,
        side: string
      ) {
        const displayArr = node.result !== null ? node.result : node.arr;
        nodes.push({
          id: node.id,
          value: `[${displayArr.join(",")}]`,
          state: node.state,
          depth,
          position,
          returnValue: node.result !== null ? `[${node.result.join(",")}]` : undefined,
        });

        if (parentId) {
          edges.push({
            id: `${parentId}->${node.id}`,
            source: parentId,
            target: node.id,
            state:
              currId === node.id
                ? "active"
                : node.state === "visited" || node.state === "returning" || node.state === "found"
                ? "traversed"
                : "default",
            label: side,
          });
        }
        if (node.left) traverse(node.left, depth + 1, position * 2, node.id, "L");
        if (node.right) traverse(node.right, depth + 1, position * 2 + 1, node.id, "R");
      }

      traverse(rootNode, 0, 0, null, "");
      return {
        type: "tree",
        nodes,
        edges,
        currentNodeId: currId ?? undefined,
        arraySnapshot,
      };
    }

    function rangeHighlights(
      start: number,
      end: number,
      state: ArrayElement["state"]
    ): { [idx: number]: ArrayElement["state"] } {
      const h: { [idx: number]: ArrayElement["state"] } = {};
      for (let idx = start; idx < end; idx++) h[idx] = state;
      return h;
    }

    function mergeSortRecursive(
      arr: number[],
      start: number,
      depth: number,
      parentNode: MergeNode | null,
      side: "left" | "right"
    ): number[] {
      const fId = `ms-${frameId++}`;
      const entryLine = arr.length <= 1 ? lineBase : lineSplit;
      const cf = frame(fId, "mergeSort", { arr: JSON.stringify(arr) }, { length: arr.length }, entryLine);
      callStack.push(cf);

      const node: MergeNode = { id: fId, arr, result: null, state: "current" };
      if (!rootNode) rootNode = node;
      else if (parentNode) parentNode[side] = node;

      steps.push(
        step()
          .line(entryLine)
          .fn("mergeSort")
          .event({ type: "CALL", functionName: "mergeSort", args: { arr: JSON.stringify(arr) }, line: entryLine })
          .callStack([...callStack])
          .variables({ arr: JSON.stringify(arr), depth, length: arr.length })
          .viz(buildTreeState(fId, buildArraySnapshot(workingArr, rangeHighlights(start, start + arr.length, "current"))))
          .explain(
            arr.length <= 1
              ? `Base case: subarray [${arr.join(",")}] has ${arr.length} element. Already sorted.`
              : `mergeSort([${arr.join(",")}]) — depth ${depth}. Split at mid = ${Math.floor(arr.length / 2)}.`
          )
          .depth(depth)
          .recursive(depth > 0)
          .build()
      );

      if (arr.length <= 1) {
        node.result = [...arr];
        node.state = "returning";
        steps.push(
          step()
            .line(lineBase)
            .fn("mergeSort")
            .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(arr), line: lineBase })
            .callStack([...callStack])
            .variables({ arr: JSON.stringify(arr), returns: JSON.stringify(arr) })
            .viz(buildTreeState(fId, buildArraySnapshot(workingArr, rangeHighlights(start, start + arr.length, "visited"))))
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
      cf.line = lineCallLeft;
      const left = mergeSortRecursive(arr.slice(0, mid), start, depth + 1, node, "left");
      cf.line = lineCallRight;
      node.state = "visited";
      const right = mergeSortRecursive(arr.slice(mid), start + mid, depth + 1, node, "right");

      node.state = "current";
      cf.line = lineMergeCall;

      // Merge with step-by-step comparisons & writes so both Tree & Race bar telemetry are exact
      const merged: number[] = [];
      let i = 0;
      let j = 0;

      const syncRangeFromMerged = () => {
        const snapshot = [...merged, ...left.slice(i), ...right.slice(j)];
        for (let m = 0; m < snapshot.length; m++) {
          workingArr[start + m] = snapshot[m];
        }
      };

      while (i < left.length && j < right.length) {
        syncRangeFromMerged();
        const k = start + merged.length;
        const leftIdx = k;
        const rightIdx = k + (left.length - i);
        const h: { [idx: number]: ArrayElement["state"] } = {};
        for (let p = start; p < k; p++) h[p] = "visited";
        h[leftIdx] = "comparing";
        h[rightIdx] = "comparing";

        const pickLeft = left[i] <= right[j];
        steps.push(
          step()
            .line(lineMergeCompare)
            .fn("merge")
            .event({
              type: "COMPARE",
              left: left[i],
              right: right[j],
              operator: "<=",
              result: pickLeft,
              indices: [leftIdx, rightIdx],
              line: lineMergeCompare,
            })
            .callStack([...callStack])
            .variables({ leftVal: left[i], rightVal: right[j], i, j, writeIndex: k })
            .viz(buildTreeState(fId, buildArraySnapshot(workingArr, h)))
            .explain(
              `Comparing left[${i}] = ${left[i]} and right[${j}] = ${right[j]} — ${
                pickLeft ? `${left[i]} ≤ ${right[j]}, pick ${left[i]}` : `${left[i]} > ${right[j]}, pick ${right[j]}`
              }.`
            )
            .depth(depth)
            .build()
        );

        const prevVal = workingArr[k];
        const chosenVal = pickLeft ? left[i++] : right[j++];
        merged.push(chosenVal);
        syncRangeFromMerged();

        const writeLine = pickLeft ? lineMergeWriteLeft : lineMergeWriteRight;
        const hWrite: { [idx: number]: ArrayElement["state"] } = {};
        for (let p = start; p <= k; p++) hWrite[p] = p === k ? "current" : "visited";

        steps.push(
          step()
            .line(writeLine)
            .fn("merge")
            .event({
              type: "UPDATE",
              variable: `arr[${k}]`,
              oldValue: prevVal,
              newValue: chosenVal,
              data: { index: k },
              line: writeLine,
            })
            .callStack([...callStack])
            .variables({ [`arr[${k}]`]: chosenVal, merged: JSON.stringify(merged) })
            .viz(buildTreeState(fId, buildArraySnapshot(workingArr, hWrite)))
            .explain(`Placed ${chosenVal} at index ${k}.`)
            .depth(depth)
            .build()
        );
      }

      while (i < left.length) {
        const k = start + merged.length;
        const prevVal = workingArr[k];
        const chosenVal = left[i++];
        merged.push(chosenVal);
        syncRangeFromMerged();

        const hWrite: { [idx: number]: ArrayElement["state"] } = {};
        for (let p = start; p <= k; p++) hWrite[p] = p === k ? "current" : "visited";
        steps.push(
          step()
            .line(lineMergeReturn)
            .fn("merge")
            .event({
              type: "UPDATE",
              variable: `arr[${k}]`,
              oldValue: prevVal,
              newValue: chosenVal,
              data: { index: k },
              line: lineMergeReturn,
            })
            .callStack([...callStack])
            .variables({ [`arr[${k}]`]: chosenVal, merged: JSON.stringify(merged) })
            .viz(buildTreeState(fId, buildArraySnapshot(workingArr, hWrite)))
            .explain(`Appended remaining left element ${chosenVal} at index ${k}.`)
            .depth(depth)
            .build()
        );
      }

      while (j < right.length) {
        const k = start + merged.length;
        const prevVal = workingArr[k];
        const chosenVal = right[j++];
        merged.push(chosenVal);
        syncRangeFromMerged();

        const hWrite: { [idx: number]: ArrayElement["state"] } = {};
        for (let p = start; p <= k; p++) hWrite[p] = p === k ? "current" : "visited";
        steps.push(
          step()
            .line(lineMergeReturn)
            .fn("merge")
            .event({
              type: "UPDATE",
              variable: `arr[${k}]`,
              oldValue: prevVal,
              newValue: chosenVal,
              data: { index: k },
              line: lineMergeReturn,
            })
            .callStack([...callStack])
            .variables({ [`arr[${k}]`]: chosenVal, merged: JSON.stringify(merged) })
            .viz(buildTreeState(fId, buildArraySnapshot(workingArr, hWrite)))
            .explain(`Appended remaining right element ${chosenVal} at index ${k}.`)
            .depth(depth)
            .build()
        );
      }

      node.result = merged;
      node.state = "returning";

      steps.push(
        step()
          .line(lineMergeCall)
          .fn("mergeSort")
          .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(merged), line: lineMergeCall })
          .callStack([...callStack])
          .variables({ left: JSON.stringify(left), right: JSON.stringify(right), merged: JSON.stringify(merged) })
          .viz(buildTreeState(fId, buildArraySnapshot(workingArr, rangeHighlights(start, start + merged.length, "visited"))))
          .explain(`Merge complete at depth ${depth}: [${left.join(",")}] + [${right.join(",")}] → [${merged.join(",")}]`)
          .depth(depth)
          .returns([...merged])
          .build()
      );

      node.state = "found";
      callStack.pop();
      return merged;
    }

    const finalResult = mergeSortRecursive([...input], 0, 0, null, "left");

    steps.push(
      step()
        .line(lineMergeCall)
        .fn("mergeSort")
        .event({ type: "RETURN", functionName: "mergeSort", value: JSON.stringify(finalResult), line: lineMergeCall })
        .callStack([])
        .variables({ result: JSON.stringify(finalResult) })
        .viz(buildTreeState(null, buildArraySnapshot(workingArr, rangeHighlights(0, workingArr.length, "found"))))
        .explain(`Merge Sort complete! Final sorted array: [${finalResult.join(", ")}]`)
        .returns([...finalResult])
        .build()
    );

    return steps;
  },
};

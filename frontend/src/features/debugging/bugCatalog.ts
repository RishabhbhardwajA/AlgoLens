import { step, frame, resetStepCounter } from "@/engine/stepBuilder";
import type { ExecutionStep, VisualizationState, ArrayElement } from "@/engine/executionTypes";

export interface BugExample {
  id: string;
  title: string;
  algorithmName: "Binary Search" | "Two Pointers";
  bugCategory: "Loop Boundary" | "Pointer Update" | "Comparison Inversion" | "Termination Condition";
  description: string;
  knownInput: string;
  expectedBehavior: string;
  actualBuggyBehavior: string;
  rootCause: string;
  fixExplanation: string;
  buggyCode: string;
  fixedCode: string;
  testCase: {
    input: unknown;
    expected: unknown;
    actualBuggy: unknown;
  };
  executeBuggy: (rawInput: string) => ExecutionStep[];
}

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

  return { type: "array", elements, pointers: { left, right, ...(mid !== null ? { mid } : {}) } };
}

export const BUG_CATALOG: BugExample[] = [
  // 1. Binary Search: Off-by-one boundary
  {
    id: "bs-off-by-one",
    title: "Binary Search: Off-by-One Loop Guard (left < right)",
    algorithmName: "Binary Search",
    bugCategory: "Loop Boundary",
    description: "Using 'while (left < right)' instead of 'while (left <= right)'. Fails when the target is at the single remaining element or array boundary.",
    knownInput: JSON.stringify({ array: [2, 5, 8], target: 8 }),
    expectedBehavior: "Return index 2 (arr[2] === 8)",
    actualBuggyBehavior: "Returns -1 (Target Not Found) even though 8 exists in array at index 2!",
    rootCause: "When left === right (both point to index 2), the condition left < right evaluates to FALSE. The loop terminates before ever inspecting the element at index 2.",
    fixExplanation: "Change 'while (left < right)' to 'while (left <= right)'. This guarantees the 1-element search space [left, left] is evaluated.",
    buggyCode: `function binarySearchBuggy(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;

  // BUG: Strict '<' skips single-element search window!
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1; // Wrongly returns -1 for target 8!
}`,
    fixedCode: `function binarySearchFixed(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;

  // FIX: '<=' checks when left === right
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}`,
    testCase: {
      input: { array: [2, 5, 8], target: 8 },
      expected: 2,
      actualBuggy: -1,
    },
    executeBuggy: (raw: string) => {
      resetStepCounter();
      const { array: arr, target } = JSON.parse(raw);
      const steps: ExecutionStep[] = [];
      let left = 0;
      let right = arr.length - 1;

      const sf = () => frame("bs-bug-1", "binarySearchBuggy", { arr, target }, { left, right }, 2);

      steps.push(
        step()
          .line(2)
          .fn("binarySearchBuggy")
          .event({ type: "UPDATE", variable: "left", oldValue: undefined, newValue: 0, line: 2 })
          .callStack([sf()])
          .variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain("Initialize left = 0, right = " + right)
          .structured(
            `Initialized left = 0 and right = ${right}.`,
            `Starting search in array for target ${target}.`,
            `Initial window spans indices [0...${right}].`
          )
          .build()
      );

      // Iteration 1: left=0, right=2 => mid=1 (val 5)
      const mid1 = 1;
      steps.push(
        step()
          .line(6)
          .fn("binarySearchBuggy")
          .event({ type: "UPDATE", variable: "mid", oldValue: undefined, newValue: mid1, line: 6 })
          .callStack([sf()])
          .variables({ left, right, mid: mid1, target })
          .viz(buildArrayState(arr, left, right, mid1, null))
          .explain(`Iteration 1: left (${left}) < right (${right}) is true. mid = 1 (arr[1] = 5 < 8).`)
          .structured(
            `Computed mid = ${mid1} (arr[${mid1}] = ${arr[mid1]}).`,
            `left (${left}) < right (${right}) is true. Evaluating midpoint.`,
            `Window is [${left}...${right}].`
          )
          .build()
      );

      left = 2; // mid + 1
      steps.push(
        step()
          .line(9)
          .fn("binarySearchBuggy")
          .event({ type: "POINTER_MOVE", pointer: "left", from: 0, to: 2, line: 9 })
          .callStack([sf()])
          .variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain(`arr[1] (5) < 8. Advance left to mid + 1 = 2. Now left = 2 and right = 2!`)
          .structured(
            `arr[1] < target. Updated left = 2.`,
            `Eliminated left half. New window is [2, 2].`,
            `Window contains exactly one element: index 2.`
          )
          .build()
      );

      // Loop condition fails! 2 < 2 is FALSE!
      steps.push(
        step()
          .line(5)
          .fn("binarySearchBuggy")
          .event({ type: "COMPARE", left, right, operator: "<", result: false, line: 5 })
          .callStack([sf()])
          .variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain(`BUG TRIGGERED! while (left < right) evaluates 2 < 2 which is FALSE! The loop exits prematurely before inspecting index 2!`)
          .structured(
            `Evaluated loop guard: left (${left}) < right (${right}) → FALSE!`,
            `Loop terminates prematurely because of the strict '<' comparison!`,
            `Target 8 at index 2 is completely skipped!`
          )
          .build()
      );

      steps.push(
        step()
          .line(13)
          .fn("binarySearchBuggy")
          .event({ type: "NOT_FOUND", target, line: 13 })
          .callStack([sf()])
          .variables({ left, right, target })
          .viz(buildArrayState(arr, -1, -1, null, null))
          .explain(`Returns -1: Target NOT found! (Bug result: expected index 2, got -1).`)
          .structured(
            `Exited loop and returned -1.`,
            `Failure caused by buggy 'while (left < right)' boundary.`,
            `Expected result was 2, but algorithm returned -1.`
          )
          .returns(-1)
          .build()
      );

      return steps;
    },
  },

  // 2. Binary Search: Infinite loop (left = mid)
  {
    id: "bs-infinite-loop",
    title: "Binary Search: Infinite Loop (left = mid instead of mid + 1)",
    algorithmName: "Binary Search",
    bugCategory: "Pointer Update",
    description: "Setting 'left = mid' instead of 'left = mid + 1'. When right - left === 1, mid truncates to left, causing infinite loop without state progress.",
    knownInput: JSON.stringify({ array: [1, 3], target: 3 }),
    expectedBehavior: "Return index 1 (arr[1] === 3)",
    actualBuggyBehavior: "Infinite loop! Pointers freeze at left = 0, mid = 0, repeating forever.",
    rootCause: "With left = 0 and right = 1, mid = Math.floor((0 + 1) / 2) = 0. arr[0] (1) < 3. If you set left = mid, left stays 0. Next iteration mid is 0 again!",
    fixExplanation: "Always advance left pointer past mid using 'left = mid + 1'. This strictly shrinks search window in every iteration.",
    buggyCode: `function binarySearchInfinite(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    // BUG: Setting left = mid freezes pointer when right - left === 1!
    else if (arr[mid] < target) left = mid; 
    else right = mid - 1;
  }
  return -1;
}`,
    fixedCode: `function binarySearchFixed(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    // FIX: Advance pointer beyond mid!
    else if (arr[mid] < target) left = mid + 1; 
    else right = mid - 1;
  }
  return -1;
}`,
    testCase: {
      input: { array: [1, 3], target: 3 },
      expected: 1,
      actualBuggy: "INFINITE_LOOP",
    },
    executeBuggy: (raw: string) => {
      resetStepCounter();
      const { array: arr, target } = JSON.parse(raw);
      const steps: ExecutionStep[] = [];
      const left = 0;
      const right = 1;

      const sf = () => frame("bs-inf-1", "binarySearchInfinite", { arr, target }, { left, right }, 2);

      steps.push(
        step().line(2).fn("binarySearchInfinite")
          .event({ type: "UPDATE", variable: "left", oldValue: undefined, newValue: 0, line: 2 })
          .callStack([sf()]).variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain("Initialize: left = 0, right = 1.")
          .structured("Initialized left = 0 and right = 1.", "Starting search in array [1, 3].", "Search space is [0, 1].")
          .build()
      );

      // Repeat 3 iterations to illustrate the infinite freeze
      for (let i = 1; i <= 3; i++) {
        const mid = 0;
        steps.push(
          step().line(6).fn("binarySearchInfinite")
            .event({ type: "UPDATE", variable: "mid", oldValue: undefined, newValue: mid, line: 6 })
            .callStack([sf()]).variables({ left, right, mid, target, iteration: i })
            .viz(buildArrayState(arr, left, right, mid, null))
            .explain(`Iteration ${i}: mid = ⌊(0 + 1) / 2⌋ = 0. arr[0] = 1 < target 3.`)
            .structured(`Iteration ${i}: Computed mid = 0.`, `Evaluating arr[0] (1) against target 3.`, `Pointers: left = 0, right = 1.`)
            .build()
        );

        steps.push(
          step().line(8).fn("binarySearchInfinite")
            .event({ type: "UPDATE", variable: "left", oldValue: 0, newValue: 0, line: 8 })
            .callStack([sf()]).variables({ left: 0, right: 1, target, iteration: i })
            .viz(buildArrayState(arr, left, right, null, null))
            .explain(`Iteration ${i}: Executed 'left = mid'. But mid is 0, so left remains 0! No progress is made!`)
            .structured(
              `BUG: left updated to mid (${mid}), remaining unchanged at 0!`,
              `Because left = mid, the search space did not shrink!`,
              `Loop condition will never terminate without left = mid + 1.`
            )
            .build()
        );
      }

      // Final step highlighting infinite cycle
      steps.push(
        step().line(8).fn("binarySearchInfinite")
          .event({ type: "STEP", description: "Infinite Loop Detected", line: 8 })
          .callStack([sf()]).variables({ left: 0, right: 1, target, state: "FROZEN" })
          .viz(buildArrayState(arr, 0, 1, 0, null))
          .explain("CRITICAL BUG: State is cycling infinitely between left = 0 and mid = 0! AlgoLens stopped execution to prevent browser crash.")
          .structured(
            "Infinite loop halted.",
            "Algorithm fails to make progress because pointer was not advanced past mid.",
            "Requires 'left = mid + 1' to guarantee convergence."
          )
          .build()
      );

      return steps;
    },
  },

  // 3. Two Pointers: Inverted Comparison
  {
    id: "tp-inverted-comparison",
    title: "Two Pointers: Inverted Sum Branch (left vs right)",
    algorithmName: "Two Pointers",
    bugCategory: "Comparison Inversion",
    description: "When sum < target, decrementing right-- instead of advancing left++. Decreases an already too-small sum further, missing the solution.",
    knownInput: JSON.stringify({ array: [1, 2, 4, 8], target: 6 }),
    expectedBehavior: "Return [1, 2] (arr[1] + arr[2] = 2 + 4 = 6)",
    actualBuggyBehavior: "Returns [-1, -1] because right pointer shrinks prematurely away from valid pairs!",
    rootCause: "When current sum (1 + 8 = 9) > 6, right moves to 2 (1 + 4 = 5). Now 5 < 6. The buggy code moves right-- again, making sum 1 + 2 = 3 instead of increasing it with left++!",
    fixExplanation: "When sum < target, increment left (left++) to find a larger value. When sum > target, decrement right (right--) to find a smaller value.",
    buggyCode: `function twoSumBuggy(arr: number[], target: number): [number, number] {
  let left = 0, right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    // BUG: Inverted logic! sum < target should move left++, NOT right--!
    else if (sum < target) right--; 
    else left++;
  }
  return [-1, -1];
}`,
    fixedCode: `function twoSumFixed(arr: number[], target: number): [number, number] {
  let left = 0, right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    // FIX: Advance left to increase sum!
    else if (sum < target) left++; 
    else right--;
  }
  return [-1, -1];
}`,
    testCase: {
      input: { array: [1, 2, 4, 8], target: 6 },
      expected: [1, 2],
      actualBuggy: [-1, -1],
    },
    executeBuggy: (raw: string) => {
      resetStepCounter();
      const { array: arr, target } = JSON.parse(raw);
      const steps: ExecutionStep[] = [];
      let left = 0;
      let right = arr.length - 1;

      const sf = () => frame("tp-inv-1", "twoSumBuggy", { arr, target }, { left, right }, 2);

      steps.push(
        step().line(2).fn("twoSumBuggy")
          .event({ type: "UPDATE", variable: "left/right", oldValue: undefined, newValue: [left, right], line: 2 })
          .callStack([sf()]).variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain("Initialize two pointers: left = 0 (1), right = 3 (8).")
          .structured("Initialized left = 0 and right = 3.", "Searching for pair summing to 6.", "Candidate range is [0...3].")
          .build()
      );

      // Iteration 1: sum = 1 + 8 = 9 > 6
      // Buggy code has: else left++ (when sum > target!)
      steps.push(
        step().line(6).fn("twoSumBuggy")
          .event({ type: "COMPARE", left: 9, right: target, operator: "===", result: false, line: 6 })
          .callStack([sf()]).variables({ left, right, sum: 9, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain("Iteration 1: sum = 1 + 8 = 9 > 6. Buggy branch executes 'left++' instead of 'right--'!")
          .structured("Computed sum = 1 + 8 = 9 > 6.", "Buggy condition branch triggered.", "Incorrect pointer will be moved.")
          .build()
      );

      left = 1;
      steps.push(
        step().line(9).fn("twoSumBuggy")
          .event({ type: "POINTER_MOVE", pointer: "left", from: 0, to: 1, line: 9 })
          .callStack([sf()]).variables({ left, right, target })
          .viz(buildArrayState(arr, left, right, null, null))
          .explain("BUG: Sum 9 was already too large, but buggy code moved left++ to index 1, making sum 2 + 8 = 10 (even larger)!")
          .structured("Moved left to 1 when sum was already greater than target.", "Direction error causes sum to drift further away from target.", "Candidates missed.")
          .build()
      );

      // Iteration 2: sum = 2 + 8 = 10 > 6 -> left++ to 2
      steps.push(
        step().line(6).fn("twoSumBuggy")
          .event({ type: "COMPARE", left: 10, right: target, operator: "===", result: false, line: 6 })
          .callStack([sf()]).variables({ left: 1, right: 3, sum: 10, target })
          .viz(buildArrayState(arr, 1, 3, null, null))
          .explain("Iteration 2: sum = 2 + 8 = 10 > 6. Buggy code moves left++ again to index 2!")
          .structured("Sum = 10 > target.", "Buggy code increments left again.", "Approaching pointers crossing.")
          .build()
      );

      left = 2;
      // Iteration 3: sum = 4 + 8 = 12 > 6 -> left++ to 3 -> pointers cross!
      steps.push(
        step().line(13).fn("twoSumBuggy")
          .event({ type: "NOT_FOUND", target, line: 13 })
          .callStack([sf()]).variables({ left: 3, right: 3, target })
          .viz(buildArrayState(arr, -1, -1, null, null))
          .explain("Pointers crossed! Buggy algorithm returns [-1, -1] and failed to find pair [1, 2] (2 + 4 = 6)!")
          .structured("Pointers crossed without inspecting candidate pairs.", "Inverted logic prevented pointers from exploring [1, 2].", "Returned [-1, -1] (failure).")
          .returns([-1, -1])
          .build()
      );

      return steps;
    },
  },

  // 4. Two Pointers: Missing Distinct Termination (allowing left === right)
  {
    id: "tp-missing-termination",
    title: "Two Pointers: Missing Termination (left <= right pairs same element)",
    algorithmName: "Two Pointers",
    bugCategory: "Termination Condition",
    description: "Using 'while (left <= right)' instead of 'while (left < right)'. When left === right, it pairs a single element with itself, violating problem constraints.",
    knownInput: JSON.stringify({ array: [1, 3, 5], target: 6 }),
    expectedBehavior: "Return [0, 2] (arr[0] + arr[2] = 1 + 5 = 6) or [-1, -1] if no two DISTINCT elements exist.",
    actualBuggyBehavior: "If array has no pair for 6, e.g. [2, 3, 9], target 6 pairs arr[1] + arr[1] = 3 + 3 = 6 returning [1, 1]!",
    rootCause: "Problem specifies finding two DISTINCT elements at different indices. 'left <= right' allows left === right, resulting in adding an element to itself.",
    fixExplanation: "Condition must be 'while (left < right)' so pointers can never point to the same index.",
    buggyCode: `function twoSumSameElementBuggy(arr: number[], target: number): [number, number] {
  let left = 0, right = arr.length - 1;

  // BUG: '<=' allows left === right!
  while (left <= right) { 
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right]; // Can return [1, 1]!
    else if (sum < target) left++;
    else right--;
  }
  return [-1, -1];
}`,
    fixedCode: `function twoSumFixed(arr: number[], target: number): [number, number] {
  let left = 0, right = arr.length - 1;

  // FIX: Strict '<' guarantees distinct indices!
  while (left < right) { 
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    else if (sum < target) left++;
    else right--;
  }
  return [-1, -1];
}`,
    testCase: {
      input: { array: [2, 3, 9], target: 6 },
      expected: [-1, -1],
      actualBuggy: [1, 1],
    },
    executeBuggy: (raw: string) => {
      resetStepCounter();
      const { array: arr, target } = JSON.parse(raw);
      const steps: ExecutionStep[] = [];
      let left = 0;
      let right = arr.length - 1;

      const sf = () => frame("tp-term-1", "twoSumSameElementBuggy", { arr, target }, { left, right }, 2);

      steps.push(
        step().line(2).fn("twoSumSameElementBuggy")
          .event({ type: "UPDATE", variable: "left/right", oldValue: undefined, newValue: [0, 2], line: 2 })
          .callStack([sf()]).variables({ left: 0, right: 2, target })
          .viz(buildArrayState(arr, 0, 2, null, null))
          .explain("Initialize: left = 0 (2), right = 2 (9). Target is 6.")
          .structured("Initialized left = 0 and right = 2.", "Target sum is 6.", "Candidate array: [2, 3, 9].")
          .build()
      );

      // 2 + 9 = 11 > 6 -> right-- to 1
      steps.push(
        step().line(6).fn("twoSumSameElementBuggy")
          .event({ type: "POINTER_MOVE", pointer: "right", from: 2, to: 1, line: 6 })
          .callStack([sf()]).variables({ left: 0, right: 1, sum: 11, target })
          .viz(buildArrayState(arr, 0, 1, null, null))
          .explain("sum = 2 + 9 = 11 > 6. Move right-- to 1.")
          .structured("Sum 11 > 6.", "Moved right to 1.", "New window [0, 1].")
          .build()
      );

      // 2 + 3 = 5 < 6 -> left++ to 1
      left = 1;
      right = 1;
      steps.push(
        step().line(8).fn("twoSumSameElementBuggy")
          .event({ type: "POINTER_MOVE", pointer: "left", from: 0, to: 1, line: 8 })
          .callStack([sf()]).variables({ left: 1, right: 1, sum: 5, target })
          .viz(buildArrayState(arr, 1, 1, null, null))
          .explain("sum = 2 + 3 = 5 < 6. Move left++ to 1. Both pointers now at index 1!")
          .structured("Sum 5 < 6.", "Moved left to 1.", "Both pointers are at index 1.")
          .build()
      );

      // BUG: left === 1 and right === 1 evaluates left <= right (TRUE!)
      // arr[1] + arr[1] = 3 + 3 = 6!
      steps.push(
        step().line(7).fn("twoSumSameElementBuggy")
          .event({ type: "FOUND", target: [1, 1], line: 7 })
          .callStack([sf()]).variables({ left: 1, right: 1, sum: 6, target })
          .viz(buildArrayState(arr, 1, 1, null, 1))
          .explain("CRITICAL BUG: 'while (left <= right)' allowed left === 1 and right === 1! Returned [1, 1] by adding arr[1] (3) to itself!")
          .structured(
            "BUG TRIGGERED: Returned [1, 1]!",
            "Element at index 1 (3) was paired with itself (3 + 3 = 6).",
            "Violates the constraint that the two numbers must be at distinct indices."
          )
          .returns([1, 1])
          .build()
      );

      return steps;
    },
  },
];

export function getBugExample(id: string): BugExample | undefined {
  return BUG_CATALOG.find((b) => b.id === id);
}

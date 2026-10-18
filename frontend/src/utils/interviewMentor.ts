import type { ExecutionStep, ExecutionEvent, VisualizableAlgorithm } from "@/engine/executionTypes";

export interface InterviewInsight {
  strategicGoal: string;
  invariant: string;
  gotcha: string;
  candidateScript: string;
  complexityContext: string;
}

/**
 * Generates structured interview coaching insights for each algorithmic execution step.
 * Implements robust error handling and fallbacks for custom or edge-case steps.
 */
export function getInterviewInsight(
  step: ExecutionStep | null | undefined,
  algorithm: VisualizableAlgorithm | null | undefined,
  stepIndex: number,
  totalSteps: number
): InterviewInsight {
  if (!step) {
    return {
      strategicGoal: "Initialize execution state and validate input parameters.",
      invariant: "Memory allocated; pointers and bounds established.",
      gotcha: "Candidates often skip verifying null or empty input at the very start.",
      candidateScript: "First, I validate the input boundaries and establish my initial pointers.",
      complexityContext: "Initial setup: O(1) space allocation."
    };
  }

  const event: ExecutionEvent = step.event;
  const algoId = algorithm?.id?.toLowerCase() || "";
  const progressPercent = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;

  // Algorithm-specific specialized insights
  if (algoId.includes("mergesort") || algoId.includes("merge-sort")) {
    return getMergeSortInsight(event, step, progressPercent);
  }

  if (algoId.includes("quicksort") || algoId.includes("quick-sort")) {
    return getQuickSortInsight(event, step, progressPercent);
  }

  if (algoId.includes("binarysearch") || algoId.includes("binary-search")) {
    return getBinarySearchInsight(event, step);
  }

  if (algoId.includes("twosum") || algoId.includes("two-sum")) {
    return getTwoSumInsight(event, step);
  }

  if (algoId.includes("fibonacci")) {
    return getFibonacciInsight(event, step);
  }

  if (algoId.includes("reverse-linked-list")) {
    return getReverseLinkedListInsight(event, step);
  }

  if (algoId.includes("detect-cycle") || algoId.includes("cycle")) {
    return getDetectCycleInsight(event, step);
  }

  // General heuristics based on ExecutionEvent type
  return getGeneralEventInsight(event, step, progressPercent);
}

function getBinarySearchInsight(event: ExecutionEvent, step: ExecutionStep): InterviewInsight {
  const vars = step.localVariables || {};
  const low = vars.low !== undefined ? String(vars.low) : "low";
  const high = vars.high !== undefined ? String(vars.high) : "high";
  const mid = vars.mid !== undefined ? String(vars.mid) : "mid";

  if (event.type === "COMPARE") {
    return {
      strategicGoal: "Compare middle element against target to eliminate half of the search space.",
      invariant: "If target exists in array, it is guaranteed to lie within index range [low, high].",
      gotcha: "Never calculate mid as (low + high) / 2 in production/Java/C++ due to 32-bit signed integer overflow. Always use low + Math.floor((high - low) / 2).",
      candidateScript: `Comparing array[${mid}] with target. Based on the comparison, I will prune either the left or right half in O(1) time.`,
      complexityContext: "Halving search space: O(log N) total time complexity."
    };
  }

  if (event.type === "POINTER_MOVE") {
    return {
      strategicGoal: "Shrink search window by advancing pointer beyond mid.",
      invariant: "Elements outside [low, high] are strictly eliminated from consideration.",
      gotcha: "Setting high = mid or low = mid causes an infinite loop when high - low === 1. Always set mid - 1 or mid + 1.",
      candidateScript: `Target is not at mid, so I safely update pointer to ${event.to}. The search space is now halved.`,
      complexityContext: "Remaining elements to search: ~N / 2^k."
    };
  }

  if (event.type === "FOUND") {
    return {
      strategicGoal: "Target element located successfully.",
      invariant: "Target match confirmed at exact index without examining remaining items.",
      gotcha: "Clarify with the interviewer if the array can contain duplicates and whether first or last occurrence is required.",
      candidateScript: `Found target value at index ${step.event.type === 'FOUND' ? (step.event.index ?? mid) : mid}. Returning this index.`,
      complexityContext: "Terminated in O(log N) comparisons."
    };
  }

  return {
    strategicGoal: "Updating search boundary pointers [low, high].",
    invariant: `Current active search segment: [${low}, ${high}].`,
    gotcha: "Loop condition must be low <= high, NOT low < high, otherwise single-element searches fail.",
    candidateScript: `Loop continues as long as low (${low}) <= high (${high}).`,
    complexityContext: "Binary Search guarantees O(1) auxiliary space."
  };
}

function getTwoSumInsight(event: ExecutionEvent, step: ExecutionStep): InterviewInsight {
  if (event.type === "COMPARE") {
    return {
      strategicGoal: "Check if the current sum matches the target value.",
      invariant: "All pairs (i, j) where i < left or j > right have already been evaluated and ruled out.",
      gotcha: "If array is unsorted, two-pointers requires O(N log N) sorting. Mention to interviewer that a Hash Map achieves O(N) time with O(N) space.",
      candidateScript: "Computing sum of current left and right pointers to decide if we need a larger or smaller sum.",
      complexityContext: "Evaluating two-sum condition in O(1) time per step."
    };
  }

  if (event.type === "POINTER_MOVE") {
    return {
      strategicGoal: "Monotonically adjust pointer to increase or decrease candidate sum.",
      invariant: "Because the array is sorted, incrementing left strictly increases sum; decrementing right strictly decreases sum.",
      gotcha: "Never move both pointers at once without checking equality first.",
      candidateScript: `Sum was not equal to target, so I move ${event.pointer} pointer to seek a closer sum.`,
      complexityContext: "Each pointer moves at most N times: total O(N) time."
    };
  }

  return {
    strategicGoal: "Two-pointer linear scan iteration.",
    invariant: "Left pointer moves rightwards, right pointer moves leftwards. They never cross unnecessarily.",
    gotcha: "Watch out for integer overflow if numbers can be close to Number.MAX_SAFE_INTEGER.",
    candidateScript: "Maintaining two pointers converging inwards until target sum is found or pointers meet.",
    complexityContext: "Optimal O(1) auxiliary space."
  };
}

function getMergeSortInsight(event: ExecutionEvent, step: ExecutionStep, progress: number): InterviewInsight {
  if (step.depth !== undefined && step.depth > 0) {
    return {
      strategicGoal: "Divide and Conquer: Split array into independent halves.",
      invariant: "Sub-arrays are partitioned down until the base case (length <= 1) is reached, which is trivially sorted.",
      gotcha: "Candidates often forget the base case (arr.length <= 1) leading to Maximum Call Stack Size Exceeded.",
      candidateScript: `Recursively splitting subarray at depth ${step.depth}. Dividing problem size by 2 at each level.`,
      complexityContext: `Recursion depth: ${step.depth} (bounded by O(log N)).`
    };
  }

  if (event.type === "RETURN") {
    return {
      strategicGoal: "Merge step: Combine two sorted subarrays into a single sorted array.",
      invariant: "Merged result is strictly sorted in ascending order.",
      gotcha: "Merge sort is stable, but only if you use <= instead of < when comparing left and right elements during merge.",
      candidateScript: "Both subarrays are now sorted; merging them in linear O(N) time using two pointers.",
      complexityContext: "Merge step takes O(N) time and requires O(N) auxiliary space."
    };
  }

  return {
    strategicGoal: `Merge Sort execution in progress (${progress}% completed).`,
    invariant: "Tree of recursive calls preserves divide-and-conquer recurrence: T(N) = 2T(N/2) + O(N).",
    gotcha: "Remember to explain why Merge Sort is preferred over QuickSort for linked lists (no random access needed) and external storage.",
    candidateScript: "At this step, divide-and-conquer guarantees strict O(N log N) worst-case time complexity.",
    complexityContext: "Guaranteed O(N log N) time; O(N) auxiliary space."
  };
}

function getQuickSortInsight(event: ExecutionEvent, step: ExecutionStep, progress: number): InterviewInsight {
  if (event.type === "COMPARE") {
    return {
      strategicGoal: "Compare element against pivot value to determine partition side.",
      invariant: "Elements before partition index will all be <= pivot; elements after will be > pivot.",
      gotcha: "Choosing a naive pivot (e.g. always first or last element) degrades QuickSort to O(N^2) on already sorted arrays. Mention median-of-three or random pivot to interviewer!",
      candidateScript: "Comparing element with the pivot to decide if it belongs in the smaller-than or greater-than partition.",
      complexityContext: "Average case: O(N log N), Worst case: O(N^2)."
    };
  }

  if (event.type === "SWAP") {
    return {
      strategicGoal: "Swap element into its proper partition boundary.",
      invariant: "Maintains partition boundary pointer so all smaller elements stay to the left.",
      gotcha: "Be careful whether using Lomuto partition (easier to code) vs Hoare partition (fewer swaps, faster in practice).",
      candidateScript: "Swapping out-of-order element to the left partition window.",
      complexityContext: "In-place partition: O(1) auxiliary space per step."
    };
  }

  return {
    strategicGoal: `Partitioning / recursive sorting in progress (${progress}%).`,
    invariant: "Once partitioned, pivot element is locked into its permanent, final sorted index.",
    gotcha: "Candidates often forget that QuickSort recursion uses O(log N) stack space, so it's not strictly O(1) total memory.",
    candidateScript: "The pivot is placed in its final position, and we recursively partition the left and right sub-arrays.",
    complexityContext: "Average stack space: O(log N)."
  };
}

function getFibonacciInsight(event: ExecutionEvent, step: ExecutionStep): InterviewInsight {
  if (step.isRecursiveCall) {
    return {
      strategicGoal: "Spawn recursive call tree branch to evaluate sub-problems.",
      invariant: "F(n) = F(n-1) + F(n-2) for n >= 2.",
      gotcha: "Naive recursion computes the exact same sub-problems repeatedly, causing O(2^N) exponential time. Highlight memoization / DP to the interviewer immediately!",
      candidateScript: `Calling fib(${step.localVariables?.n ?? "n"}) recursively. Notice how this branches out the call tree.`,
      complexityContext: "Naive recursion: O(2^N) calls; with memoization: O(N)."
    };
  }

  if (event.type === "RETURN") {
    return {
      strategicGoal: "Return calculated value from current activation frame back to caller.",
      invariant: "Base cases (n <= 1) return n directly without additional recursion.",
      gotcha: "Check whether the problem defines Fibonacci starting with 0, 1, 1... or 1, 1, 2...",
      candidateScript: `Frame resolves and returns ${step.returnValue ?? "value"} up the call stack.`,
      complexityContext: "Stack unwinds by one frame; O(N) maximum call stack depth."
    };
  }

  return {
    strategicGoal: "Evaluating Fibonacci recurrence relation.",
    invariant: "State transitions directly follow the mathematical induction definition.",
    gotcha: "Mention that Matrix Exponentiation or Binet's formula can compute Fibonacci in O(log N) or O(1) time.",
    candidateScript: "We sum the results of the two child sub-problems to compute the current frame.",
    complexityContext: "Maximum stack space: O(N)."
  };
}

function getGeneralEventInsight(
  event: ExecutionEvent,
  step: ExecutionStep,
  progress: number
): InterviewInsight {
  switch (event.type) {
    case "COMPARE":
      return {
        strategicGoal: "Evaluate decision condition to control execution branch.",
        invariant: "State remains immutable during read-only comparison.",
        gotcha: "Check for edge cases such as strict inequality (<) vs non-strict (<=), especially with duplicates.",
        candidateScript: "Evaluating this condition to determine the next state transition.",
        complexityContext: "O(1) comparison operation."
      };
    case "SWAP":
      return {
        strategicGoal: "Exchange positions of two elements to restore order.",
        invariant: "Multiset of array elements is preserved; no elements are lost or duplicated.",
        gotcha: "In JavaScript/Python, use destructuring [a, b] = [b, a] cleanly, but mention a temp variable is O(1) space.",
        candidateScript: "Performing an in-place swap to advance the sorted partition.",
        complexityContext: "O(1) in-place memory mutation."
      };
    case "POINTER_MOVE":
      return {
        strategicGoal: `Advance ${event.pointer} pointer from index ${event.from} to ${event.to}.`,
        invariant: "Pointer bounds remain within safe array limits [0, array.length - 1].",
        gotcha: "Always verify boundary guards to prevent IndexOutOfBounds / undefined dereferencing.",
        candidateScript: `Advancing pointer ${event.pointer} to explore the next candidate element.`,
        complexityContext: "O(1) pointer adjustment."
      };
    case "CALL":
      return {
        strategicGoal: `Push new activation frame for ${event.functionName} onto call stack.`,
        invariant: "Caller frame variables are safely suspended on call stack.",
        gotcha: "Every recursive call consumes call stack memory. State this clearly to the interviewer.",
        candidateScript: `Invoking ${event.functionName} with arguments to process the sub-problem.`,
        complexityContext: "Increases call stack depth by 1."
      };
    case "RETURN":
      return {
        strategicGoal: `Pop frame from call stack and return result: ${String(event.value)}.`,
        invariant: "Sub-problem computation is finalized and returned to the caller.",
        gotcha: "Ensure all execution paths return a valid value, not undefined.",
        candidateScript: `Sub-problem resolved; returning value ${String(event.value)} to the parent caller.`,
        complexityContext: "Reclaims activation frame memory."
      };
    case "VISIT":
      return {
        strategicGoal: `Visit node / cell ${event.target}.`,
        invariant: "Node marked as visited to avoid cycles and infinite loops.",
        gotcha: "Forgetting to mark visited in graphs causes cyclic infinite recursion.",
        candidateScript: `Marking node ${event.target} as visited and exploring its adjacent neighbors.`,
        complexityContext: "O(1) node inspection."
      };
      default:
        return {
          strategicGoal: `Algorithm step execution in progress (${progress}%).`,
          invariant: "Internal variables and visual state remain consistent with invariant rules.",
          gotcha: "Maintain clean code modularity and explain variable names clearly during live interviews.",
          candidateScript: step.explanation || "Executing next instruction according to algorithm specification.",
          complexityContext: "Step executed in O(1) operational time."
        };
    }
  }

function getReverseLinkedListInsight(event: ExecutionEvent, step: ExecutionStep): InterviewInsight {
  if (event.type === "UPDATE") {
    return {
      strategicGoal: "Rewire current node's next pointer backwards to point to prev.",
      invariant: "All nodes prior to curr are already reversed and form a valid backwards list.",
      gotcha: "Crucial trap: If you don't save curr.next into a temporary variable BEFORE overwriting curr.next = prev, you lose access to the remainder of the linked list permanently!",
      candidateScript: "I rewire the current node's next pointer backwards to point to prev. Notice how the arrow flips direction.",
      complexityContext: "O(1) pointer mutation."
    };
  }

  if (event.type === "RETURN") {
    return {
      strategicGoal: "Return prev as the new head of the completely reversed list.",
      invariant: "curr has reached null; prev points to the old tail, which is now the new head.",
      gotcha: "Never return curr or head! By the time the loop ends, curr is null and head is the new tail.",
      candidateScript: "The traversal has completed (curr is null). I return prev, which now points to the new head of the reversed list.",
      complexityContext: "Total O(N) time, O(1) auxiliary memory."
    };
  }

  return {
    strategicGoal: "Advance pointers down the list: prev = curr, curr = next.",
    invariant: "prev, curr, and next march forward in tandem without breaking chain integrity.",
    gotcha: "Candidates often confuse the advancement order: prev must be updated before curr!",
    candidateScript: "Now I advance prev and curr forward by one node to prepare for the next link reversal.",
    complexityContext: "O(1) pointer transition."
  };
}

function getDetectCycleInsight(event: ExecutionEvent, step: ExecutionStep): InterviewInsight {
  if (event.type === "COMPARE" && event.result === true) {
    return {
      strategicGoal: "Slow and fast pointers collided: cycle mathematically verified!",
      invariant: "If a loop exists, the relative distance between fast and slow decreases by 1 in every iteration until they meet.",
      gotcha: "Fast pointer cannot jump over slow because relative speed difference is exactly 1 (2 - 1 = 1 node per step).",
      candidateScript: "The fast and slow pointers have collided at the exact same memory address. This proves a cycle exists in O(N) time with O(1) space.",
      complexityContext: "Cycle detected: O(N) time, O(1) space."
    };
  }

  return {
    strategicGoal: "Floyd's Tortoise and Hare: advance slow by 1 step, fast by 2 steps.",
    invariant: "Distance between fast and slow modulo cycle length C decreases by 1 each round.",
    gotcha: "Always guard against null pointers with: fast !== null && fast.next !== null. Accessing fast.next.next when fast.next is null throws a NullPointerException!",
    candidateScript: "Advancing slow by 1 step and fast by 2 steps. If a cycle exists, fast will lap slow from behind.",
    complexityContext: "Bounded by at most N + C iterations."
  };
}

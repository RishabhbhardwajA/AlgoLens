import type { ExecutionStep } from "@/engine/executionTypes";

export interface ChallengeQuestion {
  id: string;
  type:
    | "swap_prediction"
    | "return_prediction"
    | "pointer_prediction"
    | "found_prediction"
    | "mid_prediction"
    | "branch_prediction"
    | "termination_prediction";
  question: string;
  contextHint: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xp: number;
}

/**
 * Evaluates whether a challenge question can be generated for the upcoming step.
 * Predictions are based directly on the actual execution events and variables.
 */
export function generateChallenge(
  steps: ExecutionStep[],
  currentIndex: number
): ChallengeQuestion | null {
  if (!steps || currentIndex < 0 || currentIndex >= steps.length - 1) {
    return null;
  }

  const current = steps[currentIndex];
  const next = steps[currentIndex + 1];

  if (!current || !next) return null;

  // 1. Binary Search: "What will mid become?"
  if (
    next.event.type === "UPDATE" &&
    next.event.variable === "mid" &&
    typeof next.event.newValue === "number"
  ) {
    const correctMid = next.event.newValue;
    const left = current.localVariables?.left ?? 0;
    const right = current.localVariables?.right ?? 0;

    const opts = [
      correctMid,
      correctMid + 1,
      Math.max(0, correctMid - 1),
      Math.floor((Number(left) + Number(right)) / 2) + 2,
    ];
    const uniqueOpts = Array.from(new Set(opts)).sort((a, b) => a - b);
    while (uniqueOpts.length < 4) {
      uniqueOpts.push(uniqueOpts[uniqueOpts.length - 1] + 1);
    }
    const correctIdx = uniqueOpts.indexOf(correctMid);

    return {
      id: `challenge-mid-${currentIndex}`,
      type: "mid_prediction",
      question: `Pointers are at left = ${left} and right = ${right}. What will index 'mid' become?`,
      contextHint: "Calculate mid = Math.floor((left + right) / 2).",
      options: uniqueOpts.map((v) => `mid = ${v}`),
      correctIndex: correctIdx !== -1 ? correctIdx : 0,
      explanation: `Correct! Math.floor((${left} + ${right}) / 2) = ${correctMid}. The search window is partitioned at index ${correctMid}.`,
      xp: 100,
    };
  }

  // 2. Binary Search: "Which branch will execute next?"
  if (
    current.event.type === "UPDATE" &&
    current.event.variable === "mid" &&
    (next.event.type === "POINTER_MOVE" || next.event.type === "FOUND")
  ) {
    const midVal = current.localVariables?.mid;
    let correctIdx = 0;
    let exp = "";

    if (next.event.type === "FOUND") {
      correctIdx = 0;
      exp = `arr[${midVal}] equals the target, so the search terminates immediately with the found index.`;
    } else if (next.event.pointer === "left") {
      correctIdx = 1;
      exp = `arr[${midVal}] is less than target, so all elements in the left half are eliminated and left pointer moves right (left = mid + 1).`;
    } else {
      correctIdx = 2;
      exp = `arr[${midVal}] is greater than target, so all elements in the right half are eliminated and right pointer moves left (right = mid - 1).`;
    }

    return {
      id: `challenge-branch-${currentIndex}`,
      type: "branch_prediction",
      question: `Midpoint element arr[${midVal}] is evaluated against target. Which branch will execute?`,
      contextHint: "Compare arr[mid] with target to determine which half is discarded.",
      options: [
        "Found target (arr[mid] === target)",
        "Search right half (left = mid + 1)",
        "Search left half (right = mid - 1)",
      ],
      correctIndex: correctIdx,
      explanation: `Correct! ${exp}`,
      xp: 120,
    };
  }

  // 3. Two Pointers / Linear Scan: Pointer direction prediction on COMPARE
  if (
    current.event.type === "COMPARE" &&
    next.event.type === "POINTER_MOVE"
  ) {
    const pointer = next.event.pointer;
    const isLeft = pointer === "left";
    const sum = current.localVariables?.sum;
    const target = current.localVariables?.target;

    return {
      id: `challenge-pointer-dir-${currentIndex}`,
      type: "pointer_prediction",
      question:
        sum !== undefined && target !== undefined
          ? `Current sum (${sum}) ${Number(sum) < Number(target) ? "<" : ">"} target (${target}). Which pointer must move?`
          : `Decision evaluation complete. Which pointer will advance next?`,
      contextHint:
        sum !== undefined && target !== undefined
          ? Number(sum) < Number(target)
            ? "To increase the sum in a sorted array, advance the left pointer forward."
            : "To decrease the sum in a sorted array, move the right pointer backward."
          : "Consider which side narrows the candidate window.",
      options: isLeft
        ? [
            "Advance LEFT pointer forward (left++)",
            "Move RIGHT pointer backward (right--)",
            "Both pointers simultaneously",
          ]
        : [
            "Move RIGHT pointer backward (right--)",
            "Advance LEFT pointer forward (left++)",
            "Both pointers simultaneously",
          ],
      correctIndex: 0,
      explanation: `Correct! The ${pointer.toUpperCase()} pointer moves to ${next.event.to} to adjust the candidate value toward the target.`,
      xp: 100,
    };
  }

  // 4. Swap prediction on Sorting COMPARE
  if (current.event.type === "COMPARE" && (next.event.type === "SWAP" || next.event.type === "COMPARE" || next.event.type === "POINTER_MOVE")) {
    const leftVal = String(current.event.left ?? "");
    const rightVal = String(current.event.right ?? "");
    const willSwap = next.event.type === "SWAP";

    return {
      id: `challenge-swap-${currentIndex}`,
      type: "swap_prediction",
      question: `Comparing [${leftVal}] and [${rightVal}]. Will these two elements be swapped?`,
      contextHint: "Evaluate whether the elements violate the sorting order.",
      options: ["Yes, swap them", "No, keep current order"],
      correctIndex: willSwap ? 0 : 1,
      explanation: willSwap
        ? `Correct! ${leftVal} and ${rightVal} are out of order, so a swap is executed.`
        : `Correct! ${leftVal} and ${rightVal} are already in sorted order, so no swap is needed.`,
      xp: 100,
    };
  }

  // 5. Loop Termination prediction
  if (next.event.type === "NOT_FOUND") {
    return {
      id: `challenge-term-${currentIndex}`,
      type: "termination_prediction",
      question: "Pointers have crossed/exhausted the search boundary. Will the loop continue or terminate?",
      contextHint: "The loop condition is no longer satisfied.",
      options: [
        "Terminate loop (target not found, return -1)",
        "Continue search with remaining elements",
      ],
      correctIndex: 0,
      explanation: "Correct! The candidate search interval is empty, so execution terminates safely.",
      xp: 90,
    };
  }

  // 6. Target Found prediction
  if (next.event.type === "FOUND") {
    return {
      id: `challenge-found-${currentIndex}`,
      type: "found_prediction",
      question: "Is the target element located at the current search position?",
      contextHint: "Check if the inspected element matches the query key.",
      options: ["Yes, target element found!", "No, continue searching"],
      correctIndex: 0,
      explanation: "Correct! The element matches the target query and the algorithm returns the result.",
      xp: 120,
    };
  }

  // 7. Recursive RETURN value prediction
  if (next.event.type === "RETURN" && next.returnValue !== undefined) {
    const actualReturn = next.returnValue;
    if (typeof actualReturn === "number") {
      const correctVal = actualReturn;
      const opts = [
        correctVal,
        correctVal + 1,
        Math.max(0, correctVal - 1),
        correctVal * 2 === correctVal ? correctVal + 2 : correctVal * 2,
      ];
      const uniqueOpts = Array.from(new Set(opts)).sort((a, b) => a - b);
      while (uniqueOpts.length < 4) {
        uniqueOpts.push(uniqueOpts.length * 3 + 1);
      }
      const correctIdx = uniqueOpts.indexOf(correctVal);

      return {
        id: `challenge-return-${currentIndex}`,
        type: "return_prediction",
        question: `Function ${next.functionName || "call"} frame is resolving. What value will it return?`,
        contextHint: "Calculate the resolved subproblem from the call stack.",
        options: uniqueOpts.map((v) => String(v)),
        correctIndex: correctIdx !== -1 ? correctIdx : 0,
        explanation: `Correct! The computed return value for this activation frame is ${correctVal}.`,
        xp: 150,
      };
    }
  }

  // 8. General pointer move fallback
  if (next.event.type === "POINTER_MOVE") {
    const pointerName = next.event.pointer;
    return {
      id: `challenge-pointer-${currentIndex}`,
      type: "pointer_prediction",
      question: "Which pointer will advance on the next step?",
      contextHint: "Consider which side of the search window or array boundary should adjust.",
      options: [
        `${pointerName.toUpperCase()} pointer`,
        "Opposite pointer",
        "Both pointers simultaneously",
      ],
      correctIndex: 0,
      explanation: `Correct! The ${pointerName} pointer moves to narrow the window.`,
      xp: 75,
    };
  }

  return null;
}

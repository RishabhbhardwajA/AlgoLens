import assert from "node:assert/strict";
import { binarySearch } from "../src/algorithms/arrays/binarySearch";
import { twoSumII } from "../src/algorithms/twoPointer/twoSumII";
import { climbingStairs } from "../src/algorithms/dp/climbingStairs";

console.log("\n=== STARTING ALGORITHM EXECUTION SUITE (BS, TWO POINTERS, DP) ===");

// -------------------------------------------------------------
// BINARY SEARCH TEST SUITE
// -------------------------------------------------------------
console.log("\n[Test Suite 1] Testing Binary Search Comprehensive Input Scenarios...");

// Case 1A: Found target in middle
{
  const steps = binarySearch.execute({ array: [1, 3, 5, 7, 9, 11, 13], target: 7 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND", "Target 7 must be found");
  assert.equal(finalStep.returnValue, 3, "Target 7 must be at index 3");
  console.log("  ✓ Case 1A: Target found in middle of odd array (index 3)");
}

// Case 1B: Boundary: First element (index 0)
{
  const steps = binarySearch.execute({ array: [2, 4, 6, 8, 10], target: 2 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.equal(finalStep.returnValue, 0, "First element must return index 0");
  console.log("  ✓ Case 1B: First element boundary found (index 0)");
}

// Case 1C: Boundary: Last element (index length - 1)
{
  const steps = binarySearch.execute({ array: [2, 4, 6, 8, 10], target: 10 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.equal(finalStep.returnValue, 4, "Last element must return index 4");
  console.log("  ✓ Case 1C: Last element boundary found (index 4)");
}

// Case 1D: Missing element: smaller than array min
{
  const steps = binarySearch.execute({ array: [5, 10, 15, 20], target: 1 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "NOT_FOUND");
  assert.equal(finalStep.returnValue, -1, "Missing element must return -1");
  console.log("  ✓ Case 1D: Element smaller than min returns -1");
}

// Case 1E: Missing element: larger than array max
{
  const steps = binarySearch.execute({ array: [5, 10, 15, 20], target: 50 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "NOT_FOUND");
  assert.equal(finalStep.returnValue, -1, "Missing element must return -1");
  console.log("  ✓ Case 1E: Element larger than max returns -1");
}

// Case 1F: Missing element: in between existing values
{
  const steps = binarySearch.execute({ array: [10, 20, 30, 40], target: 25 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "NOT_FOUND");
  assert.equal(finalStep.returnValue, -1, "Missing interior element must return -1");
  console.log("  ✓ Case 1F: Missing interior element returns -1");
}

// Case 1G: Single-element array: target matches
{
  const steps = binarySearch.execute({ array: [42], target: 42 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.equal(finalStep.returnValue, 0, "Single element match returns index 0");
  console.log("  ✓ Case 1G: Single-element array matching target returns 0");
}

// Case 1H: Single-element array: target missing
{
  const steps = binarySearch.execute({ array: [42], target: 99 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "NOT_FOUND");
  assert.equal(finalStep.returnValue, -1, "Single element missing returns -1");
  console.log("  ✓ Case 1H: Single-element array missing target returns -1");
}

// -------------------------------------------------------------
// TWO POINTERS (TWO SUM II) TEST SUITE
// -------------------------------------------------------------
console.log("\n[Test Suite 2] Testing Two Pointers (Two Sum II) Scenarios...");

// Case 2A: Standard pair found
{
  const steps = twoSumII.execute({ array: [2, 7, 11, 15], target: 9 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.deepEqual(finalStep.returnValue, [0, 1], "Pair for target 9 should be [0, 1]");
  console.log("  ✓ Case 2A: Standard pair located at [0, 1]");
}

// Case 2B: Outermost boundary pair (index 0 and index n-1)
{
  const steps = twoSumII.execute({ array: [1, 4, 6, 8, 12], target: 13 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.deepEqual(finalStep.returnValue, [0, 4], "Boundary pair should be [0, 4]");
  console.log("  ✓ Case 2B: Outermost boundary pair located at [0, 4]");
}

// Case 2C: Repeated values
{
  const steps = twoSumII.execute({ array: [3, 3, 5, 8], target: 6 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "FOUND");
  assert.deepEqual(finalStep.returnValue, [0, 1], "Duplicate elements pair at [0, 1]");
  console.log("  ✓ Case 2C: Repeated elements pair correctly at [0, 1]");
}

// Case 2D: No valid pair exists
{
  const steps = twoSumII.execute({ array: [1, 2, 3, 9], target: 8 });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "NOT_FOUND");
  assert.deepEqual(finalStep.returnValue, [-1, -1], "Missing pair returns [-1, -1]");
  console.log("  ✓ Case 2D: Non-existent sum returns [-1, -1] without error");
}

// -------------------------------------------------------------
// DYNAMIC PROGRAMMING (CLIMBING STAIRS) TEST SUITE
// -------------------------------------------------------------
console.log("\n[Test Suite 3] Testing Dynamic Programming (Climbing Stairs)...");

// Expected mathematical sequence: ways(1)=1, ways(2)=2, ways(3)=3, ways(4)=5, ways(5)=8, ways(6)=13
const expectedWays: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8,
  6: 13,
};

for (const [nStr, expected] of Object.entries(expectedWays)) {
  const n = parseInt(nStr, 10);
  const steps = climbingStairs.execute({ n });
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.event.type, "RETURN");
  assert.equal(finalStep.returnValue, expected, `ways(${n}) must equal ${expected}`);
  console.log(`  ✓ Case 3.${n}: climbStairs(${n}) = ${expected} ways`);
}

// Verify table elements progression in climbing stairs
const steps5 = climbingStairs.execute({ n: 5 });
const updateSteps = steps5.filter((s) => s.event.type === "UPDATE");
assert.ok(updateSteps.length >= 4, "Must update DP table entries for indices 0, 1, 2, 3, 4, 5");
console.log("  ✓ Tabulation fills 1D table bottom-up in O(n) linear steps.");

console.log("\n🎉 ALL ALGORITHM TESTS PASSED SUCCESSFULLY!");

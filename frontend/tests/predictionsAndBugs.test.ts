import assert from "node:assert/strict";
import { binarySearch } from "../src/algorithms/arrays/binarySearch";
import { twoSumII } from "../src/algorithms/twoPointer/twoSumII";
import { generateChallenge } from "../src/utils/challengeGenerator";
import { BUG_CATALOG, getBugExample } from "../src/features/debugging/bugCatalog";

console.log("\n=== STARTING PREDICTION MODE & BUG-FINDING EXAMPLES SUITE ===");

// -------------------------------------------------------------
// PREDICTION MODE UNIT TESTS
// -------------------------------------------------------------
console.log("\n[Test Suite 1] Testing Predict-The-Next-Step Engine...");

// 1A. Binary Search mid prediction
{
  const steps = binarySearch.execute({ array: [1, 3, 5, 7, 9, 11, 13], target: 7 });
  // Step 0: init (left=0, right=6), Step 1: UPDATE mid (mid=3)
  const challenge = generateChallenge(steps, 0);
  assert.ok(challenge, "Challenge should be generated before mid computation");
  assert.equal(challenge.type, "mid_prediction", "Challenge type must be mid_prediction");
  assert.ok(challenge.question.includes("mid"), "Question must ask about mid");
  assert.ok(challenge.options.length >= 2, "Must provide multiple choice options");
  assert.ok(challenge.options[challenge.correctIndex].includes("mid = 3"), "Correct option must be mid = 3");
  console.log("  ✓ 1A: Midpoint prediction correctly forecasts Math.floor((0 + 6) / 2) = 3");
}

// 1B. Binary Search branch prediction
{
  const steps = binarySearch.execute({ array: [1, 3, 5, 7, 9, 11, 13], target: 7 });
  // In steps, step 1 is compute mid (mid=3, val=7). Next step is FOUND!
  const challenge = generateChallenge(steps, 1);
  assert.ok(challenge, "Challenge should be generated before branch execution");
  assert.equal(challenge.type, "branch_prediction");
  assert.equal(challenge.correctIndex, 0, "When arr[mid] === target, correct branch is 'Found target'");
  console.log("  ✓ 1B: Branch prediction accurately identifies 'Found target' branch");
}

// 1C. Two Pointers direction prediction
{
  const steps = twoSumII.execute({ array: [1, 2, 4, 8], target: 10 });
  // Step 1: compute sum (1 + 8 = 9 < 10). Next is POINTER_MOVE left!
  const challenge = generateChallenge(steps, 1);
  assert.ok(challenge, "Challenge should be generated on sum comparison");
  assert.equal(challenge.type, "pointer_prediction");
  assert.ok(challenge.question.includes("Which pointer"), "Must ask which pointer moves");
  assert.ok(challenge.options[challenge.correctIndex].includes("LEFT"), "When sum < target, left pointer must move");
  console.log("  ✓ 1C: Two pointer direction prediction accurately guides learner to advance left pointer");
}

// 1D. Loop termination prediction
{
  const steps = binarySearch.execute({ array: [1, 3, 5], target: 99 });
  // Last step before not found
  const notFoundIdx = steps.findIndex((s) => s.event.type === "NOT_FOUND");
  assert.ok(notFoundIdx > 0, "Must have NOT_FOUND step");
  const challenge = generateChallenge(steps, notFoundIdx - 1);
  assert.ok(challenge, "Challenge generated before termination");
  assert.equal(challenge.type, "termination_prediction");
  assert.ok(challenge.options[challenge.correctIndex].includes("Terminate loop"), "Correct choice is terminate loop");
  console.log("  ✓ 1D: Loop termination prediction alerts learner when pointers cross");
}

// -------------------------------------------------------------
// BUG-FINDING EXAMPLES SUITE
// -------------------------------------------------------------
console.log("\n[Test Suite 2] Testing Bug-Finding Deliberate Mistakes Catalog...");

assert.equal(BUG_CATALOG.length, 4, "Bug catalog must contain 4 curated mistake examples");

// 2A: Binary Search Off-by-one boundary bug
{
  const bug = getBugExample("bs-off-by-one");
  assert.ok(bug, "bs-off-by-one must exist");
  const steps = bug.executeBuggy(bug.knownInput);
  const finalStep = steps[steps.length - 1];
  assert.equal(finalStep.returnValue, -1, "Buggy code must fail and return -1 on boundary element");
  assert.equal(finalStep.returnValue, bug.testCase.actualBuggy, "Must match documented buggy behavior");
  assert.notEqual(finalStep.returnValue, bug.testCase.expected, "Must differ from expected behavior");
  console.log("  ✓ 2A: 'bs-off-by-one' correctly demonstrates premature termination returning -1 instead of 2");
}

// 2B: Binary Search Infinite loop bug
{
  const bug = getBugExample("bs-infinite-loop");
  assert.ok(bug, "bs-infinite-loop must exist");
  const steps = bug.executeBuggy(bug.knownInput);
  const frozenStep = steps.find((s) => s.localVariables.state === "FROZEN");
  assert.ok(frozenStep, "Buggy code must detect pointer freeze / infinite cycle");
  console.log("  ✓ 2B: 'bs-infinite-loop' demonstrates pointer freeze when left = mid without +1");
}

// 2C: Two Pointers Inverted comparison bug
{
  const bug = getBugExample("tp-inverted-comparison");
  assert.ok(bug, "tp-inverted-comparison must exist");
  const steps = bug.executeBuggy(bug.knownInput);
  const finalStep = steps[steps.length - 1];
  assert.deepEqual(finalStep.returnValue, [-1, -1], "Inverted comparison must miss valid pair");
  assert.notDeepEqual(finalStep.returnValue, bug.testCase.expected, "Must miss the expected [1, 2] solution");
  console.log("  ✓ 2C: 'tp-inverted-comparison' demonstrates pointer moving wrong direction missing solution");
}

// 2D: Two Pointers Missing distinct termination bug
{
  const bug = getBugExample("tp-missing-termination");
  assert.ok(bug, "tp-missing-termination must exist");
  const steps = bug.executeBuggy(bug.knownInput);
  const finalStep = steps[steps.length - 1];
  assert.deepEqual(finalStep.returnValue, [1, 1], "Buggy code pairs single element with itself returning [1, 1]");
  assert.equal(bug.testCase.expected[0] !== bug.testCase.expected[1] || bug.testCase.expected[0] === -1, true);
  console.log("  ✓ 2D: 'tp-missing-termination' demonstrates left === right incorrectly pairing arr[1] with itself");
}

console.log("\n🎉 ALL PREDICTION & BUG-FINDING TESTS PASSED SUCCESSFULLY!");

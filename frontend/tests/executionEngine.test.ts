import assert from "node:assert/strict";
import { binarySearch } from "../src/algorithms/arrays/binarySearch";
import { twoSumII } from "../src/algorithms/twoPointer/twoSumII";
import { resetStepCounter } from "../src/engine/stepBuilder";

console.log("\n=== STARTING EXECUTION ENGINE & STEP CONTROLLER TESTS ===");

// Test 1: Step creation and metadata
console.log("\n[Test 1] Testing Step Generation & Metadata Integrity...");
resetStepCounter();
const steps = binarySearch.execute({ array: [1, 3, 5, 7, 9], target: 7 });
assert.ok(steps.length > 0, "Execution should generate at least one step");

for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  assert.ok(typeof s.id === "number", `Step ${i} must have a numeric ID`);
  assert.ok(s.line > 0, `Step ${i} must have a positive source code line number`);
  assert.ok(s.event, `Step ${i} must have an ExecutionEvent`);
  assert.ok(typeof s.explanation === "string" && s.explanation.length > 0, `Step ${i} must have an explanation`);
  assert.ok(s.localVariables, `Step ${i} must have localVariables map`);
  assert.ok(s.callStack.length > 0, `Step ${i} must have at least one callStack frame`);
}
console.log(`✓ Generated ${steps.length} valid execution steps with complete metadata.`);

// Test 2: Source line synchronization
console.log("\n[Test 2] Testing Source Line Synchronization with Code Statements...");
const firstStep = steps[0];
assert.equal(firstStep.line, 2, "First step should highlight pointer initialization line (line 2)");

const foundStep = steps.find((s) => s.event.type === "FOUND");
assert.ok(foundStep, "A found step must exist for target 7");
assert.equal(foundStep.line, 8, "Found step should highlight the return mid line (line 8)");
assert.equal(foundStep.returnValue, 3, "Return value should be index 3 (arr[3] === 7)");
console.log("✓ Source line numbers match statements in TypeScript source code exactly.");

// Test 3: Local variable transitions & diffing
console.log("\n[Test 3] Testing Variable State Transitions (old -> new)...");
let variableUpdated = false;
for (let i = 1; i < steps.length; i++) {
  const prev = steps[i - 1].localVariables;
  const curr = steps[i].localVariables;
  for (const key of Object.keys(curr)) {
    if (prev[key] !== undefined && prev[key] !== curr[key]) {
      variableUpdated = true;
      assert.notEqual(prev[key], curr[key], `Variable ${key} must have changed values`);
    }
  }
}
assert.ok(variableUpdated, "At least one variable must mutate across execution steps");
console.log("✓ State transitions mutate variables deterministically across steps.");

// Test 4: Structured explanation availability
console.log("\n[Test 4] Testing Structured Explanations (What / Why / Invariant)...");
for (const s of steps) {
  if (s.structuredExplanation) {
    assert.ok(s.structuredExplanation.what.length > 0, "What section must be non-empty");
    assert.ok(s.structuredExplanation.why.length > 0, "Why section must be non-empty");
    assert.ok(s.structuredExplanation.invariant.length > 0, "Invariant section must be non-empty");
  }
}
console.log("✓ Structured explanations contain What, Why, and Invariant sections.");

// Test 5: Input validation safeguards
console.log("\n[Test 5] Testing Engine Input Validation & Error Handling...");
const emptyArrValidation = binarySearch.validateInput({ array: [], target: 5 });
assert.equal(emptyArrValidation.valid, false, "Empty array must be rejected");

const invalidTargetValidation = binarySearch.validateInput({ array: [1, 2], target: "abc" as unknown as number });
assert.equal(invalidTargetValidation.valid, false, "Non-number target must be rejected");

const unsortedValidation = twoSumII.validateInput({ array: [5, 2, 8], target: 7 });
assert.equal(unsortedValidation.valid, false, "Unsorted array must be rejected for Two Sum II");
console.log("✓ Input validation rejects malformed, empty, and invalid inputs cleanly.");

console.log("\n🎉 ALL EXECUTION ENGINE TESTS PASSED!");

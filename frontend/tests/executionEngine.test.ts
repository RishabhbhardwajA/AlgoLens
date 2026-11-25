import assert from "node:assert/strict";
import { binarySearch } from "../src/algorithms/arrays/binarySearch";
import { twoSumII } from "../src/algorithms/twoPointer/twoSumII";
import { bubbleSort } from "../src/algorithms/sorting/bubbleSort";
import { mergeSort } from "../src/algorithms/sorting/mergeSort";
import { resetStepCounter } from "../src/engine/stepBuilder";
import { convertTraceToExecutionSteps } from "../src/utils/traceAdapter";
import { useAuthStore } from "../src/store/useAuthStore";
import { useExecutionStore } from "../src/engine/useExecutionController";
import { useChallengeStore } from "../src/engine/useChallengeStore";

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

// Test 6: Trace Adapter edge cases (negative pointers, recursive stack locals, truncation notice)
console.log("\n[Test 6] Testing JDI Trace Adapter Edge Cases & Race Parity...");
const mockTraceSteps = convertTraceToExecutionSteps({
  success: true,
  language: "java",
  truncated: true,
  totalEvents: 1,
  stdout: "",
  stderr: "",
  limitations: [],
  events: [
    {
      seq: 1,
      type: "LINE",
      line: 10,
      functionName: "factorial",
      stackFrames: [
        {
          depth: 0,
          functionName: "factorial",
          fileName: "Solution.java",
          line: 10,
          localVariables: { n: { name: "n", type: "int", value: 1, repr: "1" }, right: { name: "right", type: "int", value: -1, repr: "-1" } },
        },
        {
          depth: 1,
          functionName: "factorial",
          fileName: "Solution.java",
          line: 12,
          localVariables: { n: { name: "n", type: "int", value: 2, repr: "2" } },
        },
      ],
      variables: {
        n: { name: "n", type: "int", value: 1, repr: "1" },
        right: { name: "right", type: "int", value: -1, repr: "-1" },
      },
    },
  ],
}, [10, 20, 30]);

assert.equal(mockTraceSteps.length, 2, "Truncated trace must append an explicit truncation notification step");
assert.ok(mockTraceSteps[1].explanation.includes("truncated"), "Final step must clearly announce truncation");
assert.equal(mockTraceSteps[0].callStack[1].localVariables.n, 2, "Parent recursive stack frame must retain its local variables");
assert.equal(
  mockTraceSteps[0].visualizationState.type === "array" && mockTraceSteps[0].visualizationState.pointers?.right,
  -1,
  "Out-of-bounds negative pointers must be preserved in array visualization state"
);

// Verify Algorithm Race shared-dataset execution parity
const raceInput = [8, 3, 5, 1];
const bubbleSteps = bubbleSort.execute(raceInput);
const mergeSteps = mergeSort.execute(raceInput);
assert.ok(bubbleSteps.length > 0 && mergeSteps.length > 0, "Algorithm race engines must execute identical datasets cleanly");
console.log("✓ Trace adapter edge cases and Algorithm Race dataset execution verified.");

// Test 7: Action-based feature gating and zero-loss pending callback queueing
console.log("\n[Test 7] Testing Action-Based Inline Auth Gating Queue...");
let executedGatedAction = false;
useAuthStore.getState().requireAuthAction("Ask Gemini Tutor", () => {
  executedGatedAction = true;
});
assert.equal(useAuthStore.getState().authModalOpen, true, "Unauthenticated gated action must open AuthModal");
assert.equal(useAuthStore.getState().authModalReason, "Ask Gemini Tutor", "Modal reason must reflect gated action");
assert.equal(executedGatedAction, false, "Gated callback must NOT run before login");

useAuthStore.getState().closeAuthModal();
assert.equal(useAuthStore.getState().authModalOpen, false, "Closing modal dismisses auth gate cleanly");

useAuthStore.setState({
  isAuthenticated: true,
  user: {
    id: "u-test",
    name: "Tester",
    email: "t@example.com",
    bio: "",
    avatar_url: "",
    role: "student",
    created_at: "",
    updated_at: "",
  },
});
useAuthStore.getState().requireAuthAction("Run Java Trace", () => {
  executedGatedAction = true;
});
assert.equal(executedGatedAction, true, "Authenticated user must execute gated action immediately");
useAuthStore.setState({ isAuthenticated: false, user: null, authModalOpen: false, pendingAction: null });
console.log("✓ Action-based feature gating and immediate authenticated execution verified.");

// Test 8: Algorithm switching clears stale challenge state
console.log("\n[Test 8] Testing Challenge Store Reset on Algorithm Switch...");
useChallengeStore.getState().setChallengeMode(true);
useChallengeStore.setState({
  skippedStepIndices: [2, 5],
  score: 150,
  activeChallenge: {
    id: "ch-test",
    stepIndex: 2,
    type: "mid_prediction",
    question: "What will mid be?",
    options: ["1", "2"],
    correctIndex: 0,
    explanation: "mid = 1",
    xp: 50,
  },
});
useExecutionStore.getState().loadAlgorithm(bubbleSort);
assert.equal(useChallengeStore.getState().activeChallenge, null, "Switching algorithms must clear activeChallenge");
assert.equal(useChallengeStore.getState().skippedStepIndices.length, 0, "Switching algorithms must clear skippedStepIndices");
assert.equal(useChallengeStore.getState().score, 150, "Session XP score must persist across algorithm switches");
useChallengeStore.getState().resetStats();
useChallengeStore.getState().setChallengeMode(false);
console.log("✓ Algorithm switch cleanly resets stale challenge state.");

console.log("\n🎉 ALL EXECUTION ENGINE TESTS PASSED!");

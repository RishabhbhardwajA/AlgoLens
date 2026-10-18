import assert from "node:assert/strict";
import { resolveSourceLine } from "../src/utils/sourceLineMapper";
import { binarySearch } from "../src/algorithms/arrays/binarySearch";

console.log("\n=== STARTING SOURCE-LINE SYNCHRONIZATION REGRESSION TEST ===");

// 1. Direct unit tests for resolveSourceLine
{
  const standardCode = `function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`;

  // In standard code:
  assert.equal(resolveSourceLine(standardCode, "let left = 0;", 2), 2);
  assert.equal(resolveSourceLine(standardCode, "const mid = Math.floor", 6), 6);
  assert.equal(resolveSourceLine(standardCode, "if (arr[mid] === target)", 7), 7);
  assert.equal(resolveSourceLine(standardCode, "return -1;", 11), 11);

  // When comments, blank lines, and docstrings are prepended (e.g. 5 extra lines):
  const prependedCode = `/**
 * Binary search implementation
 * Author: AlgoLens
 */


function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`;

  // The naive hardcoded line 2 now points to a comment or blank line!
  // But resolveSourceLine dynamically adjusts to line 8 (+6 lines):
  const adjustedInitLine = resolveSourceLine(prependedCode, "let left = 0;", 2);
  const adjustedMidLine = resolveSourceLine(prependedCode, "const mid = Math.floor", 6);
  const adjustedReturnLine = resolveSourceLine(prependedCode, "return -1;", 11);

  assert.equal(adjustedInitLine, 8, "Dynamic line resolver must shift line for 'let left = 0' from 2 to 8");
  assert.equal(adjustedMidLine, 12, "Dynamic line resolver must shift line for 'mid' calculation from 6 to 12");
  assert.equal(adjustedReturnLine, 17, "Dynamic line resolver must shift return -1 line from 11 to 17");

  console.log("  ✓ Dynamic line resolution correctly recalibrates when blank lines/comments are prepended");
}

// 2. Fallback handling when pattern is not found
{
  const code = "console.log('hello world');";
  const line = resolveSourceLine(code, "nonExistentStatement()", 42);
  assert.equal(line, 42, "Must return fallback line when pattern does not exist");
  console.log("  ✓ Correctly falls back to default line if statement pattern is absent");
}

// 3. Algorithm source synchronization verification
{
  const bsSource = binarySearch.sourceCode.typescript;
  const initLine = resolveSourceLine(bsSource, "let left = 0;", 2);
  const midLine = resolveSourceLine(bsSource, "const mid = Math.floor", 6);
  const foundLine = resolveSourceLine(bsSource, "if (arr[mid] === target)", 8);

  assert.equal(typeof initLine, "number");
  assert.ok(initLine > 0, "Line numbers must be 1-indexed positive integers");
  assert.ok(midLine > initLine, "mid computation must occur after pointer initialization");
  assert.ok(foundLine > midLine, "target check must occur after mid computation");

  console.log("  ✓ Verified binary search step line ordering against actual TypeScript source");
}

// 4. Duplicate matching statements (occurrence selection)
{
  const codeWithDuplicates = `function testDuplicates(arr: number[]): number {
  if (arr.length === 0) return -1; // Line 2 (first occurrence)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 42) return i;
  }
  return -1; // Line 6 (second occurrence)
}`;

  const firstReturn = resolveSourceLine(codeWithDuplicates, "return -1;", { occurrence: 1 });
  const secondReturn = resolveSourceLine(codeWithDuplicates, "return -1;", { occurrence: 2 });
  const thirdReturn = resolveSourceLine(codeWithDuplicates, "return -1;", { occurrence: 3, fallbackLine: 99 });

  assert.equal(firstReturn, 2, "First occurrence of 'return -1;' must resolve to line 2");
  assert.equal(secondReturn, 6, "Second occurrence of 'return -1;' must resolve to line 6");
  assert.equal(thirdReturn, 99, "Non-existent third occurrence must return fallbackLine");
  console.log("  ✓ Duplicate statements correctly disambiguated by occurrence count");
}

// 5. Comment avoidance (matching code instead of comments)
{
  const codeWithMatchingComment = `function search(arr: number[]): number {
  // if (arr[mid] === target) return mid; <-- This is a comment on line 2!
  const mid = 0;
  if (arr[mid] === target) return mid; // Line 4: actual code!
  return -1;
}`;

  // With ignoreComments (default true):
  const codeLine = resolveSourceLine(codeWithMatchingComment, "if (arr[mid] === target)");
  assert.equal(codeLine, 4, "Must skip matching comment line and resolve the actual executable code line (4)");

  // With ignoreComments: false (explicitly matching comments):
  const commentLine = resolveSourceLine(codeWithMatchingComment, "if (arr[mid] === target)", {
    ignoreComments: false,
  });
  assert.equal(commentLine, 2, "When ignoreComments: false, resolves first match on line 2");

  console.log("  ✓ Comment lines skipped automatically to prevent false line highlights");
}

// 6. Renamed / edited statement with strict mode error
{
  const code = `function example() {
  const result = computeNewName();
  return result;
}`;

  // Old pattern was 'const result = computeOldName();'
  let errorCaught = false;
  try {
    resolveSourceLine(code, "computeOldName()", { strict: true });
  } catch (err: any) {
    errorCaught = true;
    assert.equal(err.name, "SourceLineNotFoundError");
    assert.ok(err.message.includes("could not be located in source code"));
  }
  assert.ok(errorCaught, "Strict mode must throw SourceLineNotFoundError for renamed/missing statements");

  // Non-strict mode returns safe fallback 0
  const safeFallback = resolveSourceLine(code, "computeOldName()", { strict: false, fallbackLine: 0 });
  assert.equal(safeFallback, 0, "Non-strict mode returns safe fallback line (0)");

  console.log("  ✓ Strict mode throws explicit SourceLineNotFoundError on renamed/edited statements");
}

console.log("=== ALL SOURCE-LINE SYNCHRONIZATION TESTS PASSED ===\n");

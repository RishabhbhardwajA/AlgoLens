import app from "../src/app.js";
import http from "node:http";
import workerApp from "../src/tracer/java/worker/server.js";
import { JavaTraceProvider } from "../src/services/execution/javaTraceProvider.js";
import { validateEnvironment } from "../src/config/env.js";
import { executionService } from "../src/services/execution/executionService.js";
import { MockExecutionProvider } from "../src/services/execution/mockExecutionProvider.js";

async function runExecutionTests() {
  console.log("=== STARTING HARDENED MULTI-LANGUAGE EXECUTION & TRACING TESTS ===");

  // Explicitly inject MockExecutionProvider for automated testing
  executionService.setExecutionProvider(new MockExecutionProvider());

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5189, resolve));
  const baseUrl = "http://localhost:5189/api/execution";

  let testsPassed = 0;

  try {
    // -------------------------------------------------------------
    // Test 1: Language Capabilities Contract
    // -------------------------------------------------------------
    console.log("\n[Test 1] Testing GET /api/execution/capabilities...");
    const capRes = await fetch(`${baseUrl}/capabilities`);
    if (capRes.status !== 200) {
      throw new Error(`Expected 200 for capabilities, got ${capRes.status}`);
    }
    const capData = await capRes.json();
    if (!capData.success || !Array.isArray(capData.languages)) {
      throw new Error("Invalid capabilities response shape");
    }

    const javaCap = capData.languages.find((l: any) => l.language === "java");
    const pyCap = capData.languages.find((l: any) => l.language === "python");
    const cppCap = capData.languages.find((l: any) => l.language === "cpp");
    const jsCap = capData.languages.find((l: any) => l.language === "javascript");

    if (!javaCap || !javaCap.supportsRun || !javaCap.supportsTrace) {
      throw new Error("Java must support both Run and Trace capabilities in test mode");
    }
    if (!pyCap || !pyCap.supportsRun || pyCap.supportsTrace) {
      throw new Error("Python must support Run, but Trace must be false initially");
    }
    if (!cppCap || !cppCap.supportsRun || cppCap.supportsTrace) {
      throw new Error("C++ must support Run, but Trace must be false initially");
    }
    if (!jsCap || !jsCap.supportsRun || jsCap.supportsTrace) {
      throw new Error("JavaScript must support Run, but Trace must be false initially");
    }
    console.log("✓ Language capabilities verified: 4 Run languages, 1 Trace language (Java).");
    testsPassed++;

    // -------------------------------------------------------------
    // Test 2: Validation on Run and Trace Endpoints
    // -------------------------------------------------------------
    console.log("\n[Test 2] Testing Request Validation...");

    // Empty payload
    const badRunRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (badRunRes.status !== 400) {
      throw new Error(`Expected 400 for empty run request, got ${badRunRes.status}`);
    }

    // Unsupported language
    const badLangRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "ruby", sourceCode: "puts 'hello'" }),
    });
    if (badLangRes.status !== 400) {
      throw new Error(`Expected 400 for unsupported language, got ${badLangRes.status}`);
    }

    // Trace requested on language without trace support (e.g. Python)
    const badTraceRes = await fetch(`${baseUrl}/trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "python", sourceCode: "print(1)" }),
    });
    if (badTraceRes.status !== 400) {
      throw new Error(`Expected 400 when tracing unsupported language, got ${badTraceRes.status}`);
    }
    const badTraceJson = await badTraceRes.json();
    if (!badTraceJson.message.includes("does not support Trace mode")) {
      throw new Error("Expected explicit message about lack of Trace mode support");
    }
    console.log("✓ Request validation, language allowlist, and trace capability enforcement verified.");
    testsPassed++;

    // -------------------------------------------------------------
    // Test 3: Multi-Language Run Mode (Java, Python, C++, JS)
    // -------------------------------------------------------------
    console.log("\n[Test 3] Testing Multi-Language Run Mode...");

    const runCases = [
      {
        lang: "python",
        code: "def solve():\n    nums = [1, 2, 3]\n    print(sum(nums))\nsolve()",
        expectedOutput: "6",
      },
      {
        lang: "javascript",
        code: "const arr = [10, 20, 30];\nconsole.log(arr.reduce((a, b) => a + b, 0));",
        expectedOutput: "60",
      },
      {
        lang: "cpp",
        code: "#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }",
        expectedOutput: "42",
      },
      {
        lang: "java",
        code: "public class Solution { public static void main(String[] args) { System.out.println(100); } }",
        expectedOutput: "100",
      },
    ];

    for (const testCase of runCases) {
      const res = await fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: testCase.lang,
          sourceCode: testCase.code,
        }),
      });
      if (res.status !== 200) {
        throw new Error(`Run failed for ${testCase.lang} with status ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== "SUCCESS") {
        throw new Error(`Execution status for ${testCase.lang} was ${data.status}`);
      }
      if (!data.stdout.includes(testCase.expectedOutput)) {
        throw new Error(`Expected stdout to contain '${testCase.expectedOutput}', got '${data.stdout}'`);
      }
      console.log(`  ✓ Run succeeded for ${testCase.lang}: status=${data.status}, output="${data.stdout.trim()}"`);
    }
    testsPassed++;

    // -------------------------------------------------------------
    // Test 4: Real Java Trace Provider - Loop & Array Mutation
    // -------------------------------------------------------------
    console.log("\n[Test 4] Testing Real Java Debugger Tracing (Loop & Array)...");
    const javaTracer = new JavaTraceProvider();

    const loopJavaCode = `
public class Solution {
    public static void main(String[] args) {
        int[] arr = { 10, 20, 30 };
        int sum = 0;
        for (int i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        System.out.println("Sum=" + sum);
    }
}
`;
    const loopTrace = await javaTracer.trace({
      language: "java",
      sourceCode: loopJavaCode,
      maxSteps: 100,
    });

    if (!loopTrace.success) {
      throw new Error(`Java trace failed: ${loopTrace.error}`);
    }
    if (loopTrace.events.length === 0) {
      throw new Error("Java trace returned 0 events");
    }
    if (!loopTrace.stdout.includes("Sum=60")) {
      throw new Error(`Expected stdout 'Sum=60', got '${loopTrace.stdout}'`);
    }

    const stepWithArr = loopTrace.events.find(
      (e) => e.variables && e.variables.arr && e.variables.arr.isArray
    );
    if (!stepWithArr) {
      throw new Error("Trace did not capture array variable 'arr'");
    }
    const arrVal = stepWithArr.variables.arr;
    if (arrVal.length !== 3 || !Array.isArray(arrVal.elements)) {
      throw new Error("Array length or elements metadata missing in trace");
    }

    console.log(
      `✓ Real Java trace verified: ${loopTrace.events.length} debugger events captured, array inspected:`,
      arrVal.elements
    );
    testsPassed++;

    // -------------------------------------------------------------
    // Test 5: Real Java Trace Provider - Binary Search
    // -------------------------------------------------------------
    console.log("\n[Test 5] Testing Real Java Debugger Tracing (Binary Search)...");
    const binarySearchCode = `
public class Solution {
    public static int binarySearch(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
    public static void main(String[] args) {
        int[] data = { 2, 4, 6, 8, 10, 12 };
        int target = 8;
        int index = binarySearch(data, target);
        System.out.println("Index: " + index);
    }
}
`;
    const bsTrace = await javaTracer.trace({
      language: "java",
      sourceCode: binarySearchCode,
      maxSteps: 200,
    });

    if (!bsTrace.success) {
      throw new Error(`Binary search trace failed: ${bsTrace.error}`);
    }
    if (!bsTrace.stdout.includes("Index: 3")) {
      throw new Error(`Expected output 'Index: 3', got '${bsTrace.stdout}'`);
    }

    const bsFrameStep = bsTrace.events.find(
      (e) => e.functionName === "binarySearch" && e.stackFrames.length >= 2
    );
    if (!bsFrameStep) {
      throw new Error("Trace did not capture multi-level stack frame inside binarySearch");
    }

    const pointerStep = bsTrace.events.find(
      (e) =>
        e.functionName === "binarySearch" &&
        e.variables.left !== undefined &&
        e.variables.right !== undefined &&
        e.variables.mid !== undefined
    );
    if (!pointerStep) {
      throw new Error("Trace did not capture pointers (left, right, mid)");
    }

    console.log(
      `✓ Binary Search trace verified: found target at index 3 with pointers left=${pointerStep.variables.left.value}, right=${pointerStep.variables.right.value}, mid=${pointerStep.variables.mid.value}`
    );
    testsPassed++;

    // -------------------------------------------------------------
    // Test 6: Real Java Trace Provider - Recursion (Factorial)
    // -------------------------------------------------------------
    console.log("\n[Test 6] Testing Real Java Debugger Tracing (Recursion)...");
    const recursionCode = `
public class Solution {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    public static void main(String[] args) {
        System.out.println("Factorial: " + factorial(4));
    }
}
`;
    const recTrace = await javaTracer.trace({
      language: "java",
      sourceCode: recursionCode,
    });

    if (!recTrace.success) {
      throw new Error(`Recursion trace failed: ${recTrace.error}`);
    }
    if (!recTrace.stdout.includes("Factorial: 24")) {
      throw new Error(`Expected output 'Factorial: 24', got '${recTrace.stdout}'`);
    }

    const deepestStep = recTrace.events.reduce(
      (max, e) => (e.stackFrames.length > max ? e.stackFrames.length : max),
      0
    );
    if (deepestStep < 4) {
      throw new Error(`Expected stack depth of at least 4 during factorial(4), got ${deepestStep}`);
    }

    console.log(`✓ Recursion stack verified: deepest stack depth = ${deepestStep} frames.`);
    testsPassed++;

    // -------------------------------------------------------------
    // Test 7: Java Compilation Failure Handling
    // -------------------------------------------------------------
    console.log("\n[Test 7] Testing Java Compilation Failure...");
    const badSyntaxCode = `
public class Solution {
    public static void main(String[] args) {
        int a = ; // syntax error
    }
}
`;
    const compileFailTrace = await javaTracer.trace({
      language: "java",
      sourceCode: badSyntaxCode,
    });

    if (compileFailTrace.success) {
      throw new Error("Expected compilation failure for invalid Java syntax");
    }
    if (compileFailTrace.events.length !== 0) {
      throw new Error("Compilation failure must not emit execution events");
    }
    if (!compileFailTrace.compilationOutput || !compileFailTrace.compilationOutput.includes("error")) {
      throw new Error("Compilation failure output must contain error details");
    }
    console.log("✓ Java compilation failure cleanly caught and reported.");
    testsPassed++;

    // -------------------------------------------------------------
    // Test 8: Java Runtime Exception Handling
    // -------------------------------------------------------------
    console.log("\n[Test 8] Testing Java Runtime Exception Handling...");
    const outOfBoundsCode = `
public class Solution {
    public static void main(String[] args) {
        int[] nums = new int[2];
        nums[99] = 42;
    }
}
`;
    const exTrace = await javaTracer.trace({
      language: "java",
      sourceCode: outOfBoundsCode,
    });

    if (!exTrace.success) {
      throw new Error("Debugger should complete execution capture on exception");
    }
    const exEvent = exTrace.events.find((e) => e.type === "EXCEPTION");
    if (!exEvent || !exEvent.exception) {
      throw new Error("Expected EXCEPTION event in trace");
    }
    if (!exEvent.exception.type.includes("ArrayIndexOutOfBoundsException")) {
      throw new Error(`Expected ArrayIndexOutOfBoundsException, got ${exEvent.exception.type}`);
    }
    console.log(`✓ Runtime exception captured: ${exEvent.exception.type} on line ${exEvent.line}`);
    testsPassed++;

    // -------------------------------------------------------------
    // Test 9: Production Startup & Config Fail-Closed Security
    // -------------------------------------------------------------
    console.log("\n[Test 9] Testing Production Startup Configuration Security...");

    // Rule 9A: USE_MOCK_EXECUTION=true is forbidden in production
    let threwMockError = false;
    try {
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "a-very-strong-production-secret-with-plenty-of-entropy-123456",
        USE_MOCK_EXECUTION: "true",
      });
    } catch (err: any) {
      threwMockError = true;
      if (!err.message.includes("USE_MOCK_EXECUTION is strictly prohibited in production")) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
    if (!threwMockError) {
      throw new Error("Expected validateEnvironment to reject USE_MOCK_EXECUTION in production mode");
    }
    console.log("  ✓ Production mode strictly rejects USE_MOCK_EXECUTION=true.");

    // Rule 9B: Production without JUDGE0_API_URL sets USE_MOCK_EXECUTION to false
    const prodConfig = validateEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "a-very-strong-production-secret-with-plenty-of-entropy-123456",
    });
    if (prodConfig.USE_MOCK_EXECUTION) {
      throw new Error("USE_MOCK_EXECUTION must be false in production when no provider is set");
    }
    console.log("  ✓ Production mode defaults USE_MOCK_EXECUTION to false.");

    // Rule 9C: When Run provider is absent, /run fails closed with 503 Service Unavailable
    const originalProvider = (executionService as any).executionProvider;
    try {
      executionService.setExecutionProvider(null);
      const absentRes = await fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", sourceCode: "print(1)" }),
      });
      if (absentRes.status !== 503) {
        throw new Error(`Expected 503 Service Unavailable when provider is absent, got ${absentRes.status}`);
      }
      const absentData = await absentRes.json();
      if (!absentData.message.includes("not configured")) {
        throw new Error("Expected clear message that execution provider is not configured");
      }
      console.log("  ✓ Calling /run without configured provider fails closed with 503.");
    } finally {
      executionService.setExecutionProvider(originalProvider);
    }
    testsPassed++;

    // -------------------------------------------------------------
    // Test 10: Infinite Loop Timeout & Process Tree Termination
    // -------------------------------------------------------------
    console.log("\n[Test 10] Testing Infinite Loop Timeout & Process Tree Kill...");
    const infiniteLoopCode = `
public class Solution {
    public static void main(String[] args) {
        while (true) {
            // Infinite loop test
        }
    }
}
`;
    const timeoutTrace = await javaTracer.trace({
      language: "java",
      sourceCode: infiniteLoopCode,
      timeoutMs: 1500, // Short timeout for test
    });

    if (timeoutTrace.success) {
      throw new Error("Infinite loop should not succeed");
    }
    if (!timeoutTrace.error || !timeoutTrace.error.includes("timed out")) {
      throw new Error(`Expected timeout error, got: ${timeoutTrace.error}`);
    }
    console.log("✓ Infinite loop terminated within deadline with process tree kill.");
    testsPassed++;

    // -------------------------------------------------------------
    // Test 11: Output Flood Truncation (64KB cap)
    // -------------------------------------------------------------
    console.log("\n[Test 11] Testing Output Flood 64KB Hard Cap...");
    const floodCode = `
public class Solution {
    public static void main(String[] args) {
        for (int i = 0; i < 5000; i++) {
            System.out.println("AlgoLens flood test line: " + i);
        }
    }
}
`;
    const floodTrace = await javaTracer.trace({
      language: "java",
      sourceCode: floodCode,
      maxSteps: 20,
    });

    // Check stdout size is capped
    const stdoutLength = floodTrace.stdout.length;
    if (stdoutLength > 70000) {
      throw new Error(`Stdout was not capped at 64KB (was ${stdoutLength} bytes)`);
    }
    console.log(`✓ Output flood successfully capped: ${stdoutLength} bytes (within 64KB limit).`);
    testsPassed++;

    // -------------------------------------------------------------
    // Test 12: Dedicated Worker Service HTTP Communication
    // -------------------------------------------------------------
    console.log("\n[Test 12] Testing Dedicated Worker Service HTTP Dispatch...");
    const workerServer = http.createServer(workerApp);
    await new Promise<void>((resolve) => workerServer.listen(5190, resolve));

    try {
      const workerHealth = await fetch("http://localhost:5190/health");
      if (workerHealth.status !== 200) {
        throw new Error(`Worker health check failed with status ${workerHealth.status}`);
      }
      const workerHealthData = await workerHealth.json();
      if (!workerHealthData.service.includes("Java Trace Worker")) {
        throw new Error("Invalid worker health response");
      }

      // Test dispatching a trace to the worker
      const workerTraceRes = await fetch("http://localhost:5190/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCode: `public class Solution { public static void main(String[] args) { System.out.println("Hello Worker"); } }`,
          maxSteps: 10,
        }),
      });

      if (workerTraceRes.status !== 200) {
        throw new Error(`Worker trace failed with status ${workerTraceRes.status}`);
      }
      const workerTrace = await workerTraceRes.json();
      if (!workerTrace.success || !workerTrace.stdout.includes("Hello Worker")) {
        throw new Error(`Worker did not return expected output: ${JSON.stringify(workerTrace)}`);
      }
      console.log("✓ Dedicated worker microservice responded to health check and executed trace over HTTP.");
      testsPassed++;
    } finally {
      workerServer.close();
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log(`\n========================================================`);
    console.log(`ALL ${testsPassed} MULTI-LANGUAGE HARDENED TESTS PASSED!`);
    console.log(`========================================================\n`);
  } finally {
    server.close();
  }
}

runExecutionTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});

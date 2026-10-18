import type {
  ExecutionProvider,
  ExecutionResult,
  LanguageCapability,
  RunRequest,
} from "../../types/execution.js";
import { resolveLanguage, getLanguageCapabilities } from "./languageRegistry.js";

export class MockExecutionProvider implements ExecutionProvider {
  public readonly name = "MockExecutionProvider";
  private submissions: Map<string, ExecutionResult> = new Map();

  public listCapabilities(): LanguageCapability[] {
    return getLanguageCapabilities();
  }

  public async submit(req: RunRequest): Promise<string> {
    const langConfig = resolveLanguage(req.language);
    if (!langConfig) {
      throw new Error(`Unsupported language: '${req.language}'. Allowed: java, python, cpp, javascript.`);
    }

    const token = `mock-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = this.simulateExecution(req);
    this.submissions.set(token, result);
    return token;
  }

  public async getSubmission(token: string): Promise<ExecutionResult> {
    const result = this.submissions.get(token);
    if (!result) {
      throw new Error(`Mock submission token '${token}' not found.`);
    }
    return result;
  }

  public async runSync(req: RunRequest): Promise<ExecutionResult> {
    const token = await this.submit(req);
    return this.getSubmission(token);
  }

  private simulateExecution(req: RunRequest): ExecutionResult {
    const code = req.sourceCode || "";
    const lang = req.language.toLowerCase();

    // 1. Check for intentional syntax/compilation errors
    if (code.includes("SYNTAX_ERROR") || code.includes("class Solution { unclosed")) {
      return {
        stdout: "",
        stderr: "",
        compileOutput:
          lang === "java"
            ? "Solution.java:2: error: ';' expected\n    int x = 10\n              ^\n1 error"
            : "main.cpp:5:1: error: expected ';' after expression",
        status: "COMPILATION_ERROR",
        exitCode: 1,
        timeMs: 45,
        memoryKb: 14000,
        isMock: true,
      };
    }

    // 2. Check for intentional timeouts / infinite loops
    if (code.includes("while(true)") || code.includes("while (true)") || code.includes("INFINITE_LOOP")) {
      return {
        stdout: "",
        stderr: "Time limit exceeded (5.0s limit reached). Execution terminated.",
        compileOutput: "",
        status: "TIME_LIMIT_EXCEEDED",
        exitCode: 124,
        timeMs: 5000,
        memoryKb: 32000,
        isMock: true,
      };
    }

    // 3. Check for intentional runtime exceptions
    if (code.includes("THROW_EXCEPTION") || code.includes("NullPointerException") || code.includes("ZeroDivisionError")) {
      return {
        stdout: "Starting execution...\n",
        stderr:
          lang === "java"
            ? "Exception in thread \"main\" java.lang.NullPointerException: Cannot invoke method on null object\n\tat Solution.main(Solution.java:7)"
            : "Traceback (most recent call last):\n  File \"main.py\", line 4, in <module>\n    1 / 0\nZeroDivisionError: division by zero",
        compileOutput: "",
        status: "RUNTIME_ERROR",
        exitCode: 1,
        timeMs: 82,
        memoryKb: 24000,
        isMock: true,
      };
    }

    // 4. Successful simulation
    let output = "";
    if (code.includes("binarySearch") || code.includes("binary_search")) {
      output = "Result index: 6\nFound target at index 6\n";
    } else if (code.includes("factorial")) {
      output = "Factorial result: 120\n";
    } else if (code.includes("fibonacci")) {
      output = "Fibonacci(7) = 13\n";
    } else if (code.includes("System.out.println")) {
      const match = code.match(/System\.out\.println\(([^)]+)\)/);
      output = match ? `${match[1].replace(/["']/g, "").trim()}\n` : "AlgoLens Java Execution completed.\n";
    } else if (code.includes("print(")) {
      if (code.includes("sum(nums)")) {
        output = "6\n";
      } else {
        const match = code.match(/print\((.*)\)/);
        output = match ? `${match[1].trim().replace(/["']/g, "")}\n` : "AlgoLens Python Execution completed.\n";
      }
    } else if (code.includes("console.log")) {
      const match = code.match(/console\.log\(([^)]+)\)/);
      output = match && match[1].includes("reduce") ? "60\n" : (match ? `${match[1].replace(/["']/g, "").trim()}\n` : "AlgoLens JS Execution completed.\n");
    } else if (code.includes("std::cout")) {
      const match = code.match(/std::cout\s*<<\s*([^<;\n]+)/);
      output = match ? `${match[1].trim().replace(/["']/g, "")}\n` : "AlgoLens C++ Execution completed successfully.\n";
    } else {
      output = `Program executed successfully in ${lang}.\nOutput: [Done]\n`;
    }

    return {
      stdout: output,
      stderr: "",
      compileOutput: "",
      status: "SUCCESS",
      exitCode: 0,
      timeMs: 65,
      memoryKb: 28400,
      isMock: true,
    };
  }
}

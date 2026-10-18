import {
  type ExecutionStep,
  type ArrayElement,
  type ElementState,
  type VisualizationState,
} from "./executionTypes";
import { resetStepCounter, step, frame } from "./stepBuilder";

export interface CustomRunResult {
  success: boolean;
  steps: ExecutionStep[];
  error?: string;
  errorLine?: number;
  logs: string[];
  finalArray: number[];
  returnValue?: unknown;
  finalExplanation?: string;
}

/**
 * Executes user-provided algorithm code in a safe sandbox with infinite-loop protection,
 * state tracing, and comprehensive error handling.
 */
export function runCustomAlgorithm(
  userCode: string,
  initialArray: number[],
  maxSteps = 600
): CustomRunResult {
  resetStepCounter();
  const logs: string[] = [];
  const steps: ExecutionStep[] = [];
  let lastCustomExplanation: string = "";
  let explicitResult: unknown = undefined;

  // Deep clone array to avoid mutating caller's original state
  const workingArray = [...initialArray];
  let currentPointers: Record<string, number> = {};
  let stepCount = 0;
  const startTime = Date.now();

  // Helper to record an array visualization snapshot
  function captureState(
    activeIndices: { index: number; state: ElementState }[] = [],
    pointers: Record<string, number> = currentPointers
  ): VisualizationState {
    const stateMap = new Map<number, ElementState>();
    activeIndices.forEach((item) => stateMap.set(item.index, item.state));

    const elements: ArrayElement[] = workingArray.map((val, idx) => {
      let elemState: ElementState = stateMap.get(idx) || "default";

      // If a pointer is at this index and no specific state was given
      if (elemState === "default") {
        if (pointers.peak === idx || pointers.result === idx || pointers.found === idx) {
          elemState = "found";
        } else if (pointers.left === idx || pointers.low === idx || pointers.i === idx) {
          elemState = "pointer-left";
        } else if (pointers.right === idx || pointers.high === idx || pointers.j === idx) {
          elemState = "pointer-right";
        } else if (pointers.mid === idx || pointers.pivot === idx) {
          elemState = "pointer-mid";
        }
      }

      return {
        value: val,
        index: idx,
        state: elemState,
        label: Object.entries(pointers)
          .filter(([, pos]) => pos === idx)
          .map(([name]) => name)
          .join(", "),
      };
    });

    return {
      type: "array",
      elements,
      pointers: { ...pointers },
    };
  }

  // Initial step before user code starts
  steps.push(
    step()
      .line(1)
      .fn("userAlgorithm")
      .event({
        type: "STEP",
        description: "Initialized array with user input values.",
        line: 1,
      })
      .callStack([
        frame("f0", "userAlgorithm", { array: [...workingArray] }, { array: [...workingArray] }, 1),
      ])
      .variables({ array: [...workingArray], length: workingArray.length })
      .viz(captureState())
      .explain("Initial array state loaded into memory.")
      .build()
  );

  // Tracer object exposed to user function
  const tracer = {
    /**
     * Compare two array elements.
     * @param i - First index
     * @param j - Second index
     * @param op - Optional operator string: ">", "<", ">=", "<=", "==", "!=". Defaults to ">".
     * @returns boolean result of the comparison
     */
    compare(i: number, j: number, op: ">" | "<" | ">=" | "<=" | "==" | "!=" = ">"): boolean {
      stepCount++;
      if (stepCount > maxSteps) {
        throw new Error(
          `Infinite loop detected! Execution exceeded ${maxSteps} steps. Check your loop exit condition.`
        );
      }
      if (Date.now() - startTime > 2500) {
        throw new Error("Execution timed out (exceeded 2.5 seconds).");
      }

      const valI = workingArray[i];
      const valJ = workingArray[j];

      // Compute result based on the actual operator requested
      let result: boolean;
      switch (op) {
        case ">":  result = valI > valJ; break;
        case "<":  result = valI < valJ; break;
        case ">=": result = valI >= valJ; break;
        case "<=": result = valI <= valJ; break;
        case "==": result = valI === valJ; break;
        case "!=": result = valI !== valJ; break;
        default:   result = valI > valJ;
      }

      // Map operator to the COMPARE event type schema
      const normalizedOp: "<" | "<=" | ">" | ">=" | "===" | "!==" =
        op === "==" ? "===" : op === "!=" ? "!==" : (op as "<" | "<=" | ">" | ">=");

      steps.push(
        step()
          .line(10)
          .fn("userAlgorithm")
          .event({
            type: "COMPARE",
            left: valI,
            right: valJ,
            operator: normalizedOp,
            result,
            indices: [i, j],
            line: 10,
          })
          .callStack([
            frame("f0", "userAlgorithm", {}, { i, j, ...currentPointers }, 10),
          ])
          .variables({ i, j, [`arr[${i}]`]: valI, [`arr[${j}]`]: valJ, result, ...currentPointers })
          .viz(
            captureState([
              { index: i, state: "comparing" },
              { index: j, state: "comparing" },
            ])
          )
          .explain(`Comparing arr[${i}] (${valI}) ${op} arr[${j}] (${valJ}) → ${result}.`)
          .build()
      );

      return result;
    },

    swap(i: number, j: number): void {
      stepCount++;
      if (stepCount > maxSteps) {
        throw new Error(`Infinite loop detected! Execution exceeded ${maxSteps} steps.`);
      }

      if (i < 0 || i >= workingArray.length || j < 0 || j >= workingArray.length) {
        throw new Error(`Index out of bounds in swap(${i}, ${j}). Array length is ${workingArray.length}.`);
      }

      const temp = workingArray[i];
      workingArray[i] = workingArray[j];
      workingArray[j] = temp;

      steps.push(
        step()
          .line(14)
          .fn("userAlgorithm")
          .event({
            type: "SWAP",
            indices: [i, j],
            array: [...workingArray],
            line: 14,
          })
          .callStack([
            frame("f0", "userAlgorithm", {}, { i, j, ...currentPointers }, 14),
          ])
          .variables({
            i,
            j,
            swapped: `arr[${i}] ↔ arr[${j}]`,
            ...currentPointers,
          })
          .viz(
            captureState([
              { index: i, state: "current" },
              { index: j, state: "current" },
            ])
          )
          .explain(`Swapped arr[${i}] (${workingArray[j]}) with arr[${j}] (${workingArray[i]}).`)
          .build()
      );
    },

    set(index: number, value: number): void {
      stepCount++;
      if (stepCount > maxSteps) {
        throw new Error(`Infinite loop detected! Execution exceeded ${maxSteps} steps.`);
      }

      if (index < 0 || index >= workingArray.length) {
        throw new Error(`Index out of bounds in set(${index}, ${value}). Array length is ${workingArray.length}.`);
      }

      const oldVal = workingArray[index];
      workingArray[index] = value;

      steps.push(
        step()
          .line(12)
          .fn("userAlgorithm")
          .event({
            type: "UPDATE",
            variable: `arr[${index}]`,
            oldValue: oldVal,
            newValue: value,
            line: 12,
          })
          .callStack([
            frame("f0", "userAlgorithm", {}, { index, value, ...currentPointers }, 12),
          ])
          .variables({ index, value, ...currentPointers })
          .viz(captureState([{ index, state: "current" }]))
          .explain(`Updated arr[${index}] from ${oldVal} to ${value}.`)
          .build()
      );
    },

    pointer(name: string, index: number): void {
      const from = currentPointers[name] ?? index;
      currentPointers[name] = index;

      steps.push(
        step()
          .line(8)
          .fn("userAlgorithm")
          .event({
            type: "POINTER_MOVE",
            pointer: name,
            from,
            to: index,
            line: 8,
          })
          .callStack([
            frame("f0", "userAlgorithm", {}, { ...currentPointers }, 8),
          ])
          .variables({ ...currentPointers })
          .viz(captureState())
          .explain(`Moved pointer '${name}' to index ${index} (value: ${workingArray[index] ?? "N/A"}).`)
          .build()
      );
    },

    explain(message: string): void {
      lastCustomExplanation = message;
      steps.push(
        step()
          .line(16)
          .fn("userAlgorithm")
          .event({
            type: "STEP",
            description: message,
            line: 16,
          })
          .callStack([
            frame("f0", "userAlgorithm", {}, { ...currentPointers }, 16),
          ])
          .variables({ ...currentPointers })
          .viz(captureState())
          .explain(message)
          .build()
      );
    },

    result(val: unknown, msg?: string): void {
      explicitResult = val;
      const explanationText = msg || `Final Result: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`;
      lastCustomExplanation = explanationText;

      const activeIdx = typeof val === "number" && val >= 0 && val < workingArray.length ? val : undefined;

      steps.push(
        step()
          .line(18)
          .fn("userAlgorithm")
          .event({
            type: "FOUND",
            target: val,
            index: activeIdx,
            line: 18,
          })
          .callStack([])
          .variables({ result: val, ...currentPointers })
          .viz(
            captureState(
              activeIdx !== undefined ? [{ index: activeIdx, state: "found" }] : []
            )
          )
          .returns(val)
          .explain(explanationText)
          .build()
      );
    },

    log(...args: unknown[]): void {
      const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
      logs.push(msg);
    },
  };

  try {
    // Compile user code with strict sandbox parameter shadowing
    const blockedApi = (api: string) => () => {
      throw new Error(`Security Violation: Access to '${api}' is strictly prohibited in AlgoLens playground.`);
    };

    const userFn = new Function(
      "arr",
      "tracer",
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "importScripts",
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      `"use strict";\n${userCode}`
    );

    const userReturned = userFn(
      workingArray,
      tracer,
      blockedApi("fetch"),
      blockedApi("XMLHttpRequest"),
      blockedApi("WebSocket"),
      blockedApi("EventSource"),
      blockedApi("importScripts"),
      undefined,
      undefined,
      undefined,
      undefined
    );

    const finalResultVal = explicitResult !== undefined ? explicitResult : userReturned;
    const finalExplanation =
      lastCustomExplanation ||
      (finalResultVal !== undefined
        ? `Algorithm finished with result: ${JSON.stringify(finalResultVal)}`
        : "Algorithm execution completed successfully!");

    // Check if the last step was already a conclusive explain or result step
    const lastStep = steps[steps.length - 1];
    const isAlreadyConcluded =
      lastStep &&
      (lastStep.explanation === lastCustomExplanation ||
        lastStep.event.type === "RETURN" ||
        lastStep.event.type === "FOUND");

    if (!isAlreadyConcluded) {
      const activeIndices =
        typeof finalResultVal === "number" && finalResultVal >= 0 && finalResultVal < workingArray.length
          ? [{ index: finalResultVal, state: "found" as ElementState }]
          : [];

      steps.push(
        step()
          .line(20)
          .fn("userAlgorithm")
          .event({
            type: "RETURN",
            functionName: "userAlgorithm",
            value: finalResultVal !== undefined ? finalResultVal : [...workingArray],
            line: 20,
          })
          .callStack([])
          .variables({
            result: finalResultVal !== undefined ? finalResultVal : [...workingArray],
            ...currentPointers,
          })
          .viz(captureState(activeIndices))
          .explain(finalExplanation)
          .returns(finalResultVal !== undefined ? finalResultVal : [...workingArray])
          .build()
      );
    }

    return {
      success: true,
      steps,
      logs,
      finalArray: workingArray,
      returnValue: finalResultVal,
      finalExplanation,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    let errorLine: number | undefined;
    const stack = err instanceof Error ? err.stack : "";
    if (stack) {
      const match = stack.match(/<anonymous>:(\d+):(\d+)/);
      if (match) {
        errorLine = parseInt(match[1], 10) - 2;
      }
    }

    return {
      success: false,
      steps: steps.length > 0 ? steps : [],
      error: errorMsg,
      errorLine: errorLine && errorLine > 0 ? errorLine : undefined,
      logs,
      finalArray: workingArray,
    };
  }
}

/**
 * Executes user code asynchronously inside a dedicated Web Worker when running in the browser.
 * Protects the UI thread from freezing by terminating the worker if execution exceeds timeoutMs (default: 2000ms).
 *
 * Security Boundary:
 * - Runs entirely on the client side; user code is NEVER transmitted to or executed on the Express backend server.
 * - The Web Worker isolates the execution thread so infinite loops (e.g. while(true){}) do not lock up the browser UI.
 * - This provides UI responsiveness isolation, not arbitrary multi-tenant process isolation.
 */
export async function runCustomAlgorithmAsync(
  userCode: string,
  initialArray: number[],
  options: { maxSteps?: number; timeoutMs?: number } = {}
): Promise<CustomRunResult> {
  const { maxSteps = 600, timeoutMs = 2000 } = options;

  // In browser environments with Web Worker support
  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    return new Promise((resolve) => {
      let worker: Worker | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      try {
        worker = new Worker(new URL("./customCodeWorker.ts", import.meta.url), {
          type: "module",
        });

        timer = setTimeout(() => {
          if (worker) {
            worker.terminate();
            worker = null;
          }
          resolve({
            success: false,
            error: `Execution timed out (${timeoutMs}ms limit). Infinite loop detected and safely terminated to protect browser responsiveness.`,
            steps: [],
            logs: [],
            finalArray: initialArray,
          });
        }, timeoutMs);

        worker.onmessage = (e: MessageEvent<CustomRunResult>) => {
          if (timer) clearTimeout(timer);
          if (worker) {
            worker.terminate();
            worker = null;
          }
          resolve(e.data);
        };

        worker.onerror = (err: ErrorEvent) => {
          if (timer) clearTimeout(timer);
          if (worker) {
            worker.terminate();
            worker = null;
          }
          resolve({
            success: false,
            error: err.message || "An execution error occurred in worker thread.",
            steps: [],
            logs: [],
            finalArray: initialArray,
          });
        };

        worker.postMessage({ userCode, initialArray, maxSteps });
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (worker) worker.terminate();
        resolve(runCustomAlgorithm(userCode, initialArray, maxSteps));
      }
    });
  }

  // Fallback for Node.js test environment or environments without Web Workers
  return Promise.resolve(runCustomAlgorithm(userCode, initialArray, maxSteps));
}


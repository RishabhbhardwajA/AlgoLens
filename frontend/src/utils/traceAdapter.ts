import type {
  ExecutionStep,
  ExecutionEvent,
  CallFrame,
  VisualizationState,
  VariableMap,
} from "../engine/executionTypes";
import type { TraceResult, VariableValue } from "../types/multiLanguage";
import { buildArrayVisualizationState } from "./arrayVisualizerHelper";

const POINTER_KEYS = new Set(["i", "j", "k", "p"]);
const POINTER_SUBSTRINGS = ["left", "right", "mid", "low", "high", "idx", "index"];

function isPointerName(name: string): boolean {
  if (POINTER_KEYS.has(name)) return true;
  return POINTER_SUBSTRINGS.some((sub) => name.includes(sub));
}

function serializeVariablesMap(
  rawVars: Record<string, VariableValue> | undefined
): { localVars: VariableMap; detectedArray: (number | string)[] | null; detectedPointers: Record<string, number> } {
  const localVars: VariableMap = {};
  let detectedArray: (number | string)[] | null = null;
  const detectedPointers: Record<string, number> = {};

  if (!rawVars) {
    return { localVars, detectedArray, detectedPointers };
  }

  for (const [key, varMeta] of Object.entries(rawVars)) {
    if (!varMeta) continue;

    if (varMeta.isArray) {
      const rawVals = varMeta.elements || (Array.isArray(varMeta.value) ? varMeta.value : []);
      const parsedArr: (number | string)[] = rawVals.map((v) => {
        if (v === null || v === undefined || v === "null") {
          return "null";
        }
        const parsed = Number(v);
        return isNaN(parsed) ? String(v) : parsed;
      });
      localVars[key] = parsedArr;
      if (!detectedArray || key === "arr" || key === "nums" || key === "data") {
        detectedArray = parsedArr;
      }
    } else {
      localVars[key] = varMeta.value ?? varMeta.repr;

      const num = Number(varMeta.value);
      if (Number.isInteger(num) && isPointerName(key)) {
        detectedPointers[key] = num;
      }
    }
  }

  return { localVars, detectedArray, detectedPointers };
}

export function convertTraceToExecutionSteps(
  traceResult: TraceResult,
  customArray?: number[]
): ExecutionStep[] {
  if (!traceResult || !traceResult.events || traceResult.events.length === 0) {
    return [];
  }

  const steps: ExecutionStep[] = [];
  let previousArraySnapshot: (number | string)[] = customArray ? [...customArray] : [];

  for (let i = 0; i < traceResult.events.length; i++) {
    const ev = traceResult.events[i];
    const { localVars, detectedArray: eventArr, detectedPointers } = serializeVariablesMap(ev.variables);

    let activeArray = eventArr;
    if (activeArray) {
      previousArraySnapshot = [...activeArray];
    } else if (previousArraySnapshot.length > 0) {
      activeArray = [...previousArraySnapshot];
    }

    // 2. Build visualization state via unified DRY helper (preserves negative/out-of-bounds pointers)
    const visState: VisualizationState =
      activeArray && activeArray.length > 0
        ? buildArrayVisualizationState(activeArray, detectedPointers)
        : { type: "none" };

    // 3. Map CallStack (preserving per-frame localVariables captured by JDI)
    const callStack: CallFrame[] = (ev.stackFrames || []).map((sf, idx) => {
      const frameVars = sf.localVariables
        ? serializeVariablesMap(sf.localVariables).localVars
        : idx === 0
        ? localVars
        : {};
      return {
        id: `frame-${sf.depth ?? idx}-${sf.functionName}`,
        functionName: sf.functionName,
        args: {},
        localVariables: frameVars,
        line: sf.line,
      };
    });

    // 4. Map Event & Explanation
    let explanation = ev.explanation || `Executed line ${ev.line} in ${ev.functionName}()`;
    let engineEvent: ExecutionEvent = {
      type: "STEP",
      description: explanation,
      line: ev.line,
    };

    if (ev.type === "RETURN") {
      engineEvent = {
        type: "RETURN",
        functionName: ev.functionName,
        value: ev.returnValue?.value ?? ev.returnValue?.repr,
        line: ev.line,
      };
      explanation = `Returned from ${ev.functionName}(): ${ev.returnValue?.repr || "void"}`;
    } else if (ev.type === "EXCEPTION") {
      explanation = `⚠️ Exception: ${ev.exception?.type || "Error"}: ${ev.exception?.message || ""}`;
      engineEvent = {
        type: "STEP",
        description: explanation,
        line: ev.line,
      };
    }

    steps.push({
      id: ev.seq || i + 1,
      line: ev.line,
      event: engineEvent,
      functionName: ev.functionName,
      callStack,
      localVariables: localVars,
      visualizationState: visState,
      explanation,
      returnValue: ev.returnValue?.value,
      depth: ev.stackFrames?.length || 1,
    });
  }

  // 5. Append explicit truncation notification if step ceiling was hit
  if (traceResult.truncated && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const limitWarning = `⚠️ Execution truncated at ${steps.length} step limit. Inspect loop conditions for possible infinite iteration or narrow the input size.`;
    steps.push({
      id: lastStep.id + 1,
      line: lastStep.line,
      event: {
        type: "STEP",
        description: limitWarning,
        line: lastStep.line,
      },
      functionName: lastStep.functionName,
      callStack: lastStep.callStack,
      localVariables: lastStep.localVariables,
      visualizationState: lastStep.visualizationState,
      explanation: limitWarning,
      depth: lastStep.depth,
    });
  }

  return steps;
}

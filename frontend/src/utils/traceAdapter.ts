import type {
  ExecutionStep,
  ExecutionEvent,
  CallFrame,
  VisualizationState,
  ArrayElement,
  ElementState,
  VariableMap,
} from "../engine/executionTypes";
import type { TraceResult, TraceEvent, VariableValue } from "../types/multiLanguage";

export function convertTraceToExecutionSteps(
  traceResult: TraceResult,
  customArray?: number[]
): ExecutionStep[] {
  if (!traceResult || !traceResult.events || traceResult.events.length === 0) {
    return [];
  }

  const steps: ExecutionStep[] = [];
  let previousArraySnapshot: number[] = customArray ? [...customArray] : [];

  for (let i = 0; i < traceResult.events.length; i++) {
    const ev = traceResult.events[i];
    const localVars: VariableMap = {};
    let detectedArray: number[] | null = null;
    const detectedPointers: Record<string, number> = {};

    // 1. Process variables
    if (ev.variables) {
      for (const [key, varMeta] of Object.entries(ev.variables)) {
        if (!varMeta) continue;

        // If variable is an array
        if (varMeta.isArray) {
          const rawVals = varMeta.elements || (Array.isArray(varMeta.value) ? varMeta.value : []);
          const numArr = rawVals.map((v) => {
            const parsed = Number(v);
            return isNaN(parsed) ? 0 : parsed;
          });
          localVars[key] = numArr;
          if (!detectedArray || key === "arr" || key === "nums" || key === "data") {
            detectedArray = numArr;
          }
        } else {
          localVars[key] = varMeta.value ?? varMeta.repr;

          // Check if variable looks like a pointer index
          const num = Number(varMeta.value);
          if (
            Number.isInteger(num) &&
            (key.includes("left") ||
              key.includes("right") ||
              key.includes("mid") ||
              key.includes("low") ||
              key.includes("high") ||
              key.includes("idx") ||
              key.includes("index") ||
              key === "i" ||
              key === "j" ||
              key === "k" ||
              key === "p")
          ) {
            detectedPointers[key] = num;
          }
        }
      }
    }

    if (detectedArray) {
      previousArraySnapshot = [...detectedArray];
    } else if (previousArraySnapshot.length > 0) {
      detectedArray = [...previousArraySnapshot];
    }

    // 2. Build visualization state
    let visState: VisualizationState = { type: "none" };

    if (detectedArray && detectedArray.length > 0) {
      const elements: ArrayElement[] = detectedArray.map((val, idx) => {
        let state: ElementState = "default";
        const matchingPointerNames: string[] = [];

        for (const [pName, pIdx] of Object.entries(detectedPointers)) {
          if (pIdx === idx) {
            matchingPointerNames.push(pName);
          }
        }

        let label: string | undefined = undefined;
        if (matchingPointerNames.length > 0) {
          label = matchingPointerNames.join(", ");
          if (matchingPointerNames.some((n) => n.includes("mid"))) {
            state = "pointer-mid";
          } else if (matchingPointerNames.some((n) => n.includes("left") || n.includes("low"))) {
            state = "pointer-left";
          } else if (matchingPointerNames.some((n) => n.includes("right") || n.includes("high"))) {
            state = "pointer-right";
          } else {
            state = "current";
          }
        }

        return {
          value: val,
          index: idx,
          state,
          label,
        };
      });

      visState = {
        type: "array",
        elements,
        pointers: detectedPointers,
      };
    }

    // 3. Map CallStack
    const callStack: CallFrame[] = (ev.stackFrames || []).map((sf, idx) => ({
      id: `frame-${sf.depth ?? idx}-${sf.functionName}`,
      functionName: sf.functionName,
      args: {},
      localVariables: idx === 0 ? localVars : {},
      line: sf.line,
    }));

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

  return steps;
}

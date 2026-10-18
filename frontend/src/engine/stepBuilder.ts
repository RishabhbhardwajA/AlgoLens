// ============================================================
// Step Builder — fluent API for building execution steps
// ============================================================
import type {
  ExecutionStep,
  ExecutionEvent,
  CallFrame,
  VariableMap,
  VisualizationState,
  StructuredExplanation,
} from "./executionTypes";

let _stepIdCounter = 0;

export function resetStepCounter() {
  _stepIdCounter = 0;
}

export class StepBuilder {
  private _id: number;
  private _line: number = 1;
  private _event: ExecutionEvent | null = null;
  private _functionName: string = "";
  private _callStack: CallFrame[] = [];
  private _localVariables: VariableMap = {};
  private _visualizationState: VisualizationState = { type: "none" };
  private _explanation: string = "";
  private _structuredExplanation?: StructuredExplanation;
  private _returnValue?: unknown;
  private _depth?: number;
  private _isRecursiveCall?: boolean;

  constructor() {
    this._id = ++_stepIdCounter;
  }

  line(n: number): this {
    this._line = n;
    return this;
  }

  event(e: ExecutionEvent): this {
    this._event = e;
    return this;
  }

  fn(name: string): this {
    this._functionName = name;
    return this;
  }

  callStack(stack: CallFrame[]): this {
    this._callStack = stack;
    return this;
  }

  variables(vars: VariableMap): this {
    this._localVariables = vars;
    return this;
  }

  viz(state: VisualizationState): this {
    this._visualizationState = state;
    return this;
  }

  explain(text: string): this {
    this._explanation = text;
    return this;
  }

  structured(what: string, why: string, invariant: string): this {
    this._structuredExplanation = { what, why, invariant };
    return this;
  }

  returns(value: unknown): this {
    this._returnValue = value;
    return this;
  }

  depth(d: number): this {
    this._depth = d;
    return this;
  }

  recursive(flag = true): this {
    this._isRecursiveCall = flag;
    return this;
  }

  build(): ExecutionStep {
    if (!this._event) {
      throw new Error(`StepBuilder: event is required (step ${this._id})`);
    }
    return {
      id: this._id,
      line: this._line,
      event: this._event,
      functionName: this._functionName,
      callStack: this._callStack,
      localVariables: this._localVariables,
      visualizationState: this._visualizationState,
      explanation: this._explanation,
      structuredExplanation: this._structuredExplanation,
      returnValue: this._returnValue,
      depth: this._depth,
      isRecursiveCall: this._isRecursiveCall,
    };
  }
}

/** Convenience factory */
export function step(): StepBuilder {
  return new StepBuilder();
}

/** Create a CallFrame */
export function frame(
  id: string,
  functionName: string,
  args: Record<string, unknown>,
  localVariables: VariableMap,
  line: number
): CallFrame {
  return { id, functionName, args, localVariables, line };
}

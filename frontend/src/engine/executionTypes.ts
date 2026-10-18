// ============================================================
// AlgoLens Execution Engine — Core Types
// ============================================================

// -----------------------------------------------------------
// Execution Events (discriminated union — every event type)
// -----------------------------------------------------------
export type ExecutionEvent =
  | {
      type: "CALL";
      functionName: string;
      args: Record<string, unknown>;
      line: number;
    }
  | {
      type: "RETURN";
      functionName: string;
      value: unknown;
      line: number;
    }
  | {
      type: "COMPARE";
      left: unknown;
      right: unknown;
      operator: "<" | "<=" | ">" | ">=" | "===" | "!==";
      result: boolean;
      data?: Record<string, unknown>;
      indices?: [number, number];
      line: number;
    }
  | {
      type: "UPDATE";
      variable: string;
      oldValue: unknown;
      newValue: unknown;
      data?: Record<string, unknown>;
      line: number;
    }
  | {
      type: "SWAP";
      indices: [number, number];
      array: unknown[];
      line: number;
    }
  | {
      type: "VISIT";
      target: string | number;
      line: number;
    }
  | {
      type: "HIGHLIGHT";
      targets: (string | number)[];
      color?: string;
      line: number;
    }
  | {
      type: "PUSH";
      stackName: string;
      value: unknown;
      line: number;
    }
  | {
      type: "POP";
      stackName: string;
      value: unknown;
      line: number;
    }
  | {
      type: "FOUND";
      target: unknown;
      index?: number;
      nodeId?: string | number;
      line: number;
    }
  | {
      type: "NOT_FOUND";
      target: unknown;
      line: number;
    }
  | {
      type: "POINTER_MOVE";
      pointer: string;
      from: number;
      to: number;
      line: number;
    }
  | {
      type: "STEP";
      description: string;
      line: number;
    };

// -----------------------------------------------------------
// Call Stack
// -----------------------------------------------------------
export interface CallFrame {
  id: string;
  functionName: string;
  args: Record<string, unknown>;
  localVariables: VariableMap;
  line: number;
}

export type VariableMap = Record<string, unknown>;

// -----------------------------------------------------------
// Visualization States
// -----------------------------------------------------------
export type ElementState =
  | "default"
  | "current"
  | "visited"
  | "comparing"
  | "found"
  | "eliminated"
  | "returning"
  | "pointer-left"
  | "pointer-right"
  | "pointer-mid";

export interface ArrayElement {
  value: number | string;
  index: number;
  state: ElementState;
  label?: string; // e.g. "left", "right", "mid"
}

export interface TreeNodeState {
  id: string;
  value: number | string | null;
  state: ElementState;
  returnValue?: unknown; // shown when function returns from this node
  depth: number;
  position: number; // horizontal position within depth
}

export interface TreeEdgeState {
  id: string;
  source: string;
  target: string;
  state: "default" | "active" | "traversed";
  label?: string; // Optional label, e.g., "L" or "R"
}

export interface LinkedListNodeState {
  id: string;
  value: unknown;
  state: ElementState;
  pointers?: string[]; // pointer labels (e.g. ["prev"], ["curr"], ["next"], ["slow", "fast"])
  nextId?: string | null; // pointer destination ID (null means points to NULL)
  isHead?: boolean;
}

export interface StackElement {
  id: string;
  value: unknown;
  state: ElementState;
}

export interface GridCell {
  row: number;
  col: number;
  type: "empty" | "wall" | "start" | "end";
  state: "default" | "visited" | "current" | "path" | "exploring";
}

export type VisualizationState =
  | { type: "array"; elements: ArrayElement[]; pointers?: Record<string, number> }
  | { type: "grid"; grid: GridCell[][]; current?: { row: number; col: number } }
  | {
      type: "tree";
      nodes: TreeNodeState[];
      edges: TreeEdgeState[];
      currentNodeId?: string;
    }
  | {
      type: "linked-list";
      nodes: LinkedListNodeState[];
      cycleTargetId?: string | null;
      pointers?: Record<string, string | null>;
    }
  | { type: "stack"; elements: StackElement[] }
  | { type: "none" };

// -----------------------------------------------------------
// Structured Step Explanations (What / Why / Invariant)
// -----------------------------------------------------------
export interface StructuredExplanation {
  what: string;      // 1. What happened?
  why: string;       // 2. Why did it happen?
  invariant: string; // 3. What condition or invariant explains the decision?
}

// -----------------------------------------------------------
// Execution Step (one UI frame = one step)
// -----------------------------------------------------------
export interface ExecutionStep {
  id: number;
  line: number;
  event: ExecutionEvent;
  functionName: string;
  callStack: CallFrame[];
  localVariables: VariableMap;        // variables of the topmost frame
  visualizationState: VisualizationState;
  explanation: string;
  structuredExplanation?: StructuredExplanation;
  returnValue?: unknown;
  isRecursiveCall?: boolean;
  depth?: number;                      // recursion depth
}

// -----------------------------------------------------------
// Algorithm Interface
// -----------------------------------------------------------
export type Difficulty = "Easy" | "Medium" | "Hard";
export type AlgorithmCategory =
  | "Arrays"
  | "Two Pointer"
  | "Sorting"
  | "Trees"
  | "Recursion"
  | "Linked List"
  | "Stack"
  | "Queue"
  | "Graphs"
  | "Dynamic Programming";

export type VisualizationType = "array" | "tree" | "linked-list" | "stack" | "grid" | "none";

export interface AlgorithmComplexity {
  time: string;
  space: string;
  timeDescription?: string;
  spaceDescription?: string;
}

export interface VisualizableAlgorithm<TInput = unknown> {
  id: string;
  name: string;
  category: AlgorithmCategory;
  difficulty: Difficulty;
  description: string;

  /** The source code shown in Monaco */
  sourceCode: string | Record<string, string>;
  /** Default language for Monaco syntax highlighting */
  language: string;

  /** Parse raw user input string into typed input */
  parseInput(raw: unknown): TInput;

  /** Validate input before execution */
  validateInput(input: TInput): { valid: boolean; error?: string };

  /** Run the algorithm and return all execution steps */
  execute(input: TInput): ExecutionStep[];

  /** Initial visualization state (before execution starts) */
  initialVisualizationState(input: TInput): VisualizationState;

  complexity: AlgorithmComplexity;
  visualizationType: VisualizationType;

  /** Default example input shown in the UI */
  defaultInput: string;
  /** Tags for filtering */
  tags: string[];
}

// ExecutionStore type is defined in useExecutionController.ts

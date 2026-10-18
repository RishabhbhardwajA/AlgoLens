/**
 * AlgoLens — Frontend Multi-Language Execution & Tracing Types
 */

export type ExecutionStatus =
  | "SUCCESS"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export type TraceEventType =
  | "LINE"
  | "CALL"
  | "RETURN"
  | "VARIABLE_CHANGE"
  | "EXCEPTION"
  | "TERMINATION";

export interface StackFrameSummary {
  depth: number;
  functionName: string;
  fileName: string;
  line: number;
}

export interface VariableValue {
  name: string;
  type: string;
  value: unknown;
  repr: string;
  isChanged?: boolean;
  isArray?: boolean;
  elements?: unknown[];
  length?: number;
  properties?: Record<string, unknown>;
  truncated?: boolean;
}

export interface ExceptionSummary {
  type: string;
  message: string;
  line: number;
}

export interface TraceEvent {
  seq: number;
  type: TraceEventType;
  line: number;
  column?: number;
  functionName: string;
  stackFrames: StackFrameSummary[];
  variables: Record<string, VariableValue>;
  returnValue?: VariableValue;
  exception?: ExceptionSummary;
  explanation?: string;
}

export interface TraceResult {
  success: boolean;
  language: string;
  events: TraceEvent[];
  truncated: boolean;
  totalEvents: number;
  error?: string;
  compilationError?: string;
  compilationOutput?: string;
  stdout: string;
  stderr: string;
  limitations: string[];
}

export interface LanguageCapability {
  language: string;
  displayName: string;
  version: string;
  judge0Id?: number;
  supportsRun: boolean;
  supportsTrace: boolean;
  limitations: string[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: ExecutionStatus;
  exitCode: number | null;
  timeMs?: number;
  memoryKb?: number;
  isMock?: boolean;
}

export interface RunRequest {
  language: string;
  sourceCode: string;
  stdin?: string;
  cpuTimeLimit?: number;
  cpuTimeLimitSec?: number;
  memoryLimitKb?: number;
}

export interface TraceRequest {
  language: string;
  sourceCode: string;
  stdin?: string;
  maxEvents?: number;
  maxSteps?: number;
  timeoutMs?: number;
  inputArray?: number[];
  targetValue?: number;
}

import type { ExecutionStep } from "@/engine/executionTypes";

export interface SocraticTutorResponse {
  concept: string;
  tier1Observation: string;
  tier2GuidingQuestion: string;
  tier3ActionHint: string;
  source: "gemini" | "deterministic-fallback";
}

export interface AdversarialEdgeCase {
  id: string;
  title: string;
  input: string;
  adversarialReason: string;
  expectedBehavior: string;
}

export async function askSocraticTutor(params: {
  algorithmId: string;
  code?: string;
  step: ExecutionStep | { line: number; functionName?: string; localVariables?: Record<string, unknown>; event?: { type: string; [key: string]: unknown }; callStack?: Array<{ functionName: string; line: number }> };
  userQuery?: string;
  exception?: { type?: string; message?: string; line?: number } | null;
  signal?: AbortSignal;
}): Promise<SocraticTutorResponse> {
  const response = await fetch("/api/gemini/tutor", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal: params.signal,
    body: JSON.stringify({
      algorithmId: params.algorithmId,
      code: params.code,
      userQuery: params.userQuery,
      step: {
        line: params.step.line,
        functionName: params.step.functionName,
        event: params.step.event,
        variables: params.step.localVariables,
        callStack: (params.step.callStack || []).map((f) => ({
          functionName: f.functionName,
          line: f.line,
        })),
        exception: params.exception || null,
      },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.tutor) {
    throw new Error(data?.message || "Failed to consult Socratic Tutor.");
  }
  return data.tutor as SocraticTutorResponse;
}

export async function generateAdversarialEdgeCases(params: {
  algorithmId: string;
  algorithmCategory?: string;
  code?: string;
  defaultInput?: string;
  signal?: AbortSignal;
}): Promise<{ cases: AdversarialEdgeCase[]; source: string }> {
  const { signal, ...bodyParams } = params;
  const response = await fetch("/api/gemini/edge-cases", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(bodyParams),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.cases)) {
    throw new Error(data?.message || "Failed to generate adversarial edge cases.");
  }
  return { cases: data.cases, source: data.source || "deterministic-fallback" };
}

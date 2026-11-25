import { config } from "../config/env.js";

export interface TraceStepSnapshot {
  line: number;
  functionName?: string;
  event?: { type: string; [key: string]: unknown };
  variables?: Record<string, unknown>;
  callStack?: Array<{ functionName: string; line: number }>;
  exception?: { type?: string; message?: string; line?: number } | null;
}

export interface SocraticTutorRequest {
  algorithmId: string;
  code?: string;
  step: TraceStepSnapshot;
  userQuery?: string;
  hintLevel?: 1 | 2 | 3;
}

export interface SocraticTutorResponse {
  concept: string;
  tier1Observation: string;
  tier2GuidingQuestion: string;
  tier3ActionHint: string;
  source: "gemini" | "deterministic-fallback";
}

export interface EdgeCaseRequest {
  algorithmId: string;
  algorithmCategory?: string;
  code?: string;
  defaultInput?: string;
}

export interface AdversarialEdgeCase {
  id: string;
  title: string;
  input: string;
  adversarialReason: string;
  expectedBehavior: string;
}

export interface EdgeCaseResponse {
  cases: AdversarialEdgeCase[];
  source: "gemini" | "deterministic-fallback";
}

function formatSnapshotContext(step: TraceStepSnapshot): string {
  const varsJson = JSON.stringify(step.variables || {}, null, 2).slice(0, 1500);
  const framesStr = (step.callStack || [])
    .map((f) => `${f.functionName}() @ line ${f.line}`)
    .join(" -> ");
  const exStr = step.exception
    ? `EXCEPTION: ${step.exception.type || "Error"} (${step.exception.message || ""}) at line ${step.exception.line ?? step.line}`
    : "No exception at this step.";

  return [
    `Line: ${step.line}`,
    `Active Function: ${step.functionName || "main"}`,
    `Event Type: ${step.event?.type || "STEP"}`,
    framesStr ? `Call Stack: ${framesStr}` : "",
    exStr,
    `Local Variables:\n${varsJson}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSocraticTutorPrompt(req: SocraticTutorRequest): string {
  const snapshotContext = formatSnapshotContext(req.step);
  const codeExcerpt = (req.code || "").slice(0, 4000);
  const query = req.userQuery?.trim() || "Why did execution reach this state or how do I fix any issue here?";

  return `You are a Computer Science Educator tutoring a student using the Socratic method on AlgoLens.
NEVER give away the full solution code upfront. Help the student reason from the actual execution snapshot below.

Algorithm / Problem: ${req.algorithmId}
Student Question: ${query}

Execution Trace Snapshot:
${snapshotContext}

Code Context:
${codeExcerpt}

Respond ONLY with valid raw JSON matching this exact schema (no markdown fences):
{
  "concept": "Short name of the core DSA concept or invariant (3-8 words)",
  "tier1Observation": "Objective observation referencing exact variable names/values/lines from the snapshot above.",
  "tier2GuidingQuestion": "A targeted Socratic question prompting the student to reason about bounds, pointers, or invariants.",
  "tier3ActionHint": "A concrete next debugging or algorithmic fix hint without pasting the full rewritten solution."
}`;
}

function buildEdgeCasePrompt(req: EdgeCaseRequest): string {
  return `You are a Principal CS Educator designing adversarial test cases to help students catch bugs in DSA code.

Algorithm: ${req.algorithmId}
Category: ${req.algorithmCategory || "General"}
Sample Default Input Format: ${req.defaultInput || "[1, 3, 5, 7]"}
Code Snippet Excerpt:
${(req.code || "").slice(0, 3000)}

Generate exactly 4 challenging adversarial edge-case inputs strictly matching the exact JSON format of the Default Input shown above. Include:
1. Minimum/Empty boundary (e.g. 1 element or smallest allowed input)
2. All duplicates / ties
3. Reverse-sorted / strictly decreasing values
4. Out-of-bounds / missing target / negative numbers

Respond ONLY with a valid JSON object matching this exact schema:
{
  "cases": [
    {
      "id": "unique-kebab-id",
      "title": "Short descriptive title",
      "input": "Exact serialized input matching Default Input format",
      "adversarialReason": "Why naive implementations fail on this input",
      "expectedBehavior": "What a correct implementation should return/do"
    }
  ]
}`;
}

export function extractJsonFromModelText<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  return JSON.parse(jsonCandidate) as T;
}

async function callGeminiJson<T>(prompt: string): Promise<T> {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(config.GEMINI_API_KEY)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    throw new Error("Gemini returned empty candidate text");
  }

  return extractJsonFromModelText<T>(text);
}

function buildFallbackSocraticHint(req: SocraticTutorRequest): SocraticTutorResponse {
  const { step } = req;
  const vars = step.variables || {};
  const varEntries = Object.entries(vars)
    .slice(0, 5)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");

  if (step.exception || String(step.event?.description || "").includes("Exception")) {
    const errMsg = step.exception?.message || String(step.event?.description || "Runtime Exception");
    return {
      concept: "Array Bounds & Defensive Indexing",
      tier1Observation: `Execution triggered a runtime fault on Line ${step.line}${varEntries ? ` while local state held (${varEntries})` : ""}. Detail: ${errMsg}.`,
      tier2GuidingQuestion:
        "Before indexing into an array or accessing a reference, did your loop condition verify that the index strictly satisfies 0 <= index < length?",
      tier3ActionHint:
        "Inspect the upper and lower loop guard on Line " +
        step.line +
        ". Check whether an index exceeded array length - 1 or dropped to -1.",
      source: "deterministic-fallback",
    };
  }

  const left = vars.left ?? vars.low;
  const right = vars.right ?? vars.high;
  const mid = vars.mid;

  if (left !== undefined && right !== undefined && Number(left) > Number(right)) {
    return {
      concept: "Search Window Crossing Invariant",
      tier1Observation: `On Line ${step.line}, pointer left (${left}) has crossed past pointer right (${right}).`,
      tier2GuidingQuestion:
        "When left > right, how many candidate elements remain inside the closed interval [left, right]?",
      tier3ActionHint:
        "Since the search space [left, right] is now empty, verify whether your loop condition terminates cleanly (e.g., returning -1) or if an element was skipped due to '<' vs '<='.",
      source: "deterministic-fallback",
    };
  }

  if (mid !== undefined && left !== undefined && right !== undefined) {
    return {
      concept: "Interval Partitioning & Midpoint Bounds",
      tier1Observation: `At Line ${step.line}, the search window spans [${left}, ${right}] with midpoint mid=${mid}.`,
      tier2GuidingQuestion:
        "How does the value at index mid compare against your target, and which pointer should exclude mid (+1 or -1) on the next iteration?",
      tier3ActionHint:
        "To avoid infinite loops when left + 1 == right, update pointers using mid + 1 or mid - 1 rather than setting low = mid directly.",
      source: "deterministic-fallback",
    };
  }

  return {
    concept: "Step-by-Step Invariant Verification",
    tier1Observation: `On Line ${step.line} inside ${step.functionName || "main"}(), active variables are ${varEntries || "currently empty"}.`,
    tier2GuidingQuestion:
      "What loop invariant or state transition must hold true immediately after Line " + step.line + " finishes executing?",
    tier3ActionHint:
      "Compare the previous variable values in the Variables Panel with the current step to verify whether state progresses monotonically toward termination.",
    source: "deterministic-fallback",
  };
}

function buildFallbackEdgeCases(req: EdgeCaseRequest): EdgeCaseResponse {
  const id = req.algorithmId.toLowerCase();
  const def = req.defaultInput || "";

  if (id.includes("binary-search") || def.includes("target")) {
    return {
      source: "deterministic-fallback",
      cases: [
        {
          id: "single-element-hit",
          title: "Single-Element Array (Found)",
          input: JSON.stringify({ array: [42], target: 42 }),
          adversarialReason: "Catches strict 'left < right' loop guard bugs that skip 1-element intervals.",
          expectedBehavior: "Returns index 0.",
        },
        {
          id: "target-below-min",
          title: "Target Smaller Than Minimum",
          input: JSON.stringify({ array: [2, 5, 8, 12, 16], target: -5 }),
          adversarialReason: "Drives right pointer to -1 to expose negative index access bugs.",
          expectedBehavior: "Terminates cleanly and returns -1.",
        },
        {
          id: "all-duplicates",
          title: "All Identical Elements",
          input: JSON.stringify({ array: [7, 7, 7, 7, 7], target: 7 }),
          adversarialReason: "Tests midpoint selection behavior on uniform duplicate values.",
          expectedBehavior: "Locates a matching index within [0, 4] in O(log N).",
        },
        {
          id: "two-element-upper",
          title: "Two-Element Array (Upper Boundary)",
          input: JSON.stringify({ array: [10, 20], target: 20 }),
          adversarialReason: "Exposes floor division rounding traps where mid stays at index 0 unless left = mid + 1.",
          expectedBehavior: "Advances left to 1 and finds 20 at index 1.",
        },
      ],
    };
  }

  if (id.includes("sort") || req.algorithmCategory === "Sorting") {
    return {
      source: "deterministic-fallback",
      cases: [
        {
          id: "reverse-sorted",
          title: "Strictly Reverse-Sorted (Worst Case)",
          input: JSON.stringify([99, 75, 50, 25, 10, 2]),
          adversarialReason: "Maximizes swaps/comparisons for O(N^2) sorts and triggers naive pivot degradation.",
          expectedBehavior: "Outputs [2, 10, 25, 50, 75, 99].",
        },
        {
          id: "negative-and-zero",
          title: "Negatives & Zero Values",
          input: JSON.stringify([-12, 0, -45, 7, -1, 0]),
          adversarialReason: "Breaks implementations assuming non-negative numbers.",
          expectedBehavior: "Outputs [-45, -12, -1, 0, 0, 7].",
        },
        {
          id: "already-sorted",
          title: "Already Sorted Input",
          input: JSON.stringify([1, 2, 3, 4, 5, 6]),
          adversarialReason: "Tests early-exit optimizations in adaptive sorts.",
          expectedBehavior: "Verifies order without unnecessary swaps.",
        },
        {
          id: "single-element",
          title: "Single Element",
          input: JSON.stringify([42]),
          adversarialReason: "Catches off-by-one outer loop bounds when n <= 1.",
          expectedBehavior: "Returns [42] with zero swaps.",
        },
      ],
    };
  }

  return {
    source: "deterministic-fallback",
    cases: [
      {
        id: "minimum-valid",
        title: "Minimum Valid Boundary",
        input: def || "[1]",
        adversarialReason: "Tests minimal base-case handling without out-of-bounds loop steps.",
        expectedBehavior: "Completes cleanly in O(1) base steps.",
      },
      {
        id: "duplicates",
        title: "Repeated Identical Elements",
        input: JSON.stringify([5, 5, 5, 5, 5]),
        adversarialReason: "Exposes strict '<' vs '<=' assumptions on repeated values.",
        expectedBehavior: "Handles identical keys without infinite loops.",
      },
      {
        id: "negatives",
        title: "Mixed Negative & Zero Inputs",
        input: JSON.stringify([-10, -3, 0, 4, 15]),
        adversarialReason: "Validates arithmetic and comparison signs on negative elements.",
        expectedBehavior: "Handles negative numbers identically to positives.",
      },
      {
        id: "reverse-order",
        title: "Descending Order Input",
        input: JSON.stringify([20, 15, 10, 5, 1]),
        adversarialReason: "Stresses worst-case traversal and backtracking behavior.",
        expectedBehavior: "Produces deterministic output without exceeding step budget.",
      },
    ],
  };
}

export const geminiService = {
  async askSocraticTutor(req: SocraticTutorRequest): Promise<SocraticTutorResponse> {
    if (!config.GEMINI_API_KEY) {
      return buildFallbackSocraticHint(req);
    }

    try {
      const prompt = buildSocraticTutorPrompt(req);
      const parsed = await callGeminiJson<Omit<SocraticTutorResponse, "source">>(prompt);
      if (
        !parsed ||
        typeof parsed.tier1Observation !== "string" ||
        typeof parsed.tier2GuidingQuestion !== "string"
      ) {
        return buildFallbackSocraticHint(req);
      }
      return {
        concept: parsed.concept || "Algorithm Execution Analysis",
        tier1Observation: parsed.tier1Observation,
        tier2GuidingQuestion: parsed.tier2GuidingQuestion,
        tier3ActionHint: parsed.tier3ActionHint || "Step forward and observe the invariant.",
        source: "gemini",
      };
    } catch {
      // Fail safe to trace-grounded deterministic tutor when offline/throttled
      return buildFallbackSocraticHint(req);
    }
  },

  async generateAdversarialEdgeCases(req: EdgeCaseRequest): Promise<EdgeCaseResponse> {
    if (!config.GEMINI_API_KEY) {
      return buildFallbackEdgeCases(req);
    }

    try {
      const prompt = buildEdgeCasePrompt(req);
      const parsed = await callGeminiJson<{ cases?: AdversarialEdgeCase[] }>(prompt);
      if (!parsed || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
        return buildFallbackEdgeCases(req);
      }
      return {
        cases: parsed.cases.slice(0, 4).map((c, idx) => ({
          id: c.id || `edge-${idx + 1}`,
          title: c.title || `Edge Case ${idx + 1}`,
          input: typeof c.input === "string" ? c.input : JSON.stringify(c.input),
          adversarialReason: c.adversarialReason || "Tests boundary invariant.",
          expectedBehavior: c.expectedBehavior || "Should terminate accurately.",
        })),
        source: "gemini",
      };
    } catch {
      return buildFallbackEdgeCases(req);
    }
  },
};

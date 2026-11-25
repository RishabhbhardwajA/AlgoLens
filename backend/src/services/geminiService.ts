import crypto from "node:crypto";
import { config } from "../config/env.js";
import { db } from "../database/database.js";

export interface TraceStepSnapshot {
  line: number;
  functionName?: string;
  event?: { type: string; [key: string]: unknown };
  variables?: Record<string, unknown>;
  callStack?: Array<{ functionName: string; line: number }>;
  exception?: { type?: string; message?: string; line?: number } | null;
}

export interface SocraticTutorRequest {
  userId?: string;
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
  userId?: string;
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

const MAX_CACHE_ENTRIES = 200;
const MAX_CONCURRENT_GEMINI_CALLS = 3;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();
let activeGeminiCalls = 0;
let circuitOpenUntilMs = 0;
let consecutiveUpstreamFailures = 0;

function sha256Short(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function getCachedValue<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  // Refresh LRU order
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value as T;
}

function setCachedValue<T>(key: string, value: T): void {
  const ttlMs = config.GEMINI_CACHE_TTL_MS;
  if (ttlMs <= 0) return;
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) {
      responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function reserveDailyAiQuota(userId?: string): boolean {
  const globalCap = config.GEMINI_GLOBAL_DAILY_CAP;
  const userCap = config.GEMINI_USER_DAILY_CAP;
  if (globalCap <= 0 || (userId && userCap <= 0)) {
    return false;
  }

  const day = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const userScope = userId ? `user:${userId}` : null;

  try {
    const getCountStmt = db.prepare("SELECT count FROM ai_usage_daily WHERE day = ? AND scope = ?");
    const upsertStmt = db.prepare(`
      INSERT INTO ai_usage_daily (day, scope, count, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(day, scope) DO UPDATE SET
        count = count + 1,
        updated_at = excluded.updated_at
    `);

    const globalRow = getCountStmt.get(day, "global") as { count: number } | undefined;
    if ((globalRow?.count ?? 0) >= globalCap) {
      return false;
    }

    if (userScope) {
      const userRow = getCountStmt.get(day, userScope) as { count: number } | undefined;
      if ((userRow?.count ?? 0) >= userCap) {
        return false;
      }
    }

    upsertStmt.run(day, "global", nowIso);
    if (userScope) {
      upsertStmt.run(day, userScope, nowIso);
    }
    return true;
  } catch (err) {
    console.warn("[Gemini Quota Check Warning]:", err);
    return false;
  }
}

/**
 * Extracts a compact code window centered on the active trace line to minimize Gemini token usage.
 */
function extractCompactCodeWindow(code: string | undefined, focusLine: number, maxChars: number): string {
  if (!code) return "";
  const lines = code.split("\n");
  if (lines.length <= 45 && code.length <= maxChars) {
    return code;
  }
  const zeroLine = Math.max(0, Math.min(lines.length - 1, (focusLine || 1) - 1));
  const start = Math.max(0, zeroLine - 20);
  const end = Math.min(lines.length, zeroLine + 24);
  return lines
    .slice(start, end)
    .map((lineText, idx) => `${start + idx + 1}: ${lineText}`)
    .join("\n")
    .slice(0, maxChars);
}

function formatSnapshotContext(step: TraceStepSnapshot): string {
  const varsJson = JSON.stringify(step.variables || {}).slice(0, 900);
  const framesStr = (step.callStack || [])
    .slice(0, 6)
    .map((f) => `${f.functionName}()@${f.line}`)
    .join(" -> ");
  const exStr = step.exception
    ? `EXCEPTION: ${step.exception.type || "Error"} (${(step.exception.message || "").slice(0, 200)}) at line ${step.exception.line ?? step.line}`
    : "No exception.";

  return [
    `Line: ${step.line} | Fn: ${step.functionName || "main"} | Event: ${step.event?.type || "STEP"}`,
    framesStr ? `Stack: ${framesStr}` : "",
    exStr,
    `Vars: ${varsJson}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSocraticTutorPrompt(req: SocraticTutorRequest): string {
  const snapshotContext = formatSnapshotContext(req.step);
  const codeExcerpt = extractCompactCodeWindow(req.code, req.step.line, 1800);
  const query = (
    req.userQuery?.trim() || "Why did execution reach this state or how do I fix any issue here?"
  ).slice(0, 400);

  return `Socratic CS tutor for AlgoLens. Be concise. Do NOT paste full solution code.
Algorithm: ${req.algorithmId}
Question: ${query}

Snapshot:
${snapshotContext}

Code Window:
${codeExcerpt}

Return raw JSON only:
{
  "concept": "Core DSA concept/invariant (3-8 words)",
  "tier1Observation": "Concise observation citing exact variables/line from snapshot.",
  "tier2GuidingQuestion": "Focused Socratic question about bounds, pointers, or invariants.",
  "tier3ActionHint": "Concrete debugging or algorithmic next hint without full solution."
}`;
}

function buildEdgeCasePrompt(req: EdgeCaseRequest): string {
  return `CS educator creating 4 concise adversarial test inputs for AlgoLens.
Algorithm: ${req.algorithmId} (${req.algorithmCategory || "General"})
Default Input: ${(req.defaultInput || "[1, 3, 5, 7]").slice(0, 400)}
Code Excerpt:
${(req.code || "").slice(0, 1200)}

Include: (1) minimum/single-element, (2) all duplicates, (3) reverse-sorted, (4) missing target or negatives. Match exact Default Input format.
Return raw JSON only:
{
  "cases": [
    {
      "id": "kebab-id",
      "title": "Short title",
      "input": "Exact serialized input string",
      "adversarialReason": "Why naive code fails",
      "expectedBehavior": "Expected output"
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

function openCircuitBreaker(status: number | "network"): void {
  if (status === 429) {
    circuitOpenUntilMs = Date.now() + 5 * 60 * 1000;
    console.warn("[Gemini Circuit Breaker] Upstream quota/rate-limited (429). Using fallback for 5m.");
    return;
  }
  if (status === 401 || status === 403) {
    circuitOpenUntilMs = Date.now() + 15 * 60 * 1000;
    console.warn(`[Gemini Circuit Breaker] Upstream auth error (${status}). Using fallback for 15m.`);
    return;
  }
  consecutiveUpstreamFailures += 1;
  if (consecutiveUpstreamFailures >= 3) {
    circuitOpenUntilMs = Date.now() + 60 * 1000;
    console.warn("[Gemini Circuit Breaker] 3 consecutive failures. Using fallback for 60s.");
  }
}

async function callGeminiJson<T>(prompt: string, userId?: string): Promise<T | null> {
  if (
    process.env.NODE_ENV === "test" ||
    !config.GEMINI_ENABLED ||
    !config.GEMINI_API_KEY
  ) {
    return null;
  }

  if (Date.now() < circuitOpenUntilMs || activeGeminiCalls >= MAX_CONCURRENT_GEMINI_CALLS) {
    return null;
  }

  if (!reserveDailyAiQuota(userId)) {
    return null;
  }

  activeGeminiCalls += 1;
  try {
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
          maxOutputTokens: config.GEMINI_MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      openCircuitBreaker(response.status);
      return null;
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      openCircuitBreaker("network");
      return null;
    }

    consecutiveUpstreamFailures = 0;
    return extractJsonFromModelText<T>(text);
  } catch {
    openCircuitBreaker("network");
    return null;
  } finally {
    activeGeminiCalls = Math.max(0, activeGeminiCalls - 1);
  }
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

function runDeduplicated<T>(cacheKey: string, producer: () => Promise<T>): Promise<T> {
  const cached = getCachedValue<T>(cacheKey);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  const existingInflight = inflightRequests.get(cacheKey);
  if (existingInflight) {
    return existingInflight as Promise<T>;
  }

  const work = producer().finally(() => {
    inflightRequests.delete(cacheKey);
  });
  inflightRequests.set(cacheKey, work);
  return work;
}

export const geminiService = {
  async askSocraticTutor(req: SocraticTutorRequest): Promise<SocraticTutorResponse> {
    if (process.env.NODE_ENV === "test" || !config.GEMINI_ENABLED || !config.GEMINI_API_KEY) {
      return buildFallbackSocraticHint(req);
    }

    const cacheKey = `tutor:${sha256Short(
      JSON.stringify({
        algorithmId: req.algorithmId,
        line: req.step.line,
        fn: req.step.functionName || "",
        vars: req.step.variables || {},
        ex: req.step.exception?.type || "",
        query: (req.userQuery || "").trim().slice(0, 200),
      })
    )}`;

    return runDeduplicated(cacheKey, async () => {
      try {
        const prompt = buildSocraticTutorPrompt(req);
        const parsed = await callGeminiJson<Omit<SocraticTutorResponse, "source">>(prompt, req.userId);
        if (
          !parsed ||
          typeof parsed.tier1Observation !== "string" ||
          typeof parsed.tier2GuidingQuestion !== "string"
        ) {
          return buildFallbackSocraticHint(req);
        }

        const result: SocraticTutorResponse = {
          concept: String(parsed.concept || "Algorithm Execution Analysis").slice(0, 120),
          tier1Observation: parsed.tier1Observation.slice(0, 700),
          tier2GuidingQuestion: parsed.tier2GuidingQuestion.slice(0, 700),
          tier3ActionHint: String(
            parsed.tier3ActionHint || "Step forward and observe the invariant."
          ).slice(0, 700),
          source: "gemini",
        };
        setCachedValue(cacheKey, result);
        return result;
      } catch {
        // Fail safe to trace-grounded deterministic tutor when offline/throttled
        return buildFallbackSocraticHint(req);
      }
    });
  },

  async generateAdversarialEdgeCases(req: EdgeCaseRequest): Promise<EdgeCaseResponse> {
    if (process.env.NODE_ENV === "test" || !config.GEMINI_ENABLED || !config.GEMINI_API_KEY) {
      return buildFallbackEdgeCases(req);
    }

    const cacheKey = `edge:${sha256Short(
      JSON.stringify({
        algorithmId: req.algorithmId,
        category: req.algorithmCategory || "",
        defaultInput: (req.defaultInput || "").slice(0, 400),
        codeHash: sha256Short((req.code || "").slice(0, 1200)),
      })
    )}`;

    return runDeduplicated(cacheKey, async () => {
      try {
        const prompt = buildEdgeCasePrompt(req);
        const parsed = await callGeminiJson<{ cases?: AdversarialEdgeCase[] }>(prompt, req.userId);
        if (!parsed || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
          return buildFallbackEdgeCases(req);
        }

        const result: EdgeCaseResponse = {
          cases: parsed.cases.slice(0, 4).map((c, idx) => ({
            id: String(c.id || `edge-${idx + 1}`).slice(0, 60),
            title: String(c.title || `Edge Case ${idx + 1}`).slice(0, 100),
            input: (typeof c.input === "string" ? c.input : JSON.stringify(c.input)).slice(0, 600),
            adversarialReason: String(c.adversarialReason || "Tests boundary invariant.").slice(0, 300),
            expectedBehavior: String(c.expectedBehavior || "Should terminate accurately.").slice(0, 300),
          })),
          source: "gemini",
        };
        setCachedValue(cacheKey, result);
        return result;
      } catch {
        return buildFallbackEdgeCases(req);
      }
    });
  },
};

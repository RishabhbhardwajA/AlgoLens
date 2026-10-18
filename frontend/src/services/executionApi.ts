import type {
  ExecutionResult,
  LanguageCapability,
  RunRequest,
  TraceRequest,
  TraceResult,
} from "../types/multiLanguage";

const BASE_URL = "/api/execution";

export async function fetchCapabilities(): Promise<LanguageCapability[]> {
  try {
    const res = await fetch(`${BASE_URL}/capabilities`);
    if (!res.ok) {
      throw new Error(`Failed to fetch language capabilities (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.languages || [];
  } catch (err: any) {
    console.error("Error fetching language capabilities:", err);
    return [
      {
        language: "java",
        displayName: "Java",
        version: "OpenJDK 17 / 24",
        supportsRun: true,
        supportsTrace: true,
        limitations: ["Captured up to 500 steps"],
      },
      {
        language: "python",
        displayName: "Python",
        version: "3.10+",
        supportsRun: true,
        supportsTrace: false,
        limitations: ["Trace coming soon"],
      },
      {
        language: "cpp",
        displayName: "C++",
        version: "GCC 11+",
        supportsRun: true,
        supportsTrace: false,
        limitations: ["Trace coming soon"],
      },
      {
        language: "javascript",
        displayName: "JavaScript",
        version: "Node.js 18+",
        supportsRun: true,
        supportsTrace: false,
        limitations: ["Trace coming soon"],
      },
    ];
  }
}

export async function runCode(req: RunRequest): Promise<ExecutionResult> {
  const res = await fetch(`${BASE_URL}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Execution request failed with status ${res.status}`);
  }

  return await res.json();
}

export async function traceCode(req: TraceRequest): Promise<TraceResult> {
  const res = await fetch(`${BASE_URL}/trace`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Trace request failed with status ${res.status}`);
  }

  return await res.json();
}

import { runCustomAlgorithm } from "./customCodeRunner";

// =========================================================================
// Worker Isolation & Network API Lockdown
// =========================================================================
// Prohibit user code inside the Worker from performing outbound network calls
// (fetch, XHR, WebSocket, EventSource) or dynamic script evaluation (importScripts).
function lockdownWorkerScope(): void {
  const securityViolation = (apiName: string) => () => {
    throw new Error(
      `Security Violation: Network request (${apiName}) is strictly prohibited inside the AlgoLens execution playground.`
    );
  };

  const restrictedApis = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts"];

  for (const api of restrictedApis) {
    try {
      Object.defineProperty(self, api, {
        value: securityViolation(api),
        writable: false,
        configurable: false,
      });
    } catch {
      (self as any)[api] = securityViolation(api);
    }
  }
}

lockdownWorkerScope();

self.onmessage = (
  e: MessageEvent<{ userCode: string; initialArray: number[]; maxSteps?: number }>
) => {
  const { userCode, initialArray, maxSteps } = e.data;
  try {
    const result = runCustomAlgorithm(userCode, initialArray, maxSteps);
    self.postMessage(result);
  } catch (err: unknown) {
    self.postMessage({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      steps: [],
      logs: [],
      finalArray: initialArray,
    });
  }
};

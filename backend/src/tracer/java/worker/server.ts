import express, { type Request, type Response } from "express";
import { LocalJavaTraceExecutor } from "../../../services/execution/javaTraceProvider.js";
import type { TraceRequest } from "../../../types/execution.js";

// Ensure worker role is explicitly flagged in environment
process.env.EXECUTION_ROLE = "worker";

const app = express();
const workerPortFromUrl = (() => {
  try {
    return process.env.JAVA_TRACE_WORKER_URL ? new URL(process.env.JAVA_TRACE_WORKER_URL).port : "";
  } catch {
    return "";
  }
})();
const parsedWorkerPort = parseInt(process.env.JAVA_TRACE_WORKER_PORT || workerPortFromUrl || "5050", 10);
const port = Number.isFinite(parsedWorkerPort) && parsedWorkerPort > 0 ? parsedWorkerPort : 5050;

app.use(express.json({ limit: "64kb" }));

// Security headers: deny framing, nosniff
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// The worker process exclusively runs LocalJavaTraceExecutor with explicit local execution authorization
const traceExecutor = new LocalJavaTraceExecutor({ authorizedForLocal: true });

const MAX_WORKER_CONCURRENT_TRACES = 2;
let activeWorkerTraces = 0;

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AlgoLens Java Trace Worker",
    role: "worker",
    isolation: "Containerized Headless JDI Sandbox",
    activeTraces: activeWorkerTraces,
    maxConcurrentTraces: MAX_WORKER_CONCURRENT_TRACES,
    timestamp: new Date().toISOString(),
  });
});

app.post("/trace", async (req: Request, res: Response) => {
  try {
    const { sourceCode, maxSteps, timeoutMs } = req.body;

    if (!sourceCode || typeof sourceCode !== "string") {
      return res.status(400).json({
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Missing or invalid 'sourceCode' payload.",
        stdout: "",
        stderr: "",
        limitations: [],
      });
    }

    if (activeWorkerTraces >= MAX_WORKER_CONCURRENT_TRACES) {
      return res.status(503).json({
        success: false,
        language: "java",
        events: [],
        truncated: false,
        totalEvents: 0,
        error: "Java trace worker is at capacity (unavailable right now). Please retry in a few seconds.",
        stdout: "",
        stderr: "",
        limitations: [],
      });
    }

    const boundedSteps = Math.min(typeof maxSteps === "number" ? maxSteps : 500, 2000);
    const boundedTimeout = Math.min(typeof timeoutMs === "number" ? timeoutMs : 6000, 10000);

    const traceReq: TraceRequest = {
      language: "java",
      sourceCode,
      maxSteps: boundedSteps,
      timeoutMs: boundedTimeout,
    };

    activeWorkerTraces += 1;
    try {
      const result = await traceExecutor.trace(traceReq);
      return res.json(result);
    } finally {
      activeWorkerTraces = Math.max(0, activeWorkerTraces - 1);
    }
  } catch (err) {
    console.error("[Worker Trace Error]:", err);
    return res.status(500).json({
      success: false,
      language: "java",
      events: [],
      truncated: false,
      totalEvents: 0,
      error: "Internal error in trace worker.",
      stdout: "",
      stderr: "",
      limitations: [],
    });
  }
});

// Boot standalone worker server when started directly
const isDirectExecution = process.argv[1]?.includes("server") && !process.argv[1]?.includes("test");
if (isDirectExecution || process.env.RUN_STANDALONE_WORKER === "true") {
  const workerServer = app.listen(port, "0.0.0.0", () => {
    console.log(`[AlgoLens Java Trace Worker] Listening on port ${port} (isolated worker role)`);
  });
  workerServer.keepAliveTimeout = 5000;
  workerServer.headersTimeout = 10000;
  workerServer.requestTimeout = 20000;

  process.on("unhandledRejection", (reason) => {
    console.error("[Worker UnhandledRejection]:", reason);
  });
}

export default app;

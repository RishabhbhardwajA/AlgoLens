import express, { type Request, type Response } from "express";
import { LocalJavaTraceExecutor } from "../../../services/execution/javaTraceProvider.js";
import type { TraceRequest } from "../../../types/execution.js";

// Ensure worker role is explicitly flagged in environment
process.env.EXECUTION_ROLE = "worker";

const app = express();
const port = parseInt(process.env.PORT || "5050", 10);

app.use(express.json({ limit: "64kb" }));

// Security headers: deny framing, nosniff
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// The worker process exclusively runs LocalJavaTraceExecutor with explicit local execution authorization
const traceExecutor = new LocalJavaTraceExecutor({ authorizedForLocal: true });

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AlgoLens Java Trace Worker",
    role: "worker",
    isolation: "Containerized Headless JDI Sandbox",
    timestamp: new Date().toISOString(),
  });
});

app.post("/trace", async (req: Request, res: Response) => {
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

  const boundedSteps = Math.min(typeof maxSteps === "number" ? maxSteps : 500, 500);
  const boundedTimeout = Math.min(typeof timeoutMs === "number" ? timeoutMs : 6000, 10000);

  const traceReq: TraceRequest = {
    language: "java",
    sourceCode,
    maxSteps: boundedSteps,
    timeoutMs: boundedTimeout,
  };

  const result = await traceExecutor.trace(traceReq);
  return res.json(result);
});

// Boot standalone worker server when started directly
const isDirectExecution = process.argv[1]?.includes("server") && !process.argv[1]?.includes("test");
if (isDirectExecution || process.env.RUN_STANDALONE_WORKER === "true") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`[AlgoLens Java Trace Worker] Listening on port ${port} (isolated worker role)`);
  });
}

export default app;

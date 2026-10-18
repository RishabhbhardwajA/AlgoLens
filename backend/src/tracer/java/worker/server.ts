import express, { type Request, type Response } from "express";
import { JavaTraceProvider } from "../../../services/execution/javaTraceProvider.js";
import type { TraceRequest } from "../../../types/execution.js";

const app = express();
const port = parseInt(process.env.PORT || "5050", 10);

app.use(express.json({ limit: "64kb" }));

// Security headers: deny framing, nosniff
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const traceProvider = new JavaTraceProvider();

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AlgoLens Java Trace Worker",
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

  const result = await traceProvider.trace(traceReq);
  return res.json(result);
});

// Boot standalone worker server when started directly
const isDirectExecution = process.argv[1]?.includes("server") && !process.argv[1]?.includes("test");
if (isDirectExecution || process.env.RUN_STANDALONE_WORKER === "true") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`[AlgoLens Java Trace Worker] Listening on port ${port} (isolated boundary)`);
  });
}

export default app;

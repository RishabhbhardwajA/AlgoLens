import { Router, type Request, type Response } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import executionRoutes from "./executionRoutes.js";
import geminiRoutes from "./geminiRoutes.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AlgoLens Modular API",
    security: "OWASP-compliant headers, rate-limiting & bcrypt/JWT active",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/execution", executionRoutes);
router.use("/gemini", geminiRoutes);

export default router;

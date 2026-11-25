import { Router } from "express";
import { executionController } from "../controllers/executionController.js";
import { requireAuth } from "../middleware/auth.js";
import { runLimiter, traceLimiter } from "../middleware/rateLimiter.js";
import { validateExecutionPayload } from "../validators/executionValidators.js";

const router = Router();

router.get("/capabilities", executionController.getCapabilities);
router.get("/languages", executionController.getCapabilities); // Alias
router.post("/run", requireAuth, runLimiter, validateExecutionPayload("run"), executionController.run);
router.post("/trace", requireAuth, traceLimiter, validateExecutionPayload("trace"), executionController.trace);

export default router;

import { Router } from "express";
import { executionController } from "../controllers/executionController.js";
import { runLimiter, traceLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.get("/capabilities", executionController.getCapabilities);
router.get("/languages", executionController.getCapabilities); // Alias
router.post("/run", runLimiter, executionController.run);
router.post("/trace", traceLimiter, executionController.trace);

export default router;

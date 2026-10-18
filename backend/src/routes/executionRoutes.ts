import { Router } from "express";
import { executionController } from "../controllers/executionController.js";
import { executionLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.get("/capabilities", executionController.getCapabilities);
router.get("/languages", executionController.getCapabilities); // Alias
router.post("/run", executionLimiter, executionController.run);
router.post("/trace", executionLimiter, executionController.trace);

export default router;

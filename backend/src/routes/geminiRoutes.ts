import { Router } from "express";
import { geminiController } from "../controllers/geminiController.js";
import { requireAuth } from "../middleware/auth.js";
import { geminiLimiter, geminiHourlyLimiter } from "../middleware/rateLimiter.js";
import { validateTutorRequest, validateEdgeCaseRequest } from "../validators/geminiValidators.js";

const router = Router();

router.use(requireAuth, geminiLimiter, geminiHourlyLimiter);

router.post("/tutor", validateTutorRequest, geminiController.askTutor);
router.post("/edge-cases", validateEdgeCaseRequest, geminiController.generateEdgeCases);

export default router;

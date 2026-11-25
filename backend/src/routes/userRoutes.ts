import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { userWriteLimiter } from "../middleware/rateLimiter.js";
import {
  validateBookmark,
  validateProgress,
  validateSnippet,
  validateChallengeAttempt,
  validateTraceBookmark,
} from "../validators/userValidators.js";

const router = Router();

router.use(requireAuth);

router.get("/bookmarks", userController.getBookmarks);
router.post("/bookmarks", userWriteLimiter, validateBookmark, userController.addBookmark);
router.delete("/bookmarks/:algorithmId", userWriteLimiter, userController.removeBookmark);

router.get("/progress", userController.getProgress);
router.post("/progress", userWriteLimiter, validateProgress, userController.recordProgress);

router.get("/snippets", userController.getSnippets);
router.post("/snippets", userWriteLimiter, validateSnippet, userController.saveSnippet);
router.delete("/snippets/:id", userWriteLimiter, userController.deleteSnippet);

router.post("/challenges/attempt", userWriteLimiter, validateChallengeAttempt, userController.recordChallengeAttempt);
router.get("/challenges/stats", userController.getChallengeStats);
router.get("/analytics/weak-topics", userController.getWeakTopics);

router.get("/traces/bookmarks", userController.getTraceBookmarks);
router.post("/traces/bookmarks", userWriteLimiter, validateTraceBookmark, userController.addTraceBookmark);
router.delete("/traces/bookmarks/:id", userWriteLimiter, userController.removeTraceBookmark);

export default router;

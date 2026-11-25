import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
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
router.post("/bookmarks", validateBookmark, userController.addBookmark);
router.delete("/bookmarks/:algorithmId", userController.removeBookmark);

router.get("/progress", userController.getProgress);
router.post("/progress", validateProgress, userController.recordProgress);

router.get("/snippets", userController.getSnippets);
router.post("/snippets", validateSnippet, userController.saveSnippet);
router.delete("/snippets/:id", userController.deleteSnippet);

router.post("/challenges/attempt", validateChallengeAttempt, userController.recordChallengeAttempt);
router.get("/challenges/stats", userController.getChallengeStats);
router.get("/analytics/weak-topics", userController.getWeakTopics);

router.get("/traces/bookmarks", userController.getTraceBookmarks);
router.post("/traces/bookmarks", validateTraceBookmark, userController.addTraceBookmark);
router.delete("/traces/bookmarks/:id", userController.removeTraceBookmark);

export default router;

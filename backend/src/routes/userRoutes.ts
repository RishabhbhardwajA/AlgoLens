import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBookmark,
  validateProgress,
  validateSnippet,
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

export default router;

import type { Request, Response, NextFunction } from "express";
import { userService } from "../services/userService.js";
import { sanitizeString } from "../utils/sanitizer.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const userController = {
  getBookmarks(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const bookmarks = userService.getBookmarks(authReq.user!.id);
    return res.json({ success: true, bookmarks });
  },

  addBookmark(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { algorithmId } = req.body;
    const bookmarks = userService.addBookmark(authReq.user!.id, algorithmId.trim());
    return res.json({ success: true, message: "Algorithm bookmarked.", bookmarks });
  },

  removeBookmark(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const rawId = req.params.algorithmId;
    const algorithmId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!algorithmId) {
      return res.status(400).json({ error: "Validation Error", message: "algorithmId is required." });
    }
    const bookmarks = userService.removeBookmark(authReq.user!.id, algorithmId);
    return res.json({ success: true, message: "Bookmark removed.", bookmarks });
  },

  getProgress(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const progress = userService.getProgress(authReq.user!.id);
    return res.json({ success: true, progress });
  },

  recordProgress(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { algorithmId, completed, quiz_score, steps_explored } = req.body;
    const record = userService.recordProgress(authReq.user!.id, algorithmId.trim(), {
      completed,
      quiz_score,
      steps_explored,
    });
    return res.json({ success: true, message: "Progress recorded.", record });
  },

  getSnippets(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const snippets = userService.getSnippets(authReq.user!.id);
    return res.json({ success: true, snippets });
  },

  saveSnippet(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { title, code, input_data, algorithm_category } = req.body;
    const snippet = userService.saveSnippet(authReq.user!.id, {
      title: sanitizeString(title),
      code,
      input_data: input_data || "",
      algorithm_category: sanitizeString(algorithm_category || "custom"),
    });
    return res.status(201).json({ success: true, message: "Snippet saved successfully.", snippet });
  },

  deleteSnippet(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ error: "Validation Error", message: "Snippet ID is required." });
    }
    const deleted = userService.deleteSnippet(authReq.user!.id, id);
    if (!deleted) {
      return res.status(404).json({ error: "Not Found", message: "Snippet not found or unauthorized." });
    }
    return res.json({ success: true, message: "Snippet deleted successfully." });
  },

  recordChallengeAttempt(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { algorithmId, stepIndex, challengeType, selectedOption, correctOption, isCorrect, xpEarned } = req.body;
    const attempt = userService.recordChallengeAttempt(authReq.user!.id, {
      algorithmId: sanitizeString(algorithmId),
      stepIndex,
      challengeType: sanitizeString(challengeType),
      selectedOption: sanitizeString(selectedOption),
      correctOption: sanitizeString(correctOption),
      isCorrect: Boolean(isCorrect),
      xpEarned: typeof xpEarned === "number" ? Math.max(0, xpEarned) : 0,
    });
    const stats = userService.getChallengeStats(authReq.user!.id);
    return res.status(201).json({ success: true, attempt, stats });
  },

  getChallengeStats(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const stats = userService.getChallengeStats(authReq.user!.id);
    return res.json({ success: true, stats });
  },

  getWeakTopics(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const weakTopics = userService.getWeakTopicsAnalytics(authReq.user!.id);
    return res.json({ success: true, weakTopics });
  },

  getTraceBookmarks(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const traceBookmarks = userService.getTraceBookmarks(authReq.user!.id);
    return res.json({ success: true, traceBookmarks });
  },

  addTraceBookmark(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { algorithmId, stepIndex, stepSnapshot, note } = req.body;
    const serializedSnapshot =
      typeof stepSnapshot === "string" ? stepSnapshot : JSON.stringify(stepSnapshot);
    const bookmark = userService.addTraceBookmark(authReq.user!.id, {
      algorithmId: sanitizeString(algorithmId),
      stepIndex,
      stepSnapshot: serializedSnapshot.slice(0, 20000),
      note: note ? sanitizeString(note) : "",
    });
    return res.status(201).json({ success: true, bookmark });
  },

  removeTraceBookmark(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ error: "Validation Error", message: "Bookmark ID is required." });
    }
    const deleted = userService.removeTraceBookmark(authReq.user!.id, id);
    if (!deleted) {
      return res.status(404).json({ error: "Not Found", message: "Trace bookmark not found." });
    }
    return res.json({ success: true, message: "Trace bookmark removed." });
  },
};

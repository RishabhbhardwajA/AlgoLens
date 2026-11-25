import type { Request, Response, NextFunction } from "express";
import { geminiService } from "../services/geminiService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const geminiController = {
  async askTutor(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { algorithmId, code, step, userQuery, hintLevel } = req.body;
      const result = await geminiService.askSocraticTutor({
        userId: authReq.user?.id,
        algorithmId,
        code,
        step,
        userQuery,
        hintLevel,
      });
      return sendSuccess(res, { tutor: result });
    } catch (err) {
      return next(err);
    }
  },

  async generateEdgeCases(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const { algorithmId, algorithmCategory, code, defaultInput } = req.body;
      const result = await geminiService.generateAdversarialEdgeCases({
        userId: authReq.user?.id,
        algorithmId,
        algorithmCategory,
        code,
        defaultInput,
      });
      return sendSuccess(res, { ...result });
    } catch (err) {
      return next(err);
    }
  },
};

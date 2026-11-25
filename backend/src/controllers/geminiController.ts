import type { Request, Response, NextFunction } from "express";
import { geminiService } from "../services/geminiService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const geminiController = {
  async askTutor(req: Request, res: Response, next: NextFunction) {
    try {
      const { algorithmId, code, step, userQuery, hintLevel } = req.body;
      const result = await geminiService.askSocraticTutor({
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
      const { algorithmId, algorithmCategory, code, defaultInput } = req.body;
      const result = await geminiService.generateAdversarialEdgeCases({
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

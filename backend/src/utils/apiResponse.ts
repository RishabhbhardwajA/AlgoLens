import type { Response } from "express";

export function sendSuccess<T extends Record<string, unknown>>(
  res: Response,
  payload: T,
  status = 200
) {
  return res.status(status).json({
    success: true,
    ...payload,
  });
}

export function sendError(
  res: Response,
  error: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  return res.status(status).json({
    error,
    message,
    ...(extra || {}),
  });
}

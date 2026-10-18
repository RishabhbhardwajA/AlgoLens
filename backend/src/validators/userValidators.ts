import type { Request } from "express";
import { createValidator, type ValidationErrorDetail } from "./authValidators.js";

export const validateBookmark = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId } = req.body;

  if (!algorithmId || typeof algorithmId !== "string" || !algorithmId.trim()) {
    errors.push({ field: "algorithmId", message: "A valid algorithm identifier is required." });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(algorithmId.trim())) {
    errors.push({ field: "algorithmId", message: "Algorithm ID contains invalid characters." });
  }

  return errors;
});

export const validateProgress = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, quiz_score, steps_explored } = req.body;

  if (!algorithmId || typeof algorithmId !== "string" || !algorithmId.trim()) {
    errors.push({ field: "algorithmId", message: "algorithmId is required." });
  }

  if (quiz_score !== undefined && (typeof quiz_score !== "number" || quiz_score < 0 || quiz_score > 100)) {
    errors.push({ field: "quiz_score", message: "quiz_score must be a number between 0 and 100." });
  }

  if (steps_explored !== undefined && (typeof steps_explored !== "number" || steps_explored < 0)) {
    errors.push({ field: "steps_explored", message: "steps_explored must be a non-negative number." });
  }

  return errors;
});

export const validateSnippet = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { title, code, input_data } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push({ field: "title", message: "Snippet title is required." });
  } else if (title.trim().length > 100) {
    errors.push({ field: "title", message: "Snippet title cannot exceed 100 characters." });
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    errors.push({ field: "code", message: "Code content cannot be empty." });
  } else if (code.length > 50000) {
    errors.push({ field: "code", message: "Code content cannot exceed 50,000 characters." });
  }

  if (input_data !== undefined && typeof input_data === "string" && input_data.length > 10000) {
    errors.push({ field: "input_data", message: "Input data cannot exceed 10,000 characters." });
  }

  return errors;
});

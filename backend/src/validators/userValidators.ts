import type { Request } from "express";
import { createValidator, type ValidationErrorDetail } from "./authValidators.js";

const ALGORITHM_ID_REGEX = /^[a-zA-Z0-9-_]+$/;
const MAX_ALGORITHM_ID_LENGTH = 80;

function validateAlgorithmIdField(
  algorithmId: unknown,
  errors: ValidationErrorDetail[],
  requiredMessage = "algorithmId is required."
): void {
  if (!algorithmId || typeof algorithmId !== "string" || !algorithmId.trim()) {
    errors.push({ field: "algorithmId", message: requiredMessage });
  } else {
    const trimmed = algorithmId.trim();
    if (trimmed.length > MAX_ALGORITHM_ID_LENGTH) {
      errors.push({
        field: "algorithmId",
        message: `Algorithm ID cannot exceed ${MAX_ALGORITHM_ID_LENGTH} characters.`,
      });
    } else if (!ALGORITHM_ID_REGEX.test(trimmed)) {
      errors.push({ field: "algorithmId", message: "Algorithm ID contains invalid characters." });
    }
  }
}

export const validateBookmark = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  validateAlgorithmIdField(
    req.body.algorithmId,
    errors,
    "A valid algorithm identifier is required."
  );
  return errors;
});

export const validateProgress = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, quiz_score, steps_explored, completed } = req.body;

  validateAlgorithmIdField(algorithmId, errors);

  if (completed !== undefined && typeof completed !== "boolean") {
    errors.push({ field: "completed", message: "completed must be a boolean." });
  }

  if (
    quiz_score !== undefined &&
    (typeof quiz_score !== "number" || !Number.isFinite(quiz_score) || quiz_score < 0 || quiz_score > 100)
  ) {
    errors.push({ field: "quiz_score", message: "quiz_score must be a number between 0 and 100." });
  }

  if (
    steps_explored !== undefined &&
    (typeof steps_explored !== "number" || !Number.isFinite(steps_explored) || steps_explored < 0)
  ) {
    errors.push({ field: "steps_explored", message: "steps_explored must be a non-negative number." });
  }

  return errors;
});

export const validateSnippet = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { title, code, input_data, algorithm_category } = req.body;

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

  if (input_data !== undefined) {
    if (typeof input_data !== "string") {
      errors.push({ field: "input_data", message: "Input data must be a string." });
    } else if (input_data.length > 10000) {
      errors.push({ field: "input_data", message: "Input data cannot exceed 10,000 characters." });
    }
  }

  if (algorithm_category !== undefined) {
    if (typeof algorithm_category !== "string") {
      errors.push({ field: "algorithm_category", message: "algorithm_category must be a string." });
    } else if (algorithm_category.length > 60) {
      errors.push({ field: "algorithm_category", message: "algorithm_category cannot exceed 60 characters." });
    }
  }

  return errors;
});

export const validateChallengeAttempt = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, stepIndex, challengeType, selectedOption, correctOption, isCorrect } = req.body;

  validateAlgorithmIdField(algorithmId, errors);

  if (typeof stepIndex !== "number" || !Number.isFinite(stepIndex) || stepIndex < 0) {
    errors.push({ field: "stepIndex", message: "stepIndex must be a non-negative integer." });
  }
  if (!challengeType || typeof challengeType !== "string" || challengeType.length > 80) {
    errors.push({ field: "challengeType", message: "challengeType is required." });
  }
  if (selectedOption === undefined || typeof selectedOption !== "string" || selectedOption.length > 500) {
    errors.push({ field: "selectedOption", message: "selectedOption is required." });
  }
  if (correctOption === undefined || typeof correctOption !== "string" || correctOption.length > 500) {
    errors.push({ field: "correctOption", message: "correctOption is required." });
  }
  if (typeof isCorrect !== "boolean") {
    errors.push({ field: "isCorrect", message: "isCorrect must be a boolean." });
  }

  return errors;
});

export const validateTraceBookmark = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, stepIndex, stepSnapshot, note } = req.body;

  validateAlgorithmIdField(algorithmId, errors);

  if (typeof stepIndex !== "number" || !Number.isFinite(stepIndex) || stepIndex < 0) {
    errors.push({ field: "stepIndex", message: "stepIndex must be a non-negative number." });
  }
  if (!stepSnapshot || (typeof stepSnapshot !== "string" && typeof stepSnapshot !== "object")) {
    errors.push({ field: "stepSnapshot", message: "stepSnapshot payload is required." });
  } else {
    try {
      const serialized = typeof stepSnapshot === "string" ? stepSnapshot : JSON.stringify(stepSnapshot);
      if (serialized.length > 50000) {
        errors.push({ field: "stepSnapshot", message: "stepSnapshot payload cannot exceed 50,000 characters." });
      }
    } catch {
      errors.push({ field: "stepSnapshot", message: "stepSnapshot payload is not serializable." });
    }
  }
  if (note !== undefined) {
    if (typeof note !== "string") {
      errors.push({ field: "note", message: "Bookmark note must be a string." });
    } else if (note.length > 500) {
      errors.push({ field: "note", message: "Bookmark note cannot exceed 500 characters." });
    }
  }

  return errors;
});

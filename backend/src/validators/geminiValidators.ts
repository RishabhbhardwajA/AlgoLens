import type { Request } from "express";
import { createValidator, type ValidationErrorDetail } from "./authValidators.js";

const MAX_ALGORITHM_ID_LENGTH = 100;
const MAX_CODE_LENGTH = 20000;
const MAX_QUERY_LENGTH = 1000;
const MAX_STEP_BYTES = 32768;
const MAX_CATEGORY_LENGTH = 100;
const MAX_DEFAULT_INPUT_LENGTH = 5000;

function validateOptionalBoundedString(
  value: unknown,
  field: string,
  maxLength: number,
  errors: ValidationErrorDetail[]
): void {
  if (value === undefined) return;
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string.` });
  } else if (value.length > maxLength) {
    errors.push({ field, message: `${field} cannot exceed ${maxLength} characters.` });
  }
}

function validateRequiredAlgorithmId(value: unknown, errors: ValidationErrorDetail[]): void {
  if (!value || typeof value !== "string" || !value.trim()) {
    errors.push({ field: "algorithmId", message: "algorithmId is required." });
  } else if (value.trim().length > MAX_ALGORITHM_ID_LENGTH) {
    errors.push({
      field: "algorithmId",
      message: `algorithmId cannot exceed ${MAX_ALGORITHM_ID_LENGTH} characters.`,
    });
  }
}

export const validateTutorRequest = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, code, step, userQuery, hintLevel } = req.body;

  validateRequiredAlgorithmId(algorithmId, errors);
  validateOptionalBoundedString(code, "code", MAX_CODE_LENGTH, errors);
  validateOptionalBoundedString(userQuery, "userQuery", MAX_QUERY_LENGTH, errors);

  if (hintLevel !== undefined && hintLevel !== 1 && hintLevel !== 2 && hintLevel !== 3) {
    errors.push({ field: "hintLevel", message: "hintLevel must be 1, 2, or 3." });
  }

  if (
    !step ||
    typeof step !== "object" ||
    Array.isArray(step) ||
    typeof step.line !== "number" ||
    !Number.isFinite(step.line)
  ) {
    errors.push({ field: "step", message: "A valid trace step snapshot with 'line' is required." });
  } else {
    try {
      if (JSON.stringify(step).length > MAX_STEP_BYTES) {
        errors.push({
          field: "step",
          message: `Trace step payload cannot exceed ${MAX_STEP_BYTES} bytes.`,
        });
      }
    } catch {
      errors.push({ field: "step", message: "Trace step payload is not serializable." });
    }
  }

  return errors;
});

export const validateEdgeCaseRequest = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { algorithmId, algorithmCategory, code, defaultInput } = req.body;

  validateRequiredAlgorithmId(algorithmId, errors);
  validateOptionalBoundedString(algorithmCategory, "algorithmCategory", MAX_CATEGORY_LENGTH, errors);
  validateOptionalBoundedString(code, "code", MAX_CODE_LENGTH, errors);
  validateOptionalBoundedString(defaultInput, "defaultInput", MAX_DEFAULT_INPUT_LENGTH, errors);

  return errors;
});

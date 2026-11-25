import type { Request, Response, NextFunction } from "express";

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const URL_REGEX = /^https?:\/\/.+$/;

export function createValidator(
  validatorFn: (req: Request) => ValidationErrorDetail[] | Promise<ValidationErrorDetail[]>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = await validatorFn(req);
      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation Error",
          message: errors[0].message,
          details: errors,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const validateRegister = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { name, email, password, confirmPassword } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push({ field: "name", message: "Name must be at least 2 characters long." });
  } else if (name.trim().length > 60) {
    errors.push({ field: "name", message: "Name cannot exceed 60 characters." });
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: "email", message: "Please provide a valid email address (e.g., student@university.edu)." });
  }

  if (!password || typeof password !== "string") {
    errors.push({ field: "password", message: "Password is required." });
  } else {
    if (password.length < 8) {
      errors.push({ field: "password", message: "Password must be at least 8 characters long." });
    } else if (password.length > 128) {
      errors.push({ field: "password", message: "Password cannot exceed 128 characters." });
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.push({
        field: "password",
        message: "Password must contain at least one letter and one number for security.",
      });
    }
  }

  if (confirmPassword === undefined || typeof confirmPassword !== "string" || confirmPassword !== password) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match." });
  }

  return errors;
});

export const validateVerifyOtp = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { email, otp } = req.body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: "email", message: "Please provide a valid email address." });
  }

  if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
    errors.push({ field: "otp", message: "Please enter the valid 6-digit verification code." });
  }

  return errors;
});

export const validateResendOtp = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { email } = req.body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: "email", message: "Please provide a valid email address." });
  }

  return errors;
});

export const validateLogin = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    errors.push({ field: "email", message: "Email address is required." });
  } else if (email.trim().length > 254 || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: "email", message: "Please provide a valid email address." });
  }

  if (!password || typeof password !== "string" || !password) {
    errors.push({ field: "password", message: "Password is required." });
  } else if (password.length > 128) {
    errors.push({ field: "password", message: "Password cannot exceed 128 characters." });
  }

  return errors;
});

export const validateProfileUpdate = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { name, bio, avatar_url } = req.body;

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      errors.push({ field: "name", message: "Name must be at least 2 characters long." });
    } else if (name.trim().length > 60) {
      errors.push({ field: "name", message: "Name cannot exceed 60 characters." });
    }
  }

  if (bio !== undefined) {
    if (typeof bio !== "string") {
      errors.push({ field: "bio", message: "Bio must be a string." });
    } else if (bio.length > 300) {
      errors.push({ field: "bio", message: "Bio cannot exceed 300 characters." });
    }
  }

  if (avatar_url !== undefined) {
    if (typeof avatar_url !== "string") {
      errors.push({ field: "avatar_url", message: "Avatar URL must be a string." });
    } else if (avatar_url !== "") {
      if (avatar_url.length > 500 || !URL_REGEX.test(avatar_url.trim())) {
        errors.push({ field: "avatar_url", message: "Avatar must be a valid HTTP or HTTPS image URL." });
      }
    }
  }

  return errors;
});

export const validateChangePassword = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== "string" || currentPassword.length > 128) {
    errors.push({ field: "currentPassword", message: "Current password is required." });
  }

  if (!newPassword || typeof newPassword !== "string") {
    errors.push({ field: "newPassword", message: "New password is required." });
  } else {
    if (newPassword.length < 8) {
      errors.push({ field: "newPassword", message: "New password must be at least 8 characters long." });
    } else if (newPassword.length > 128) {
      errors.push({ field: "newPassword", message: "New password cannot exceed 128 characters." });
    } else if (newPassword === currentPassword) {
      errors.push({ field: "newPassword", message: "New password cannot be the same as the current password." });
    } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errors.push({ field: "newPassword", message: "New password must contain both letters and numbers." });
    }
  }

  return errors;
});

export const validateForgotPassword = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { email } = req.body;

  if (!email || typeof email !== "string" || email.trim().length > 254 || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  return errors;
});

export const validateResetPassword = createValidator((req: Request) => {
  const errors: ValidationErrorDetail[] = [];
  const { token, newPassword } = req.body;

  if (!token || typeof token !== "string" || token.trim().length === 0 || token.trim().length > 256) {
    errors.push({ field: "token", message: "Password reset token is required." });
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    errors.push({ field: "newPassword", message: "New password must be at least 8 characters long." });
  } else if (newPassword.length > 128) {
    errors.push({ field: "newPassword", message: "New password cannot exceed 128 characters." });
  } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    errors.push({ field: "newPassword", message: "New password must contain at least one letter and one number." });
  }

  return errors;
});

import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validateRegister, authController.register);
router.post("/login", authLimiter, validateLogin, authController.login);
router.get("/me", requireAuth, authController.getMe);
router.put("/profile", requireAuth, validateProfileUpdate, authController.updateProfile);
router.put("/change-password", requireAuth, validateChangePassword, authController.changePassword);
router.post("/forgot-password", authLimiter, validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", authLimiter, validateResetPassword, authController.resetPassword);

export default router;

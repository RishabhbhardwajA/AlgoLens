import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter, oauthInitLimiter, strictAccountLimiter } from "../middleware/rateLimiter.js";
import {
  validateRegister,
  validateVerifyOtp,
  validateResendOtp,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validateRegister, authController.register);
router.post("/verify-otp", authLimiter, validateVerifyOtp, authController.verifyOtp);
router.post("/resend-otp", strictAccountLimiter, validateResendOtp, authController.resendOtp);
router.post("/login", authLimiter, validateLogin, authController.login);
router.post("/logout", authController.logout);

router.get("/providers", authController.getAuthProviders);
router.get("/google", oauthInitLimiter, authController.googleAuthInit);
router.get("/google/callback", authController.googleAuthCallback);

router.get("/me", requireAuth, authController.getMe);
router.put("/profile", requireAuth, validateProfileUpdate, authController.updateProfile);
router.put("/change-password", requireAuth, validateChangePassword, authController.changePassword);
router.post("/forgot-password", strictAccountLimiter, validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", strictAccountLimiter, validateResetPassword, authController.resetPassword);

export default router;

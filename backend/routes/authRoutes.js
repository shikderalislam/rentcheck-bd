import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  deleteMyAccount,
  verifyEmail,
  resendVerification,
  authConfig,
  googleAuth,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/config", authConfig);
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);
router.get("/me", protect, getMe);
router.delete("/me", protect, deleteMyAccount);

export default router;

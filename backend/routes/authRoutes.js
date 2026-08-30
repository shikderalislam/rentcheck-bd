import express from "express";
import { register, login, logout, getMe, deleteMyAccount } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.delete("/me", protect, deleteMyAccount);

export default router;

import asyncHandler from "express-async-handler";
import validator from "validator";
import User from "../models/User.js";
import { generateToken, setTokenCookie } from "../utils/generateToken.js";

// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { displayName, email, password, role } = req.body;

  if (!displayName || !email || !password) {
    res.status(400);
    throw new Error("Display name, email and password are required");
  }
  if (!validator.isEmail(email)) {
    res.status(400);
    throw new Error("Invalid email address");
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const allowedSelfRoles = ["tenant", "landlord"];
  const finalRole = allowedSelfRoles.includes(role) ? role : "tenant";

  const user = await User.create({
    displayName,
    email: email.toLowerCase(),
    passwordHash: password, // hashed in pre-save hook
    role: finalRole,
  });

  const token = generateToken(user._id, user.role);
  setTokenCookie(res, token);

  res.status(201).json({ success: true, user: user.toPublicJSON(), token });
});

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }
  if (user.isSuspended || user.isDeleted) {
    res.status(403);
    throw new Error("This account is unavailable");
  }

  user.lastLoginAt = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();

  const token = generateToken(user._id, user.role);
  setTokenCookie(res, token);

  res.json({ success: true, user: user.toPublicJSON(), token });
});

// @route POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "rc_token");
  res.json({ success: true, message: "Logged out" });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// @route DELETE /api/auth/me
export const deleteMyAccount = asyncHandler(async (req, res) => {
  req.user.isDeleted = true;
  req.user.email = `deleted_${req.user._id}@rentcheckbd.invalid`;
  req.user.displayName = "Deleted User";
  await req.user.save();
  res.clearCookie(process.env.COOKIE_NAME || "rc_token");
  res.json({ success: true, message: "Account deleted" });
});

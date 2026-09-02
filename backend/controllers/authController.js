import asyncHandler from "express-async-handler";
import crypto from "crypto";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { generateToken, setTokenCookie } from "../utils/generateToken.js";

const isProd = () => process.env.NODE_ENV === "production";
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function newVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

// In a real deployment this sends an email. With no mail provider configured we
// log the link and (in non-production only) hand it back to the client so the
// "one-click verify" button in the UI can work during development.
function issueVerification(user) {
  const token = newVerificationToken();
  user.emailVerificationToken = token;
  user.emailVerificationSentAt = new Date();
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${base}/verify-email?token=${token}`;
  console.log(`[email] verification link for ${user.email}: ${verifyUrl}`);
  return isProd() ? { emailSent: true } : { verifyUrl, devToken: token };
}

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

  const verification = issueVerification(user);
  await user.save();

  const token = generateToken(user._id, user.role);
  setTokenCookie(res, token);

  res.status(201).json({
    success: true,
    user: user.toPublicJSON(),
    token,
    verification, // { verifyUrl, devToken } in dev, { emailSent:true } in prod
  });
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

// @route POST /api/auth/verify-email   Body: { token }
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }
  const user = await User.findOne({ emailVerificationToken: token }).select("+emailVerificationToken");
  if (!user) {
    res.status(400);
    throw new Error("This verification link is invalid or already used");
  }
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  if (user.trustLevel < 1) user.trustLevel = 1;
  await user.save();
  res.json({ success: true, user: user.toPublicJSON() });
});

// @route POST /api/auth/resend-verification   (auth)
export const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) {
    return res.json({ success: true, message: "Your email is already verified" });
  }
  const verification = issueVerification(req.user);
  await req.user.save();
  res.json({ success: true, verification });
});

// @route GET /api/auth/config  (public — tells the frontend which sign-in methods are available)
export const authConfig = asyncHandler(async (req, res) => {
  res.json({ success: true, googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

// @route POST /api/auth/google   Body: { credential }  (Google ID token from Google Identity Services)
export const googleAuth = asyncHandler(async (req, res) => {
  if (!googleClient) {
    res.status(503);
    throw new Error("Google sign-in is not configured on the server");
  }
  const { credential } = req.body;
  if (!credential) {
    res.status(400);
    throw new Error("Missing Google credential");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    res.status(401);
    throw new Error("Could not verify your Google sign-in");
  }
  if (!payload?.email || payload.email_verified === false) {
    res.status(401);
    throw new Error("Your Google account email is not verified");
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email }).select("+passwordHash");
  if (user) {
    if (user.isSuspended || user.isDeleted) {
      res.status(403);
      throw new Error("This account is unavailable");
    }
    if (!user.isEmailVerified) user.isEmailVerified = true;
    if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
  } else {
    user = new User({
      displayName: payload.name || email.split("@")[0],
      email,
      passwordHash: crypto.randomBytes(24).toString("hex"), // random — this account signs in with Google
      role: "tenant",
      isEmailVerified: true,
      avatarUrl: payload.picture || "",
      trustLevel: 1,
    });
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

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[process.env.COOKIE_NAME || "rc_token"];

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authenticated");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.isDeleted || user.isSuspended) {
      res.status(401);
      throw new Error("Account unavailable");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Invalid or expired token");
  }
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("Insufficient permissions");
  }
  next();
};

// Attaches req.user if a valid token exists, but does not block the request
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[process.env.COOKIE_NAME || "rc_token"];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && !user.isDeleted && !user.isSuspended) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

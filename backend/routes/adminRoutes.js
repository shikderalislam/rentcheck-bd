import express from "express";
import {
  getDashboardStats,
  getModerationQueue,
  moderateReview,
  getReviewReportQueue,
  resolveReviewReport,
  getVerificationQueue,
  verifyLandlordClaim,
  suspendUser,
  getReportQueue,
  moderateReport,
  getAuditLog,
  listAllReports,
  getReportForAdmin,
  updateReport,
  deleteReport,
  listUsers,
  getUserForAdmin,
  updateUser,
  getSiteSettings,
  updateSiteSetting,
} from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, requireRole("moderator", "admin", "super_admin"));

const adminOnly = requireRole("admin", "super_admin");

// Overview
router.get("/stats", getDashboardStats);
router.get("/audit", adminOnly, getAuditLog);

// Reviews (account-based)
router.get("/reviews/queue", getModerationQueue);
router.put("/reviews/:id/moderate", moderateReview);
router.get("/review-reports/queue", getReviewReportQueue);
router.put("/review-reports/:id/resolve", resolveReviewReport);

// Rental verification + landlord claims
router.get("/verifications/queue", getVerificationQueue);
router.put("/landlords/:id/verify", adminOnly, verifyLandlordClaim);

// Anonymous reports — full management
router.get("/reports", listAllReports);
router.get("/reports/queue", getReportQueue);
router.get("/reports/:id", getReportForAdmin);
router.put("/reports/:id/moderate", moderateReport);
router.patch("/reports/:id", updateReport);
router.delete("/reports/:id", adminOnly, deleteReport);

// Users
router.get("/users", listUsers);
router.get("/users/:id", getUserForAdmin);
router.patch("/users/:id", adminOnly, updateUser);
router.put("/users/:id/suspend", adminOnly, suspendUser);

// Dynamic site content
router.get("/site-settings", getSiteSettings);
router.put("/site-settings/:key", adminOnly, updateSiteSetting);

export default router;

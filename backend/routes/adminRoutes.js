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
} from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, requireRole("moderator", "admin", "super_admin"));

router.get("/stats", requireRole("admin", "super_admin"), getDashboardStats);
router.get("/reviews/queue", getModerationQueue);
router.put("/reviews/:id/moderate", moderateReview);
router.get("/review-reports/queue", getReviewReportQueue);
router.put("/review-reports/:id/resolve", resolveReviewReport);
router.get("/verifications/queue", getVerificationQueue);
router.get("/reports/queue", getReportQueue);
router.put("/reports/:id/moderate", moderateReport);
router.put("/landlords/:id/verify", requireRole("admin", "super_admin"), verifyLandlordClaim);
router.put("/users/:id/suspend", requireRole("admin", "super_admin"), suspendUser);
router.get("/audit", requireRole("admin", "super_admin"), getAuditLog);

export default router;

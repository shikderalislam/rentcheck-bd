import express from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth } from "../middleware/auth.js";
import { getPublicStats, getRecentExperiences, getTopAreas, getPublicSiteSettings } from "../controllers/publicController.js";
import {
  submitReport,
  listReports,
  getReport,
  confirmReport,
  getReportStats,
  getReportsByArea,
  addComment,
} from "../controllers/reportController.js";

const router = express.Router();

router.get("/stats", getPublicStats);
router.get("/recent-experiences", getRecentExperiences);
router.get("/top-areas", getTopAreas);
router.get("/site-settings", getPublicSiteSettings);

// Anonymous rental experiences (no auth). Stricter limits since there is no
// account to tie abuse to.
const reportSubmitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const commentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
const confirmLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });

router.post("/reports", reportSubmitLimiter, optionalAuth, submitReport);
router.get("/reports", listReports);
router.get("/reports/stats", getReportStats);
router.get("/reports/by-area", getReportsByArea);
router.get("/reports/:id", getReport);
router.post("/reports/:id/confirm", confirmLimiter, optionalAuth, confirmReport);
router.post("/reports/:id/comments", commentLimiter, addComment);

export default router;

import express from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth } from "../middleware/auth.js";
import { cachePublic } from "../middleware/cache.js";
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

router.get("/stats", cachePublic(30_000), getPublicStats);
router.get("/recent-experiences", cachePublic(30_000), getRecentExperiences);
router.get("/top-areas", cachePublic(60_000), getTopAreas);
router.get("/site-settings", cachePublic(15_000), getPublicSiteSettings);

// Anonymous rental experiences (no auth). Stricter limits since there is no
// account to tie abuse to.
const reportSubmitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const commentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
const confirmLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });

router.post("/reports", reportSubmitLimiter, optionalAuth, submitReport);
router.get("/reports", listReports);
router.get("/reports/stats", cachePublic(30_000), getReportStats);
router.get("/reports/by-area", cachePublic(60_000), getReportsByArea);
router.get("/reports/:id", getReport);
router.post("/reports/:id/confirm", confirmLimiter, optionalAuth, confirmReport);
router.post("/reports/:id/comments", commentLimiter, addComment);

export default router;

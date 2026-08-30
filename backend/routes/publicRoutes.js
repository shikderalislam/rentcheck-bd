import express from "express";
import rateLimit from "express-rate-limit";
import { getPublicStats, getRecentExperiences, getTopAreas } from "../controllers/publicController.js";
import { submitReport, listReports, voteReport, getReportStats, addComment, getTransparencyLedger } from "../controllers/reportController.js";

const router = express.Router();

router.get("/stats", getPublicStats);
router.get("/recent-experiences", getRecentExperiences);
router.get("/top-areas", getTopAreas);

// Anonymous issue reports (no auth) — stricter rate limit since there's no account to tie abuse to
const reportSubmitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const commentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
const voteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120 });
router.post("/reports", reportSubmitLimiter, submitReport);
router.get("/reports", listReports);
router.get("/reports/ledger", getTransparencyLedger);
router.get("/reports/stats", getReportStats);
router.post("/reports/:id/vote", voteLimiter, voteReport);
router.post("/reports/:id/comments", commentLimiter, addComment);

export default router;

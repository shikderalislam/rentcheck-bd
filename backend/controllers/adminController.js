import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import ReviewReport from "../models/ReviewReport.js";
import User from "../models/User.js";
import Property from "../models/Property.js";
import Landlord from "../models/Landlord.js";
import RentalRelationship from "../models/RentalRelationship.js";
import Report from "../models/Report.js";
import AuditLog from "../models/AuditLog.js";
import { recalculatePropertyReputation, recalculateLandlordReputation } from "./reviewController.js";
import { assertTransition } from "../utils/reviewWorkflow.js";
import { recordAudit } from "../utils/audit.js";

// @route GET /api/admin/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    users,
    tenants,
    landlords,
    properties,
    reviews,
    pendingReviews,
    needsReview,
    verifiedReviews,
    pendingVerifications,
    openReviewReports,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: "tenant", isDeleted: false }),
    Landlord.countDocuments(),
    Property.countDocuments({ isDeleted: false }),
    Review.countDocuments(),
    Review.countDocuments({ status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } }),
    Review.countDocuments({ status: "NEEDS_REVIEW" }),
    Review.countDocuments({ isVerified: true, status: "APPROVED" }),
    RentalRelationship.countDocuments({ status: "PENDING" }),
    ReviewReport.countDocuments({ status: "OPEN" }),
  ]);

  res.json({
    success: true,
    stats: {
      users,
      tenants,
      landlords,
      properties,
      reviews,
      pendingReviews,
      needsReview,
      verifiedReviews,
      pendingVerifications,
      openReviewReports,
    },
  });
});

// @route GET /api/admin/reviews/queue
export const getModerationQueue = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    status: { $in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_REVIEW", "DISPUTED"] },
  })
    .sort({ "moderation.openReportCount": -1, "moderation.riskScore": -1, createdAt: 1 })
    .populate("author", "displayName trustLevel")
    .populate("property", "name slug")
    .populate("landlord", "name slug")
    .limit(100);
  res.json({ success: true, reviews });
});

// @route PUT /api/admin/reviews/:id/moderate
export const moderateReview = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // APPROVED | REJECTED | HIDDEN | REMOVED | UNDER_REVIEW | NEEDS_REVIEW
  const allowed = ["APPROVED", "REJECTED", "HIDDEN", "REMOVED", "UNDER_REVIEW", "NEEDS_REVIEW"];
  if (!allowed.includes(decision)) {
    res.status(400);
    throw new Error("Invalid moderation decision");
  }

  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  const fromState = review.status;
  assertTransition(fromState, decision, req.user.role); // throws 409 on an illegal move

  review.status = decision;
  review.moderation.moderatedBy = req.user._id;
  review.moderation.moderatedAt = new Date();
  review.moderation.note = note || "";

  // Any decision that resolves the review closes its outstanding reports.
  if (["APPROVED", "REJECTED", "HIDDEN", "REMOVED"].includes(decision)) {
    const closeStatus = decision === "APPROVED" ? "DISMISSED" : "ACTIONED";
    await ReviewReport.updateMany(
      { review: review._id, status: "OPEN" },
      { status: closeStatus, resolvedBy: req.user._id, resolvedAt: new Date(), resolutionNote: `review ${decision}` }
    );
    review.moderation.openReportCount = 0;
  }
  await review.save();

  // Recalculate whichever way the review crossed the APPROVED boundary.
  if (decision === "APPROVED" || fromState === "APPROVED") {
    await recalculatePropertyReputation(review.property);
    await recalculateLandlordReputation(review.landlord);
  }

  await recordAudit({
    req,
    action: "review.moderate",
    entityType: "Review",
    entityId: review._id,
    fromState,
    toState: decision,
    reason: note || "",
  });

  res.json({ success: true, review });
});

// @route GET /api/admin/review-reports/queue
export const getReviewReportQueue = asyncHandler(async (req, res) => {
  const reports = await ReviewReport.find({ status: "OPEN" })
    .sort({ createdAt: 1 })
    .populate("reporter", "displayName trustLevel")
    .populate({
      path: "review",
      select: "body status overallRating property landlord moderation",
      populate: [
        { path: "property", select: "name slug" },
        { path: "landlord", select: "name slug" },
      ],
    })
    .limit(100);
  res.json({ success: true, reports });
});

// @route PUT /api/admin/review-reports/:id/resolve
export const resolveReviewReport = asyncHandler(async (req, res) => {
  const { action, note } = req.body; // ACTIONED | DISMISSED
  if (!["ACTIONED", "DISMISSED"].includes(action)) {
    res.status(400);
    throw new Error("Invalid resolution");
  }
  const report = await ReviewReport.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  if (report.status !== "OPEN") {
    res.status(409);
    throw new Error("This report is already resolved");
  }

  report.status = action;
  report.resolvedBy = req.user._id;
  report.resolvedAt = new Date();
  report.resolutionNote = note || "";
  await report.save();

  const openCount = await ReviewReport.countDocuments({ review: report.review, status: "OPEN" });
  await Review.findByIdAndUpdate(report.review, { "moderation.openReportCount": openCount });

  await recordAudit({
    req,
    action: "review_report.resolve",
    entityType: "ReviewReport",
    entityId: report._id,
    toState: action,
    reason: note || "",
    metadata: { review: report.review, remainingOpen: openCount },
  });

  res.json({ success: true, report });
});

// @route GET /api/admin/verifications/queue
export const getVerificationQueue = asyncHandler(async (req, res) => {
  const items = await RentalRelationship.find({ status: "PENDING" })
    .sort({ createdAt: 1 })
    .populate("tenant", "displayName email")
    .populate("property", "name slug")
    .populate("landlord", "name slug")
    .limit(100);
  res.json({ success: true, items });
});

// @route PUT /api/admin/landlords/:id/verify
export const verifyLandlordClaim = asyncHandler(async (req, res) => {
  const { approve, note } = req.body;
  const landlord = await Landlord.findById(req.params.id);
  if (!landlord) {
    res.status(404);
    throw new Error("Landlord not found");
  }
  const wasClaimedBy = landlord.claimedBy;
  landlord.isVerified = !!approve;
  if (!approve) {
    landlord.claimedBy = null;
    landlord.isClaimable = true;
  }
  await landlord.save();

  await recordAudit({
    req,
    action: approve ? "landlord.claim.approve" : "landlord.claim.reject",
    entityType: "Landlord",
    entityId: landlord._id,
    toState: approve ? "VERIFIED" : "UNCLAIMED",
    reason: note || "",
    metadata: { claimant: wasClaimedBy },
  });

  res.json({ success: true, landlord: landlord.toPublicJSON() });
});

// @route GET /api/admin/reports/queue
export const getReportQueue = asyncHandler(async (req, res) => {
  const reports = await Report.find({ status: "PENDING" }).sort({ createdAt: 1 }).limit(100);
  res.json({ success: true, reports });
});

// @route PUT /api/admin/reports/:id/moderate
export const moderateReport = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // APPROVED | REJECTED
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    res.status(400);
    throw new Error("Invalid moderation decision");
  }
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  const fromState = report.status;
  report.status = decision;
  report.moderation.moderatedBy = req.user._id;
  report.moderation.moderatedAt = new Date();
  report.moderation.note = note || "";
  await report.save();

  await recordAudit({
    req,
    action: "report.moderate",
    entityType: "Report",
    entityId: report._id,
    fromState,
    toState: decision,
    reason: note || "",
  });

  res.json({ success: true, report });
});

// @route PUT /api/admin/users/:id/suspend
export const suspendUser = asyncHandler(async (req, res) => {
  const { suspend, note } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.isSuspended = !!suspend;
  await user.save();

  await recordAudit({
    req,
    action: suspend ? "user.suspend" : "user.reinstate",
    entityType: "User",
    entityId: user._id,
    toState: suspend ? "SUSPENDED" : "ACTIVE",
    reason: note || "",
  });

  res.json({ success: true, message: `User ${suspend ? "suspended" : "reinstated"}` });
});

// @route GET /api/admin/audit?entityType=&entityId=&action=&actor=&page=&limit=
export const getAuditLog = asyncHandler(async (req, res) => {
  const { entityType, entityId, action, actor, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = action;
  if (actor) filter.actor = actor;

  const lim = Math.min(Number(limit) || 50, 200);
  const skip = (Math.max(Number(page), 1) - 1) * lim;

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate("actor", "displayName role"),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    entries,
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import ReviewReport from "../models/ReviewReport.js";
import User from "../models/User.js";
import Property from "../models/Property.js";
import Landlord from "../models/Landlord.js";
import RentalRelationship from "../models/RentalRelationship.js";
import Report from "../models/Report.js";
import ReportConfirmation from "../models/ReportConfirmation.js";
import AuditLog from "../models/AuditLog.js";
import SiteSetting, { PUBLIC_SETTING_DEFAULTS } from "../models/SiteSetting.js";
import { recalculatePropertyReputation, recalculateLandlordReputation } from "./reviewController.js";
import { assertTransition } from "../utils/reviewWorkflow.js";
import { recordAudit } from "../utils/audit.js";

const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "DISPUTED"];
const ASSIGNABLE_ROLES = ["tenant", "landlord", "property_manager", "moderator", "admin", "super_admin"];
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @route GET /api/admin/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    users,
    tenants,
    landlordUsers,
    staff,
    suspended,
    newUsers7d,
    landlords,
    properties,
    reports,
    reportsPending,
    reportsApproved,
    reportsHidden,
    reportConfirmations,
    reports7d,
    reviews,
    pendingReviews,
    needsReview,
    verifiedReviews,
    pendingVerifications,
    openReviewReports,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: "tenant", isDeleted: false }),
    User.countDocuments({ role: { $in: ["landlord", "property_manager"] }, isDeleted: false }),
    User.countDocuments({ role: { $in: ["moderator", "admin", "super_admin"] }, isDeleted: false }),
    User.countDocuments({ isSuspended: true }),
    User.countDocuments({ isDeleted: false, createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
    Landlord.countDocuments(),
    Property.countDocuments({ isDeleted: false }),
    Report.countDocuments(),
    Report.countDocuments({ status: "PENDING" }),
    Report.countDocuments({ status: "APPROVED" }),
    Report.countDocuments({ status: "HIDDEN" }),
    Report.aggregate([{ $group: { _id: null, t: { $sum: "$confirmations" } } }]),
    Report.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
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
      landlordUsers,
      staff,
      suspended,
      newUsers7d,
      landlords,
      properties,
      reports,
      reportsPending,
      reportsApproved,
      reportsHidden,
      reportConfirmations: reportConfirmations[0]?.t || 0,
      reports7d,
      reviews,
      pendingReviews,
      needsReview,
      verifiedReviews,
      pendingVerifications,
      openReviewReports,
    },
  });
});

// @route GET /api/admin/reports/timeseries?days=30
export const getReportsTimeseries = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
  const start = new Date(Date.now() - (days - 1) * 864e5);
  start.setHours(0, 0, 0, 0);

  const rows = await Report.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: map[key] || 0 });
  }
  res.json({ success: true, days, series });
});

// ---------------- Reports: full management ----------------

// @route GET /api/admin/reports?status=&division=&category=&q=&page=&limit=
export const listAllReports = asyncHandler(async (req, res) => {
  const { status, division, category, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && REPORT_STATUSES.includes(status)) filter.status = status;
  if (division) filter.division = division;
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ issueTitle: rx }, { description: rx }, { area: rx }, { city: rx }, { propertyName: rx }];
  }

  const lim = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page), 1) - 1) * lim;

  const [items, total] = await Promise.all([
    Report.find(filter)
      .select("+submittedBy")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate("submittedBy", "displayName email role")
      .populate("lastEditedBy", "displayName role"),
    Report.countDocuments(filter),
  ]);

  res.json({
    success: true,
    reports: items.map((r) => ({
      ...r.toObject(),
      submissionFingerprint: undefined,
    })),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

// @route GET /api/admin/reports/:id
export const getReportForAdmin = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  const report = await Report.findById(req.params.id)
    .select("+submittedBy")
    .populate("submittedBy", "displayName email role")
    .populate("moderation.moderatedBy", "displayName role")
    .populate("lastEditedBy", "displayName role");
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  const obj = report.toObject();
  delete obj.submissionFingerprint;
  res.json({ success: true, report: obj });
});

const EDITABLE_REPORT_FIELDS = [
  "category",
  "issueTitle",
  "city",
  "division",
  "area",
  "propertyName",
  "rentalDuration",
  "overallRating",
  "recommendation",
  "communicationQuality",
  "landlordBehavior",
  "description",
  "issues",
  "positives",
];

// @route PATCH /api/admin/reports/:id
export const updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }

  const changed = [];
  for (const field of EDITABLE_REPORT_FIELDS) {
    if (req.body[field] === undefined) continue;
    report[field] = req.body[field];
    changed.push(field);
  }

  let fromState;
  if (req.body.status && REPORT_STATUSES.includes(req.body.status) && req.body.status !== report.status) {
    fromState = report.status;
    report.status = req.body.status;
    report.moderation.moderatedBy = req.user._id;
    report.moderation.moderatedAt = new Date();
  }
  if (typeof req.body.moderationNote === "string") report.moderation.note = req.body.moderationNote;

  if (changed.length || fromState) {
    report.lastEditedBy = req.user._id;
    report.lastEditedAt = new Date();
  }
  await report.save();

  await recordAudit({
    req,
    action: "report.admin_edit",
    entityType: "Report",
    entityId: report._id,
    fromState: fromState || "",
    toState: fromState ? report.status : "",
    reason: req.body.moderationNote || "",
    metadata: { fields: changed },
  });

  const obj = report.toObject();
  delete obj.submissionFingerprint;
  delete obj.submittedBy;
  res.json({ success: true, report: obj });
});

// @route DELETE /api/admin/reports/:id   (admin / super_admin)
export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  await ReportConfirmation.deleteMany({ report: report._id });
  await Report.deleteOne({ _id: report._id });

  await recordAudit({
    req,
    action: "report.delete",
    entityType: "Report",
    entityId: report._id,
    fromState: report.status,
    toState: "DELETED",
    reason: req.body?.reason || "",
    metadata: { issueTitle: report.issueTitle, area: report.area },
  });

  res.json({ success: true, message: "Report permanently deleted" });
});

// ---------------- Users ----------------

// @route GET /api/admin/users?q=&role=&suspended=&page=&limit=
export const listUsers = asyncHandler(async (req, res) => {
  const { q, role, suspended, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };
  if (role && ASSIGNABLE_ROLES.includes(role)) filter.role = role;
  if (suspended === "true") filter.isSuspended = true;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ displayName: rx }, { email: rx }];
  }

  const lim = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page), 1) - 1) * lim;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).select("+phone"),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    users: items.map((u) => ({
      id: u._id,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone || null,
      role: u.role,
      trustLevel: u.trustLevel,
      isEmailVerified: u.isEmailVerified,
      isSuspended: u.isSuspended,
      profileVisibility: u.profileVisibility,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      loginCount: u.loginCount || 0,
    })),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

// @route GET /api/admin/users/:id
export const getUserForAdmin = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("User not found");
  }
  const user = await User.findById(req.params.id).select("+phone");
  if (!user || user.isDeleted) {
    res.status(404);
    throw new Error("User not found");
  }
  const [reviewCount, reportCount, rentalCount] = await Promise.all([
    Review.countDocuments({ author: user._id }),
    Report.countDocuments({ submittedBy: user._id }),
    RentalRelationship.countDocuments({ tenant: user._id }),
  ]);

  res.json({
    success: true,
    user: {
      id: user._id,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      trustLevel: user.trustLevel,
      isEmailVerified: user.isEmailVerified,
      isSuspended: user.isSuspended,
      profileVisibility: user.profileVisibility,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || null,
      loginCount: user.loginCount || 0,
      activity: { reviews: reviewCount, reports: reportCount, rentals: rentalCount },
    },
  });
});

// @route PATCH /api/admin/users/:id
// Body: { role?, isSuspended?, trustLevel?, isEmailVerified?, displayName? }
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.isDeleted) {
    res.status(404);
    throw new Error("User not found");
  }

  const isSuper = req.user.role === "super_admin";
  const self = user._id.toString() === req.user._id.toString();
  const changed = [];

  if (req.body.role !== undefined && req.body.role !== user.role) {
    if (!isSuper) {
      res.status(403);
      throw new Error("Only a super admin can change roles");
    }
    if (!ASSIGNABLE_ROLES.includes(req.body.role)) {
      res.status(400);
      throw new Error("Invalid role");
    }
    if (self && req.body.role !== "super_admin") {
      res.status(400);
      throw new Error("You cannot demote your own super admin account");
    }
    user.role = req.body.role;
    changed.push("role");
  }

  if (req.body.isSuspended !== undefined) {
    if (self && req.body.isSuspended) {
      res.status(400);
      throw new Error("You cannot suspend your own account");
    }
    user.isSuspended = !!req.body.isSuspended;
    changed.push("isSuspended");
  }
  if (req.body.isEmailVerified !== undefined) {
    user.isEmailVerified = !!req.body.isEmailVerified;
    changed.push("isEmailVerified");
  }
  if (req.body.trustLevel !== undefined) {
    const t = Number(req.body.trustLevel);
    if (t >= 0 && t <= 4) {
      user.trustLevel = Math.round(t);
      changed.push("trustLevel");
    }
  }
  if (typeof req.body.displayName === "string" && req.body.displayName.trim()) {
    user.displayName = req.body.displayName.trim().slice(0, 80);
    changed.push("displayName");
  }

  await user.save();

  await recordAudit({
    req,
    action: "user.admin_edit",
    entityType: "User",
    entityId: user._id,
    reason: req.body.reason || "",
    metadata: { fields: changed, role: user.role, isSuspended: user.isSuspended },
  });

  res.json({ success: true, user: user.toPublicJSON() });
});

// ---------------- Site settings (dynamic content) ----------------

// @route GET /api/admin/site-settings
export const getSiteSettings = asyncHandler(async (req, res) => {
  const rows = await SiteSetting.find().populate("updatedBy", "displayName role");
  const stored = Object.fromEntries(rows.map((r) => [r.key, r]));
  const settings = {};
  for (const key of Object.keys(PUBLIC_SETTING_DEFAULTS)) {
    settings[key] = {
      key,
      value: stored[key]?.value ?? PUBLIC_SETTING_DEFAULTS[key],
      isDefault: !stored[key],
      updatedBy: stored[key]?.updatedBy || null,
      updatedAt: stored[key]?.updatedAt || null,
    };
  }
  res.json({ success: true, settings });
});

// @route PUT /api/admin/site-settings/:key   Body: { value }
export const updateSiteSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!Object.keys(PUBLIC_SETTING_DEFAULTS).includes(key)) {
    res.status(400);
    throw new Error("Unknown setting key");
  }
  if (req.body.value === undefined) {
    res.status(400);
    throw new Error("value is required");
  }

  const setting = await SiteSetting.findOneAndUpdate(
    { key },
    { value: req.body.value, updatedBy: req.user._id },
    { new: true, upsert: true }
  );

  await recordAudit({
    req,
    action: "site_setting.update",
    entityType: "User", // no dedicated entity; anchor to the acting admin
    entityId: req.user._id,
    reason: `key=${key}`,
  });

  res.json({ success: true, setting: { key, value: setting.value } });
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

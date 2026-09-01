import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Report from "../models/Report.js";
import ReportConfirmation from "../models/ReportConfirmation.js";
import Review from "../models/Review.js";
import { recordAudit } from "../utils/audit.js";

// @route GET /api/me/summary
export const getMySummary = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [reportsTotal, reportsApproved, reportsPending, confirmations, reviews] = await Promise.all([
    Report.countDocuments({ submittedBy: uid }),
    Report.countDocuments({ submittedBy: uid, status: "APPROVED" }),
    Report.countDocuments({ submittedBy: uid, status: { $in: ["PENDING", "DISPUTED"] } }),
    ReportConfirmation.countDocuments({ user: uid }),
    Review.countDocuments({ author: uid }),
  ]);
  res.json({
    success: true,
    summary: { reportsTotal, reportsApproved, reportsPending, confirmations, reviews },
  });
});

// @route GET /api/me/reports?status=&page=&limit=
export const getMyReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { submittedBy: req.user._id };
  if (status) filter.status = status;
  const lim = Math.min(Number(limit) || 20, 50);
  const skip = (Math.max(Number(page), 1) - 1) * lim;
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Report.countDocuments(filter),
  ]);
  res.json({
    success: true,
    reports: items.map((r) => r.toPublicJSON()),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

const OWNER_EDITABLE = [
  "issueTitle",
  "area",
  "city",
  "division",
  "propertyName",
  "overallRating",
  "recommendation",
  "communicationQuality",
  "landlordBehavior",
  "description",
  "issues",
  "positives",
  "category",
  "rentalDuration",
];

// @route PATCH /api/me/reports/:id  (edit own report; re-enters moderation if it was live)
export const updateMyReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  const report = await Report.findOne({ _id: req.params.id }).select("+submittedBy");
  if (!report || String(report.submittedBy) !== String(req.user._id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  if (["REJECTED", "HIDDEN"].includes(report.status)) {
    res.status(409);
    throw new Error("This report can no longer be edited");
  }

  const changed = [];
  for (const f of OWNER_EDITABLE) {
    if (req.body[f] === undefined) continue;
    report[f] = req.body[f];
    changed.push(f);
  }
  const wasApproved = report.status === "APPROVED";
  if (wasApproved && changed.length) report.status = "PENDING"; // back through moderation
  await report.save();

  await recordAudit({
    req,
    action: "report.owner_edit",
    entityType: "Report",
    entityId: report._id,
    fromState: wasApproved ? "APPROVED" : report.status,
    toState: report.status,
    metadata: { fields: changed },
  });

  const obj = report.toPublicJSON();
  res.json({ success: true, report: obj, reentryToModeration: wasApproved && changed.length > 0 });
});

// @route DELETE /api/me/reports/:id  (withdraw own report)
export const deleteMyReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  const report = await Report.findOne({ _id: req.params.id }).select("+submittedBy");
  if (!report || String(report.submittedBy) !== String(req.user._id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  await ReportConfirmation.deleteMany({ report: report._id });
  await Report.deleteOne({ _id: report._id });
  await recordAudit({
    req,
    action: "report.owner_withdraw",
    entityType: "Report",
    entityId: report._id,
    fromState: report.status,
    toState: "DELETED",
  });
  res.json({ success: true, message: "Report withdrawn" });
});

// @route GET /api/me/confirmations?page=&limit=
export const getMyConfirmations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const lim = Math.min(Number(limit) || 20, 50);
  const skip = (Math.max(Number(page), 1) - 1) * lim;

  const [rows, total] = await Promise.all([
    ReportConfirmation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate("report", "issueTitle area city division status overallRating confirmations"),
    ReportConfirmation.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    success: true,
    confirmations: rows
      .filter((r) => r.report)
      .map((r) => ({
        id: r._id,
        confirmedAt: r.createdAt,
        report: {
          id: r.report._id,
          issueTitle: r.report.issueTitle,
          area: r.report.area,
          city: r.report.city,
          division: r.report.division,
          status: r.report.status,
          overallRating: r.report.overallRating ?? null,
          confirmations: r.report.confirmations,
        },
      })),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

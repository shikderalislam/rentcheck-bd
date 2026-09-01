import asyncHandler from "express-async-handler";
import crypto from "crypto";
import mongoose from "mongoose";
import Report from "../models/Report.js";
import ReportConfirmation from "../models/ReportConfirmation.js";

const BD_DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];
const ANON_COOKIE = "rc_anon";
const COMMUNICATION_VALUES = ["", "no_response", "hostile", "delayed", "dismissive", "cooperative"];
const RECOMMENDATION_VALUES = ["", "yes", "maybe", "no"];
const DURATION_VALUES = ["", "lt_6m", "6_12m", "1_2y", "2y_plus"];

// Coarse, salted, one-way fingerprint for basic rate-limiting only — never
// reversible to an IP, never stored as PII, never exposed to anyone.
function buildFingerprint(req) {
  const raw = `${req.ip}|${req.headers["user-agent"] || ""}|${new Date().toDateString()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// Returns { hash } for the caller's anonymous browser token, setting a fresh
// httpOnly cookie if they don't have one yet.
function ensureAnonToken(req, res) {
  let token = req.cookies?.[ANON_COOKIE];
  if (!token || !/^[a-f0-9]{32,}$/i.test(token)) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie(ANON_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  return hashToken(token);
}

function runReportHeuristics(text = "") {
  const flags = [];
  let riskScore = 0;
  const phonePattern = /(\+?880|0)1[3-9]\d{8}/;
  const namePattern = /\b(mr\.?|mrs\.?|md\.?)\s+[A-Z][a-z]+/;

  if (phonePattern.test(text)) {
    flags.push("possible_pii_phone");
    riskScore += 0.5;
  }
  if (namePattern.test(text)) {
    flags.push("possible_named_individual");
    riskScore += 0.4;
  }
  if (text.length < 20) {
    flags.push("very_short_report");
    riskScore += 0.2;
  }
  return { riskScore: Math.min(riskScore, 1), flags };
}

function cleanRatings(input = {}) {
  const keys = ["behavior", "privacy", "maintenance", "rentFairness", "advanceRefund", "communication", "rules"];
  const out = {};
  for (const k of keys) {
    const n = Number(input?.[k]);
    if (n >= 1 && n <= 5) out[k] = Math.round(n);
  }
  return out;
}

function cleanStringArray(input, max = 20) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim().slice(0, 60))
    .slice(0, max);
}

// @route POST /api/public/reports  (anonymous, no auth required)
export const submitReport = asyncHandler(async (req, res) => {
  const {
    category,
    issueTitle,
    city,
    division,
    area,
    propertyName,
    rentalDuration,
    overallRating,
    categoryRatings,
    issues,
    positives,
    recommendation,
    communicationQuality,
    landlordBehavior,
    description,
  } = req.body;

  if (!category || !issueTitle || !city || !division || !description) {
    res.status(400);
    throw new Error("Please fill in the required fields");
  }
  if (!BD_DIVISIONS.includes(division)) {
    res.status(400);
    throw new Error("Invalid division");
  }
  if (description.trim().length < 20) {
    res.status(400);
    throw new Error("Please describe your experience in a bit more detail");
  }

  const rating = Number(overallRating);
  const doc = {
    category,
    issueTitle: issueTitle.trim().slice(0, 150),
    city: city.trim(),
    division,
    area: (area || "").trim(),
    propertyName: (propertyName || "").trim().slice(0, 160),
    rentalDuration: DURATION_VALUES.includes(rentalDuration) ? rentalDuration : "",
    overallRating: rating >= 1 && rating <= 5 ? Math.round(rating) : undefined,
    categoryRatings: cleanRatings(categoryRatings),
    issues: cleanStringArray(issues),
    positives: cleanStringArray(positives),
    recommendation: RECOMMENDATION_VALUES.includes(recommendation) ? recommendation : "",
    communicationQuality: COMMUNICATION_VALUES.includes(communicationQuality) ? communicationQuality : "",
    landlordBehavior: (landlordBehavior || "").slice(0, 1000),
    description: description.trim().slice(0, 2000),
  };

  const { riskScore, flags } = runReportHeuristics(`${doc.issueTitle} ${doc.description} ${doc.landlordBehavior}`);
  // Low-risk experiences publish straight away (account-free community feature).
  // Anything that trips the PII / named-individual heuristics waits for a moderator.
  const status = riskScore >= 0.4 ? "PENDING" : "APPROVED";

  const report = await Report.create({
    ...doc,
    status,
    submissionFingerprint: buildFingerprint(req),
    moderation: { riskFlags: flags },
  });

  res.status(201).json({
    success: true,
    published: status === "APPROVED",
    message:
      status === "APPROVED"
        ? "Your experience was published anonymously."
        : "Your experience was submitted anonymously and will appear after a moderator reviews it.",
    reportId: report._id,
  });
});

// @route GET /api/public/reports?division=&category=&area=&sort=&page=&limit=
export const listReports = asyncHandler(async (req, res) => {
  const { division, category, area, sort = "recent", page = 1, limit = 12 } = req.query;

  const filter = { status: "APPROVED" };
  if (division) filter.division = division;
  if (category) filter.category = category;
  if (area) filter.area = new RegExp(`^${area.trim()}$`, "i");

  const sortMap = {
    recent: { createdAt: -1 },
    most_confirmed: { confirmations: -1, createdAt: -1 },
    top_rated: { overallRating: -1, confirmations: -1 },
  };

  const lim = Math.min(Number(limit) || 12, 50);
  const skip = (Math.max(Number(page), 1) - 1) * lim;
  const [items, total] = await Promise.all([
    Report.find(filter).sort(sortMap[sort] || sortMap.recent).skip(skip).limit(lim),
    Report.countDocuments(filter),
  ]);

  res.json({
    success: true,
    reports: items.map((r) => r.toCardJSON()),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

// @route GET /api/public/reports/:id  (full detail)
export const getReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  const report = await Report.findOne({ _id: req.params.id, status: { $in: ["APPROVED", "DISPUTED"] } });
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  res.json({ success: true, report: report.toPublicJSON() });
});

// @route POST /api/public/reports/:id/confirm  ("I had a similar experience")
// One confirmation per person: logged-in users by id, anonymous by hashed cookie.
export const confirmReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }
  const report = await Report.findOne({ _id: req.params.id, status: "APPROVED" });
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }

  const entry = { report: report._id };
  if (req.user?._id) entry.user = req.user._id;
  else entry.anonTokenHash = ensureAnonToken(req, res);

  try {
    await ReportConfirmation.create(entry);
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, alreadyConfirmed: true, confirmations: report.confirmations });
    }
    throw err;
  }

  const updated = await Report.findByIdAndUpdate(
    report._id,
    { $inc: { confirmations: 1 } },
    { new: true }
  );
  res.json({ success: true, alreadyConfirmed: false, confirmations: updated.confirmations });
});

// @route GET /api/public/reports/stats
// Rental/community statistics only — no monetary data.
export const getReportStats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalCount, recentCount, confirmAgg, divisionAgg, areaAgg] = await Promise.all([
    Report.countDocuments({ status: "APPROVED" }),
    Report.countDocuments({ status: "APPROVED", createdAt: { $gte: since } }),
    Report.aggregate([{ $match: { status: "APPROVED" } }, { $group: { _id: null, total: { $sum: "$confirmations" } } }]),
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$division", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Report.aggregate([
      { $match: { status: "APPROVED", area: { $ne: "" } } },
      { $group: { _id: "$area", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      totalReports: totalCount,
      recentCount,
      totalConfirmations: confirmAgg[0]?.total || 0,
      topDivisions: divisionAgg.map((d) => ({ division: d._id, count: d.count })),
      topArea: areaAgg[0]?._id || null,
    },
  });
});

// @route GET /api/public/reports/by-area?limit=6
// Powers the homepage "কোন এলাকায় কী ধরনের সমস্যা?" section.
export const getReportsByArea = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);

  const rows = await Report.aggregate([
    { $match: { status: "APPROVED", area: { $ne: "" } } },
    {
      $group: {
        _id: { area: "$area", city: "$city" },
        reportCount: { $sum: 1 },
        avgRating: { $avg: "$overallRating" },
        confirmations: { $sum: "$confirmations" },
        categories: { $push: "$category" },
      },
    },
    { $sort: { reportCount: -1 } },
    { $limit: limit },
  ]);

  const topCategory = (arr) => {
    const counts = {};
    for (const c of arr) counts[c] = (counts[c] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };

  res.json({
    success: true,
    areas: rows.map((r) => ({
      area: r._id.area,
      city: r._id.city,
      reportCount: r.reportCount,
      avgRating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : null,
      confirmations: r.confirmations,
      topIssue: topCategory(r.categories),
    })),
  });
});

// @route POST /api/public/reports/:id/comments  (anonymous, no auth)
export const addComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || body.trim().length < 3) {
    res.status(400);
    throw new Error("Comment is too short");
  }
  if (body.length > 500) {
    res.status(400);
    throw new Error("Comment is too long");
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Report not found");
  }

  const report = await Report.findOne({ _id: req.params.id, status: "APPROVED" });
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }

  const { riskScore } = runReportHeuristics(body);
  const status = riskScore >= 0.4 ? "PENDING" : "APPROVED";

  report.comments.push({ body: body.trim(), status });
  await report.save();

  const saved = report.comments[report.comments.length - 1];
  res.status(201).json({
    success: true,
    comment: status === "APPROVED" ? { id: saved._id, body: saved.body, createdAt: saved.createdAt } : null,
    message: status === "APPROVED" ? "Comment posted" : "Your comment was flagged for review and will appear once approved.",
  });
});

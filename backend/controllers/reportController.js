import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Report from "../models/Report.js";

const BD_DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];

// Builds a coarse, salted, one-way fingerprint for basic rate-limiting only —
// never reversible to an IP, never stored as PII, never exposed to anyone.
function buildFingerprint(req) {
  const raw = `${req.ip}|${req.headers["user-agent"] || ""}|${new Date().toDateString()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
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

const COMMUNICATION_VALUES = ["", "no_response", "hostile", "delayed", "dismissive", "cooperative"];

// @route POST /api/public/reports  (anonymous, no auth required)
export const submitReport = asyncHandler(async (req, res) => {
  const {
    category,
    issueTitle,
    city,
    division,
    area,
    claimedAmount,
    outcome,
    communicationQuality,
    landlordBehavior,
    description,
  } = req.body;

  if (!category || !issueTitle || !city || !division || !outcome || !description) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }
  if (!BD_DIVISIONS.includes(division)) {
    res.status(400);
    throw new Error("Invalid division");
  }
  if (description.length < 20) {
    res.status(400);
    throw new Error("Please describe what happened in a bit more detail");
  }
  const comm = COMMUNICATION_VALUES.includes(communicationQuality) ? communicationQuality : "";

  const { riskScore, flags } = runReportHeuristics(`${issueTitle} ${description} ${landlordBehavior || ""}`);
  // Low-risk reports publish straight to the public ledger (this is a
  // community-run, account-free feature). Anything that trips the PII (phone)
  // or named-individual heuristics waits for a moderator instead.
  const status = riskScore >= 0.4 ? "PENDING" : "APPROVED";

  const report = await Report.create({
    category,
    issueTitle,
    city,
    division,
    area,
    claimedAmount: Number(claimedAmount) || 0,
    outcome,
    communicationQuality: comm,
    landlordBehavior: (landlordBehavior || "").slice(0, 1000),
    description,
    status,
    submissionFingerprint: buildFingerprint(req),
    moderation: { riskFlags: flags },
  });

  res.status(201).json({
    success: true,
    published: status === "APPROVED",
    message:
      status === "APPROVED"
        ? "Your report was published anonymously to the public ledger."
        : "Your report was submitted anonymously and will appear after a moderator reviews it.",
    reportId: report._id,
  });
});

// @route GET /api/public/reports?status=APPROVED&city=&division=&category=&sort=&page=&limit=
export const listReports = asyncHandler(async (req, res) => {
  const { city, division, category, sort = "recent", page = 1, limit = 10 } = req.query;

  const filter = { status: "APPROVED" }; // public feed only ever shows approved reports
  if (city) filter.city = city;
  if (division) filter.division = division;
  if (category) filter.category = category;

  const sortMap = {
    recent: { createdAt: -1 },
    amount_high: { claimedAmount: -1 },
    most_upvoted: { upvotes: -1 },
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Report.find(filter).sort(sortMap[sort] || sortMap.recent).skip(skip).limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  res.json({
    success: true,
    reports: items.map((r) => r.toPublicJSON()),
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

// @route POST /api/public/reports/:id/vote  (anonymous up/down vote)
// Body: { direction: "up" | "down" }
export const voteReport = asyncHandler(async (req, res) => {
  const direction = req.body?.direction === "down" ? "down" : "up";
  const field = direction === "down" ? "downvotes" : "upvotes";

  const report = await Report.findOneAndUpdate(
    { _id: req.params.id, status: "APPROVED" },
    { $inc: { [field]: 1 } },
    { new: true }
  );
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  res.json({
    success: true,
    upvotes: report.upvotes,
    downvotes: report.downvotes,
    score: report.upvotes - report.downvotes,
  });
});

// @route GET /api/public/reports/stats
export const getReportStats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);

  const [totalAmountAgg, totalCount, recentCount, outcomeAgg, divisionAgg] = await Promise.all([
    Report.aggregate([{ $match: { status: "APPROVED" } }, { $group: { _id: null, total: { $sum: "$claimedAmount" } } }]),
    Report.countDocuments({ status: "APPROVED" }),
    Report.countDocuments({ status: "APPROVED", createdAt: { $gte: since } }),
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]),
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$division", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const totalAmount = totalAmountAgg[0]?.total || 0;
  const rejectedCount = outcomeAgg.find((o) => o._id === "paid_or_lost")?.count || 0;
  const rejectedPct = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  res.json({
    success: true,
    stats: {
      totalAmount,
      totalCount,
      recentCount,
      rejectedPct,
      topDivisions: divisionAgg.map((d) => ({ division: d._id, count: d.count })),
    },
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

  const report = await Report.findOne({ _id: req.params.id, status: "APPROVED" });
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }

  const { riskScore } = runReportHeuristics(body);
  // Comments auto-publish unless they trip PII/name heuristics, in which case
  // they wait for a moderator rather than silently vanishing.
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

// @route GET /api/public/reports/ledger
// Powers the "Transparency Ledger" — aggregated totals by category and by
// division, shaped for simple horizontal bar-chart rendering.
export const getTransparencyLedger = asyncHandler(async (req, res) => {
  const [byCategory, byDivision, totals] = await Promise.all([
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalAmount: { $sum: "$claimedAmount" } } },
      { $sort: { count: -1 } },
    ]),
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$division", count: { $sum: 1 }, totalAmount: { $sum: "$claimedAmount" } } },
      { $sort: { count: -1 } },
    ]),
    Report.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: null, totalAmount: { $sum: "$claimedAmount" }, totalCount: { $sum: 1 } } },
    ]),
  ]);

  const maxCategoryCount = Math.max(1, ...byCategory.map((c) => c.count));
  const maxDivisionCount = Math.max(1, ...byDivision.map((d) => d.count));

  res.json({
    success: true,
    totals: {
      totalAmount: totals[0]?.totalAmount || 0,
      totalCount: totals[0]?.totalCount || 0,
      activeDivisions: byDivision.length,
    },
    byCategory: byCategory.map((c) => ({
      category: c._id,
      count: c.count,
      totalAmount: c.totalAmount,
      barPct: Math.round((c.count / maxCategoryCount) * 100),
    })),
    byDivision: byDivision.map((d) => ({
      division: d._id,
      count: d.count,
      totalAmount: d.totalAmount,
      barPct: Math.round((d.count / maxDivisionCount) * 100),
    })),
  });
});

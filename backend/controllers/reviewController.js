import asyncHandler from "express-async-handler";
import crypto from "crypto";
import RentalRelationship from "../models/RentalRelationship.js";
import Review from "../models/Review.js";
import ReviewReport, { REVIEW_REPORT_REASONS } from "../models/ReviewReport.js";
import Property from "../models/Property.js";
import Landlord from "../models/Landlord.js";
import { computeReputation } from "../utils/rating.js";
import { assertTransition } from "../utils/reviewWorkflow.js";
import { recordAudit } from "../utils/audit.js";

// Number of distinct open reports that auto-escalates an APPROVED review.
const REPORT_ESCALATION_THRESHOLD = 3;

// ---------- Rental relationship & verification ----------

// @route POST /api/rentals
export const createRentalRelationship = asyncHandler(async (req, res) => {
  const { propertyId, startDate, endDate } = req.body;
  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error("Property not found");
  }

  const relationship = await RentalRelationship.create({
    tenant: req.user._id,
    property: property._id,
    landlord: property.landlord,
    startDate,
    endDate,
    status: "PENDING",
  });

  res.status(201).json({ success: true, relationship });
});

// @route POST /api/rentals/:id/evidence
export const addRentalEvidence = asyncHandler(async (req, res) => {
  const relationship = await RentalRelationship.findById(req.params.id);
  if (!relationship) {
    res.status(404);
    throw new Error("Rental relationship not found");
  }
  if (relationship.tenant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { type, fileKey } = req.body;
  relationship.evidence.push({ type, fileKey });
  await relationship.save();

  await recordAudit({
    req,
    action: "rental.evidence.add",
    entityType: "RentalRelationship",
    entityId: relationship._id,
    metadata: { evidenceType: type, evidenceCount: relationship.evidence.length },
  });

  res.json({ success: true, relationship });
});

// @route PUT /api/rentals/:id/verify  (moderator/admin)
export const verifyRentalRelationship = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // decision: VERIFIED | REJECTED
  if (!["VERIFIED", "REJECTED"].includes(decision)) {
    res.status(400);
    throw new Error("Invalid decision");
  }

  const relationship = await RentalRelationship.findById(req.params.id);
  if (!relationship) {
    res.status(404);
    throw new Error("Rental relationship not found");
  }

  const fromState = relationship.status;
  relationship.status = decision;
  relationship.reviewedBy = req.user._id;
  relationship.reviewNote = note || "";
  await relationship.save();

  if (decision === "VERIFIED") {
    await Review.updateMany({ rentalRelationship: relationship._id }, { isVerified: true });
    await recalculatePropertyReputation(relationship.property);
    await recalculateLandlordReputation(relationship.landlord);
  }

  await recordAudit({
    req,
    action: "rental.verify",
    entityType: "RentalRelationship",
    entityId: relationship._id,
    fromState,
    toState: decision,
    reason: note || "",
  });

  res.json({ success: true, relationship });
});

// ---------- Reviews ----------

// @route POST /api/reviews
export const submitReview = asyncHandler(async (req, res) => {
  const {
    propertyId,
    rentalRelationshipId,
    reviewType,
    overallRating,
    categoryRatings,
    wouldRentAgain,
    wouldRecommend,
    title,
    body,
    pros,
    cons,
    tags,
    photos,
  } = req.body;

  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error("Property not found");
  }

  let isVerified = false;
  if (rentalRelationshipId) {
    const relationship = await RentalRelationship.findById(rentalRelationshipId);
    if (relationship && relationship.tenant.toString() === req.user._id.toString() && relationship.status === "VERIFIED") {
      isVerified = true;
    }
  }

  // Lightweight moderation pre-check (heuristic placeholder for AI moderation service)
  const { riskScore, flags } = runBasicModerationHeuristics(body);
  const status = riskScore >= 0.8 ? "NEEDS_REVIEW" : "SUBMITTED";

  const review = await Review.create({
    author: req.user._id,
    property: property._id,
    landlord: property.landlord,
    rentalRelationship: rentalRelationshipId || null,
    reviewType: reviewType || "property",
    overallRating,
    categoryRatings,
    wouldRentAgain,
    wouldRecommend,
    title,
    body,
    pros,
    cons,
    tags,
    photos,
    isVerified,
    status,
    moderation: { riskScore, flags },
  });

  await recordAudit({
    req,
    action: "review.submit",
    entityType: "Review",
    entityId: review._id,
    toState: status,
    metadata: { riskScore, flags, isVerified },
  });

  res.status(201).json({
    success: true,
    review,
    message: "Your review was submitted and is pending moderation.",
  });
});

// @route GET /api/reviews/mine
export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ author: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

// @route POST /api/reviews/:id/response  (claimed landlord)
export const respondToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate("landlord");
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  if (review.status !== "APPROVED") {
    res.status(400);
    throw new Error("Can only respond to approved reviews");
  }

  const landlord = await Landlord.findById(review.landlord._id);
  const isOwner = landlord.claimedBy && landlord.claimedBy.toString() === req.user._id.toString();
  if (!isOwner && !["admin", "super_admin"].includes(req.user.role)) {
    res.status(403);
    throw new Error("Not authorized to respond to this review");
  }
  if (isOwner && !landlord.isVerified) {
    res.status(403);
    throw new Error("Your landlord profile must be verified before you can respond publicly");
  }

  const { body } = req.body;
  if (!body || body.trim().length < 3) {
    res.status(400);
    throw new Error("Response body is required");
  }
  if (body.length > 1500) {
    res.status(400);
    throw new Error("Response is too long");
  }

  // The landlord's own words are user-generated content too — screen them.
  const { riskScore, flags } = runBasicModerationHeuristics(body);
  if (riskScore >= 0.4) {
    res.status(422);
    throw new Error("Your response looks like it contains a phone number, ID number or threatening language. Please rephrase without personal or identifying details.");
  }

  const isFirst = !review.landlordResponse?.body;
  review.landlordResponse = { body: body.trim(), respondedAt: new Date() };
  await review.save();
  await recalculateLandlordReputation(review.landlord._id); // response rate changed

  await recordAudit({
    req,
    action: isFirst ? "review.response.create" : "review.response.edit",
    entityType: "Review",
    entityId: review._id,
    metadata: { landlord: review.landlord._id, flags },
  });

  res.json({ success: true, review });
});

// @route POST /api/reviews/:id/report
// Body: { reason, detail? }. One report per reporter (user or anon fingerprint).
export const reportReview = asyncHandler(async (req, res) => {
  const { reason, detail } = req.body;
  if (!REVIEW_REPORT_REASONS.includes(reason)) {
    res.status(400);
    throw new Error("Please choose a valid reason for reporting this review");
  }

  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  const reporter = req.user?._id || null;
  const reporterFingerprint = reporter ? null : buildReporterFingerprint(req);

  try {
    await ReviewReport.create({
      review: review._id,
      reporter,
      reporterFingerprint,
      reason,
      detail: (detail || "").slice(0, 1000),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, message: "You have already reported this review." });
    }
    throw err;
  }

  const openCount = await ReviewReport.countDocuments({ review: review._id, status: "OPEN" });
  review.moderation.openReportCount = openCount;

  let escalated = false;
  if (openCount >= REPORT_ESCALATION_THRESHOLD && review.status === "APPROVED") {
    assertTransition(review.status, "NEEDS_REVIEW", "system");
    const fromState = review.status;
    review.status = "NEEDS_REVIEW";
    escalated = true;
    await recordAudit({
      req,
      actor: null,
      action: "review.escalate.reports",
      entityType: "Review",
      entityId: review._id,
      fromState,
      toState: "NEEDS_REVIEW",
      reason: `Reached ${openCount} distinct open reports`,
      metadata: { openReportCount: openCount },
    });
  }
  await review.save();

  await recordAudit({
    req,
    action: "review.report",
    entityType: "ReviewReport",
    entityId: review._id,
    reason,
    metadata: { openReportCount: openCount, anonymous: !reporter },
  });

  res.json({
    success: true,
    message: escalated
      ? "Report received. This review has been sent back to moderators."
      : "Report received. Thank you.",
  });
});

// @route POST /api/reviews/:id/helpful
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  review.helpfulVotes += 1;
  await review.save();
  res.json({ success: true, helpfulVotes: review.helpfulVotes });
});

// ---------- Helpers ----------

function buildReporterFingerprint(req) {
  const raw = `${req.ip}|${req.headers["user-agent"] || ""}|${new Date().toDateString()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function runBasicModerationHeuristics(text = "") {
  const flags = [];
  let riskScore = 0;

  const phonePattern = /(\+?880|0)1[3-9]\d{8}/; // BD phone pattern
  const nidPattern = /\b\d{10}(\d{3})?\b/; // rough NID-like number
  const threatWords = /\b(kill|hurt|threat|beat up|attack)\b/i;
  const hateWords = /\b(hate speech placeholder)\b/i;

  if (phonePattern.test(text)) {
    flags.push("possible_pii_phone");
    riskScore += 0.4;
  }
  if (nidPattern.test(text)) {
    flags.push("possible_pii_nid");
    riskScore += 0.3;
  }
  if (threatWords.test(text)) {
    flags.push("possible_threat");
    riskScore += 0.6;
  }
  if (hateWords.test(text)) {
    flags.push("possible_hate_speech");
    riskScore += 0.6;
  }
  if (text.length < 15) {
    flags.push("very_short_review");
    riskScore += 0.1;
  }

  return { riskScore: Math.min(riskScore, 1), flags };
}

export async function recalculatePropertyReputation(propertyId) {
  const property = await Property.findById(propertyId);
  if (!property) return;

  const reviews = await Review.find({ property: propertyId, status: "APPROVED" }).select(
    "overallRating isVerified createdAt categoryRatings landlordResponse"
  );
  const rep = computeReputation(reviews);

  property.reputation = {
    overall: rep.display,
    bayesian: rep.bayesian,
    confidence: rep.confidence,
    privacy: rep.categories.privacy ?? 0,
    maintenance: rep.categories.maintenance ?? 0,
    communication: rep.categories.communication ?? 0,
    fairness: rep.categories.agreementFairness ?? 0,
    safety: rep.categories.safety ?? 0,
    value: rep.categories.valueForMoney ?? 0,
    reviewCount: rep.sampleSize,
    verifiedReviewCount: rep.verifiedCount,
    trend: rep.trend,
  };
  await property.save();
}

export async function recalculateLandlordReputation(landlordId) {
  const landlord = await Landlord.findById(landlordId);
  if (!landlord) return;

  const reviews = await Review.find({ landlord: landlordId, status: "APPROVED" }).select(
    "overallRating isVerified createdAt categoryRatings landlordResponse"
  );
  const rep = computeReputation(reviews);

  landlord.reputation = {
    ...landlord.reputation,
    overall: rep.display,
    bayesian: rep.bayesian,
    confidence: rep.confidence,
    communication: rep.categories.communication ?? 0,
    privacy: rep.categories.privacy ?? 0,
    maintenance: rep.categories.maintenance ?? 0,
    fairness: rep.categories.agreementFairness ?? 0,
    depositHandling: rep.categories.depositHandling ?? 0,
    reviewCount: rep.sampleSize,
    verifiedReviewCount: rep.verifiedCount,
    responseRate: rep.responseRate,
    trend: rep.trend,
  };
  await landlord.save();
}

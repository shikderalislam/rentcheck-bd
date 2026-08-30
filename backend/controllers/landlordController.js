import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Landlord from "../models/Landlord.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";
import { recordAudit } from "../utils/audit.js";

// @route GET /api/landlords?query=&page=&limit=
export const searchLandlords = asyncHandler(async (req, res) => {
  const { query, verifiedOnly, page = 1, limit = 12 } = req.query;
  const filter = {};
  if (query) filter.name = new RegExp(query, "i");
  if (verifiedOnly === "true") filter.isVerified = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    // Rank by the prior-shrunk score, not the raw mean, so a landlord with
    // "5.0 from 2 reviews" doesn't leapfrog "4.5 from 120".
    Landlord.find(filter).sort({ "reputation.bayesian": -1, "reputation.reviewCount": -1 }).skip(skip).limit(Number(limit)),
    Landlord.countDocuments(filter),
  ]);

  res.json({
    success: true,
    results: items.map((l) => l.toPublicJSON()),
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

// @route GET /api/landlords/:slug
export const getLandlordBySlug = asyncHandler(async (req, res) => {
  const landlord = await Landlord.findOne({ slug: req.params.slug });
  if (!landlord) {
    res.status(404);
    throw new Error("Landlord not found");
  }

  const [properties, reviews] = await Promise.all([
    Property.find({ landlord: landlord._id, isDeleted: false }),
    Review.find({ landlord: landlord._id, status: "APPROVED" })
      .sort({ createdAt: -1 })
      .populate("author", "displayName avatarUrl trustLevel")
      .limit(50),
  ]);

  res.json({
    success: true,
    landlord: landlord.toPublicJSON(),
    properties: properties.map((p) => p.toPublicJSON()),
    reviews,
  });
});

// @route POST /api/landlords  (admin creates base profile OR landlord self-creates then claims)
export const createLandlord = asyncHandler(async (req, res) => {
  const { name, bio, logoUrl } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Landlord name is required");
  }

  let baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let count = 1;
  while (await Landlord.findOne({ slug })) {
    slug = `${baseSlug}-${count++}`;
  }

  const landlord = await Landlord.create({ name, slug, bio, logoUrl });
  res.status(201).json({ success: true, landlord: landlord.toPublicJSON() });
});

// @route POST /api/landlords/:id/claim
export const claimLandlord = asyncHandler(async (req, res) => {
  const landlord = await Landlord.findById(req.params.id);
  if (!landlord) {
    res.status(404);
    throw new Error("Landlord not found");
  }
  if (landlord.claimedBy) {
    res.status(409);
    throw new Error("This profile has already been claimed");
  }

  // MVP: auto-pending claim, real flow would require document upload + admin review.
  // `claimedBy` is recorded but confers no public powers until an admin sets
  // `isVerified` via PUT /api/admin/landlords/:id/verify.
  landlord.claimedBy = req.user._id;
  landlord.isClaimable = false;
  landlord.isVerified = false;
  await landlord.save();

  await recordAudit({
    req,
    action: "landlord.claim.submit",
    entityType: "Landlord",
    entityId: landlord._id,
    toState: "CLAIM_PENDING",
  });

  res.json({
    success: true,
    message: "Claim submitted. Our team will verify your ownership/management proof shortly.",
    landlord: landlord.toPublicJSON(),
  });
});

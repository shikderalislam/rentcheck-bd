import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import slugify from "slugify";
import Landlord from "../models/Landlord.js";
import Property, { PROPERTY_TYPES, LISTING_STATUSES } from "../models/Property.js";
import Review from "../models/Review.js";
import { recordAudit } from "../utils/audit.js";

// Resolves the landlord profile the current user has claimed (if any).
async function myLandlord(userId) {
  return Landlord.findOne({ claimedBy: userId });
}

// Landlords must be able to list a property immediately. If they have not
// claimed a public landlord profile yet, create an unverified one linked to
// them so their listings have a home. A super_admin still verifies it later.
async function ensureLandlordProfile(user) {
  let landlord = await myLandlord(user._id);
  if (landlord) return landlord;

  const base = slugify(user.displayName || "landlord", { lower: true, strict: true }) || "landlord";
  let slug = base;
  let n = 1;
  while (await Landlord.findOne({ slug })) slug = `${base}-${n++}`;

  landlord = await Landlord.create({
    name: user.displayName || "Landlord",
    slug,
    claimedBy: user._id,
    isClaimable: false,
    isVerified: false,
  });
  await recordAudit({
    req: { user },
    action: "landlord.profile.autocreate",
    entityType: "Landlord",
    entityId: landlord._id,
  });
  return landlord;
}

async function uniquePropertySlug(name, area) {
  const base = slugify(`${area || ""}-${name}`, { lower: true, strict: true }) || "property";
  let slug = base;
  let n = 1;
  while (await Property.findOne({ slug })) slug = `${base}-${n++}`;
  return slug;
}

function ownsProperty(property, user) {
  if (!property) return false;
  if (String(property.listedBy) === String(user._id)) return true;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return false;
}

// Fields a landlord may set on their own listing.
const LISTING_FIELDS = [
  "name", "propertyType", "listingStatus", "description",
  "bedrooms", "bathrooms", "balconies", "floor", "totalFloors", "sizeSqft", "furnishing",
  "features", "amenities", "coverPhoto", "photos",
  "rentDetails", "deposit", "availableFrom", "rentalPolicy", "contact",
];

function applyListingFields(property, body) {
  const changed = [];
  for (const f of LISTING_FIELDS) {
    if (body[f] === undefined) continue;
    property[f] = body[f];
    changed.push(f);
  }
  if (body.address && typeof body.address === "object") {
    property.address = { ...property.address.toObject?.() ?? property.address, ...body.address };
    changed.push("address");
  }
  if (body.location && typeof body.location === "object") {
    property.location = { ...(property.location?.toObject?.() ?? property.location), ...body.location };
    changed.push("location");
  }
  return changed;
}

// @route GET /api/landlord/summary
export const getLandlordSummary = asyncHandler(async (req, res) => {
  const landlord = await myLandlord(req.user._id);
  if (!landlord) {
    return res.json({ success: true, hasProfile: false });
  }

  const [properties, reviewAgg, pendingResponses, recentReviews] = await Promise.all([
    Property.find({ landlord: landlord._id, isDeleted: false }).select("name slug address reputation isVerified"),
    Review.aggregate([
      { $match: { landlord: landlord._id, status: "APPROVED" } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$overallRating" }, responded: { $sum: { $cond: [{ $ifNull: ["$landlordResponse.body", false] }, 1, 0] } } } },
    ]),
    Review.countDocuments({ landlord: landlord._id, status: "APPROVED", "landlordResponse.body": { $in: [null, ""] } }),
    Review.find({ landlord: landlord._id, status: "APPROVED" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("overallRating body createdAt landlordResponse property")
      .populate("property", "name slug"),
  ]);

  const agg = reviewAgg[0] || { count: 0, avg: 0, responded: 0 };

  res.json({
    success: true,
    hasProfile: true,
    landlord: {
      id: landlord._id,
      name: landlord.name,
      slug: landlord.slug,
      bio: landlord.bio,
      isVerified: landlord.isVerified,
      reputation: landlord.reputation,
    },
    summary: {
      properties: properties.length,
      reviews: agg.count,
      avgRating: agg.count ? Math.round(agg.avg * 10) / 10 : null,
      responseRate: agg.count ? Math.round((agg.responded / agg.count) * 100) : 0,
      pendingResponses,
    },
    properties: properties.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      area: p.address?.area,
      city: p.address?.city,
      rating: p.reputation?.overall || 0,
      reviewCount: p.reputation?.reviewCount || 0,
      isVerified: p.isVerified,
    })),
    recentReviews: recentReviews.map((r) => ({
      id: r._id,
      overallRating: r.overallRating,
      body: r.body,
      createdAt: r.createdAt,
      hasResponse: !!r.landlordResponse?.body,
      property: r.property ? { name: r.property.name, slug: r.property.slug } : null,
    })),
  });
});

// @route GET /api/landlord/reviews?responded=&page=&limit=
export const getLandlordReviews = asyncHandler(async (req, res) => {
  const landlord = await myLandlord(req.user._id);
  if (!landlord) {
    return res.json({ success: true, reviews: [], pagination: { total: 0, page: 1, pages: 0 } });
  }
  const { responded, page = 1, limit = 20 } = req.query;
  const filter = { landlord: landlord._id, status: "APPROVED" };
  if (responded === "false") filter["landlordResponse.body"] = { $in: [null, ""] };
  if (responded === "true") filter["landlordResponse.body"] = { $nin: [null, ""] };

  const lim = Math.min(Number(limit) || 20, 50);
  const skip = (Math.max(Number(page), 1) - 1) * lim;
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .select("overallRating categoryRatings body pros cons createdAt landlordResponse property isVerified")
      .populate("property", "name slug"),
    Review.countDocuments(filter),
  ]);

  // Note: author identity is deliberately omitted — landlords never see who wrote a review.
  res.json({
    success: true,
    reviews: items.map((r) => ({
      id: r._id,
      overallRating: r.overallRating,
      categoryRatings: r.categoryRatings,
      body: r.body,
      pros: r.pros,
      cons: r.cons,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      landlordResponse: r.landlordResponse?.body
        ? { body: r.landlordResponse.body, respondedAt: r.landlordResponse.respondedAt }
        : null,
      property: r.property ? { name: r.property.name, slug: r.property.slug } : null,
    })),
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  });
});

// ---------------- Landlord: own property listings ----------------

// @route GET /api/landlord/properties
export const getMyProperties = asyncHandler(async (req, res) => {
  const landlord = await myLandlord(req.user._id);
  const or = [{ listedBy: req.user._id }];
  if (landlord) or.push({ landlord: landlord._id });
  const items = await Property.find({ $or: or, isDeleted: false }).sort({ createdAt: -1 });
  res.json({ success: true, properties: items.map((p) => p.toPublicJSON()) });
});

// @route GET /api/landlord/properties/:id
export const getMyProperty = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Property not found");
  }
  const property = await Property.findById(req.params.id);
  if (!property || property.isDeleted || !ownsProperty(property, req.user)) {
    res.status(404);
    throw new Error("Property not found");
  }
  res.json({ success: true, property: property.toPublicJSON() });
});

// @route POST /api/landlord/properties
export const createMyProperty = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.propertyType || !PROPERTY_TYPES.includes(b.propertyType)) {
    res.status(400);
    throw new Error("Property name and a valid type are required");
  }
  const addr = b.address || {};
  if (!addr.area || !addr.division) {
    res.status(400);
    throw new Error("At least division and area are required");
  }
  const monthly = Number(b.rentDetails?.monthly);
  if (!(monthly > 0)) {
    res.status(400);
    throw new Error("Monthly rent is required");
  }

  const landlord = await ensureLandlordProfile(req.user);
  const slug = await uniquePropertySlug(b.name, addr.area);

  const property = new Property({
    name: String(b.name).trim().slice(0, 160),
    slug,
    landlord: landlord._id,
    listedBy: req.user._id,
    propertyType: b.propertyType,
    listingStatus: LISTING_STATUSES.includes(b.listingStatus) ? b.listingStatus : "available",
    address: {
      addressLine: addr.addressLine || addr.landmark || addr.area,
      area: addr.area,
      district: addr.district || addr.area,
      city: addr.city || addr.district || addr.area,
      division: addr.division,
      road: addr.road || "",
      block: addr.block || "",
      landmark: addr.landmark || "",
    },
    rent: { min: monthly, max: monthly },
  });
  applyListingFields(property, { ...b, address: undefined });
  await property.save();

  await recordAudit({
    req,
    action: "property.create",
    entityType: "Property",
    entityId: property._id,
    metadata: { name: property.name, area: property.address.area },
  });

  res.status(201).json({ success: true, property: property.toPublicJSON() });
});

// @route PATCH /api/landlord/properties/:id
export const updateMyProperty = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Property not found");
  }
  const property = await Property.findById(req.params.id);
  if (!property || property.isDeleted || !ownsProperty(property, req.user)) {
    res.status(404);
    throw new Error("Property not found");
  }
  const changed = applyListingFields(property, req.body || {});
  await property.save();
  await recordAudit({
    req,
    action: "property.update",
    entityType: "Property",
    entityId: property._id,
    metadata: { fields: changed },
  });
  res.json({ success: true, property: property.toPublicJSON() });
});

// @route DELETE /api/landlord/properties/:id  (soft delete)
export const deleteMyProperty = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Property not found");
  }
  const property = await Property.findById(req.params.id);
  if (!property || property.isDeleted || !ownsProperty(property, req.user)) {
    res.status(404);
    throw new Error("Property not found");
  }
  property.isDeleted = true;
  await property.save();
  await recordAudit({
    req,
    action: "property.delete",
    entityType: "Property",
    entityId: property._id,
    metadata: { name: property.name },
  });
  res.json({ success: true, message: "Listing removed" });
});

import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Property from "../models/Property.js";
import Landlord from "../models/Landlord.js";
import Review from "../models/Review.js";

// @route GET /api/properties?query=&city=&area=&minRent=&maxRent=&bedrooms=&verified=&page=&limit=
export const searchProperties = asyncHandler(async (req, res) => {
  const {
    query,
    city,
    area,
    district,
    propertyType,
    minRent,
    maxRent,
    bedrooms,
    verifiedOnly,
    sort = "recent",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { isDeleted: false };
  if (query) filter.$text = { $search: query };
  if (city) filter["address.city"] = new RegExp(`^${city}$`, "i");
  if (area) filter["address.area"] = new RegExp(area, "i");
  if (district) filter["address.district"] = new RegExp(`^${district}$`, "i");
  if (propertyType) filter.propertyType = propertyType;
  if (bedrooms) filter.bedrooms = Number(bedrooms);
  if (verifiedOnly === "true") filter.isVerified = true;
  if (minRent || maxRent) {
    filter["rent.min"] = {};
    if (minRent) filter["rent.min"].$gte = Number(minRent);
    if (maxRent) filter["rent.max"] = { $lte: Number(maxRent) };
  }

  const sortMap = {
    recent: { createdAt: -1 },
    rating: { "reputation.overall": -1 },
    rent_low: { "rent.min": 1 },
    rent_high: { "rent.min": -1 },
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(sortMap[sort] || sortMap.recent)
      .skip(skip)
      .limit(Number(limit))
      .populate("landlord", "name slug isVerified reputation"),
    Property.countDocuments(filter),
  ]);

  res.json({
    success: true,
    results: items.map((p) => p.toPublicJSON()),
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

// @route GET /api/properties/:slug
export const getPropertyBySlug = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ slug: req.params.slug, isDeleted: false }).populate(
    "landlord",
    "name slug logoUrl isVerified reputation badges"
  );
  if (!property) {
    res.status(404);
    throw new Error("Property not found");
  }

  const reviews = await Review.find({ property: property._id, status: "APPROVED" })
    .sort({ createdAt: -1 })
    .populate("author", "displayName avatarUrl trustLevel")
    .limit(50);

  res.json({
    success: true,
    property: property.toPublicJSON(),
    landlord: property.landlord,
    reviews,
  });
});

// @route POST /api/properties  (landlord / property_manager / admin)
export const createProperty = asyncHandler(async (req, res) => {
  const { name, landlordId, propertyType, address, bedrooms, bathrooms, approxSizeSqft, amenities, rent, deposit, photos, location } =
    req.body;

  if (!name || !landlordId || !propertyType || !address || !rent) {
    res.status(400);
    throw new Error("Missing required property fields");
  }

  const landlord = await Landlord.findById(landlordId);
  if (!landlord) {
    res.status(404);
    throw new Error("Landlord not found");
  }

  // Only the claimed owner, a property manager on the landlord, or admin can add properties
  const isOwner = landlord.claimedBy && landlord.claimedBy.toString() === req.user._id.toString();
  if (!isOwner && !["admin", "super_admin"].includes(req.user.role)) {
    res.status(403);
    throw new Error("You are not authorized to add properties for this landlord");
  }

  let baseSlug = slugify(`${address.city}-${address.area}-${name}`, { lower: true, strict: true });
  let slug = baseSlug;
  let count = 1;
  while (await Property.findOne({ slug })) {
    slug = `${baseSlug}-${count++}`;
  }

  const property = await Property.create({
    name,
    slug,
    landlord: landlordId,
    propertyType,
    address,
    location,
    bedrooms,
    bathrooms,
    approxSizeSqft,
    amenities,
    photos,
    rent,
    deposit,
  });

  res.status(201).json({ success: true, property: property.toPublicJSON() });
});

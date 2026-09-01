import asyncHandler from "express-async-handler";
import Property from "../models/Property.js";
import Landlord from "../models/Landlord.js";
import Review from "../models/Review.js";
import Report from "../models/Report.js";

// @route GET /api/public/stats
// Powers the homepage "পরিসংখ্যান" counters. Community/rental data only — no money.
export const getPublicStats = asyncHandler(async (req, res) => {
  const [
    totalReviews,
    totalReports,
    totalProperties,
    totalLandlords,
    propertyAreas,
    reportAreas,
    confirmAgg,
    lastReport,
  ] = await Promise.all([
    Review.countDocuments({ status: "APPROVED" }),
    Report.countDocuments({ status: "APPROVED" }),
    Property.countDocuments({ isDeleted: false }),
    Landlord.countDocuments(),
    Property.distinct("address.area", { isDeleted: false }),
    Report.distinct("area", { status: "APPROVED", area: { $ne: "" } }),
    Report.aggregate([{ $match: { status: "APPROVED" } }, { $group: { _id: null, total: { $sum: "$confirmations" } } }]),
    Report.findOne({ status: "APPROVED" }).sort({ createdAt: -1 }).select("createdAt"),
  ]);

  const areaSet = new Set([...propertyAreas, ...reportAreas].filter(Boolean).map((a) => a.toLowerCase()));

  res.json({
    success: true,
    stats: {
      totalReports,
      totalReviews,
      totalExperiences: totalReports + totalReviews,
      totalProperties,
      totalLandlords,
      totalAreas: areaSet.size,
      totalConfirmations: confirmAgg[0]?.total || 0,
      lastUpdated: lastReport?.createdAt || null,
    },
  });
});

// @route GET /api/public/recent-experiences?limit=5
// Powers the "Recent experiences" feed on the homepage.
export const getRecentExperiences = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);

  const reviews = await Review.find({ status: "APPROVED" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("property", "name slug propertyType address rent")
    .select("overallRating body createdAt property reviewType helpfulVotes");

  res.json({ success: true, reviews });
});

// @route GET /api/public/top-areas?limit=6
// Aggregates live per-area stats: rent range, avg rating, review count.
export const getTopAreas = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);

  const areas = await Property.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: { area: "$address.area", city: "$address.city" },
        propertyCount: { $sum: 1 },
        avgRating: { $avg: "$reputation.overall" },
        reviewCount: { $sum: "$reputation.reviewCount" },
        minRent: { $min: "$rent.min" },
        maxRent: { $max: "$rent.max" },
      },
    },
    { $sort: { reviewCount: -1, propertyCount: -1 } },
    { $limit: limit },
  ]);

  res.json({
    success: true,
    areas: areas.map((a) => ({
      area: a._id.area,
      city: a._id.city,
      propertyCount: a.propertyCount,
      avgRating: Math.round((a.avgRating || 0) * 10) / 10,
      reviewCount: a.reviewCount,
      rentRange: { min: a.minRent, max: a.maxRent },
    })),
  });
});

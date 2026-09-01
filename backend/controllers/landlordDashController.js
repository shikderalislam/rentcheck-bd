import asyncHandler from "express-async-handler";
import Landlord from "../models/Landlord.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";

// Resolves the landlord profile the current user has claimed (if any).
async function myLandlord(userId) {
  return Landlord.findOne({ claimedBy: userId });
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

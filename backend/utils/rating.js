// RentCheck BD rating algorithm.
//
// A blind mean is misleading: "5.0 from 2 reviews" must not outrank
// "4.4 from 180 reviews". We compute three numbers from a set of APPROVED
// reviews and store all three:
//
//   display    – recency- & verification-weighted mean, for showing a number
//   bayesian   – display mean shrunk toward a global prior; use this to rank
//   confidence – Wilson lower bound on the "positive" share (>= 4 stars);
//                a 0..1 sortable trust score that punishes small samples
//
// Tuning constants live at the top so they can be adjusted from data later.
// See docs/rating-algorithm.md for the reasoning.

export const RATING_CONFIG = {
  globalPriorMean: 3.4, // m: assumed mean of a brand-new property/landlord
  priorWeight: 8, // C: how many "prior" reviews the prior is worth
  verifiedWeight: 1.6, // weight multiplier for a verified-rental review
  unverifiedWeight: 1.0,
  recencyHalfLifeDays: 730, // a review's weight halves every ~2 years
  positiveThreshold: 4, // >= this overall rating counts as "positive" for Wilson
  minSampleForTrend: 6,
};

function recencyWeight(createdAt, now = Date.now()) {
  const ageDays = Math.max(0, (now - new Date(createdAt).getTime()) / 86_400_000);
  return Math.pow(0.5, ageDays / RATING_CONFIG.recencyHalfLifeDays);
}

// Wilson score lower bound for a Bernoulli parameter at 95% confidence.
export function wilsonLowerBound(positives, total, z = 1.96) {
  if (!total) return 0;
  const phat = positives / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = phat + z2 / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  return Math.max(0, (centre - margin) / denom);
}

function round1(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * @param {Array<{ overallRating:number, isVerified?:boolean, createdAt:Date|string,
 *                 categoryRatings?:Object, landlordResponse?:{body?:string} }>} reviews
 * @returns {{
 *   display:number, bayesian:number, confidence:number,
 *   sampleSize:number, verifiedCount:number, responseRate:number,
 *   categories:Object, trend:'improving'|'stable'|'declining'|'insufficient_data'
 * }}
 */
export function computeReputation(reviews = []) {
  const approved = reviews.filter((r) => typeof r.overallRating === "number");
  const sampleSize = approved.length;

  if (sampleSize === 0) {
    return {
      display: 0,
      bayesian: 0,
      confidence: 0,
      sampleSize: 0,
      verifiedCount: 0,
      responseRate: 0,
      categories: {},
      trend: "insufficient_data",
    };
  }

  const now = Date.now();
  let wSum = 0;
  let wRatingSum = 0;
  let positives = 0;
  let verifiedCount = 0;
  let respondedCount = 0;

  for (const r of approved) {
    const base = r.isVerified ? RATING_CONFIG.verifiedWeight : RATING_CONFIG.unverifiedWeight;
    const w = base * recencyWeight(r.createdAt, now);
    wSum += w;
    wRatingSum += w * r.overallRating;
    if (r.overallRating >= RATING_CONFIG.positiveThreshold) positives += 1;
    if (r.isVerified) verifiedCount += 1;
    if (r.landlordResponse?.body) respondedCount += 1;
  }

  const weightedMean = wSum > 0 ? wRatingSum / wSum : 0;

  // Bayesian shrinkage toward the global prior. effectiveN is the total review
  // weight, so a handful of recent reviews barely moves off the prior.
  const { globalPriorMean: m, priorWeight: C } = RATING_CONFIG;
  const bayesian = (C * m + wSum * weightedMean) / (C + wSum);

  const confidence = wilsonLowerBound(positives, sampleSize);

  // Category means: simple means are fine here, but blank them below the
  // small-sample floor so the UI can hide noisy sub-scores.
  const categories = averageCategories(approved);

  return {
    display: round1(weightedMean),
    bayesian: round2(bayesian),
    confidence: round2(confidence),
    sampleSize,
    verifiedCount,
    responseRate: sampleSize ? Math.round((respondedCount / sampleSize) * 100) : 0,
    categories,
    trend: computeTrend(approved),
  };
}

function averageCategories(reviews) {
  const keys = new Set();
  reviews.forEach((r) => r.categoryRatings && Object.keys(r.categoryRatings).forEach((k) => keys.add(k)));
  const out = {};
  for (const key of keys) {
    const vals = reviews.map((r) => r.categoryRatings?.[key]).filter((v) => typeof v === "number");
    out[key] = vals.length >= 3 ? round1(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }
  return out;
}

// Compare the weighted mean of the newer half vs the older half.
function computeTrend(reviews) {
  if (reviews.length < RATING_CONFIG.minSampleForTrend) return "insufficient_data";
  const sorted = [...reviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const mid = Math.floor(sorted.length / 2);
  const mean = (arr) => arr.reduce((s, r) => s + r.overallRating, 0) / arr.length;
  const older = mean(sorted.slice(0, mid));
  const newer = mean(sorted.slice(mid));
  const delta = newer - older;
  if (delta >= 0.4) return "improving";
  if (delta <= -0.4) return "declining";
  return "stable";
}

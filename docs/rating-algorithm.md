# RentCheck BD — Rating Algorithm

> Implemented in [`backend/utils/rating.js`](../backend/utils/rating.js). Consumed by
> `recalculatePropertyReputation` / `recalculateLandlordReputation` in
> [`backend/controllers/reviewController.js`](../backend/controllers/reviewController.js),
> which run whenever a review crosses the `APPROVED` boundary or a rental is verified.

## Why not a plain average

A blind mean is misleading at small sample sizes. `5.0` from 2 reviews would
outrank `4.4` from 180 reviews, and a single fresh angry review would swing a
property's score. Section 81 of the product spec explicitly forbids this.

We therefore compute **three** numbers from the set of `APPROVED` reviews and
store all of them:

| field | range | use |
|---|---|---|
| `overall` (`display`) | 0–5 | the number shown to users |
| `bayesian` | 0–5 | **ranking / sorting** (search results, "top landlords") |
| `confidence` | 0–1 | a sortable trust score; also gates whether sub-scores/trend show |

## 1. Weighted mean (`display`)

Each review gets a weight:

```
weight = baseWeight * recencyWeight
baseWeight    = 1.6 if the review has a verified rental relationship, else 1.0
recencyWeight = 0.5 ^ (ageDays / 730)      # halves every ~2 years
```

`display = Σ(weight * rating) / Σ(weight)`, rounded to 1 dp.

Verified experiences count for more; stale reviews fade but never disappear.

## 2. Bayesian shrinkage (`bayesian`)

We pull the weighted mean toward a global prior so thin samples stay near the
baseline:

```
bayesian = (C * m + W * weightedMean) / (C + W)

m = 3.4   # RATING_CONFIG.globalPriorMean  — assumed mean of a brand-new entity
C = 8     # RATING_CONFIG.priorWeight       — the prior is worth 8 reviews
W = Σ(weight)   # total evidence weight actually collected
```

- 1 review → score sits ~7/8 of the way back at `m`.
- ~30+ reviews → prior is negligible, `bayesian ≈ weightedMean`.

`m` and `C` are the two knobs to retune once there is real data (set `m` to the
platform-wide mean of all approved reviews).

## 3. Wilson lower bound (`confidence`)

Treat each review as a Bernoulli trial: **positive** = `overallRating >= 4`.
`confidence` is the Wilson score interval's lower bound at 95%:

```
confidence = wilsonLowerBound(positives, sampleSize)
```

This answers "what's the pessimistic estimate of this entity's positive rate?"
and naturally punishes small samples (few trials → wide interval → low bound).
Good default for a "most trusted" sort that shouldn't be gameable with a couple
of 5-star reviews.

## Category sub-scores & trend

- Category ratings (privacy, maintenance, …) use plain means, but are set to
  `null` below **3** data points so the UI can hide noisy sub-scores.
- `trend` compares the mean of the newer half vs the older half of reviews:
  `improving` / `declining` at a ±0.4 delta, else `stable`; `insufficient_data`
  below 6 reviews.

## Guarantees

- Only `status === "APPROVED"` reviews are counted (`countsTowardReputation`).
- Hiding, removing, or disputing an approved review triggers a recalc, so a
  score never lags a moderation action.
- `isPromoted` / featured status is **never** an input here.

## Tuning constants

All live in `RATING_CONFIG` at the top of `rating.js`:

```js
globalPriorMean: 3.4,
priorWeight: 8,
verifiedWeight: 1.6,
unverifiedWeight: 1.0,
recencyHalfLifeDays: 730,
positiveThreshold: 4,
minSampleForTrend: 6,
```

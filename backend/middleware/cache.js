// Tiny in-process response cache for hot public GET endpoints.
//
// Good enough for a single instance. For a load-balanced deployment (multiple
// app servers) swap the Map for Redis so the cache is shared — see
// docs/deployment.md. TTLs are short so staleness after an edit is bounded.

const store = new Map(); // key -> { body, expires }
const MAX_ENTRIES = 500;

function purgeExpired(now) {
  for (const [k, v] of store) {
    if (v.expires <= now) store.delete(k);
  }
}

export function cachePublic(ttlMs = 30_000) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    const key = req.originalUrl;
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expires > now) {
      res.set("X-Cache", "HIT");
      return res.json(hit.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (store.size >= MAX_ENTRIES) purgeExpired(now);
          if (store.size >= MAX_ENTRIES) store.clear();
          store.set(key, { body, expires: now + ttlMs });
        }
      } catch {
        /* never let caching break a response */
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };
    next();
  };
}

// Drop everything (call after a write that could affect cached reads).
export function bustCache() {
  store.clear();
}

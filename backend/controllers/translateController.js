import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Translation from "../models/Translation.js";

const MAX_BATCH = 60;
const MAX_LEN = 800;
const CONCURRENCY = 4;

const mem = new Map(); // `${lang}:${hash}` -> text  (hot in-process cache)
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex");

// --- provider ---------------------------------------------------------------
// Default: MyMemory (free, anonymous, ~5k words/day; add TRANSLATE_EMAIL to
// raise the quota). Swap by setting LIBRETRANSLATE_URL, or wire another
// provider here.
async function providerTranslate(text, from, to) {
  const lt = process.env.LIBRETRANSLATE_URL;
  if (lt) {
    const r = await fetch(`${lt.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
    });
    if (!r.ok) throw new Error(`libretranslate ${r.status}`);
    const j = await r.json();
    return { text: j.translatedText || text, provider: "libretranslate" };
  }

  const params = new URLSearchParams({ q: text, langpair: `${from}|${to}` });
  if (process.env.TRANSLATE_EMAIL) params.set("de", process.env.TRANSLATE_EMAIL);
  const r = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
  if (!r.ok) throw new Error(`mymemory ${r.status}`);
  const j = await r.json();
  const out = j?.responseData?.translatedText;
  if (!out || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) throw new Error("mymemory quota/limit");
  return { text: out, provider: "mymemory" };
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

// @route POST /api/translate   Body: { texts: string[], to: "en"|"bn" }
export const translateBatch = asyncHandler(async (req, res) => {
  const to = req.body?.to === "bn" ? "bn" : "en";
  const from = to === "en" ? "bn" : "en";
  const rawTexts = Array.isArray(req.body?.texts) ? req.body.texts : [];

  const texts = rawTexts.slice(0, MAX_BATCH).map((t) => String(t == null ? "" : t));
  const out = new Array(texts.length);
  const misses = []; // { idx, text, h }

  // 1. resolve from in-process + DB cache
  const unresolved = [];
  texts.forEach((text, idx) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_LEN) {
      out[idx] = text;
      return;
    }
    const h = hash(trimmed);
    const m = mem.get(`${to}:${h}`);
    if (m !== undefined) {
      out[idx] = m;
      return;
    }
    unresolved.push({ idx, text: trimmed, h });
  });

  if (unresolved.length) {
    const rows = await Translation.find({ lang: to, srcHash: { $in: unresolved.map((u) => u.h) } }).select("srcHash text");
    const byHash = Object.fromEntries(rows.map((r) => [r.srcHash, r.text]));
    for (const u of unresolved) {
      if (byHash[u.h] !== undefined) {
        out[u.idx] = byHash[u.h];
        mem.set(`${to}:${u.h}`, byHash[u.h]);
      } else {
        misses.push(u);
      }
    }
  }

  // 2. call the provider for the rest, persist, and fall back to source on error
  if (misses.length) {
    const translated = await runPool(misses, async (u) => {
      try {
        const { text, provider } = await providerTranslate(u.text, from, to);
        return { ...u, translated: text, provider, ok: true };
      } catch {
        return { ...u, translated: u.text, ok: false };
      }
    });
    for (const r of translated) {
      out[r.idx] = r.translated;
      mem.set(`${to}:${r.h}`, r.translated);
      if (r.ok && r.translated && r.translated !== r.text) {
        Translation.updateOne(
          { srcHash: r.h, lang: to },
          { $set: { src: r.text, text: r.translated, provider: r.provider || "" } },
          { upsert: true }
        ).catch(() => {});
      }
    }
  }

  // anything still undefined -> echo original
  texts.forEach((text, idx) => {
    if (out[idx] === undefined) out[idx] = text;
  });

  res.json({ success: true, to, translations: out });
});

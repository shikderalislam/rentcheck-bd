import api from "../api/axios.js";

// Whole-site machine translation. When the language is switched to English we
// walk the DOM, translate every Bangla text node / key attribute via the
// backend (which caches to MongoDB), and swap it in. Switching back restores
// the originals verbatim. User-generated content — anything inside a
// [data-no-translate] subtree — is never touched.

const BANGLA = /[ঀ-৿]/;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "OPTION"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const CHUNK = 50;
const LS_KEY = "rc_tr_en_v1";

let observer = null;
let debounceTimer = null;
let running = false;
let currentLang = "bn";

// node -> original string  (text nodes)
const textOriginals = new Map();
// element -> { attr: original }  (attributes)
const attrOriginals = new Map();

let listeners = new Set();
const emit = (busy) => listeners.forEach((fn) => fn(busy));
export const onTranslateBusy = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveCache(cache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}
const key = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
};

function isSkippable(node) {
  let el = node.nodeType === 1 ? node : node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute?.("data-no-translate")) return true;
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

function collect(root) {
  const texts = new Set();
  const pendingTextNodes = [];
  const pendingAttrs = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const v = n.nodeValue;
      if (!v || !BANGLA.test(v) || !v.trim()) return NodeFilter.FILTER_REJECT;
      if (textOriginals.has(n) && textOriginals.get(n) === v) return NodeFilter.FILTER_REJECT; // already ours
      if (isSkippable(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = walker.nextNode())) {
    pendingTextNodes.push(node);
    texts.add(node.nodeValue.trim());
  }

  const elWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  let el = root.nodeType === 1 ? root : elWalker.nextNode();
  const scanEl = (e) => {
    if (!e.getAttribute || SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-no-translate")) return;
    for (const a of ATTRS) {
      const val = e.getAttribute(a);
      if (val && BANGLA.test(val) && !(attrOriginals.get(e)?.[a] === val)) {
        pendingAttrs.push({ el: e, attr: a, val: val });
        texts.add(val.trim());
      }
    }
  };
  if (root.nodeType === 1) scanEl(root);
  while ((el = elWalker.nextNode())) scanEl(el);

  return { texts: [...texts], pendingTextNodes, pendingAttrs };
}

async function fetchTranslations(texts) {
  const cache = loadCache();
  const need = texts.filter((t) => cache[key(t)] === undefined);
  for (let i = 0; i < need.length; i += CHUNK) {
    const slice = need.slice(i, i + CHUNK);
    try {
      const { data } = await api.post("/translate", { texts: slice, to: "en" });
      slice.forEach((src, idx) => {
        cache[key(src)] = data.translations?.[idx] ?? src;
      });
      saveCache(cache);
    } catch {
      slice.forEach((src) => {
        cache[key(src)] = src;
      });
    }
  }
  return cache;
}

async function translateRoot(root) {
  if (currentLang !== "en") return;
  const { texts, pendingTextNodes, pendingAttrs } = collect(root);
  if (!texts.length) return;

  running = true;
  emit(true);
  try {
    const cache = await fetchTranslations(texts);
    if (currentLang !== "en") return; // toggled back mid-flight

    for (const n of pendingTextNodes) {
      if (!n.parentNode) continue;
      const orig = n.nodeValue;
      const trimmed = orig.trim();
      const tr = cache[key(trimmed)];
      if (tr && tr !== trimmed) {
        if (!textOriginals.has(n)) textOriginals.set(n, orig);
        n.nodeValue = orig.replace(trimmed, tr);
      }
    }
    for (const { el, attr, val } of pendingAttrs) {
      const tr = cache[key(val.trim())];
      if (tr && tr !== val.trim()) {
        const store = attrOriginals.get(el) || {};
        if (store[attr] === undefined) store[attr] = val;
        attrOriginals.set(el, store);
        el.setAttribute(attr, tr);
      }
    }
  } finally {
    running = false;
    emit(false);
  }
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (currentLang !== "en") return;
    let touched = false;
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes.length) touched = true;
      if (m.type === "characterData") touched = true;
      if (touched) break;
    }
    if (!touched) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => translateRoot(document.body), 350);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function restoreOriginals() {
  for (const [n, orig] of textOriginals) {
    if (n.parentNode) n.nodeValue = orig;
  }
  textOriginals.clear();
  for (const [el, attrs] of attrOriginals) {
    for (const [a, v] of Object.entries(attrs)) el.setAttribute(a, v);
  }
  attrOriginals.clear();
}

// Public entry — called by the i18n provider whenever `lang` changes.
export function setAutoTranslateLang(lang) {
  currentLang = lang === "en" ? "en" : "bn";
  if (currentLang === "en") {
    startObserver();
    translateRoot(document.body);
  } else {
    restoreOriginals();
  }
}

export const isTranslateBusy = () => running;

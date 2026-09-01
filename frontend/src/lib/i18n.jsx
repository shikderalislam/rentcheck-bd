import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAutoTranslateLang, onTranslateBusy } from "./autoTranslate.js";

// Lightweight i18n for app chrome (nav, dashboards, common labels). Public
// marketing copy stays authored in Bangla. Strings fall back to Bangla, then
// to the key itself, so a missing translation is never a blank.
const DICT = {
  // nav / chrome
  "nav.findHome": { bn: "বাসা খুঁজুন", en: "Find a home" },
  "nav.areas": { bn: "এলাকা", en: "Areas" },
  "nav.landlords": { bn: "বাড়িওয়ালা", en: "Landlords" },
  "nav.liveReports": { bn: "লাইভ রিপোর্ট", en: "Live reports" },
  "nav.shareExperience": { bn: "✎ অভিজ্ঞতা শেয়ার করুন", en: "✎ Share experience" },
  "nav.login": { bn: "লগইন", en: "Login" },
  "nav.logout": { bn: "লগ আউট", en: "Log out" },
  "nav.dashboard": { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  "nav.support": { bn: "সাপোর্ট", en: "Support" },

  // dashboard shell
  "dash.overview": { bn: "ওভারভিউ", en: "Overview" },
  "dash.myReports": { bn: "আমার রিপোর্ট", en: "My reports" },
  "dash.myConfirmations": { bn: "আমার কনফার্মেশন", en: "My confirmations" },
  "dash.savedProperties": { bn: "সেভ করা বাড়ি", en: "Saved properties" },
  "dash.notifications": { bn: "নোটিফিকেশন", en: "Notifications" },
  "dash.profile": { bn: "প্রোফাইল", en: "Profile" },
  "dash.settings": { bn: "সেটিংস", en: "Settings" },
  "dash.myProfile": { bn: "আমার প্রোফাইল", en: "My profile" },
  "dash.myProperties": { bn: "আমার বাড়ি", en: "My properties" },
  "dash.addProperty": { bn: "নতুন বাসা যোগ করুন", en: "Add property" },
  "dash.tenantReports": { bn: "ভাড়াটিয়া রিপোর্ট", en: "Tenant reports" },
  "dash.reviewsAboutMe": { bn: "আমার সম্পর্কে রিভিউ", en: "Reviews about me" },
  "dash.responses": { bn: "উত্তর", en: "Responses" },
  "dash.verification": { bn: "ভেরিফিকেশন", en: "Verification" },
  "dash.analytics": { bn: "অ্যানালিটিক্স", en: "Analytics" },
  "dash.reviewQueue": { bn: "রিভিউ কিউ", en: "Review queue" },
  "dash.allReports": { bn: "সব রিপোর্ট", en: "All reports" },
  "dash.reportReports": { bn: "রিপোর্ট করা কনটেন্ট", en: "Reported content" },
  "dash.users": { bn: "ব্যবহারকারী", en: "Users" },
  "dash.content": { bn: "সাইট কনটেন্ট", en: "Site content" },
  "dash.audit": { bn: "অডিট লগ", en: "Audit log" },
  "dash.welcome": { bn: "স্বাগতম", en: "Welcome" },
  "dash.loading": { bn: "লোড হচ্ছে…", en: "Loading…" },
  "dash.nothing": { bn: "কিছু নেই।", en: "Nothing here yet." },
  "dash.backToSite": { bn: "সাইটে ফিরে যান", en: "Back to site" },

  // roles
  "role.USER": { bn: "ব্যবহারকারী", en: "User" },
  "role.LANDLORD": { bn: "বাড়িওয়ালা", en: "Landlord" },
  "role.MODERATOR": { bn: "মডারেটর", en: "Moderator" },
  "role.SUPER_ADMIN": { bn: "সুপার অ্যাডমিন", en: "Super admin" },

  // report statuses
  "status.PENDING": { bn: "পেন্ডিং", en: "Pending" },
  "status.APPROVED": { bn: "পাবলিশড", en: "Published" },
  "status.REJECTED": { bn: "প্রত্যাখ্যাত", en: "Rejected" },
  "status.HIDDEN": { bn: "লুকানো", en: "Hidden" },
  "status.DISPUTED": { bn: "বিতর্কিত", en: "Disputed" },
};

const I18nContext = createContext({ lang: "bn", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("rc_lang") === "en" ? "en" : "bn";
    } catch {
      return "bn";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("rc_lang", lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    // Kick the whole-site machine translation for anything not covered by DICT.
    // Runs after paint so React has committed the current view.
    const id = requestAnimationFrame(() => setAutoTranslateLang(lang));
    return () => cancelAnimationFrame(id);
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === "en" ? "en" : "bn"), []);
  const t = useCallback(
    (key) => {
      const entry = DICT[key];
      if (!entry) return key;
      return entry[lang] || entry.bn || key;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export function LangToggle({ className = "" }) {
  const { lang, setLang } = useI18n();
  const [busy, setBusy] = useState(false);
  useEffect(() => onTranslateBusy(setBusy), []);
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs font-semibold">
        {["bn", "en"].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 ${lang === l ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
          >
            {l === "bn" ? "বাংলা" : "EN"}
          </button>
        ))}
      </div>
      {busy && (
        <span
          className="h-3 w-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"
          title="Translating…"
        />
      )}
    </div>
  );
}

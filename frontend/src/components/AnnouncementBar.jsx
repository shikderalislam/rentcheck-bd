import { useSiteSettings } from "../lib/useSiteSettings.js";

// Thin strip that sits ABOVE the navbar. Content is admin-editable
// (site-settings > announcement) with a code fallback.
export default function AnnouncementBar() {
  const site = useSiteSettings();
  const a = site.announcement || {};
  if (a.enabled === false || !a.text) return null;
  return (
    <div className="bg-brand-700 text-white text-xs sm:text-sm font-medium">
      <div className="container-page py-2 text-center">{a.text}</div>
    </div>
  );
}

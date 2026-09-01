import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { PUBLIC_SETTING_DEFAULTS } from "./reportLabels.js";

// Fetches admin-editable content (announcement, hero copy, FAQ). Always returns
// a usable object — falls back to the built-in defaults if the request fails.
export function useSiteSettings() {
  const [settings, setSettings] = useState(PUBLIC_SETTING_DEFAULTS);
  useEffect(() => {
    let ok = true;
    api
      .get("/public/site-settings")
      .then(({ data }) => ok && data?.settings && setSettings({ ...PUBLIC_SETTING_DEFAULTS, ...data.settings }))
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);
  return settings;
}

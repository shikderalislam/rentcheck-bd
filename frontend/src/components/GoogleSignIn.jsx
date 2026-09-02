import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";

let gisPromise = null;
function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/**
 * Renders Google's official "Sign in with Google" button when the server has a
 * GOOGLE_CLIENT_ID configured; renders nothing otherwise.
 * @param {(credential:string)=>Promise<void>} onCredential
 */
export default function GoogleSignIn({ onCredential, onError }) {
  const ref = useRef(null);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    let ok = true;
    api
      .get("/auth/config")
      .then(({ data }) => ok && setClientId(data.googleClientId || null))
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp) => {
            try {
              await onCredential(resp.credential);
            } catch (e) {
              onError?.(e);
            }
          },
        });
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        });
      })
      .catch((e) => onError?.(e));
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) return null;

  return (
    <div className="pt-1">
      <div className="flex items-center gap-3 my-3">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-xs text-neutral-400">or</span>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div ref={ref} className="flex justify-center" />
    </div>
  );
}

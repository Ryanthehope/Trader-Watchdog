import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { getConsentStatus } from "./CookieBanner";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function gtagScriptSelector(measurementId: string) {
  return `script[src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}"]`;
}

/**
 * Loads GA4 gtag.js when a Measurement ID is configured (Integrations → Google Analytics).
 * Does not run on /staff routes. Sends page_view on SPA navigations.
 */
export function GoogleAnalytics() {
  const { googleAnalyticsMeasurementId } = useSiteData();
  const location = useLocation();
  const id = googleAnalyticsMeasurementId?.trim() ?? "";
  const lastConfiguredId = useRef<string | null>(null);
  const [consent, setConsent] = useState<string | null>(() => getConsentStatus());

  // Re-check consent when the user accepts via the banner
  useEffect(() => {
    const handler = () => setConsent(getConsentStatus());
    window.addEventListener("tw:consent-changed", handler);
    return () => window.removeEventListener("tw:consent-changed", handler);
  }, []);

  useEffect(() => {
    if (!id || location.pathname.startsWith("/staff")) return;
    if (consent !== "accepted") return;

    const w = window as GtagWindow;
    w.dataLayer = w.dataLayer ?? [];
    if (!w.gtag) {
      w.gtag = function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
    }

    const path = location.pathname + location.search;
    const sendPageView = () => {
      w.gtag!("event", "page_view", {
        page_path: path,
        page_title: document.title,
      });
    };

    const configureIfNeeded = () => {
      if (lastConfiguredId.current !== id) {
        w.gtag!("js", new Date());
        w.gtag!("config", id, { send_page_view: false });
        lastConfiguredId.current = id;
      }
    };

    const existing = document.querySelector(gtagScriptSelector(id));
    if (existing) {
      // gtag.js already loaded (SPA navigation) — just send the page view.
      sendPageView();
      return;
    }

    // Queue init commands in dataLayer BEFORE the script loads.
    // Google's gtag.js reads the dataLayer queue on initialisation, so these
    // must be present when the script executes — not in the onload callback.
    configureIfNeeded();

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.onload = () => {
      sendPageView();
    };
    document.head.appendChild(script);
  }, [id, location.pathname, location.search, consent]);

  return null;
}

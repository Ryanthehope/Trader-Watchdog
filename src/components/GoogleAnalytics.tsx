import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

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

  useEffect(() => {
    if (!id || location.pathname.startsWith("/staff")) return;

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
      configureIfNeeded();
      sendPageView();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.onload = () => {
      configureIfNeeded();
      sendPageView();
    };
    document.head.appendChild(script);
  }, [id, location.pathname, location.search]);

  return null;
}

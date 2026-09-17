import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getConsentStatus } from "./CookieBanner";

const META_PIXEL_ID = "1431192655546255";
const META_PIXEL_SCRIPT = "https://connect.facebook.net/en_US/fbevents.js";

type MetaPixelFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: MetaPixelFunction;
};

type MetaPixelWindow = Window & {
  fbq?: MetaPixelFunction;
  _fbq?: MetaPixelFunction;
  __twMetaPixelInitialized?: boolean;
};

function metaPixelScriptSelector() {
  return `script[src="${META_PIXEL_SCRIPT}"]`;
}

function ensureMetaPixelQueue(windowWithPixel: MetaPixelWindow): MetaPixelFunction {
  if (windowWithPixel.fbq) return windowWithPixel.fbq;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  } as MetaPixelFunction;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  windowWithPixel.fbq = fbq;
  windowWithPixel._fbq = fbq;
  return fbq;
}

function readTrackedPurchases(): string[] {
  try {
    const raw = sessionStorage.getItem("tw_meta_purchase_events");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberTrackedPurchase(eventId: string) {
  try {
    const events = new Set(readTrackedPurchases());
    events.add(eventId);
    sessionStorage.setItem("tw_meta_purchase_events", JSON.stringify([...events]));
  } catch {
    /* Ignore storage restrictions; the event can still be sent this visit. */
  }
}

/** Loads Meta Pixel after analytics consent and tracks the paid activation return. */
export function MetaPixel() {
  const location = useLocation();
  const [consent, setConsent] = useState<string | null>(() => getConsentStatus());
  const lastPagePath = useRef<string | null>(null);

  useEffect(() => {
    const handler = () => setConsent(getConsentStatus());
    window.addEventListener("tw:consent-changed", handler);
    return () => window.removeEventListener("tw:consent-changed", handler);
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/staff")) return;
    if (consent !== "accepted") return;

    const windowWithPixel = window as MetaPixelWindow;
    const fbq = ensureMetaPixelQueue(windowWithPixel);
    if (!windowWithPixel.__twMetaPixelInitialized) {
      fbq("init", META_PIXEL_ID);
      windowWithPixel.__twMetaPixelInitialized = true;
    }

    const pagePath = location.pathname + location.search;
    if (lastPagePath.current === pagePath) return;
    lastPagePath.current = pagePath;
    fbq("track", "PageView");

    if (!document.querySelector(metaPixelScriptSelector())) {
      const script = document.createElement("script");
      script.async = true;
      script.src = META_PIXEL_SCRIPT;
      document.head.appendChild(script);
    }
  }, [consent, location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname !== "/join" || consent !== "accepted") return;

    const params = new URLSearchParams(location.search);
    if (params.get("paid") !== "membership") return;

    const applicationId = params.get("app")?.trim();
    const valuePence = Number.parseInt(params.get("value") ?? "", 10);
    if (!applicationId || !Number.isFinite(valuePence) || valuePence <= 0) return;

    const eventId = `membership:${applicationId}`;
    if (readTrackedPurchases().includes(eventId)) return;

    const windowWithPixel = window as MetaPixelWindow;
    const fbq = windowWithPixel.fbq;
    if (!fbq) return;

    fbq(
      "track",
      "Purchase",
      { value: valuePence / 100, currency: "GBP" },
      { eventID: eventId }
    );
    rememberTrackedPurchase(eventId);
  }, [consent, location.pathname, location.search]);

  return null;
}
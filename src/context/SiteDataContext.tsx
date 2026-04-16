import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet } from "../lib/api";
import { findMemberInDirectory } from "../lib/memberLookup";
import type { Guide, VerifiedMember } from "../types/content";

type SiteDataContextValue = {
  loading: boolean;
  error: string | null;
  members: VerifiedMember[];
  guides: Guide[];
  /** White-label name from Staff → Settings (defaults to TradeVerify). */
  brandName: string;
  /** Public site base URL for links (from settings or env). */
  publicSiteUrl: string;
  /** GA4 Measurement ID for the public site (empty if not configured). */
  googleAnalyticsMeasurementId: string;
  findMember: (query: string) => VerifiedMember | undefined;
  reload: () => void;
};

const SiteDataContext = createContext<SiteDataContextValue | null>(null);

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<VerifiedMember[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [brandName, setBrandName] = useState("TradeVerify");
  const [publicSiteUrl, setPublicSiteUrl] = useState("http://localhost:5173");
  const [googleAnalyticsMeasurementId, setGoogleAnalyticsMeasurementId] =
    useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [membersRes, guidesRes, metaRes] = await Promise.all([
          apiGet<{ members: VerifiedMember[] }>("/api/members"),
          apiGet<{ guides: Guide[] }>("/api/guides"),
          apiGet<{
            brandName: string;
            publicSiteUrl: string;
            googleAnalyticsMeasurementId?: string | null;
          }>("/api/site-meta").catch(() => ({
            brandName: "TradeVerify",
            publicSiteUrl: "http://localhost:5173",
            googleAnalyticsMeasurementId: null as string | null,
          })),
        ]);
        if (cancelled) return;
        setMembers(Array.isArray(membersRes.members) ? membersRes.members : []);
        setGuides(Array.isArray(guidesRes.guides) ? guidesRes.guides : []);
        setBrandName(
          metaRes.brandName?.trim() ? metaRes.brandName.trim() : "TradeVerify"
        );
        setPublicSiteUrl(
          metaRes.publicSiteUrl?.trim() || "http://localhost:5173"
        );
        setGoogleAnalyticsMeasurementId(
          typeof metaRes.googleAnalyticsMeasurementId === "string" &&
            metaRes.googleAnalyticsMeasurementId.trim()
            ? metaRes.googleAnalyticsMeasurementId.trim()
            : ""
        );
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Could not reach the Trader Watchdog API. Start the server (npm run dev) or check your connection."
        );
        setMembers([]);
        setGuides([]);
        setGoogleAnalyticsMeasurementId("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const findMember = useCallback(
    (query: string) => findMemberInDirectory(members, query),
    [members]
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      members,
      guides,
      brandName,
      publicSiteUrl,
      googleAnalyticsMeasurementId,
      findMember,
      reload,
    }),
    [
      loading,
      error,
      members,
      guides,
      brandName,
      publicSiteUrl,
      googleAnalyticsMeasurementId,
      findMember,
      reload,
    ]
  );

  return (
    <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>
  );
}

export function useSiteData(): SiteDataContextValue {
  const ctx = useContext(SiteDataContext);
  if (!ctx) {
    throw new Error("useSiteData must be used within SiteDataProvider");
  }
  return ctx;
}

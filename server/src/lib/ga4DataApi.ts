import fs from "fs";
import path from "path";
import type { OrganizationSettings } from "@prisma/client";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export type Ga4ReportResult = {
  configured: boolean;
  metrics: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    dateRangeLabel: string;
  } | null;
  hint: string | null;
  error: string | null;
};

function resolveCredentialsPath(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return path.isAbsolute(t) ? t : path.join(process.cwd(), t);
}

/**
 * GA4 Data API — uses (in order):
 * 1. GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS file (env) — optional override
 * 2. OrganizationSettings.googleAnalyticsPropertyId + googleAnalyticsServiceAccountJson (Integrations UI)
 */
export async function fetchGa4OverviewReport(
  org: OrganizationSettings
): Promise<Ga4ReportResult> {
  const envProperty = process.env.GA4_PROPERTY_ID?.trim();
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const dbProperty = org.googleAnalyticsPropertyId?.trim();
  const dbJson = org.googleAnalyticsServiceAccountJson?.trim();

  const propertyId = envProperty || dbProperty || "";

  let client: BetaAnalyticsDataClient | null = null;

  if (envKeyPath) {
    const resolved = resolveCredentialsPath(envKeyPath);
    if (fs.existsSync(resolved)) {
      client = new BetaAnalyticsDataClient({ keyFilename: resolved });
    }
  }

  if (!client && dbJson) {
    try {
      const credentials = JSON.parse(dbJson) as Record<string, unknown>;
      if (
        typeof credentials !== "object" ||
        credentials === null ||
        typeof credentials.private_key !== "string" ||
        typeof credentials.client_email !== "string"
      ) {
        return {
          configured: true,
          metrics: null,
          hint: null,
          error: "Stored service account JSON is invalid. Paste a new key in Integrations.",
        };
      }
      client = new BetaAnalyticsDataClient({ credentials });
    } catch {
      return {
        configured: true,
        metrics: null,
        hint: null,
        error: "Could not parse stored service account JSON.",
      };
    }
  }

  if (!propertyId || !client) {
    return {
      configured: false,
      metrics: null,
      hint:
        "To show Google stats here: in Integrations → Google Analytics, set the numeric Property ID and paste your service account JSON (or use GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS in server .env). Add the service account email as Viewer in GA4 → Admin → Property access management.",
      error: null,
    };
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
    });

    const row = response.rows?.[0];
    const vals = row?.metricValues;
    if (!vals || vals.length < 3) {
      return {
        configured: true,
        metrics: {
          activeUsers: 0,
          sessions: 0,
          screenPageViews: 0,
          dateRangeLabel: "Last 28 days",
        },
        hint:
          "GA returned no rows yet — traffic may still be processing, or the site has no hits in this range.",
        error: null,
      };
    }

    const num = (i: number) =>
      Number.parseInt(String(vals[i]?.value ?? "0"), 10) || 0;

    return {
      configured: true,
      metrics: {
        activeUsers: num(0),
        sessions: num(1),
        screenPageViews: num(2),
        dateRangeLabel: "Last 28 days",
      },
      hint: null,
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      configured: true,
      metrics: null,
      hint:
        "Ensure the service account email is added under GA4 → Admin → Property access management (Viewer).",
      error: msg,
    };
  }
}

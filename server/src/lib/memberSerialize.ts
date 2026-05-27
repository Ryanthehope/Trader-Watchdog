import type { Member } from "@prisma/client";

export type VettingItemStatus = "verified" | "pending";

export type VettingFactPublic = {
  label: string;
  value: string;
};

export type VettingItemPublic = {
  id: string;
  label: string;
  status: VettingItemStatus;
  detail?: string;
  /** Shown below detail (e.g. phone number with call icon) */
  value?: string;
  /** Structured rows when expanded (town, social handles, review notes, etc.) */
  facts?: VettingFactPublic[];
};

export type VettingSectionPublic = {
  id: string;
  label: string;
  items: VettingItemPublic[];
};

export type InsuranceSummaryPublic = {
  type: string;
  status: "active" | "expiring_soon" | "in_grace";
};

export type PublicMember = {
  slug: string;
  tvId: string;
  name: string;
  trade: string;
  location: string;
  phone: string | null;
  checks: string[];
  vettingSections: VettingSectionPublic[];
  verifiedSince: string;
  blurb: string;
  /** Public profile has an uploaded logo image. */
  profileLogo: boolean;
  /** Active or expiring insurance policies — type and status only, no sensitive details. */
  insurancePolicies: InsuranceSummaryPublic[];
};

function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseChecksJson(checks: unknown): string[] {
  if (Array.isArray(checks)) return checks.map(String);
  if (typeof checks === "string") {
    try {
      const p = JSON.parse(checks) as unknown;
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseVettingItems(raw: unknown): VettingSectionPublic[] | null {
  if (!Array.isArray(raw)) return null;
  const out: VettingSectionPublic[] = [];
  for (const cat of raw) {
    if (!cat || typeof cat !== "object") return null;
    const label = String((cat as { label?: unknown }).label ?? "").trim();
    if (!label) return null;
    const id = String((cat as { id?: unknown }).id ?? "").trim() || slugId(label);
    const itemsRaw = (cat as { items?: unknown }).items;
    if (!Array.isArray(itemsRaw)) return null;
    const items: VettingItemPublic[] = [];
    for (const it of itemsRaw) {
      if (!it || typeof it !== "object") return null;
      const ilabel = String((it as { label?: unknown }).label ?? "").trim();
      if (!ilabel) return null;
      const st = (it as { status?: unknown }).status;
      const status: VettingItemStatus =
        st === "pending" ? "pending" : "verified";
      const detail =
        typeof (it as { detail?: unknown }).detail === "string"
          ? (it as { detail: string }).detail
          : undefined;
      const value =
        typeof (it as { value?: unknown }).value === "string"
          ? (it as { value: string }).value
          : undefined;
      let facts: VettingFactPublic[] | undefined;
      const factsRaw = (it as { facts?: unknown }).facts;
      if (Array.isArray(factsRaw)) {
        const parsed: VettingFactPublic[] = [];
        for (const f of factsRaw) {
          if (!f || typeof f !== "object") continue;
          const fl = String((f as { label?: unknown }).label ?? "").trim();
          const fv = String((f as { value?: unknown }).value ?? "").trim();
          if (fl && fv) parsed.push({ label: fl, value: fv });
        }
        if (parsed.length) facts = parsed;
      }
      items.push({
        id:
          String((it as { id?: unknown }).id ?? "").trim() ||
          slugId(`${id}-${ilabel}`),
        label: ilabel,
        status,
        detail,
        value,
        facts,
      });
    }
    out.push({ id, label, items });
  }
  return out.length ? out : null;
}

function checksToFallbackSections(checks: string[]): VettingSectionPublic[] {
  return [
    {
      id: "summary",
      label: "Verification summary",
      items: checks.map((c, i) => ({
        id: `check-${i}`,
        label: c,
        status: "verified" as const,
        detail:
          "This point was independently confirmed as part of our verification process before this profile went live.",
      })),
    },
  ];
}

export function memberToPublic(
  m: Member & { insurancePolicies?: Array<{ type: string; status: string }> }
): PublicMember {
  const checks = parseChecksJson(m.checks);
  const parsed = parseVettingItems(m.vettingItems);
  const vettingSections =
    parsed ?? (checks.length ? checksToFallbackSections(checks) : []);
  const insurancePolicies: InsuranceSummaryPublic[] = (m.insurancePolicies ?? [])
    .filter((p) => p.status === "active" || p.status === "expiring_soon" || p.status === "in_grace")
    .map((p) => ({ type: p.type, status: p.status as InsuranceSummaryPublic["status"] }));
  return {
    slug: m.slug,
    tvId: m.tvId,
    name: m.name,
    trade: m.trade,
    location: m.location,
    phone: m.invoicePhone?.trim() || null,
    checks,
    vettingSections,
    verifiedSince: m.verifiedSince,
    blurb: m.blurb,
    profileLogo: Boolean(m.profileLogoStoredName?.trim()),
    insurancePolicies,
  };
}

export function guideToPublic(g: {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  body: unknown;
}) {
  const body = Array.isArray(g.body)
    ? (g.body as unknown[]).map(String)
    : typeof g.body === "string"
      ? JSON.parse(g.body)
      : [];
  return {
    slug: g.slug,
    title: g.title,
    excerpt: g.excerpt,
    readTime: g.readTime,
    body,
  };
}

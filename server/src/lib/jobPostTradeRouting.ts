import type { PrismaClient } from "@prisma/client";
import { isMemberPublicListingVisible } from "./memberMembership.js";

export const JOB_TRADE_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "it", label: "IT & technology" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing & heating" },
  { slug: "building", label: "Building & construction" },
  { slug: "carpentry", label: "Carpentry & joinery" },
  { slug: "roofing", label: "Roofing" },
  { slug: "decorating", label: "Painting & decorating" },
  { slug: "landscaping", label: "Landscaping & gardening" },
  { slug: "security", label: "Security & alarms" },
  { slug: "cleaning", label: "Cleaning" },
  { slug: "other", label: "Other / general (broad match)" },
];

const SLUGS = new Set(JOB_TRADE_CATEGORIES.map((c) => c.slug));

export function isValidJobTradeSlug(slug: string): boolean {
  return SLUGS.has(slug.trim().toLowerCase());
}

export function jobTradeLabelForSlug(slug: string): string {
  const s = slug.trim().toLowerCase();
  return JOB_TRADE_CATEGORIES.find((c) => c.slug === s)?.label ?? slug;
}

/**
 * Heuristic match between homeowner-selected category and member.profile trade string.
 */
export function memberTradeMatchesCategory(
  memberTrade: string,
  slug: string
): boolean {
  const t = memberTrade.trim().toLowerCase();
  if (!t) return false;
  const s = slug.trim().toLowerCase();

  switch (s) {
    case "it":
      return (
        /\b(it|i\.t\.|ict|tech|computer|computing|network|software|cyber|digital|web|developer|programming|data)\b/i.test(
          memberTrade
        ) ||
        t.includes("information technology") ||
        t.includes("it support") ||
        t.includes("it services") ||
        t.includes("msp")
      );
    case "electrical":
      return (
        t.includes("electric") ||
        t.includes("rewire") ||
        t.includes("ev ") ||
        t.includes("ev charger")
      );
    case "plumbing":
      return (
        t.includes("plumb") ||
        t.includes("heating") ||
        t.includes("gas safe") ||
        t.includes("boiler") ||
        t.includes("bathroom fit")
      );
    case "building":
      return (
        t.includes("builder") ||
        t.includes("building") ||
        t.includes("construction") ||
        t.includes("brick") ||
        t.includes("extension")
      );
    case "carpentry":
      return (
        t.includes("carpent") || t.includes("joiner") || t.includes("wood")
      );
    case "roofing":
      return t.includes("roof");
    case "decorating":
      return (
        t.includes("decor") || t.includes("paint") || t.includes("plaster")
      );
    case "landscaping":
      return (
        t.includes("landscape") ||
        t.includes("garden") ||
        t.includes("grounds") ||
        t.includes("tree") ||
        t.includes("lawn")
      );
    case "security":
      return (
        t.includes("security") ||
        t.includes("alarm") ||
        t.includes("cctv") ||
        t.includes("locksmith") ||
        t.includes("access control")
      );
    case "cleaning":
      return t.includes("clean");
    case "other":
      return (
        t.includes("handyman") ||
        t.includes("general") ||
        t.includes("maintenance") ||
        t.includes("property") ||
        t.includes("odd job") ||
        t.includes("multi") ||
        t.includes("multi-trade")
      );
    default:
      return false;
  }
}

type MemberVis = {
  id: string;
  trade: string;
  membershipUnlimited: boolean;
  membershipBillingType: string | null;
  membershipExpiresAt: Date | null;
  stripeSubscriptionStatus: string | null;
};

const MAX_BROADCAST_OTHER = 50;

export async function findMembersMatchingJobTrade(
  prisma: PrismaClient,
  tradeSlug: string
): Promise<{ id: string; trade: string }[]> {
  const slug = tradeSlug.trim().toLowerCase();
  const rows = (await prisma.member.findMany({
    select: {
      id: true,
      trade: true,
      membershipUnlimited: true,
      membershipBillingType: true,
      membershipExpiresAt: true,
      stripeSubscriptionStatus: true,
    },
    orderBy: { name: "asc" },
  })) as MemberVis[];

  const visible = rows.filter((m) => {
    return (
      isMemberPublicListingVisible({
        membershipUnlimited: m.membershipUnlimited,
        membershipBillingType: m.membershipBillingType,
        membershipExpiresAt: m.membershipExpiresAt,
        stripeSubscriptionStatus: m.stripeSubscriptionStatus,
      }) && memberTradeMatchesCategory(m.trade, slug)
    );
  });

  if (slug === "other") {
    const broad = rows.filter((m) =>
      isMemberPublicListingVisible({
        membershipUnlimited: m.membershipUnlimited,
        membershipBillingType: m.membershipBillingType,
        membershipExpiresAt: m.membershipExpiresAt,
        stripeSubscriptionStatus: m.stripeSubscriptionStatus,
      })
    );
    const out = broad.filter((m) => memberTradeMatchesCategory(m.trade, "other"));
    if (out.length > 0) return out.map((m) => ({ id: m.id, trade: m.trade }));
    return broad.slice(0, MAX_BROADCAST_OTHER).map((m) => ({
      id: m.id,
      trade: m.trade,
    }));
  }

  return visible.map((m) => ({ id: m.id, trade: m.trade }));
}

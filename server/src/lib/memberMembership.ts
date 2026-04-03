import type { PrismaClient } from "@prisma/client";

function normalizeBillingType(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim().toLowerCase();
  return t === "" ? null : t;
}

/** Safe millis from DB Date or ISO string (SQLite edge cases). */
function membershipExpiresAtToMs(
  d: Date | string | null | undefined
): number | null {
  if (d == null) return null;
  const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Null billing + null expiry = members created before membership tracking. */
export function isLegacyUnlimitedMember(m: {
  membershipBillingType: string | null;
  membershipExpiresAt: Date | null;
}): boolean {
  return (
    normalizeBillingType(m.membershipBillingType) == null &&
    membershipExpiresAtToMs(m.membershipExpiresAt) == null
  );
}

type MembershipFields = {
  membershipUnlimited: boolean;
  membershipBillingType: string | null;
  membershipExpiresAt: Date | null;
  stripeSubscriptionStatus: string | null;
};

/**
 * Portal CRM + public listing: staff unlimited, or legacy (no billing record),
 * or an access window that has not ended yet.
 */
export function isMemberMembershipAccessActive(m: MembershipFields): boolean {
  if (m.membershipUnlimited) return true;

  const billing = normalizeBillingType(m.membershipBillingType);
  const expMs = membershipExpiresAtToMs(m.membershipExpiresAt);
  const now = Date.now();

  /** Grandfathered: no billing type and no expiry stored — full access. */
  if (billing == null && expMs == null) {
    return true;
  }

  /** Any recorded end date in the past ends access (manual, Stripe, fast-track). */
  if (expMs != null && expMs <= now) {
    return false;
  }

  if (billing === "stripe") {
    const st = String(m.stripeSubscriptionStatus ?? "")
      .trim()
      .toLowerCase();
    if (st === "active" || st === "trialing") return true;
    return expMs != null && expMs > now;
  }

  if (billing === "manual" || billing === "fast_track") {
    return expMs != null && expMs > now;
  }

  /** Unknown billing type but an expiry is set — trust the date only. */
  return expMs != null && expMs > now;
}

export function isMemberPublicListingVisible(m: MembershipFields): boolean {
  return isMemberMembershipAccessActive(m);
}

export function membershipSummaryForMember(m: MembershipFields) {
  const legacyUnlimited =
    !m.membershipUnlimited && isLegacyUnlimitedMember(m);
  const accessActive = isMemberMembershipAccessActive(m);
  return {
    billingType: m.membershipBillingType,
    expiresAt: m.membershipExpiresAt?.toISOString() ?? null,
    subscriptionStatus: m.stripeSubscriptionStatus,
    accessActive,
    legacyUnlimited,
    adminUnlimited: m.membershipUnlimited,
  };
}

/** Deletes members whose paid term ended more than `graceDays` ago (listing removed). */
export async function deleteMembersExpiredBeyondGrace(
  prisma: PrismaClient,
  graceDays = 30
): Promise<number> {
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  const result = await prisma.member.deleteMany({
    where: {
      membershipUnlimited: false,
      membershipExpiresAt: { not: null, lte: cutoff },
    },
  });
  return result.count;
}

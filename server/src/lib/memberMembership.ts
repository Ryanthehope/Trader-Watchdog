type MemberMembershipFields = {
  membershipUnlimited: boolean;
  membershipBillingType: string | null;
  membershipExpiresAt: Date | null;
  stripeSubscriptionStatus: string | null;
};

function nowUtc(): Date {
  return new Date();
}

function isStripeMembershipActive(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

export function isMemberMembershipAccessActive(
  member: MemberMembershipFields,
  now = nowUtc()
): boolean {
  if (member.membershipUnlimited) return true;
  if (!member.membershipBillingType) return true;
  if (!member.membershipExpiresAt) {
    return (
      member.membershipBillingType !== "stripe" ||
      isStripeMembershipActive(member.stripeSubscriptionStatus)
    );
  }
  return member.membershipExpiresAt > now;
}

export function isMemberPublicListingVisible(
  member: MemberMembershipFields,
  now = nowUtc()
): boolean {
  if (isMemberMembershipAccessActive(member, now)) return true;
  if (!member.membershipExpiresAt) return false;

  const graceEndsAt = new Date(
    member.membershipExpiresAt.getTime() + 14 * 24 * 60 * 60 * 1000
  );
  return now <= graceEndsAt;
}

export function membershipSummaryForMember(
  member: MemberMembershipFields,
  now = nowUtc()
) {
  const accessActive = isMemberMembershipAccessActive(member, now);
  const publicVisible = isMemberPublicListingVisible(member, now);

  return {
    accessActive,
    publicVisible,
    membershipUnlimited: member.membershipUnlimited,
    billingType: member.membershipBillingType,
    expiresAt: member.membershipExpiresAt?.toISOString() ?? null,
    stripeSubscriptionStatus: member.stripeSubscriptionStatus,
    inGracePeriod:
      !accessActive && publicVisible && Boolean(member.membershipExpiresAt),
  };
}
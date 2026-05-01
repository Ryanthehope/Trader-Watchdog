function nowUtc() {
    return new Date();
}
function isStripeMembershipActive(status) {
    return status === "active" || status === "trialing";
}
export function isMemberMembershipAccessActive(member, now = nowUtc()) {
    if (member.membershipUnlimited)
        return true;
    if (!member.membershipBillingType)
        return true;
    if (!member.membershipExpiresAt) {
        return (member.membershipBillingType !== "stripe" ||
            isStripeMembershipActive(member.stripeSubscriptionStatus));
    }
    return member.membershipExpiresAt > now;
}
export function isMemberPublicListingVisible(member, now = nowUtc()) {
    if (isMemberMembershipAccessActive(member, now))
        return true;
    if (!member.membershipExpiresAt)
        return false;
    const graceEndsAt = new Date(member.membershipExpiresAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    return now <= graceEndsAt;
}
export function membershipSummaryForMember(member, now = nowUtc()) {
    const accessActive = isMemberMembershipAccessActive(member, now);
    const publicVisible = isMemberPublicListingVisible(member, now);
    return {
        accessActive,
        publicVisible,
        membershipUnlimited: member.membershipUnlimited,
        billingType: member.membershipBillingType,
        expiresAt: member.membershipExpiresAt?.toISOString() ?? null,
        stripeSubscriptionStatus: member.stripeSubscriptionStatus,
        inGracePeriod: !accessActive && publicVisible && Boolean(member.membershipExpiresAt),
    };
}

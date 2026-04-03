import { prisma } from "../db.js";
import { isMemberMembershipAccessActive } from "../lib/memberMembership.js";
/** Blocks portal routes when membership has lapsed (after requireMember). */
export const requireMemberMembershipActive = async (req, res, next) => {
    const memberId = req.memberId;
    try {
        const m = await prisma.member.findUnique({
            where: { id: memberId },
            select: {
                membershipUnlimited: true,
                membershipBillingType: true,
                membershipExpiresAt: true,
                stripeSubscriptionStatus: true,
            },
        });
        if (!m) {
            res.status(404).json({ error: "Account not found" });
            return;
        }
        if (isMemberMembershipAccessActive(m)) {
            next();
            return;
        }
        res.status(403).json({
            error: "Your membership has expired. Open Membership to renew or subscribe with card.",
            code: "MEMBERSHIP_EXPIRED",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not verify membership" });
    }
};

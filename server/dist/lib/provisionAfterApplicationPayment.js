import { tryProvisionMemberForApplication } from "./provisionMemberFromApplication.js";
/**
 * Creates the member profile when an application is APPROVED and at least one
 * payment path (fast-track or membership) is satisfied.
 */
export async function provisionIfApplicationPaid(prisma, applicationId) {
    const app = await prisma.application.findUnique({
        where: { id: applicationId },
    });
    if (!app)
        return { ok: false, reason: "not_found" };
    if (app.status !== "APPROVED")
        return { ok: false, reason: "not_approved" };
    if (app.createdMemberId)
        return { ok: false, reason: "already_provisioned" };
    const paid = Boolean(app.fastTrackPaidAt) || Boolean(app.membershipSubscribed);
    if (!paid)
        return { ok: false, reason: "unpaid" };
    const prov = await tryProvisionMemberForApplication(prisma, applicationId);
    if (prov.kind === "email_in_use") {
        return { ok: false, reason: "email_in_use" };
    }
    return { ok: true };
}

import type { PrismaClient } from "@prisma/client";
import { tryProvisionMemberForApplication } from "./provisionMemberFromApplication.js";

export type ProvisionAfterPaymentResult =
  | { ok: true; newlyCreated: true; temporaryPassword: string; email: string; name: string }
  | { ok: true; newlyCreated: false }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_approved"
        | "unpaid"
        | "membership_expiry_missing"
        | "email_in_use"
        | "already_provisioned";
    };

/**
 * Creates the member profile when an application is APPROVED and at least one
 * payment path (registration fee and membership) is satisfied.
 */
export async function provisionIfApplicationPaid(
  prisma: PrismaClient,
  applicationId: string
): Promise<ProvisionAfterPaymentResult> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app) return { ok: false, reason: "not_found" };
  if (app.status !== "APPROVED") return { ok: false, reason: "not_approved" };
  if (app.createdMemberId) return { ok: false, reason: "already_provisioned" };
  const paid =
    Boolean(app.registrationFeePaidAt) && Boolean(app.membershipSubscribed);
  if (!paid) return { ok: false, reason: "unpaid" };
  const prov = await tryProvisionMemberForApplication(prisma, applicationId);
  if (prov.kind === "email_in_use") {
    return { ok: false, reason: "email_in_use" };
  }
  if (prov.kind === "membership_expiry_missing") {
    return { ok: false, reason: "membership_expiry_missing" };
  }
  if (prov.kind === "created") {
    return {
      ok: true,
      newlyCreated: true,
      temporaryPassword: prov.temporaryPassword,
      email: app.email.trim().toLowerCase(),
      name: (app.identifiablePerson?.trim() || app.company).trim(),
    };
  }
  return { ok: true, newlyCreated: false };
}

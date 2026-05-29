import type { Request, Response } from "express";
import { parse as parseGoCardlessWebhooks } from "gocardless-nodejs/webhooks";
import { prisma } from "../db.js";
import {
  getGoCardlessApiClient,
  getGoCardlessWebhookSecret,
} from "../lib/billingSettings.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import { notifySubscriptionRenewed, notifyMemberWelcome } from "../lib/adminMail.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";

type GoCardlessPayment = {
  created_at?: string | null;
  metadata?: Record<string, string | undefined> | null;
  status?: string | null;
};

type GoCardlessEvent = {
  action?: string;
  links?: {
    billing_request?: string;
    payment?: string;
  };
  resource_type?: string;
};

async function customerIdFromBillingRequest(
  gocardless: Awaited<ReturnType<typeof getGoCardlessApiClient>>,
  billingRequestId: string | undefined
) {
  if (!gocardless || !billingRequestId) return null;
  try {
    const billingRequest = await gocardless.billingRequests.find(billingRequestId);
    return billingRequest.resources?.customer?.id ?? null;
  } catch (error) {
    console.warn(
      `[gocardless webhook] could not load billing request ${billingRequestId}`,
      error
    );
    return null;
  }
}

export async function goCardlessWebhookHandler(req: Request, res: Response) {
  const signatureHeader =
    req.headers["webhook-signature"] ?? req.headers["gocardless-signature"];
  const secret = await getGoCardlessWebhookSecret();
  const gocardless = await getGoCardlessApiClient();
  if (!gocardless || !secret || typeof signatureHeader !== "string") {
    res.status(400).type("text/plain").send("Webhook not configured");
    return;
  }
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }
  let events: GoCardlessEvent[];
  try {
    events = parseGoCardlessWebhooks(buf, secret, signatureHeader) as GoCardlessEvent[];
  } catch (e) {
    console.warn("[gocardless webhook] signature failed", e);
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  try {
    for (const event of events) {
      if (event.resource_type !== "payments") continue;
      const action = event.action;
      if (action !== "created" && action !== "confirmed") continue;

      const paymentId = event.links?.payment;
      if (!paymentId) continue;

      const payment = (await gocardless.payments.find(paymentId)) as GoCardlessPayment;
      const kind = payment.metadata?.checkoutKind;
      if (!kind) continue;

      // On `created`: the billing_request link is available — capture the GoCardless
      // customer ID and persist it. Do NOT provision yet; wait for `confirmed` to
      // ensure the money has actually been collected (covers Bacs/Direct Debit).
      if (action === "created") {
        const customerId = await customerIdFromBillingRequest(
          gocardless,
          event.links?.billing_request
        );
        if (!customerId) continue;
        const appId = payment.metadata?.applicationId;
        if (appId && (kind === "registration_fee" || kind === "membership")) {
          await prisma.application.updateMany({
            where: { id: appId },
            data: { goCardlessCustomerId: customerId },
          });
        }
        const memberId = payment.metadata?.memberId;
        if (memberId && kind === "member_portal_renewal") {
          await prisma.member.updateMany({
            where: { id: memberId },
            data: { goCardlessCustomerId: customerId },
          });
        }
        continue;
      }

      // action === "confirmed" — payment collected, safe to activate/provision
      const paymentCreatedAt = payment.created_at
        ? new Date(payment.created_at)
        : new Date();

      if (kind === "member_portal_renewal" && payment.metadata?.memberId) {
        const memberId = payment.metadata.memberId;
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { membershipExpiresAt: true, name: true, loginEmail: true },
        });
        if (!member) {
          console.warn(
            `[gocardless webhook] renewal confirmed for missing member ${memberId}`
          );
          continue;
        }
        const baseDate =
          member.membershipExpiresAt && member.membershipExpiresAt > paymentCreatedAt
            ? member.membershipExpiresAt
            : paymentCreatedAt;
        const renewedUntil = addOneCalendarYearEndUtc(baseDate);
        await prisma.member.update({
          where: { id: memberId },
          data: {
            membershipBillingType: "manual",
            membershipExpiresAt: renewedUntil,
          },
        });
        if (member.loginEmail?.trim()) {
          notifySubscriptionRenewed(prisma, {
            traderName: member.name,
            email: member.loginEmail,
            renewedUntil,
          });
        }
        continue;
      }

      const appId = payment.metadata?.applicationId;
      if (appId && kind === "registration_fee") {
        const updated = await prisma.application.updateMany({
          where: { id: appId, registrationFeePaidAt: null },
          data: { registrationFeePaidAt: paymentCreatedAt },
        });
        if (updated.count > 0) {
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
          }
          if (prov.ok && prov.newlyCreated) {
            notifyMemberWelcome(prisma, { email: prov.email, name: prov.name, temporaryPassword: prov.temporaryPassword });
          }
        }
      }

      if (appId && kind === "membership") {
        const updated = await prisma.application.updateMany({
          where: { id: appId, membershipSubscribed: false },
          data: {
            membershipSubscribed: true,
            manualMembershipExpiresAt: addOneCalendarYearEndUtc(paymentCreatedAt),
          },
        });
        if (updated.count > 0) {
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
          }
          if (prov.ok && prov.newlyCreated) {
            notifyMemberWelcome(prisma, { email: prov.email, name: prov.name, temporaryPassword: prov.temporaryPassword });
          }
        }
      }
    }
  } catch (e) {
    console.error("[gocardless webhook] handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
}

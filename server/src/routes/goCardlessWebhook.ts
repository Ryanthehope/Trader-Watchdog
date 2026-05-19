import type { Request, Response } from "express";
import { prisma } from "../db.js";
import {
  getGoCardlessClient,
  getGoCardlessWebhookSecret,
} from "../lib/billingSettings.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";

type GoCardlessCheckoutSession = {
  customer?: string | { id?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
  created?: number | null;
};

type GoCardlessWebhookEvent = {
  type?: string;
  data?: {
    object?: unknown;
  };
};

function customerIdFromSession(
  session: GoCardlessCheckoutSession
): string | null {
  const c = session.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) return c.id ?? null;
  return null;
}

export async function goCardlessWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["gocardless-signature"];
  const secret = await getGoCardlessWebhookSecret();
  const gocardless = await getGoCardlessClient();
  if (!gocardless || !secret || typeof sig !== "string") {
    res.status(400).type("text/plain").send("Webhook not configured");
    return;
  }
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }
  let event: GoCardlessWebhookEvent;
  try {
    event = (gocardless as any).webhooks.constructEvent(buf, sig, secret);
  } catch (e) {
    console.warn("[gocardless webhook] signature failed", e);
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object as GoCardlessCheckoutSession;
      const kind = session.metadata?.checkoutKind;
      const sessionCreatedAt = new Date(
        (session.created ?? Math.floor(Date.now() / 1000)) * 1000
      );

      if (kind === "member_portal_renewal" && session.metadata?.memberId) {
        const memberId = session.metadata.memberId;
        const customerId = customerIdFromSession(session);
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { membershipExpiresAt: true },
        });
        if (!member) {
          console.warn(
            `[gocardless webhook] renewal completed for missing member ${memberId}`
          );
        } else {
          const baseDate =
            member.membershipExpiresAt &&
            member.membershipExpiresAt > sessionCreatedAt
              ? member.membershipExpiresAt
              : sessionCreatedAt;
          await prisma.member.update({
            where: { id: memberId },
            data: {
              membershipBillingType: "manual",
              membershipExpiresAt: addOneCalendarYearEndUtc(baseDate),
              goCardlessSubscriptionId: null,
              goCardlessSubscriptionStatus: null,
              ...(customerId ? { goCardlessCustomerId: customerId } : {}),
            },
          });
        }
      } else {
        const appId = session.metadata?.applicationId;
        if (appId && kind === "registration_fee") {
          await prisma.application.update({
            where: { id: appId },
            data: { registrationFeePaidAt: new Date() },
          });
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
          }
        }
        if (appId && kind === "membership") {
          const customerId = customerIdFromSession(session);
          await prisma.application.update({
            where: { id: appId },
            data: {
              membershipSubscribed: true,
              manualMembershipExpiresAt: addOneCalendarYearEndUtc(
                sessionCreatedAt
              ),
              ...(customerId ? { goCardlessCustomerId: customerId } : {}),
            },
          });
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
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

import type { Request, Response } from "express";
import type Stripe from "stripe";
import { prisma } from "../db.js";
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "../lib/billingSettings.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";
import { notifyStripeSubscriptionEnded } from "../lib/adminMail.js";

function subscriptionIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  const s = session.subscription;
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && "id" in s) return s.id;
  return null;
}

function customerIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  const c = session.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) return c.id;
  return null;
}

function customerIdFromSubscription(sub: Stripe.Subscription): string | null {
  const c = sub.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) return c.id;
  return null;
}

function subscriptionPeriodEndUnix(sub: Stripe.Subscription): number {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  if (typeof fromItem === "number") return fromItem;
  const legacy = sub as unknown as { current_period_end?: number };
  if (typeof legacy.current_period_end === "number") {
    return legacy.current_period_end;
  }
  return Math.floor(Date.now() / 1000);
}

async function applyStripeSubscriptionToMember(
  memberId: string,
  sub: Stripe.Subscription,
  customerIdFallback: string | null
) {
  const customerId = customerIdFromSubscription(sub) ?? customerIdFallback;
  const endSec = sub.ended_at ?? subscriptionPeriodEndUnix(sub);
  const periodEnd = new Date(endSec * 1000);
  await prisma.member.update({
    where: { id: memberId },
    data: {
      membershipBillingType: "stripe",
      membershipExpiresAt: periodEnd,
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: sub.status,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
  });
}

async function syncMemberFromStripeSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription
) {
  const metaMemberId = sub.metadata?.memberId?.trim();
  let memberId: string | undefined = metaMemberId || undefined;
  if (!memberId) {
    const m = await prisma.member.findFirst({
      where: { stripeSubscriptionId: sub.id },
      select: { id: true },
    });
    memberId = m?.id;
  }
  if (!memberId) return;
  await applyStripeSubscriptionToMember(
    memberId,
    sub,
    customerIdFromSubscription(sub)
  );
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const secret = await getStripeWebhookSecret();
  const stripe = await getStripeClient();
  if (!stripe || !secret || typeof sig !== "string") {
    res.status(400).type("text/plain").send("Webhook not configured");
    return;
  }
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, secret);
  } catch (e) {
    console.warn("[stripe webhook] signature failed", e);
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.checkoutKind;

      if (kind === "member_portal_subscription" && session.metadata?.memberId) {
        const memberId = session.metadata.memberId;
        const subId = subscriptionIdFromSession(session);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applyStripeSubscriptionToMember(
            memberId,
            sub,
            customerIdFromSession(session)
          );
        } else {
          console.warn(
            "[stripe webhook] member_portal_subscription without subscription id"
          );
        }
      } else {
        const appId = session.metadata?.applicationId;
        if (appId && kind === "fast_track") {
          await prisma.application.update({
            where: { id: appId },
            data: { fastTrackPaidAt: new Date() },
          });
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[stripe webhook] provision blocked: applicant email already has a member portal"
            );
          }
        }
        if (appId && kind === "membership") {
          const customerId = customerIdFromSession(session);
          const subId = subscriptionIdFromSession(session);
          let sub: Stripe.Subscription | null = null;
          if (subId) {
            sub = await stripe.subscriptions.retrieve(subId);
          }
          await prisma.application.update({
            where: { id: appId },
            data: {
              membershipSubscribed: true,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[stripe webhook] provision blocked: applicant email already has a member portal"
            );
          }
          if (sub) {
            const app = await prisma.application.findUnique({
              where: { id: appId },
              select: { createdMemberId: true },
            });
            if (app?.createdMemberId) {
              await applyStripeSubscriptionToMember(
                app.createdMemberId,
                sub,
                customerId
              );
            }
          }
        }
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      await syncMemberFromStripeSubscription(stripe, sub);
      if (event.type === "customer.subscription.deleted") {
        const metaMemberId = sub.metadata?.memberId?.trim();
        const m = metaMemberId
          ? await prisma.member.findUnique({
              where: { id: metaMemberId },
              select: { name: true, tvId: true, loginEmail: true },
            })
          : await prisma.member.findFirst({
              where: { stripeSubscriptionId: sub.id },
              select: { name: true, tvId: true, loginEmail: true },
            });
        if (m) {
          notifyStripeSubscriptionEnded(prisma, m, sub.id);
        }
      }
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
}

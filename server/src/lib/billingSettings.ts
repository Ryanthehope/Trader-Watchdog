import Stripe from "stripe";
import { prisma } from "../db.js";

const MIN_CHECKOUT_PENCE = 100; // £1.00 — Stripe practical minimum for GBP
const MAX_CHECKOUT_PENCE = 999_999_99;

export async function getOrgBilling() {
  return prisma.organizationSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function getStripeSecretKey(): Promise<string | null> {
  const env = process.env.STRIPE_SECRET_KEY?.trim();
  if (env) return env;
  const s = await getOrgBilling();
  return s.stripeSecretKey?.trim() || null;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const env = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (env) return env;
  const s = await getOrgBilling();
  return s.stripeWebhookSecret?.trim() || null;
}

export async function getStripeClient(): Promise<Stripe | null> {
  const key = await getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

export function billingReady(s: {
  billingEnabled: boolean;
  stripePublishableKey: string | null;
}): boolean {
  return Boolean(s.billingEnabled && s.stripePublishableKey?.trim());
}

type BillingRow = {
  checkoutMembershipName: string | null;
  checkoutFastTrackName: string | null;
  checkoutMembershipPence: number;
  checkoutFastTrackPence: number;
};

export function clampCheckoutPence(n: number): number {
  const v = Math.floor(Number(n));
  if (Number.isNaN(v)) return MIN_CHECKOUT_PENCE;
  return Math.min(MAX_CHECKOUT_PENCE, Math.max(MIN_CHECKOUT_PENCE, v));
}

/** Names + amounts for Stripe Checkout `price_data` line items. */
export function checkoutLineConfig(s: BillingRow) {
  return {
    membershipPence: clampCheckoutPence(s.checkoutMembershipPence),
    fastTrackPence: clampCheckoutPence(s.checkoutFastTrackPence),
    membershipName:
      s.checkoutMembershipName?.trim() || "Trader Watchdog monthly membership",
    fastTrackName:
      s.checkoutFastTrackName?.trim() || "Trader Watchdog fast-track vetting",
  };
}

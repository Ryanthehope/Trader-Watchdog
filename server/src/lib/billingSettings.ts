import Stripe from "stripe";
import { prisma } from "../db.js";
import { getLaunchWindow } from "./launchWindow.js";
const MIN_CHECKOUT_PENCE = 100; // £1.00 — Stripe practical minimum for GBP
const MAX_CHECKOUT_PENCE = 999_999_99;
const LAUNCH_DISCOUNT_PERCENT = 20;

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

function applyPercentageDiscount(amountPence: number, percent: number) {
  const multiplier = Math.max(0, 100 - percent) / 100;
  return clampCheckoutPence(Math.round(amountPence * multiplier));
}

/** Names + amounts for Stripe Checkout `price_data` line items. */
export function checkoutLineConfig(s: BillingRow) {
  const { launchDiscountActive } = getLaunchWindow();
  const baseMembershipPence = clampCheckoutPence(s.checkoutMembershipPence);
  return {
    membershipPence: launchDiscountActive
      ? applyPercentageDiscount(baseMembershipPence, LAUNCH_DISCOUNT_PERCENT)
      : baseMembershipPence,
    fastTrackPence: clampCheckoutPence(s.checkoutFastTrackPence),
    membershipName:
      s.checkoutMembershipName?.trim() || "Trader Watchdog annual membership",
    fastTrackName:
      s.checkoutFastTrackName?.trim() || "Trader Watchdog fast-track vetting",
  };
}

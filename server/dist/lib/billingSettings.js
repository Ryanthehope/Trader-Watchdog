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
export async function getStripeSecretKey() {
    const env = process.env.STRIPE_SECRET_KEY?.trim();
    if (env)
        return env;
    const s = await getOrgBilling();
    return s.stripeSecretKey?.trim() || null;
}
export async function getStripeWebhookSecret() {
    const env = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (env)
        return env;
    const s = await getOrgBilling();
    return s.stripeWebhookSecret?.trim() || null;
}
export async function getStripeClient() {
    const key = await getStripeSecretKey();
    if (!key)
        return null;
    return new Stripe(key);
}
export function billingReady(s) {
    return Boolean(s.billingEnabled && s.stripePublishableKey?.trim());
}
export function clampCheckoutPence(n) {
    const v = Math.floor(Number(n));
    if (Number.isNaN(v))
        return MIN_CHECKOUT_PENCE;
    return Math.min(MAX_CHECKOUT_PENCE, Math.max(MIN_CHECKOUT_PENCE, v));
}
/** Names + amounts for Stripe Checkout `price_data` line items. */
export function checkoutLineConfig(s) {
    return {
        membershipPence: clampCheckoutPence(s.checkoutMembershipPence),
        fastTrackPence: clampCheckoutPence(s.checkoutFastTrackPence),
        membershipName: s.checkoutMembershipName?.trim() || "TradeVerify monthly membership",
        fastTrackName: s.checkoutFastTrackName?.trim() || "TradeVerify fast-track vetting",
    };
}

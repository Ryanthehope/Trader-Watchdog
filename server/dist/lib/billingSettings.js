import GoCardless from "gocardless";
import { prisma } from "../db.js";
import { getLaunchWindow } from "./launchWindow.js";
const MIN_CHECKOUT_PENCE = 100; // £1.00 — GoCardless practical minimum for GBP
const MAX_CHECKOUT_PENCE = 999_999_99;
const LAUNCH_DISCOUNT_PERCENT = 20;
export async function getOrgBilling() {
    return prisma.organizationSettings.upsert({
        where: { id: "default" },
        create: { id: "default" },
        update: {},
    });
}
export async function getGoCardlessSecretKey() {
    const env = process.env.GO_CARDLESS_SECRET_KEY?.trim() ||
        process.env.GOCARDLESS_SECRET_KEY?.trim();
    if (env)
        return env;
    const s = await getOrgBilling();
    return s.goCardlessSecretKey?.trim() || null;
}
export async function getGoCardlessWebhookSecret() {
    const env = process.env.GO_CARDLESS_WEBHOOK_SECRET?.trim() ||
        process.env.GOCARDLESS_WEBHOOK_SECRET?.trim();
    if (env)
        return env;
    const s = await getOrgBilling();
    return s.goCardlessWebhookSecret?.trim() || null;
}
export async function getGoCardlessClient() {
    const key = await getGoCardlessSecretKey();
    if (!key)
        return null;
    return new GoCardless(key);
}
export function billingReady(s) {
    return Boolean(s.billingEnabled && s.goCardlessPublishableKey?.trim());
}
export function clampCheckoutPence(n) {
    const v = Math.floor(Number(n));
    if (Number.isNaN(v))
        return MIN_CHECKOUT_PENCE;
    return Math.min(MAX_CHECKOUT_PENCE, Math.max(MIN_CHECKOUT_PENCE, v));
}
function applyPercentageDiscount(amountPence, percent) {
    const multiplier = Math.max(0, 100 - percent) / 100;
    return clampCheckoutPence(Math.round(amountPence * multiplier));
}
/** Names + amounts for online billing line items. */
export function checkoutLineConfig(s) {
    const { launchDiscountActive } = getLaunchWindow();
    const baseMembershipPence = clampCheckoutPence(s.checkoutMembershipPence);
    return {
        membershipPence: launchDiscountActive
            ? applyPercentageDiscount(baseMembershipPence, LAUNCH_DISCOUNT_PERCENT)
            : baseMembershipPence,
        fastTrackPence: clampCheckoutPence(s.checkoutFastTrackPence),
        membershipName: s.checkoutMembershipName?.trim() || "Trader Watchdog annual membership",
        fastTrackName: s.checkoutFastTrackName?.trim() || "Trader Watchdog fast-track vetting",
    };
}

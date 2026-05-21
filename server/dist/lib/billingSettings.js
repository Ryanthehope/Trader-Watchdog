import GoCardless from "gocardless";
import { prisma } from "../db.js";
import { getLaunchWindow } from "./launchWindow.js";
const MIN_CHECKOUT_PENCE = 100; // £1.00 — GoCardless practical minimum for GBP
const MAX_CHECKOUT_PENCE = 999_999_99;
const LAUNCH_DISCOUNT_PERCENT = 20;
const DEFAULT_ANNUAL_MEMBERSHIP_PENCE = 9_480;
const DEFAULT_REGISTRATION_FEE_PENCE = 1_800;
function ensureVatMention(label) {
    return /vat/i.test(label) ? label : `${label} + VAT`;
}
function defaultAnnualMembershipPence(value) {
    const normalized = clampCheckoutPence(value);
    return normalized === 1_500 ? DEFAULT_ANNUAL_MEMBERSHIP_PENCE : normalized;
}
export async function getOrgBilling() {
    return prisma.organizationSettings.upsert({
        where: { id: "default" },
        create: {
            id: "default",
            checkoutMembershipPence: DEFAULT_ANNUAL_MEMBERSHIP_PENCE,
            checkoutRegistrationFeePence: DEFAULT_REGISTRATION_FEE_PENCE,
        },
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
    return Boolean(s.billingEnabled);
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
    const baseMembershipPence = defaultAnnualMembershipPence(s.checkoutMembershipPence ?? DEFAULT_ANNUAL_MEMBERSHIP_PENCE);
    return {
        membershipPence: launchDiscountActive
            ? applyPercentageDiscount(baseMembershipPence, LAUNCH_DISCOUNT_PERCENT)
            : baseMembershipPence,
        registrationFeePence: clampCheckoutPence(s.checkoutRegistrationFeePence ?? DEFAULT_REGISTRATION_FEE_PENCE),
        membershipName: ensureVatMention(s.checkoutMembershipName?.trim() || "Trader Watchdog annual membership"),
        registrationFeeName: ensureVatMention(s.checkoutRegistrationFeeName?.trim() ||
            "Trader Watchdog registration and admin checks"),
    };
}

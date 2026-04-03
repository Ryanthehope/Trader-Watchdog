import fs from "fs";
import path from "path";
import { getStripeClient } from "./billingSettings.js";
/**
 * Uploads a logo file to Stripe and sets it as the platform account invoice/checkout branding logo.
 * Requires Stripe secret key; logo must meet Stripe's business_logo rules (PNG/JPG, typically ≤512KB).
 */
export async function syncLogoFileToStripeAccount(absolutePath) {
    const stripe = await getStripeClient();
    if (!stripe) {
        return { ok: false, error: "Stripe is not configured" };
    }
    try {
        const data = fs.readFileSync(absolutePath);
        const name = path.basename(absolutePath);
        const file = await stripe.files.create({
            file: { data, name, type: "application/octet-stream" },
            purpose: "business_logo",
        });
        const account = await stripe.accounts.retrieve();
        await stripe.accounts.update(account.id, {
            settings: {
                branding: {
                    logo: file.id,
                },
            },
        });
        return { ok: true, fileId: file.id };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
    }
}

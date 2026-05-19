import { Router } from "express";
import { prisma } from "../db.js";
import { billingReady, checkoutLineConfig, getOrgBilling, getGoCardlessClient, } from "../lib/billingSettings.js";
const router = Router();
/** From approval (or application date if legacy); applicants pay after staff approve. */
const PAYMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
async function assertFreshApplication(applicationId, email) {
    const row = await prisma.application.findUnique({
        where: { id: applicationId },
    });
    if (!row) {
        return { error: "Application not found" };
    }
    if (row.email.toLowerCase() !== email.toLowerCase()) {
        return { error: "Email does not match application" };
    }
    if (row.status !== "APPROVED") {
        return {
            error: "Your application is not approved yet. When Trader Watchdog approves it, you can return here to pay and activate your listing.",
        };
    }
    const windowStart = row.approvedAt ?? row.createdAt;
    if (Date.now() - windowStart.getTime() > PAYMENT_WINDOW_MS) {
        return { error: "Payment window expired — contact Trader Watchdog" };
    }
    return { application: row };
}
function siteOrigin(req) {
    return (req.get("origin")?.trim() ||
        process.env.PUBLIC_SITE_URL?.trim() ||
        "http://localhost:5173");
}
router.post("/checkout-fast-track", async (req, res) => {
    try {
        const applicationId = String(req.body?.applicationId ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        if (!applicationId || !email) {
            res.status(400).json({ error: "applicationId and email are required" });
            return;
        }
        const settings = await getOrgBilling();
        if (!billingReady(settings)) {
            res.status(400).json({ error: "Billing is not enabled" });
            return;
        }
        const gocardless = await getGoCardlessClient();
        if (!gocardless) {
            res.status(400).json({ error: "GoCardless is not configured" });
            return;
        }
        const check = await assertFreshApplication(applicationId, email);
        if ("error" in check) {
            res.status(400).json({ error: check.error });
            return;
        }
        const application = check.application;
        if (application.fastTrackPaidAt) {
            res.status(400).json({ error: "Fast-track payment is already recorded" });
            return;
        }
        const origin = siteOrigin(req);
        const lines = checkoutLineConfig(settings);
        const session = await gocardless.checkout.sessions.create({
            mode: "payment",
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: "gbp",
                        product_data: { name: lines.fastTrackName },
                        unit_amount: lines.fastTrackPence,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${origin}/join?paid=fast_track&app=${encodeURIComponent(applicationId)}`,
            cancel_url: `${origin}/join?cancelled=1`,
            metadata: {
                applicationId,
                checkoutKind: "fast_track",
            },
        });
        if (!session.url) {
            res.status(500).json({ error: "Could not create checkout session" });
            return;
        }
        res.json({ url: session.url });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not start checkout" });
    }
});
router.post("/checkout-membership", async (req, res) => {
    try {
        const applicationId = String(req.body?.applicationId ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        if (!applicationId || !email) {
            res.status(400).json({ error: "applicationId and email are required" });
            return;
        }
        const settings = await getOrgBilling();
        if (!billingReady(settings)) {
            res.status(400).json({ error: "Billing is not enabled" });
            return;
        }
        const gocardless = await getGoCardlessClient();
        if (!gocardless) {
            res.status(400).json({ error: "GoCardless is not configured" });
            return;
        }
        const check = await assertFreshApplication(applicationId, email);
        if ("error" in check) {
            res.status(400).json({ error: check.error });
            return;
        }
        const application = check.application;
        if (application.membershipSubscribed) {
            res.status(400).json({ error: "Membership payment is already recorded" });
            return;
        }
        const origin = siteOrigin(req);
        const lines = checkoutLineConfig(settings);
        const session = await gocardless.checkout.sessions.create({
            mode: "payment",
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: "gbp",
                        product_data: { name: lines.membershipName },
                        unit_amount: lines.membershipPence,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${origin}/join?paid=membership&app=${encodeURIComponent(applicationId)}`,
            cancel_url: `${origin}/join?cancelled=1`,
            metadata: {
                applicationId,
                checkoutKind: "membership",
            },
        });
        if (!session.url) {
            res.status(500).json({ error: "Could not create checkout session" });
            return;
        }
        res.json({ url: session.url });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not start checkout" });
    }
});
export default router;

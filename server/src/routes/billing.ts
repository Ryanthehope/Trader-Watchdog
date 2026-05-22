import { Router } from "express";
import { prisma } from "../db.js";
import {
  billingReady,
  checkoutLineConfig,
  getOrgBilling,
  getGoCardlessClient,
} from "../lib/billingSettings.js";

const router = Router();

/** Card checkout links are only valid for a limited period after the relevant trigger. */
const PAYMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
const CHECKOUT_SESSION_TIMEOUT_MS = 15_000;
type CheckoutSessionResponse = { url?: string | null };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

async function assertRegistrationCheckoutAllowed(
  applicationId: string,
  email: string
) {
  const row = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!row) {
    return { error: "Application not found" as const };
  }
  if (row.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "Email does not match application" as const };
  }
  if (row.status === "DECLINED") {
    return {
      error:
        "This application was declined, so online checkout is no longer available. Contact Trader Watchdog if you need this reviewed.",
    } as const;
  }
  if (row.createdMemberId) {
    return {
      error: "This application already has a live member profile.",
    } as const;
  }
  const windowStart = row.createdAt;
  if (Date.now() - windowStart.getTime() > PAYMENT_WINDOW_MS) {
    return { error: "Payment window expired — contact Trader Watchdog" } as const;
  }
  return { application: row };
}

async function assertMembershipCheckoutAllowed(
  applicationId: string,
  email: string
) {
  const row = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!row) {
    return { error: "Application not found" as const };
  }
  if (row.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "Email does not match application" as const };
  }
  if (row.status !== "APPROVED") {
    return {
      error:
        "Annual membership unlocks after Trader Watchdog completes verification and approves your application.",
    } as const;
  }
  if (row.createdMemberId) {
    return {
      error: "This application already has a live member profile.",
    } as const;
  }
  const windowStart = row.approvedAt ?? row.createdAt;
  if (Date.now() - windowStart.getTime() > PAYMENT_WINDOW_MS) {
    return { error: "Payment window expired — contact Trader Watchdog" } as const;
  }
  return { application: row };
}

function siteOrigin(req: { get: (h: string) => string | undefined }) {
  return (
    req.get("origin")?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim() ||
    "http://localhost:5173"
  );
}

router.post("/checkout-registration-fee", async (req, res) => {
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
    const check = await assertRegistrationCheckoutAllowed(applicationId, email);
    if ("error" in check) {
      res.status(400).json({ error: check.error });
      return;
    }
    const application = check.application;
    if (application.registrationFeePaidAt) {
      res.status(400).json({ error: "Registration fee is already recorded" });
      return;
    }
    const origin = siteOrigin(req);
    const lines = checkoutLineConfig(settings);
    const session = (await withTimeout(
      gocardless.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: { name: lines.registrationFeeName },
              unit_amount: lines.registrationFeePence,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/join?paid=registration_fee&app=${encodeURIComponent(applicationId)}`,
        cancel_url: `${origin}/join?cancelled=1`,
        metadata: {
          applicationId,
          checkoutKind: "registration_fee",
        },
      }),
      CHECKOUT_SESSION_TIMEOUT_MS,
      "GoCardless checkout session"
    )) as CheckoutSessionResponse;
    if (!session.url) {
      res.status(500).json({ error: "Could not create checkout session" });
      return;
    }
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    if (/timed out/i.test(message)) {
      res.status(504).json({
        error:
          "GoCardless did not respond in time. Please try again, and if it keeps happening check the GoCardless secret key and network access from the backend.",
      });
      return;
    }
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
    const check = await assertMembershipCheckoutAllowed(applicationId, email);
    if ("error" in check) {
      res.status(400).json({ error: check.error });
      return;
    }
    const application = check.application;
    if (application.membershipSubscribed) {
      res.status(400).json({ error: "Membership payment is already recorded" });
      return;
    }
    if (!application.registrationFeePaidAt) {
      res.status(400).json({
        error:
          "Registration fee must be paid before annual membership checkout is available.",
      });
      return;
    }
    const origin = siteOrigin(req);
    const lines = checkoutLineConfig(settings);
    const session = (await withTimeout(
      gocardless.checkout.sessions.create({
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
      }),
      CHECKOUT_SESSION_TIMEOUT_MS,
      "GoCardless checkout session"
    )) as CheckoutSessionResponse;
    if (!session.url) {
      res.status(500).json({ error: "Could not create checkout session" });
      return;
    }
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    if (/timed out/i.test(message)) {
      res.status(504).json({
        error:
          "GoCardless did not respond in time. Please try again, and if it keeps happening check the GoCardless secret key and network access from the backend.",
      });
      return;
    }
    res.status(500).json({ error: "Could not start checkout" });
  }
});

export default router;

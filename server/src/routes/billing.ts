import { Router } from "express";
import { prisma } from "../db.js";
import {
  billingReady,
  checkoutLineConfig,
  getOrgBilling,
  getGoCardlessApiClient,
} from "../lib/billingSettings.js";
import { createGoCardlessHostedPaymentFlow } from "../lib/goCardlessHostedPaymentFlow.js";

const router = Router();

/** Hosted payment links are only valid for a limited period after the relevant trigger. */
const PAYMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

function goCardlessErrorDetails(error: unknown): {
  statusCode: number;
  message: string;
} {
  const fallback = {
    statusCode: 500,
    message: "Could not start checkout",
  };

  if (!(error instanceof Error)) {
    return fallback;
  }

  const timedOut = /timed out/i.test(error.message);
  if (timedOut) {
    return {
      statusCode: 504,
      message:
        "GoCardless did not respond in time. Please try again, and if it keeps happening check the GoCardless access token, environment, and network access from the backend.",
    };
  }

  const maybeApiError = error as Error & {
    errors?: Array<{ message?: string; reason?: string; field?: string }>;
    statusCode?: number;
    errorType?: string;
    code?: string;
    requestId?: string;
  };

  if (Array.isArray(maybeApiError.errors) && maybeApiError.errors.length > 0) {
    const detail = maybeApiError.errors
      .map((entry) => entry.message || entry.reason || entry.field)
      .filter(Boolean)
      .join("; ");
    return {
      statusCode:
        typeof maybeApiError.statusCode === "number"
          ? maybeApiError.statusCode
          : 502,
      message: detail || error.message || fallback.message,
    };
  }

  if (error.message.trim()) {
    return {
      statusCode:
        typeof maybeApiError.statusCode === "number"
          ? maybeApiError.statusCode
          : 500,
      message: error.message,
    };
  }

  return fallback;
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
    const gocardless = await getGoCardlessApiClient();
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
    const flow = await createGoCardlessHostedPaymentFlow(gocardless, {
      amountPence: lines.registrationFeePence,
      description: lines.registrationFeeName,
      email,
      companyName: application.company,
      addressLine1: application.tradingAddress,
      postalCode: application.postcode,
      successRedirectUrl: `${origin}/join?paid=registration_fee&app=${encodeURIComponent(applicationId)}`,
      exitUrl: `${origin}/join?cancelled=1`,
      metadata: {
        applicationId,
        checkoutKind: "registration_fee",
      },
    });
    res.json({ url: flow.url });
  } catch (e) {
    const detail = goCardlessErrorDetails(e);
    console.error("[billing] registration checkout failed", {
      error: e,
      statusCode: detail.statusCode,
      message: detail.message,
    });
    res.status(detail.statusCode).json({ error: detail.message });
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
    const gocardless = await getGoCardlessApiClient();
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
    const flow = await createGoCardlessHostedPaymentFlow(gocardless, {
      amountPence: lines.membershipPence,
      description: lines.membershipName,
      email,
      companyName: application.company,
      addressLine1: application.tradingAddress,
      postalCode: application.postcode,
      existingCustomerId: application.goCardlessCustomerId,
      successRedirectUrl: `${origin}/join?paid=membership&app=${encodeURIComponent(applicationId)}`,
      exitUrl: `${origin}/join?cancelled=1`,
      metadata: {
        applicationId,
        checkoutKind: "membership",
      },
    });
    res.json({ url: flow.url });
  } catch (e) {
    const detail = goCardlessErrorDetails(e);
    console.error("[billing] membership checkout failed", {
      error: e,
      statusCode: detail.statusCode,
      message: detail.message,
    });
    res.status(detail.statusCode).json({ error: detail.message });
  }
});

export default router;

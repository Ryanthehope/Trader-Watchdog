import { Router } from "express";
import { prisma } from "../db.js";
import {
  billingReady,
  checkoutLineConfig,
  getOrgBilling,
} from "../lib/billingSettings.js";
import { getStripeClient } from "../lib/stripeClient.js";
import { createStripeCheckoutSession } from "../lib/stripeCheckoutSession.js";
import { stripeErrorDetails } from "../lib/stripeErrors.js";
import { ensureReusableRegistrationFeeForApplication } from "../lib/reusableRegistrationFee.js";
import { isSumsubConfigured } from "../lib/sumsub.js";

const router = Router();
const DISCOUNTED_PAYABLE_PENCE = 120;

/** Hosted payment links are only valid for a limited period after the relevant trigger. */
const PAYMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

async function assertRegistrationCheckoutAllowed(
  applicationId: string,
  email: string
) {
  let row = await prisma.application.findUnique({
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
  if (!row.registrationFeePaidAt) {
    row = await ensureReusableRegistrationFeeForApplication(applicationId);
    if (!row) {
      return { error: "Application not found" as const };
    }
  }
  if (
    isSumsubConfigured() &&
    !row.registrationFeePaidAt &&
    row.verificationStatus !== "APPROVED"
  ) {
    return {
      error:
        "Registration fee unlocks after your identity verification is completed.",
    } as const;
  }
  const windowStart = row.verificationApprovedAt ?? row.createdAt;
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
        "Annual portal fee unlocks after Trader Watchdog completes verification and approves your application.",
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

function resolveDiscountCode(
  code: string,
  fullAmountPence: number,
  feeType: "registration" | "membership" = "membership"
): {
  code: string;
  discountType: "reduced";
  finalPricePence: number;
  savingsPence: number;
} | null {
  const upper = code.trim().toUpperCase();

  // NGB1 (or env override): reduces both fees to nominal minimum
  const freeCode = (process.env.PROMO_CODE_FREE_MEMBERSHIP?.trim() || "NGB1").toUpperCase();
  if (upper === freeCode) {
    const finalPricePence = Math.min(fullAmountPence, DISCOUNTED_PAYABLE_PENCE);
    return {
      code: upper,
      discountType: "reduced",
      finalPricePence,
      savingsPence: Math.max(fullAmountPence - finalPricePence, 0),
    };
  }

  // NGB25: 25% off first year portal fee only (registration fee unchanged)
  if (upper === "NGB25") {
    if (feeType === "registration") {
      return { code: upper, discountType: "reduced", finalPricePence: fullAmountPence, savingsPence: 0 };
    }
    const discount = Math.round(fullAmountPence * 0.25);
    const finalPricePence = Math.max(fullAmountPence - discount, DISCOUNTED_PAYABLE_PENCE);
    return { code: upper, discountType: "reduced", finalPricePence, savingsPence: Math.max(fullAmountPence - finalPricePence, 0) };
  }

  // NGB33: 33% off first year portal fee only (registration fee unchanged)
  if (upper === "NGB33") {
    if (feeType === "registration") {
      return { code: upper, discountType: "reduced", finalPricePence: fullAmountPence, savingsPence: 0 };
    }
    const discount = Math.round(fullAmountPence * 0.33);
    const finalPricePence = Math.max(fullAmountPence - discount, DISCOUNTED_PAYABLE_PENCE);
    return { code: upper, discountType: "reduced", finalPricePence, savingsPence: Math.max(fullAmountPence - finalPricePence, 0) };
  }

  return null;
}

router.post("/validate-discount", async (req, res) => {
  const code = String(req.body?.code ?? "").trim();
  if (!code) {
    res.json({ valid: false });
    return;
  }
  const settings = await getOrgBilling();
  if (!billingReady(settings)) {
    res.json({ valid: false });
    return;
  }
  const lines = checkoutLineConfig(settings);
  const registrationDiscount = resolveDiscountCode(
    code,
    lines.registrationFeePence,
    "registration"
  );
  const membershipDiscount = resolveDiscountCode(
    code,
    lines.membershipPence,
    "membership"
  );
  if (!registrationDiscount || !membershipDiscount) {
    res.json({ valid: false });
    return;
  }
  res.json({
    valid: true,
    discountType: "reduced",
    code: registrationDiscount.code,
    registrationFinalPricePence: registrationDiscount.finalPricePence,
    registrationSavingsPence: registrationDiscount.savingsPence,
    membershipFinalPricePence: membershipDiscount.finalPricePence,
    membershipSavingsPence: membershipDiscount.savingsPence,
  });
});

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

    res.status(400).json({
      error:
        "Registration fee is no longer charged separately. Once your application is approved, the registration fee and first annual portal fee are collected together.",
    });
    return;
  } catch (e) {
    const detail = stripeErrorDetails(e);
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
    const stripe = await getStripeClient();
    if (!stripe) {
      res.status(400).json({ error: "Stripe is not configured" });
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
    const origin = siteOrigin(req);
    const lines = checkoutLineConfig(settings);

    const discountCodeInput = String(req.body?.discountCode ?? "").trim();
    const membershipDiscount = discountCodeInput
      ? resolveDiscountCode(discountCodeInput, lines.membershipPence, "membership")
      : null;
    const registrationDiscount = discountCodeInput
      ? resolveDiscountCode(discountCodeInput, lines.registrationFeePence, "registration")
      : null;
    const combinedAmountPence =
      (application.registrationFeePaidAt
        ? 0
        : registrationDiscount?.finalPricePence ?? lines.registrationFeePence) +
      (membershipDiscount?.finalPricePence ?? lines.membershipPence);
    const paymentDescription = application.registrationFeePaidAt
      ? lines.membershipName
      : "Trader Watchdog registration fee and first annual portal fee + VAT";

    const flow = await createStripeCheckoutSession(stripe, {
      amountPence: combinedAmountPence,
      description: paymentDescription,
      email,
      existingStripeCustomerId: application.stripeCustomerId,
      createCustomer: !application.stripeCustomerId,
      successRedirectUrl: `${origin}/join?paid=membership&app=${encodeURIComponent(applicationId)}`,
      cancelRedirectUrl: `${origin}/join?cancelled=1`,
      metadata: {
        applicationId,
        checkoutKind: "membership",
        ...(discountCodeInput
          ? { discountCode: discountCodeInput.trim().toUpperCase() }
          : {}),
      },
    });
    res.json({ url: flow.url });
  } catch (e) {
    const detail = stripeErrorDetails(e);
    console.error("[billing] membership checkout failed", {
      error: e,
      statusCode: detail.statusCode,
      message: detail.message,
    });
    res.status(detail.statusCode).json({ error: detail.message });
  }
});

export default router;

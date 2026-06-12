import { Router } from "express";
import { prisma } from "../db.js";
import {
  billingReady,
  checkoutLineConfig,
  getOrgBilling,
  getGoCardlessApiClient,
} from "../lib/billingSettings.js";
import { createGoCardlessHostedPaymentFlow } from "../lib/goCardlessHostedPaymentFlow.js";
import { goCardlessErrorDetails } from "../lib/goCardlessErrors.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";
import { notifyMemberWelcome } from "../lib/adminMail.js";
import { getLaunchWindow } from "../lib/launchWindow.js";

const router = Router();

/** Hosted payment links are only valid for a limited period after the relevant trigger. */
const PAYMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

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

function resolveDiscountCode(code: string): { discountType: "full" | "partial30" } | null {
  const upper = code.trim().toUpperCase();
  const freeCode = (process.env.PROMO_CODE_FREE_MEMBERSHIP?.trim() || "NGB0").toUpperCase();
  const off30Code = (process.env.PROMO_CODE_30_OFF?.trim() || "").toUpperCase();
  if (upper === freeCode) return { discountType: "full" };
  if (off30Code && upper === off30Code) return { discountType: "partial30" };
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
  const discount = resolveDiscountCode(code);
  if (!discount) {
    res.json({ valid: false });
    return;
  }
  if (discount.discountType === "partial30" && !getLaunchWindow().launchDiscountActive) {
    res.json({ valid: false });
    return;
  }
  if (discount.discountType === "full") {
    res.json({ valid: true, discountType: "full", savingsPence: lines.membershipPence, finalPricePence: 0 });
  } else {
    const savings = 3_600; // £30+VAT discount: £90 gross - £36 gross = £54 gross (£30+VAT saving)
    res.json({ valid: true, discountType: "partial30", savingsPence: savings, finalPricePence: Math.max(0, lines.membershipPence - savings) });
  }
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

    // Free-code path — mark registration fee paid directly, skip GoCardless
    const discountCodeInput = String(req.body?.discountCode ?? "").trim();
    const discount = discountCodeInput ? resolveDiscountCode(discountCodeInput) : null;
    if (discount?.discountType === "full") {
      await prisma.application.update({
        where: { id: applicationId },
        data: { registrationFeePaidAt: new Date() },
      });
      const origin = siteOrigin(req);
      res.json({ url: `${origin}/join?paid=registration_fee&app=${encodeURIComponent(applicationId)}` });
      return;
    }

    const gocardless = await getGoCardlessApiClient();
    if (!gocardless) {
      res.status(400).json({ error: "GoCardless is not configured" });
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

    const discountCodeInput = String(req.body?.discountCode ?? "").trim();
    const discount = discountCodeInput ? resolveDiscountCode(discountCodeInput) : null;
    if (discount?.discountType === "partial30" && !getLaunchWindow().launchDiscountActive) {
      res.status(400).json({ error: "That founder discount code has expired." });
      return;
    }

    if (discount?.discountType === "full") {
      // 100% off — provision directly without GoCardless
      const now = new Date();
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          membershipSubscribed: true,
          manualMembershipExpiresAt: addOneCalendarYearEndUtc(now),
          membershipRenewalPricePence: 0,
        },
      });
      if (application.createdMemberId) {
        await prisma.member.update({
          where: { id: application.createdMemberId },
          data: {
            membershipBillingType: "manual",
            membershipExpiresAt: addOneCalendarYearEndUtc(now),
            membershipRenewalPricePence: 0,
          },
        });
      }
      const prov = await provisionIfApplicationPaid(prisma, applicationId);
      if (!prov.ok && prov.reason === "email_in_use") {
        console.error("[billing] free membership provision blocked: email already in use");
      }
      if (prov.ok && prov.newlyCreated) {
        notifyMemberWelcome(prisma, { email: prov.email, name: prov.name, temporaryPassword: prov.temporaryPassword });
      }
      res.json({ url: `/join?paid=membership&app=${encodeURIComponent(applicationId)}` });
      return;
    }

    const amountPence = discount?.discountType === "partial30"
      ? Math.max(0, lines.membershipPence - 3_600)
      : lines.membershipPence;

    const flow = await createGoCardlessHostedPaymentFlow(gocardless, {
      amountPence,
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

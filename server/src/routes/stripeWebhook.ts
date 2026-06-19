import type { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { getStripeClient, getStripeWebhookSecret } from "../lib/stripeClient.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import {
  notifySubscriptionRenewed,
  notifyMemberWelcome,
  notifyVanStickerOrder,
  notifyVanStickerOrderAdditional,
  notifyApplicantVerificationLink,
  sendXeroInvoiceToTrader,
} from "../lib/adminMail.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";
import { ensureSumsubApplicantForApplication } from "../lib/ensureSumsubApplicant.js";
import { generateSumsubWebSdkLink, isSumsubConfigured } from "../lib/sumsub.js";
import { createPaidXeroInvoice } from "../lib/xeroInvoice.js";
import { mergeApplicationXeroInvoiceRef } from "../lib/applicationXeroInvoices.js";
import { createStripeInvoicePdf } from "../lib/stripeInvoice.js";

/**
 * Creates a Stripe invoice PDF for a completed payment and emails it to the trader.
 * Xero invoices are still created for accounting, but this is what the trader receives
 * (no "make payment" button since Stripe marks the invoice as already paid).
 */
async function sendStripeReceipt(
  stripe: Stripe,
  stripeCustomerId: string,
  params: {
    description: string;
    amountPence: number;
    reference: string;
    paidAt: Date;
    traderName: string;
    email: string;
    invoiceDescription: string;
  }
): Promise<void> {
  const pdf = await createStripeInvoicePdf(stripe, {
    stripeCustomerId,
    description: params.description,
    amountPence: params.amountPence,
    reference: params.reference,
    paidAt: params.paidAt,
  });
  if (!pdf) {
    console.warn("[stripe webhook] Stripe invoice PDF was not created", {
      stripeCustomerId,
      email: params.email,
      invoiceDescription: params.invoiceDescription,
      reference: params.reference,
    });
    return;
  }

  await sendXeroInvoiceToTrader(prisma, {
    traderName: params.traderName,
    email: params.email,
    pdfBuffer: pdf,
    invoiceDescription: params.invoiceDescription,
  });
}

function preferredReceiptEmail(member: {
  invoiceEmail?: string | null;
  loginEmail?: string | null;
}) {
  return member.invoiceEmail?.trim() || member.loginEmail?.trim() || null;
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const signatureHeader = req.headers["stripe-signature"];
  const secret = await getStripeWebhookSecret();
  const stripe = await getStripeClient();

  if (!stripe || !secret || typeof signatureHeader !== "string") {
    res.status(400).type("text/plain").send("Stripe webhook not configured");
    return;
  }

  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, signatureHeader, secret);
  } catch (e) {
    console.warn("[stripe webhook] signature failed", e);
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(
        stripe,
        event.data.object as Stripe.Checkout.Session
      );
    } else if (event.type === "payment_intent.succeeded") {
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent
      );
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
}

// ---------------------------------------------------------------------------
// checkout.session.completed — all user-initiated payment flows
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata ?? {};
  const kind = metadata.checkoutKind;
  if (!kind) return;

  const paidAt = new Date(session.created * 1000);
  const amountPence = session.amount_total ?? 0;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  // ------------------------------------------------------------------
  // Persist Stripe customer ID captured at any checkout (for later use)
  // ------------------------------------------------------------------
  if (stripeCustomerId) {
    const appId = metadata.applicationId;
    const memberId = metadata.memberId;
    if (appId && (kind === "registration_fee" || kind === "membership")) {
      await prisma.application.updateMany({
        where: { id: appId },
        data: { stripeCustomerId },
      });
    }
    if (memberId && (kind === "member_portal_renewal" || kind === "van_sticker_order" || kind === "van_sticker_order_additional")) {
      await prisma.member.updateMany({
        where: { id: memberId },
        data: { stripeCustomerId },
      });
    }
  }

  // ------------------------------------------------------------------
  // registration_fee — also save payment method for auto-charge later
  // ------------------------------------------------------------------
  if (kind === "registration_fee") {
    const appId = metadata.applicationId;
    if (!appId) return;

    // Retrieve payment method from the PaymentIntent so we can auto-charge
    // membership off-session when staff approves the application.
    let stripePaymentMethodId: string | null = null;
    if (session.payment_intent && stripeCustomerId) {
      try {
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(piId);
        stripePaymentMethodId =
          typeof pi.payment_method === "string"
            ? pi.payment_method
            : pi.payment_method?.id ?? null;
      } catch (err) {
        console.warn("[stripe webhook] could not retrieve payment method", err);
      }
    }

    const confirmedMandateBackfill: Record<string, unknown> = {};
    if (stripeCustomerId)
      confirmedMandateBackfill.stripeCustomerId = stripeCustomerId;
    if (stripePaymentMethodId)
      confirmedMandateBackfill.stripePaymentMethodId = stripePaymentMethodId;

    const updated = await prisma.application.updateMany({
      where: { id: appId, registrationFeePaidAt: null },
      data: {
        registrationFeePaidAt: paidAt,
        ...confirmedMandateBackfill,
      },
    });

    if (updated.count > 0) {
      const prov = await provisionIfApplicationPaid(prisma, appId);
      if (!prov.ok && prov.reason === "email_in_use") {
        console.error(
          "[stripe webhook] provision blocked: applicant email already has a member portal"
        );
      }
      if (prov.ok && prov.newlyCreated) {
        notifyMemberWelcome(prisma, {
          email: prov.email,
          name: prov.name,
          temporaryPassword: prov.temporaryPassword,
        });
      }

      void (async () => {
        const app = await prisma.application.findUnique({
          where: { id: appId },
          select: {
            email: true,
            company: true,
            tradingAddress: true,
            postcode: true,
            xeroInvoiceId: true,
          },
        });
        // Send the trader receipt independently so accounting delays do not block it.
        if (stripeCustomerId && app?.email) {
          void sendStripeReceipt(stripe, stripeCustomerId, {
            description: "Registration Fee",
            amountPence,
            reference: session.id,
            paidAt,
            traderName: app.company ?? "Trader",
            email: app.email,
            invoiceDescription: "Registration Fee",
          }).catch((err) => {
            console.error("[stripe webhook] registration Stripe receipt send failed", err);
          });
        }
        // Xero invoice — accounting record only, not emailed to trader
        const xeroId = await createPaidXeroInvoice({
          contactName: app?.company ?? "Unknown Trader",
          contactEmail: app?.email ?? "",
          contactAddress: app?.tradingAddress,
          contactPostalCode: app?.postcode,
          description: "Registration Fee",
          amountPence,
          reference: session.id,
          paidAt,
        });
        void prisma.application.update({
          where: { id: appId },
          data: xeroId
            ? {
                xeroInvoiceId: mergeApplicationXeroInvoiceRef(
                  app?.xeroInvoiceId ?? null,
                  "registration_fee",
                  xeroId
                ),
                xeroInvoiceFailed: false,
              }
            : { xeroInvoiceFailed: true },
        });
      })();

    }
    return;
  }

  // ------------------------------------------------------------------
  // membership — paid by applicant after staff approval
  // ------------------------------------------------------------------
  if (kind === "membership") {
    const appId = metadata.applicationId;
    if (!appId) return;
    await handleMembershipConfirmed(appId, amountPence, paidAt, session.id, stripe, stripeCustomerId);
    return;
  }

  // ------------------------------------------------------------------
  // member_portal_renewal — paid by logged-in member
  // ------------------------------------------------------------------
  if (kind === "member_portal_renewal") {
    const memberId = metadata.memberId;
    if (!memberId) return;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        membershipExpiresAt: true,
        name: true,
        invoiceEmail: true,
        loginEmail: true,
        invoiceAddress: true,
      },
    });
    if (!member) {
      console.warn(
        `[stripe webhook] renewal for missing member ${memberId}`
      );
      return;
    }
    const baseDate =
      member.membershipExpiresAt && member.membershipExpiresAt > paidAt
        ? member.membershipExpiresAt
        : paidAt;
    const renewedUntil = addOneCalendarYearEndUtc(baseDate);
    await prisma.member.update({
      where: { id: memberId },
      data: {
        membershipBillingType: "manual",
        membershipExpiresAt: renewedUntil,
      },
    });
    if (member.loginEmail?.trim()) {
      notifySubscriptionRenewed(prisma, {
        traderName: member.name,
        email: member.loginEmail,
        renewedUntil,
      });
    }
    const receiptEmail = preferredReceiptEmail(member);
    void createPaidXeroInvoice({
      contactName: member.name,
      contactEmail: receiptEmail ?? member.loginEmail ?? "",
      contactAddress: member.invoiceAddress,
      description: `Annual Membership Renewal (${paidAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })} – ${renewedUntil.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })})`,
      amountPence,
      reference: session.id,
      paidAt,
    }).then((xeroId) => {
      void prisma.member.update({
        where: { id: memberId },
        data: {
          xeroInvoiceId: xeroId ?? undefined,
          xeroInvoiceFailed: !xeroId,
        },
      });
    });
    // Stripe invoice PDF — emailed to trader
    if (stripeCustomerId && receiptEmail) {
      void sendStripeReceipt(stripe, stripeCustomerId, {
        description: `Annual Membership Renewal (${paidAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${renewedUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`,
        amountPence,
        reference: session.id,
        paidAt,
        traderName: member.name,
        email: receiptEmail,
        invoiceDescription: "Annual Membership Renewal",
      }).catch((err) => {
        console.error("[stripe webhook] renewal Stripe receipt send failed", err);
      });
    }
    return;
  }

  // ------------------------------------------------------------------
  // van_sticker_order
  // ------------------------------------------------------------------
  if (kind === "van_sticker_order") {
    const memberId = metadata.memberId;
    if (!memberId) return;
    const stickerVariant = metadata.stickerVariant === "2" ? "2" : "1";
    await prisma.member.updateMany({
      where: { id: memberId, vanStickerOrderedAt: null },
      data: { vanStickerOrderedAt: paidAt },
    });
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        name: true,
        slug: true,
        tvId: true,
        invoiceEmail: true,
        loginEmail: true,
        invoiceAddress: true,
        location: true,
        sourceApplication: { select: { tradingAddress: true, postcode: true } },
      },
    });
    if (member) {
      const receiptEmail = preferredReceiptEmail(member);
      const applicationAddress = [
        member.sourceApplication?.tradingAddress,
        member.sourceApplication?.postcode,
      ].filter(Boolean).join("\n") || null;
      notifyVanStickerOrder(prisma, { ...member, stickerVariant, applicationAddress });
      // Xero invoice — accounting record only
      void createPaidXeroInvoice({
        contactName: member.name,
        contactEmail: receiptEmail ?? member.loginEmail ?? "",
        contactAddress: member.invoiceAddress,
        description: "Van Stickers (x2)",
        amountPence,
        reference: session.id,
        paidAt,
      }).catch((err) => {
        console.error("[stripe webhook] sticker Xero invoice failed", err);
      });
      // Stripe invoice PDF — emailed to trader
      if (stripeCustomerId && receiptEmail) {
        void sendStripeReceipt(stripe, stripeCustomerId, {
          description: "Van Stickers (x2)",
          amountPence,
          reference: session.id,
          paidAt,
          traderName: member.name,
          email: receiptEmail,
          invoiceDescription: "Van Stickers (x2)",
        }).catch((err) => {
          console.error("[stripe webhook] sticker Stripe receipt send failed", err);
        });
      }
    }
    return;
  }

  // ------------------------------------------------------------------
  // van_sticker_order_additional
  // ------------------------------------------------------------------
  if (kind === "van_sticker_order_additional") {
    const memberId = metadata.memberId;
    if (!memberId) return;
    const stickerVariant = metadata.stickerVariant === "2" ? "2" : "1";
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        name: true,
        slug: true,
        tvId: true,
        invoiceEmail: true,
        loginEmail: true,
        invoiceAddress: true,
        location: true,
        sourceApplication: { select: { tradingAddress: true, postcode: true } },
      },
    });
    if (member) {
      const receiptEmail = preferredReceiptEmail(member);
      const applicationAddress = [
        member.sourceApplication?.tradingAddress,
        member.sourceApplication?.postcode,
      ].filter(Boolean).join("\n") || null;
      notifyVanStickerOrderAdditional(prisma, { ...member, stickerVariant, applicationAddress });
      // Xero invoice — accounting record only
      void createPaidXeroInvoice({
        contactName: member.name,
        contactEmail: receiptEmail ?? member.loginEmail ?? "",
        contactAddress: member.invoiceAddress,
        description: "Additional Van Sticker",
        amountPence,
        reference: session.id,
        paidAt,
      }).catch((err) => {
        console.error(
          "[stripe webhook] additional sticker Xero invoice failed",
          err
        );
      });
      // Stripe invoice PDF — emailed to trader
      if (stripeCustomerId && receiptEmail) {
        void sendStripeReceipt(stripe, stripeCustomerId, {
          description: "Additional Van Sticker",
          amountPence,
          reference: session.id,
          paidAt,
          traderName: member.name,
          email: receiptEmail,
          invoiceDescription: "Additional Van Sticker",
        }).catch((err) => {
          console.error("[stripe webhook] additional sticker Stripe receipt send failed", err);
        });
      }
    }
    return;
  }
}

// ---------------------------------------------------------------------------
// payment_intent.succeeded — off-session auto-charge from staff approval
// Only processes events tagged with source: "auto_charge" in metadata
// ---------------------------------------------------------------------------

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const metadata = pi.metadata ?? {};
  if (metadata.source !== "auto_charge") return;
  const kind = metadata.checkoutKind;
  if (kind !== "membership") return;
  const appId = metadata.applicationId;
  if (!appId) return;

  const amountPence = pi.amount;
  const paidAt = new Date(pi.created * 1000);
  const piStripeCustomerId = typeof pi.customer === "string" ? pi.customer : null;

  const stripe = await getStripeClient();
  await handleMembershipConfirmed(appId, amountPence, paidAt, pi.id, stripe ?? undefined, piStripeCustomerId);
}

// ---------------------------------------------------------------------------
// Shared: handle membership confirmed (both checkout and auto-charge paths)
// ---------------------------------------------------------------------------

async function handleMembershipConfirmed(
  appId: string,
  amountPence: number,
  paidAt: Date,
  reference: string,
  stripe?: Stripe,
  stripeCustomerId?: string | null
) {
  const appBeforeMembership = await prisma.application.findUnique({
    where: { id: appId },
    select: {
      membershipSubscribed: true,
      registrationFeePaidAt: true,
    },
  });
  if (!appBeforeMembership || appBeforeMembership.membershipSubscribed) return;

  const updated = await prisma.application.updateMany({
    where: { id: appId, membershipSubscribed: false },
    data: {
      membershipSubscribed: true,
      manualMembershipExpiresAt: addOneCalendarYearEndUtc(paidAt),
      ...(appBeforeMembership.registrationFeePaidAt
        ? {}
        : { registrationFeePaidAt: paidAt }),
    },
  });

  if (updated.count === 0) return;

  const appAfterMembership = await prisma.application.findUnique({
    where: { id: appId },
    select: {
      createdMemberId: true,
      manualMembershipExpiresAt: true,
    },
  });
  if (
    appAfterMembership?.createdMemberId &&
    appAfterMembership.manualMembershipExpiresAt
  ) {
    await prisma.member.update({
      where: { id: appAfterMembership.createdMemberId },
      data: {
        membershipBillingType: "manual",
        membershipExpiresAt: appAfterMembership.manualMembershipExpiresAt,
        membershipRenewalPricePence: null,
      },
    });
  }

  const prov = await provisionIfApplicationPaid(prisma, appId);
  if (!prov.ok && prov.reason === "email_in_use") {
    console.error(
      "[stripe webhook] provision blocked: applicant email already has a member portal"
    );
  }
  if (prov.ok && prov.newlyCreated) {
    notifyMemberWelcome(prisma, {
      email: prov.email,
      name: prov.name,
      temporaryPassword: prov.temporaryPassword,
    });
  }

  void (async () => {
    const app = await prisma.application.findUnique({
      where: { id: appId },
      select: {
        email: true,
        company: true,
        tradingAddress: true,
        postcode: true,
        xeroInvoiceId: true,
      },
    });
    // Send the trader receipt independently so accounting delays do not block it.
    if (stripe && stripeCustomerId && app?.email) {
      void sendStripeReceipt(stripe, stripeCustomerId, {
        description: appBeforeMembership.registrationFeePaidAt
          ? `Annual Membership (${paidAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })} – ${addOneCalendarYearEndUtc(paidAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })})`
          : `Registration Fee and Annual Membership (${paidAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })} – ${addOneCalendarYearEndUtc(paidAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })})`,
        amountPence,
        reference,
        paidAt,
        traderName: app.company ?? "Trader",
        email: app.email,
        invoiceDescription: appBeforeMembership.registrationFeePaidAt
          ? "Annual Membership"
          : "Registration Fee and Annual Membership",
      }).catch((err) => {
        console.error("[stripe webhook] membership Stripe receipt send failed", err);
      });
    }
    const xeroId = await createPaidXeroInvoice({
      contactName: app?.company ?? "Unknown Trader",
      contactEmail: app?.email ?? "",
      contactAddress: app?.tradingAddress,
      contactPostalCode: app?.postcode,
      description: appBeforeMembership.registrationFeePaidAt
        ? `Annual Membership (${paidAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })} – ${addOneCalendarYearEndUtc(paidAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })})`
        : `Registration Fee and Annual Membership (${paidAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })} – ${addOneCalendarYearEndUtc(paidAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })})`,
      amountPence,
      reference,
      paidAt,
    });
    void prisma.application.update({
      where: { id: appId },
      data: xeroId
        ? {
            xeroInvoiceId: mergeApplicationXeroInvoiceRef(
              app?.xeroInvoiceId ?? null,
              "membership",
              xeroId
            ),
            xeroInvoiceFailed: false,
          }
        : { xeroInvoiceFailed: true },
    });
  })();
}

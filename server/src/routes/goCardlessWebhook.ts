import type { Request, Response } from "express";
import { parse as parseGoCardlessWebhooks } from "gocardless-nodejs/webhooks";
import { prisma } from "../db.js";
import {
  getGoCardlessApiClient,
  getGoCardlessWebhookSecret,
} from "../lib/billingSettings.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import { notifySubscriptionRenewed, notifyMemberWelcome, notifyVanStickerOrder, 
notifyVanStickerOrderAdditional, notifyApplicantVerificationLink, sendXeroInvoiceToTrader } from "../lib/adminMail.js";
import { provisionIfApplicationPaid } from "../lib/provisionAfterApplicationPayment.js";
import { ensureSumsubApplicantForApplication } from "../lib/ensureSumsubApplicant.js";
import { generateSumsubWebSdkLink, isSumsubConfigured } from "../lib/sumsub.js";
import { createPaidXeroInvoice, createXeroCreditNote, fetchXeroInvoicePDF }  from "../lib/xeroInvoice.js";
import { mergeApplicationXeroInvoiceRef } from "../lib/applicationXeroInvoices.js";


type GoCardlessPayment = {
  created_at?: string | null;
  amount?: number | null;
  links?: { mandate?: string | null };
  metadata?: Record<string, string | undefined> | null;
  status?: string | null;
};

type GoCardlessEvent = {
  action?: string;
  links?: {
    billing_request?: string;
    payment?: string;
  };
  resource_type?: string;
};

async function customerAndMandateFromBillingRequest(
  gocardless: Awaited<ReturnType<typeof getGoCardlessApiClient>>,
  billingRequestId: string | undefined
) {
  if (!gocardless || !billingRequestId) return { customerId: null, mandateId: null };
  try {
    const billingRequest = await gocardless.billingRequests.find(billingRequestId);
    return {
      customerId: billingRequest.resources?.customer?.id ?? null,
      // mandate_request_mandate is set once the customer completes the billing request
      mandateId: (billingRequest.links as Record<string, string | undefined>)?.mandate_request_mandate ?? null,
    };
  } catch (error) {
    console.warn(
      `[gocardless webhook] could not load billing request ${billingRequestId}`,
      error
    );
    return { customerId: null, mandateId: null };
  }
}

export async function goCardlessWebhookHandler(req: Request, res: Response) {
  const signatureHeader =
    req.headers["webhook-signature"] ?? req.headers["gocardless-signature"];
  const secret = await getGoCardlessWebhookSecret();
  const gocardless = await getGoCardlessApiClient();
  if (!gocardless || !secret || typeof signatureHeader !== "string") {
    res.status(400).type("text/plain").send("Webhook not configured");
    return;
  }
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }
  let events: GoCardlessEvent[];
  try {
    events = parseGoCardlessWebhooks(buf, secret, signatureHeader) as GoCardlessEvent[];
  } catch (e) {
    console.warn("[gocardless webhook] signature failed", e);
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  try {
    for (const event of events) {
      if (event.resource_type !== "payments" && event.resource_type) continue;
      const action = event.action;
      if (action !== "created" && action !== "confirmed" && action !== "paid_out") continue;

      const paymentId = event.links?.payment;
      if (!paymentId) continue;

      const payment = (await gocardless.payments.find(paymentId)) as GoCardlessPayment;
      const kind = payment.metadata?.checkoutKind;
      if (!kind) continue;

      // On `created`: the billing_request link is available — capture the GoCardless
      // customer ID and mandate ID and persist them. Do NOT provision yet; wait for
      // `confirmed` to ensure the money has actually been collected (covers Bacs/Direct Debit).
      if (action === "created") {
        const { customerId, mandateId } = await customerAndMandateFromBillingRequest(
          gocardless,
          event.links?.billing_request
        );
        if (!customerId) continue;
        const appId = payment.metadata?.applicationId;
        if (appId && (kind === "registration_fee" || kind === "membership")) {
          await prisma.application.updateMany({
            where: { id: appId },
            data: {
              goCardlessCustomerId: customerId,
              ...(mandateId ? { goCardlessMandateId: mandateId } : {}),
            },
          });
        }
        const memberId = payment.metadata?.memberId;
        if (memberId && kind === "member_portal_renewal") {
          await prisma.member.updateMany({
            where: { id: memberId },
            data: { goCardlessCustomerId: customerId },
          });
        }
        continue;
      }

      // action === "confirmed" — payment collected, safe to activate/provision
      const paymentCreatedAt = payment.created_at
        ? new Date(payment.created_at)
        : new Date();

      if (kind === "member_portal_renewal" && payment.metadata?.memberId) {
        const memberId = payment.metadata.memberId;
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: {
            membershipExpiresAt: true,
            name: true,
            loginEmail: true,
            invoiceAddress: true,
          },
        });
        if (!member) {
          console.warn(
            `[gocardless webhook] renewal confirmed for missing member ${memberId}`
          );
          continue;
        }
        const baseDate =
          member.membershipExpiresAt && member.membershipExpiresAt > paymentCreatedAt
            ? member.membershipExpiresAt
            : paymentCreatedAt;
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
        void createPaidXeroInvoice({
          contactName: member.name,
          contactEmail: member.loginEmail ?? "",
          contactAddress: member.invoiceAddress,
          description: `Annual Membership Renewal (${paymentCreatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${renewedUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`,
          amountPence: payment.amount ?? 7200,
          reference: paymentId,
          paidAt: paymentCreatedAt,
        }).then(async (xeroId) => {
          void prisma.member.update({ 
            where: { id: memberId }, 
            data: { xeroInvoiceId: xeroId ?? undefined, xeroInvoiceFailed: !xeroId } });
          if (xeroId && member.loginEmail) {
            const pdf = await fetchXeroInvoicePDF(xeroId);
            if (pdf) {
              void sendXeroInvoiceToTrader(prisma, {
                traderName: member.name,
                email: member.loginEmail,
                pdfBuffer: pdf,
                invoiceDescription: "Annual Membership Renewal",
              });
            }
          }
        });
        continue;
      }

      const appId = payment.metadata?.applicationId;
      if (appId && kind === "registration_fee") {
        // Backfill mandate ID if the payments.created handler missed it (timing race).
        // By confirmed time the mandate is reliably present on payment.links.mandate.
        const confirmedMandateId = payment.links?.mandate;
        if (confirmedMandateId) {
          await prisma.application.updateMany({
            where: { id: appId, goCardlessMandateId: null },
            data: { goCardlessMandateId: confirmedMandateId },
          });
        }
        const updated = await prisma.application.updateMany({
          where: { id: appId, registrationFeePaidAt: null },
          data: { registrationFeePaidAt: paymentCreatedAt },
        });
        if (updated.count > 0) {
          const prov = await provisionIfApplicationPaid(prisma, appId);
          if (!prov.ok && prov.reason === "email_in_use") {
            console.error(
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
          }
          if (prov.ok && prov.newlyCreated) {
            notifyMemberWelcome(prisma, { email: prov.email, name: prov.name, temporaryPassword: prov.temporaryPassword });
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
            const xeroId = await createPaidXeroInvoice({
              contactName: app?.company ?? "Unknown Trader",
              contactEmail: app?.email ?? "",
              contactAddress: app?.tradingAddress,
              contactPostalCode: app?.postcode,
              description: "Registration Fee",
              amountPence: payment.amount ?? 1800,
              reference: paymentId,
              paidAt: paymentCreatedAt,
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
            if (xeroId && app?.email) {
              const pdf = await fetchXeroInvoicePDF(xeroId);
              if (pdf) {
                void sendXeroInvoiceToTrader(prisma, {
                  traderName: app.company ?? "Trader",
                  email: app.email,
                  pdfBuffer: pdf,
                  invoiceDescription: "Registration Fee",
                });
              }
            }
          })();

          // Automatically create Sumsub applicant and email the verification link
          if (isSumsubConfigured()) {
            void (async () => {
              try {
                const ensured = await ensureSumsubApplicantForApplication(prisma, appId);
                if (ensured.kind !== "not_found") {
                  const link = await generateSumsubWebSdkLink({
                    userId: ensured.externalUserId,
                    email: ensured.email,
                    phone: ensured.phone,
                    lang: "en",
                  });
                  const app = await prisma.application.findUnique({
                    where: { id: appId },
                    select: { identifiablePerson: true, company: true, email: true },
                  });
                  if (app) {
                    notifyApplicantVerificationLink(prisma, {
                      traderName: app.identifiablePerson,
                      company: app.company,
                      email: app.email,
                      verificationUrl: link.url,
                    });
                  }
                }
              } catch (err) {
                console.error("[gocardless webhook] auto-sumsub link failed", err);
              }
            })();
          }
        }
      }

      if (appId && kind === "membership") {
        const updated = await prisma.application.updateMany({
          where: { id: appId, membershipSubscribed: false },
          data: {
            membershipSubscribed: true,
            manualMembershipExpiresAt: addOneCalendarYearEndUtc(paymentCreatedAt),
          },
        });
        if (updated.count > 0) {
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
              "[gocardless webhook] provision blocked: applicant email already has a member portal"
            );
          }
          if (prov.ok && prov.newlyCreated) {
            notifyMemberWelcome(prisma, { email: prov.email, name: prov.name, temporaryPassword: prov.temporaryPassword });
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
            const xeroId = await createPaidXeroInvoice({
              contactName: app?.company ?? "Unknown Trader",
              contactEmail: app?.email ?? "",
              contactAddress: app?.tradingAddress,
              contactPostalCode: app?.postcode,
              description: `Annual Membership (${paymentCreatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${addOneCalendarYearEndUtc(paymentCreatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`,
              amountPence: payment.amount ?? 7200,
              reference: paymentId,
              paidAt: paymentCreatedAt,
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
            if (xeroId && app?.email) {
              const pdf = await fetchXeroInvoicePDF(xeroId);
              if (pdf) {
                void sendXeroInvoiceToTrader(prisma, {
                  traderName: app.company ?? "Trader",
                  email: app.email,
                  pdfBuffer: pdf,
                  invoiceDescription: "Annual Membership",
                });
              }
            }
          })();
        }
      }

      if (kind === "van_sticker_order" && payment.metadata?.memberId) {
        const memberId = payment.metadata.memberId;
        await prisma.member.updateMany({
          where: { id: memberId, vanStickerOrderedAt: null },
          data: { vanStickerOrderedAt: paymentCreatedAt },
        });
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { name: true, loginEmail: true, invoiceAddress: true, location: true },
        });
        if (member) {
          notifyVanStickerOrder(prisma, member);
          void createPaidXeroInvoice({
            contactName: member.name,
            contactEmail: member.loginEmail ?? "",
            contactAddress: member.invoiceAddress,
            description: "Van Stickers (x2)",
            amountPence: 2100,
            reference: paymentId,
            paidAt: paymentCreatedAt,
          });
        }
      }

      if (kind === "van_sticker_order_additional" && payment.metadata?.memberId) {
        const memberId = payment.metadata.memberId;
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { name: true, loginEmail: true, invoiceAddress: true, location: true },
        });
        if (member) {
          notifyVanStickerOrderAdditional(prisma, member);
          void createPaidXeroInvoice({
            contactName: member.name,
            contactEmail: member.loginEmail ?? "",
            contactAddress: member.invoiceAddress,
            description: "Additional Van Sticker",
            amountPence: 720,
            reference: paymentId,
            paidAt: paymentCreatedAt,
          });
        }
      }
    }
  } catch (e) {
    console.error("[gocardless webhook] handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
    return;
  }

  res.json({ received: true });
}

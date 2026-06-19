import Stripe from "stripe";
import { prisma } from "../db.js";

export type StripeInvoicePayload = {
  stripeCustomerId: string;
  description: string;
  /** Gross amount in pence including 20% VAT. */
  amountPence: number;
  /** Stripe Checkout Session ID or PaymentIntent ID — shown as payment reference. */
  reference: string;
  paidAt: Date;
};

async function loadInvoiceBranding() {
  return prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: {
      invoiceLegalName: true,
      invoiceVatNumber: true,
      invoiceAddress: true,
      invoiceFooterNote: true,
    },
  });
}

/**
 * Creates a finalised, paid Stripe invoice for a payment that was already collected
 * via a Checkout Session or off-session PaymentIntent.
 * Returns the invoice PDF as a Buffer, or null on failure.
 */
export async function createStripeInvoicePdf(
  stripe: Stripe,
  payload: StripeInvoicePayload
): Promise<Buffer | null> {
  try {
    // VAT breakdown: gross = net × 1.2  →  VAT = gross / 6
    const vatPence = Math.round(payload.amountPence / 6);
    const netPence = payload.amountPence - vatPence;
    const paidAtDisplay = payload.paidAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const invoiceBranding = await loadInvoiceBranding();
    const invoiceFooter = [
      invoiceBranding?.invoiceLegalName?.trim() || null,
      invoiceBranding?.invoiceAddress?.trim() || null,
      invoiceBranding?.invoiceVatNumber?.trim()
        ? `VAT registration number: ${invoiceBranding.invoiceVatNumber.trim()}`
        : null,
      invoiceBranding?.invoiceFooterNote?.trim() || null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // 1. Add line item to the customer's pending invoice
    await stripe.invoiceItems.create({
      customer: payload.stripeCustomerId,
      amount: payload.amountPence,
      currency: "gbp",
      description: payload.description,
    });

    // 2. Create the invoice (don't auto-advance so we control timing)
    const invoice = await stripe.invoices.create({
      customer: payload.stripeCustomerId,
      auto_advance: false,
      collection_method: "send_invoice",
      days_until_due: 0,
      description: `Date of supply: ${paidAtDisplay}\nPayment reference: ${payload.reference.slice(0, 30)}`,
      ...(invoiceFooter ? { footer: invoiceFooter } : {}),
      metadata: { reference: payload.reference.slice(0, 40) },
      custom_fields: [
        { name: "VAT applied", value: "20%" },
        { name: "Total incl. VAT", value: `£${(payload.amountPence / 100).toFixed(2)}` },
        { name: "Net (ex. VAT)", value: `£${(netPence / 100).toFixed(2)}` },
        { name: "VAT at 20%", value: `£${(vatPence / 100).toFixed(2)}` },
      ],
    });

    // 3. Finalise — generates the PDF
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    // 4. Mark as paid out-of-band (payment was already collected via Checkout Session)
    const paid = await stripe.invoices.pay(finalized.id, {
      paid_out_of_band: true,
    });

    if (!paid.invoice_pdf) return null;

    // 5. Fetch the PDF — invoice_pdf is a signed public URL, no auth required
    const pdfRes = await fetch(paid.invoice_pdf);
    if (!pdfRes.ok) {
      console.warn(
        "[stripeInvoice] PDF fetch failed",
        pdfRes.status,
        paid.invoice_pdf
      );
      return null;
    }
    return Buffer.from(await pdfRes.arrayBuffer());
  } catch (err) {
    console.error("[stripeInvoice] failed to create invoice", err);
    return null;
  }
}

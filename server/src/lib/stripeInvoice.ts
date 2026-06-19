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

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: Array<{ text: string; size?: number }>): Buffer {
  const content = lines
    .map((line, index) => {
      const y = 800 - index * (line.size && line.size > 14 ? 26 : 18);
      const fontSize = line.size ?? 12;
      return `BT\n/F1 ${fontSize} Tf\n50 ${y} Td\n(${pdfEscape(line.text)}) Tj\nET`;
    })
    .join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

async function createFallbackInvoicePdf(
  payload: StripeInvoicePayload
): Promise<Buffer> {
  const vatPence = Math.round(payload.amountPence / 6);
  const netPence = payload.amountPence - vatPence;
  const paidAtDisplay = payload.paidAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const invoiceBranding = await loadInvoiceBranding();
  const footerLines = [
    invoiceBranding?.invoiceLegalName?.trim() || "Trader Watchdog Ltd",
    ...(invoiceBranding?.invoiceAddress?.trim()
      ? invoiceBranding.invoiceAddress
          .split(/\r?\n|,/) 
          .map((part) => part.trim())
          .filter(Boolean)
      : []),
    invoiceBranding?.invoiceVatNumber?.trim()
      ? `VAT registration number: ${invoiceBranding.invoiceVatNumber.trim()}`
      : null,
    invoiceBranding?.invoiceFooterNote?.trim() || null,
  ].filter(Boolean) as string[];

  const lines: Array<{ text: string; size?: number }> = [
    { text: "VAT Receipt", size: 20 },
    { text: footerLines[0] || "Trader Watchdog Ltd", size: 14 },
    { text: "" },
    { text: `Date of supply: ${paidAtDisplay}` },
    { text: `Payment reference: ${payload.reference}` },
    { text: `Description of service: ${payload.description}` },
    { text: "VAT applied: 20%" },
    { text: `Total incl. VAT: £${(payload.amountPence / 100).toFixed(2)}` },
    { text: `Net (ex. VAT): £${(netPence / 100).toFixed(2)}` },
    { text: `VAT at 20%: £${(vatPence / 100).toFixed(2)}` },
    { text: "" },
    ...footerLines.slice(1).map((text) => ({ text })),
  ];

  return buildSimplePdf(lines);
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
  try {
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

    // 4. Mark as paid out-of-band (payment was already collected via Checkout Session).
    // Stripe can respond with "Invoice is already paid" for historical resends or if
    // the invoice has already reached a paid state; in that case, reuse the existing
    // Stripe invoice PDF instead of falling back to a locally generated document.
    let paid = finalized;
    try {
      paid = await stripe.invoices.pay(finalized.id, {
        paid_out_of_band: true,
      });
    } catch (err) {
      if (
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        /invoice is already paid/i.test(err.message)
      ) {
        paid = await stripe.invoices.retrieve(finalized.id);
      } else {
        throw err;
      }
    }

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
    try {
      return await createFallbackInvoicePdf(payload);
    } catch (fallbackErr) {
      console.error("[stripeInvoice] fallback PDF generation failed", fallbackErr);
      return null;
    }
  }
}

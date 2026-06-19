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
  receivedFromName?: string;
  receivedFromEmail?: string;
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

async function createCustomReceiptPdf(
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
  const headerLines = [
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
  ].filter(Boolean) as string[];

  const receivedFromLines = [
    payload.receivedFromName?.trim() || null,
    payload.receivedFromEmail?.trim() || null,
  ].filter(Boolean) as string[];

  const lines: Array<{ text: string; size?: number }> = [
    { text: "Receipt", size: 20 },
    { text: headerLines[0] || "Trader Watchdog Ltd", size: 14 },
    ...headerLines.slice(1).map((text) => ({ text })),
    { text: "" },
    ...(receivedFromLines.length > 0
      ? [
          { text: "Received from", size: 13 },
          ...receivedFromLines.map((text) => ({ text })),
          { text: "" },
        ]
      : []),
    { text: `Date of supply: ${paidAtDisplay}` },
    { text: `Payment reference: ${payload.reference}` },
    { text: `Description of service: ${payload.description}` },
    { text: "VAT applied: 20%" },
    { text: `Total incl. VAT: £${(payload.amountPence / 100).toFixed(2)}` },
    { text: `Net (ex. VAT): £${(netPence / 100).toFixed(2)}` },
    { text: `VAT at 20%: £${(vatPence / 100).toFixed(2)}` },
    ...(invoiceBranding?.invoiceFooterNote?.trim()
      ? [{ text: "" }, { text: invoiceBranding.invoiceFooterNote.trim() }]
      : []),
  ];

  return buildSimplePdf(lines);
}

/**
 * Builds the trader-facing receipt PDF for a payment that was already collected.
 */
export async function createStripeInvoicePdf(
  _stripe: Stripe,
  payload: StripeInvoicePayload
): Promise<Buffer | null> {
  try {
    return await createCustomReceiptPdf(payload);
  } catch (err) {
    console.error("[stripeInvoice] failed to create receipt PDF", err);
    return null;
  }
}

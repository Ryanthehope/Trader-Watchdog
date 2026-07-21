import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

function formatIssuedInvoiceNumber(id: number): string {
  return String(id).padStart(2, "0");
}

export async function ensureIssuedInvoiceNumber(
  paymentReference: string
): Promise<string> {
  const normalizedReference = paymentReference.trim();
  if (!normalizedReference) {
    throw new Error("Payment reference is required to issue an invoice number");
  }

  const existing = await prisma.issuedInvoice.findUnique({
    where: { paymentReference: normalizedReference },
    select: { id: true },
  });
  if (existing) {
    return formatIssuedInvoiceNumber(existing.id);
  }

  try {
    const created = await prisma.issuedInvoice.create({
      data: { paymentReference: normalizedReference },
      select: { id: true },
    });
    return formatIssuedInvoiceNumber(created.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const issuedInvoice = await prisma.issuedInvoice.findUnique({
        where: { paymentReference: normalizedReference },
        select: { id: true },
      });
      if (issuedInvoice) {
        return formatIssuedInvoiceNumber(issuedInvoice.id);
      }
    }
    throw error;
  }
}

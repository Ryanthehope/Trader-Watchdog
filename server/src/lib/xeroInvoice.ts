import { Invoices, Invoice, LineItem, Contact } from "xero-node";
import { getAuthorisedXeroClient } from "./xeroClient.js";
import { prisma } from "../db.js";

export type XeroInvoicePayload = {
    contactName: string;        // traders company name
    contactEmail: string;       // traders email
    description: string;         // e.g. "Annual Membership" or "Registration Fee"
    amountPence: number;        // amount in pence, e.g. 1999 for £19.99 inc VAT if applicable
    reference: string;          // e.g. goCardless ID
    paidAt: Date;               //when payment was confirmed
};

export async function createPaidXeroInvoice(payload: XeroInvoicePayload): Promise<string | null> {
    try {
        const client = await getAuthorisedXeroClient();

        const settings = await prisma.organizationSettings.findUnique({
            where: { id: "default" },
            select: { xeroTenantId: true },
        });

        const tenantId = settings?.xeroTenantId;
        if (!tenantId) {
            console.warn("[xero] No tenant ID stored — skipping invoice creation");
            return null;
    }

     const amountGross = payload.amountPence / 100;

    let contactId: string | undefined;
    if (payload.contactEmail) {
      const existing = await client.accountingApi.getContacts(
        tenantId, undefined, `EmailAddress="${payload.contactEmail}"`
      );
      contactId = existing.body.contacts?.[0]?.contactID;
    }
    const contact: Contact = contactId
      ? { contactID: contactId }
      : { name: payload.contactName, emailAddress: payload.contactEmail };

    const lineItem: LineItem = {
      description: payload.description,
      quantity: 1.0,
      unitAmount: amountGross,
      taxType: "OUTPUT2", 
      accountCode: "200", // default Xero sales account — Nigel can adjust in Xero
    };

    const invoice: Invoice = {
      type: Invoice.TypeEnum.ACCREC,
      contact,
      lineItems: [lineItem],
      date: payload.paidAt.toISOString().split("T")[0],
      dueDate: payload.paidAt.toISOString().split("T")[0],
      reference: payload.reference,
      status: Invoice.StatusEnum.AUTHORISED,
    };

    const invoices: Invoices = { invoices: [invoice] };
    const created = await client.accountingApi.createInvoices(tenantId, invoices);
    const invoiceId = created.body.invoices?.[0]?.invoiceID;

    if (!invoiceId) {
      console.error("[xero] Invoice created but no ID returned", created.body);
      return null;
    }

    // Mark as paid immediately
    const payment = {
      invoice: { invoiceID: invoiceId },
      account: { code: "090" }, // default Xero bank account — Nigel can adjust
      date: payload.paidAt.toISOString().split("T")[0],
      amount: amountGross,
    };

    await client.accountingApi.createPayment(tenantId, { payments: [payment] } as any);

    console.log(`[xero] Invoice ${invoiceId} created and marked paid for ${payload.contactName}`);
    return invoiceId;
  } catch (err) {
    // Non-fatal — log but don't break the webhook flow
    console.error("[xero] Failed to create invoice", err);
    return null;
  }
}
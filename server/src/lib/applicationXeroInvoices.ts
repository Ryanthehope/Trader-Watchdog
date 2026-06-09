import { prisma } from "../db.js";
import {
  checkoutLineConfig,
  getGoCardlessApiClient,
  getOrgBilling,
} from "./billingSettings.js";
import { addOneCalendarYearEndUtc } from "./membershipPeriod.js";
import {
  createPaidXeroInvoice,
  fetchXeroInvoicePDF,
  findRecentXeroInvoiceByReference,
} from "./xeroInvoice.js";
import { sendXeroInvoiceToTrader } from "./adminMail.js";

export type ApplicationXeroInvoiceKind = "registration_fee" | "membership";

type ApplicationXeroInvoiceRefs = {
  registration_fee: string | null;
  membership: string | null;
};

type GoCardlessListedPayment = {
  id?: string;
  amount?: number;
  created_at?: string | null;
  status?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

const APPLICATION_XERO_ORDER: ApplicationXeroInvoiceKind[] = [
  "registration_fee",
  "membership",
];

export function parseApplicationXeroInvoiceRefs(
  raw: string | null | undefined
): ApplicationXeroInvoiceRefs {
  const refs: Partial<Record<ApplicationXeroInvoiceKind, string>> = {};
  const legacy: string[] = [];
  for (const token of String(raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const [kind, ...rest] = token.split(":");
    if (
      (kind === "registration_fee" || kind === "membership") &&
      rest.length > 0
    ) {
      refs[kind] = rest.join(":").trim();
    } else {
      legacy.push(token);
    }
  }
  for (const kind of APPLICATION_XERO_ORDER) {
    if (!refs[kind] && legacy.length > 0) {
      refs[kind] = legacy.shift() ?? "";
    }
  }
  return {
    registration_fee: refs.registration_fee ?? null,
    membership: refs.membership ?? null,
  };
}

export function mergeApplicationXeroInvoiceRef(
  existing: string | null | undefined,
  kind: ApplicationXeroInvoiceKind,
  invoiceId: string
): string {
  const refs = parseApplicationXeroInvoiceRefs(existing);
  refs[kind] = invoiceId;
  return APPLICATION_XERO_ORDER.map((key) => {
    const value = refs[key];
    return value ? `${key}:${value}` : null;
  })
    .filter(Boolean)
    .join(",");
}

async function latestApplicationPayment(
  applicationId: string,
  customerId: string,
  kind: ApplicationXeroInvoiceKind
): Promise<GoCardlessListedPayment | null> {
  const gocardless = await getGoCardlessApiClient();
  if (!gocardless) return null;
  const list = await gocardless.payments.list({
    customer: customerId,
    limit: "50",
  });
  const payments = (list.payments ?? []) as GoCardlessListedPayment[];
  return payments
    .filter(
      (payment) =>
        payment.status !== "failed" &&
        payment.status !== "cancelled" &&
        payment.metadata?.applicationId === applicationId &&
        payment.metadata?.checkoutKind === kind
    )
    .sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at
        ? new Date(right.created_at).getTime()
        : 0;
      return rightTime - leftTime;
    })[0] ?? null;
}

export async function retryApplicationXeroInvoice(
  applicationId: string,
  kind: ApplicationXeroInvoiceKind
): Promise<{
  invoiceId: string;
  paymentId: string;
  receiptEmailed: boolean;
  usedFallback: boolean;
}> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      company: true,
      email: true,
      registrationFeePaidAt: true,
      membershipSubscribed: true,
      membershipRenewalPricePence: true,
      manualMembershipExpiresAt: true,
      goCardlessCustomerId: true,
      xeroInvoiceId: true,
      xeroInvoiceFailed: true,
    },
  });
  if (!app) {
    throw new Error("Application not found");
  }
  const refs = parseApplicationXeroInvoiceRefs(app.xeroInvoiceId);
  if (refs[kind]) {
    throw new Error("A Xero invoice is already stored for that payment");
  }
  if (kind === "registration_fee" && !app.registrationFeePaidAt) {
    throw new Error("Registration fee is not recorded on this application");
  }
  if (kind === "membership" && !app.membershipSubscribed) {
    throw new Error("Membership payment is not recorded on this application");
  }
  if (!app.goCardlessCustomerId?.trim()) {
    throw new Error("No GoCardless customer is linked to this application");
  }

  try {
    const payment = await latestApplicationPayment(
      applicationId,
      app.goCardlessCustomerId,
      kind
    );
    const billing = await getOrgBilling();
    const lines = checkoutLineConfig(billing);
    const paidAt = payment?.created_at
      ? new Date(payment.created_at)
      : kind === "registration_fee"
        ? (app.registrationFeePaidAt ?? new Date())
        : new Date();
    const usedFallback = !payment?.id;
    const amountPence =
      typeof payment?.amount === "number"
        ? payment.amount
        : kind === "registration_fee"
          ? lines.registrationFeePence
          : app.membershipRenewalPricePence === 0
            ? 0
            : lines.membershipPence;
    const description =
      kind === "registration_fee"
        ? "Registration Fee"
        : `Annual Membership (${paidAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })} – ${(app.manualMembershipExpiresAt ?? addOneCalendarYearEndUtc(paidAt)).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })})`;

    const reference =
      payment?.id ??
      `xero-retry:${kind}:${app.id}:${paidAt.toISOString().slice(0, 10)}`;
    let invoiceId = await findRecentXeroInvoiceByReference(reference);
    if (!invoiceId) {
      invoiceId = await createPaidXeroInvoice({
      contactName: app.company,
      contactEmail: app.email,
      description,
      amountPence,
      reference,
      paidAt,
    });
    }
    if (!invoiceId) {
      throw new Error("Xero invoice creation did not return an invoice ID");
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        xeroInvoiceId: mergeApplicationXeroInvoiceRef(
          app.xeroInvoiceId,
          kind,
          invoiceId
        ),
        xeroInvoiceFailed: false,
      },
    });

    let receiptEmailed = false;
    const pdf = await fetchXeroInvoicePDF(invoiceId);
    if (pdf && app.email.trim()) {
      await sendXeroInvoiceToTrader(prisma, {
        traderName: app.company,
        email: app.email,
        pdfBuffer: pdf,
        invoiceDescription:
          kind === "registration_fee" ? "Registration Fee" : "Annual Membership",
      });
      receiptEmailed = true;
    }

    return {
      invoiceId,
      paymentId: reference,
      receiptEmailed,
      usedFallback,
    };
  } catch (error) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { xeroInvoiceFailed: true },
    });
    throw error;
  }
}
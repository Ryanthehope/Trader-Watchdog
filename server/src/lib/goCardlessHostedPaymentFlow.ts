import type { GoCardlessClient } from "gocardless-nodejs";

const CHECKOUT_FLOW_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

type HostedPaymentFlowOptions = {
  amountPence: number;
  description: string;
  email: string;
  companyName?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  existingCustomerId?: string | null;
  successRedirectUrl: string;
  exitUrl: string;
  metadata: Record<string, string>;
  /** When true, creates a one-off payment only — no mandate/Direct Debit setup */
  oneOffPayment?: boolean;
};

function prefilledCustomer(options: HostedPaymentFlowOptions) {
  const customer: Record<string, string> = { country_code: "GB" };
  if (options.email) customer.email = options.email;
  const name = options.companyName?.trim();
  if (name) customer.company_name = name;
  const addr = options.addressLine1?.trim();
  if (addr) customer.address_line1 = addr;
  const pc = options.postalCode?.trim();
  if (pc) customer.postal_code = pc;
  return customer;
}

export async function createGoCardlessHostedPaymentFlow(
  gocardless: GoCardlessClient,
  options: HostedPaymentFlowOptions
) {
  const billingRequest = await withTimeout(
    gocardless.billingRequests.create({
      ...(options.existingCustomerId
        ? { links: { customer: options.existingCustomerId } }
        : {}),
      payment_request: {
        amount: String(options.amountPence),
        currency: "GBP",
        description: options.description,
        metadata: options.metadata,
      },
      ...(options.oneOffPayment ? {} : { mandate_request: { scheme: "bacs" } }),
    }),
    CHECKOUT_FLOW_TIMEOUT_MS,
    "GoCardless billing request"
  );

  const flow = await withTimeout(
    gocardless.billingRequestFlows.create({
      auto_fulfil: true,
      redirect_uri: options.successRedirectUrl,
      exit_uri: options.exitUrl,
      links: { billing_request: billingRequest.id },
      prefilled_customer: options.existingCustomerId
        ? undefined
        : prefilledCustomer(options),
      show_redirect_buttons: true,
      show_success_redirect_button: true,
      skip_success_screen: true,
    }),
    CHECKOUT_FLOW_TIMEOUT_MS,
    "GoCardless billing request flow"
  );

  if (!flow.authorisation_url) {
    throw new Error("GoCardless flow missing authorisation_url");
  }

  return {
    url: flow.authorisation_url,
    billingRequestId: billingRequest.id,
    billingRequestFlowId: flow.id,
  };
}
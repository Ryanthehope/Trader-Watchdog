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
};

function prefilledCustomer(options: HostedPaymentFlowOptions) {
  return {
    email: options.email,
    company_name: options.companyName?.trim() || null,
    address_line1: options.addressLine1?.trim() || null,
    postal_code: options.postalCode?.trim() || null,
    country_code: "GB",
  };
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
      lock_customer_details: !options.existingCustomerId,
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
import type Stripe from "stripe";

export type StripeCheckoutParams = {
  amountPence: number;
  description: string;
  /** Pre-filled email shown on the Stripe checkout page. */
  email: string;
  /** Existing Stripe customer ID to attach this payment to (optional). */
  existingStripeCustomerId?: string | null;
  successRedirectUrl: string;
  cancelRedirectUrl: string;
  /**
   * Key/value metadata echoed back on the checkout.session.completed webhook.
   * Must include `checkoutKind` so the webhook knows what to do.
   */
  metadata: Record<string, string>;
  /**
   * When true, saves the payment method for future off-session charges.
   * Use for registration_fee so membership can be auto-charged on approval.
   */
  savePaymentMethod?: boolean;
};

export async function createStripeCheckoutSession(
  stripe: Stripe,
  params: StripeCheckoutParams
): Promise<{ url: string }> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: { name: params.description },
          unit_amount: params.amountPence,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: params.metadata,
      ...(params.savePaymentMethod
        ? { setup_future_usage: "off_session" }
        : {}),
    },
    metadata: params.metadata,
    success_url: params.successRedirectUrl,
    cancel_url: params.cancelRedirectUrl,
  };

  if (params.existingStripeCustomerId) {
    sessionParams.customer = params.existingStripeCustomerId;
  } else {
    sessionParams.customer_email = params.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

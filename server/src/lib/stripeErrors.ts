import Stripe from "stripe";

export function stripeErrorDetails(e: unknown): { statusCode: number; message: string } {
  if (e instanceof Stripe.errors.StripeError) {
    return {
      statusCode: e.statusCode ?? 400,
      message:
        e.message?.trim() ||
        "Payment provider error — please try again or contact support",
    };
  }
  return {
    statusCode: 500,
    message: "Unexpected billing error — please contact support",
  };
}

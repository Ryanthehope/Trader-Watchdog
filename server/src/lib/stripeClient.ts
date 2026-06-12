import Stripe from "stripe";
import { prisma } from "../db.js";

export async function getStripeSecretKey(): Promise<string | null> {
  const env = process.env.STRIPE_SECRET_KEY?.trim();
  if (env) return env;
  const s = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true },
  });
  return s?.stripeSecretKey?.trim() || null;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const env = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (env) return env;
  const s = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { stripeWebhookSecret: true },
  });
  return s?.stripeWebhookSecret?.trim() || null;
}

export async function getStripeClient(): Promise<Stripe | null> {
  const key = await getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

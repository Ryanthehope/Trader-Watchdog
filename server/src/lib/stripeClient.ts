import Stripe from "stripe";
import { prisma } from "../db.js";

type StripeMode = "live" | "test";

function normalizeSecret(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stripeSecretMode(key: string | null | undefined): StripeMode | null {
  if (!key) return null;
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return null;
}

function matchesMode(
  key: string | null | undefined,
  liveMode?: boolean
): key is string {
  if (!key) return false;
  if (liveMode === undefined) return true;
  return stripeSecretMode(key) === (liveMode ? "live" : "test");
}

async function loadStoredStripeSettings() {
  return prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true, stripeWebhookSecret: true },
  });
}

export async function getStripeSecretKey(liveMode?: boolean): Promise<string | null> {
  const envModeKey = liveMode === undefined
    ? null
    : normalizeSecret(
        liveMode
          ? process.env.STRIPE_LIVE_SECRET_KEY
          : process.env.STRIPE_TEST_SECRET_KEY
      );
  if (matchesMode(envModeKey, liveMode)) return envModeKey;

  const env = normalizeSecret(process.env.STRIPE_SECRET_KEY);
  if (matchesMode(env, liveMode)) return env;

  const stored = await loadStoredStripeSettings();
  const dbKey = normalizeSecret(stored?.stripeSecretKey);
  if (matchesMode(dbKey, liveMode)) return dbKey;

  if (liveMode === undefined) {
    return envModeKey || env || dbKey || null;
  }
  return null;
}

export async function getStripeWebhookSecretCandidates(): Promise<string[]> {
  const stored = await loadStoredStripeSettings();
  return [
    normalizeSecret(process.env.STRIPE_LIVE_WEBHOOK_SECRET),
    normalizeSecret(process.env.STRIPE_TEST_WEBHOOK_SECRET),
    normalizeSecret(process.env.STRIPE_WEBHOOK_SECRET),
    normalizeSecret(stored?.stripeWebhookSecret),
  ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const [first] = await getStripeWebhookSecretCandidates();
  return first ?? null;
}

export async function getStripeClient(liveMode?: boolean): Promise<Stripe | null> {
  const key = await getStripeSecretKey(liveMode);
  if (!key) return null;
  return new Stripe(key);
}

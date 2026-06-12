-- AddColumn: Stripe fields on OrganizationSettings
ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "stripeWebhookSecret" TEXT;

-- AddColumn: Stripe fields on Application
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;

-- AddColumn: Stripe customer ID on Member
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE "Member"
  DROP COLUMN "goCardlessCustomerId",
  DROP COLUMN "goCardlessSubscriptionId",
  DROP COLUMN "goCardlessSubscriptionStatus";

ALTER TABLE "Application"
  DROP COLUMN "goCardlessCustomerId",
  DROP COLUMN "goCardlessMandateId";

ALTER TABLE "OrganizationSettings"
  DROP COLUMN "goCardlessPublishableKey",
  DROP COLUMN "goCardlessSecretKey",
  DROP COLUMN "goCardlessWebhookSecret",
  DROP COLUMN "goCardlessBrandingLogoFileId";
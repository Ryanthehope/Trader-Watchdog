ALTER TABLE "OrganizationSettings"
ALTER COLUMN "checkoutMembershipPence" SET DEFAULT 9480;

UPDATE "OrganizationSettings"
SET "checkoutMembershipPence" = 9480
WHERE "checkoutMembershipPence" = 7900;
-- Fix registration fee to 1800p gross (= £15 + VAT display, £18 total charge)
-- Covers any incorrect value that was not already 1800
ALTER TABLE "OrganizationSettings"
ALTER COLUMN "checkoutRegistrationFeePence" SET DEFAULT 1800;

UPDATE "OrganizationSettings"
SET "checkoutRegistrationFeePence" = 1800
WHERE "checkoutRegistrationFeePence" != 1800;

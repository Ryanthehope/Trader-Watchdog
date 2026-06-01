-- Change registration fee default from £18 (1800p) to £15 (1500p)
ALTER TABLE "OrganizationSettings"
ALTER COLUMN "checkoutRegistrationFeePence" SET DEFAULT 1500;

UPDATE "OrganizationSettings"
SET "checkoutRegistrationFeePence" = 1500
WHERE "checkoutRegistrationFeePence" = 1800;

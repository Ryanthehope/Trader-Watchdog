-- Add membershipAutoChargeInitiatedAt to Application
-- Tracks when an off-session GoCardless payment was successfully created from the stored mandate on approval.
-- Prevents duplicate manual checkout while the Bacs payment clears (~3-5 working days).
ALTER TABLE "Application" ADD COLUMN "membershipAutoChargeInitiatedAt" TIMESTAMP(3);

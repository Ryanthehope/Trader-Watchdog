-- Add membershipAutoChargeInitiatedAt to Application
-- Tracks when an off-session Stripe membership payment is started from a saved payment method.
-- Prevents duplicate manual checkout while the renewal charge is in flight.
ALTER TABLE "Application" ADD COLUMN "membershipAutoChargeInitiatedAt" TIMESTAMP(3);

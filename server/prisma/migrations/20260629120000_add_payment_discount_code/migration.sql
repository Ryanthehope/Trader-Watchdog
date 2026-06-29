-- AlterTable: add paymentDiscountCode to Application for affiliate/referral tracking
ALTER TABLE "Application" ADD COLUMN "paymentDiscountCode" TEXT;

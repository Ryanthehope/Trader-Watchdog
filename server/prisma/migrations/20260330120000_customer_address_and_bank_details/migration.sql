-- AlterTable
ALTER TABLE "Member" ADD COLUMN "invoiceBankDetails" TEXT;

-- AlterTable
ALTER TABLE "MemberQuote" ADD COLUMN "customerAddress" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "MemberTradeInvoice" ADD COLUMN "customerAddress" TEXT NOT NULL DEFAULT '';

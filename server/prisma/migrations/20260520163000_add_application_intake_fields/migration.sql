ALTER TABLE "Application"
ADD COLUMN "legalStructure" TEXT,
ADD COLUMN "tradingAddress" TEXT,
ADD COLUMN "identifiablePerson" TEXT,
ADD COLUMN "identifiablePersonAddress" TEXT,
ADD COLUMN "wasteCarrierRequired" TEXT,
ADD COLUMN "wasteCarrierNumber" TEXT,
ADD COLUMN "gasSafeRequired" TEXT,
ADD COLUMN "gasSafeNumber" TEXT,
ADD COLUMN "icoNumber" TEXT,
ADD COLUMN "businessDescription" TEXT,
ADD COLUMN "documentsConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "agreementAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "enquiriesAccepted" BOOLEAN NOT NULL DEFAULT false;
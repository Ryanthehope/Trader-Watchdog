ALTER TABLE "Application"
ADD COLUMN "addressVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "addressVerificationApprovedAt" TIMESTAMP(3),
ADD COLUMN "addressVerificationRejectedAt" TIMESTAMP(3),
ADD COLUMN "addressVerificationFailureReason" TEXT,
ADD COLUMN "addressVerificationMatchedAddress" TEXT,
ADD COLUMN "addressVerificationMatchedApplication" BOOLEAN;

ALTER TABLE "Member"
ADD COLUMN "addressVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "addressVerificationApprovedAt" TIMESTAMP(3),
ADD COLUMN "addressVerificationRejectedAt" TIMESTAMP(3),
ADD COLUMN "addressVerificationFailureReason" TEXT,
ADD COLUMN "addressVerificationMatchedAddress" TEXT,
ADD COLUMN "addressVerificationMatchedApplication" BOOLEAN;
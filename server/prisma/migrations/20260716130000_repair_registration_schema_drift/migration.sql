DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationSettings'
      AND column_name = 'checkoutFastTrackName'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationSettings'
      AND column_name = 'checkoutRegistrationFeeName'
  ) THEN
    ALTER TABLE "OrganizationSettings"
      RENAME COLUMN "checkoutFastTrackName" TO "checkoutRegistrationFeeName";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationSettings'
      AND column_name = 'checkoutFastTrackPence'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationSettings'
      AND column_name = 'checkoutRegistrationFeePence'
  ) THEN
    ALTER TABLE "OrganizationSettings"
      RENAME COLUMN "checkoutFastTrackPence" TO "checkoutRegistrationFeePence";
  END IF;
END $$;

ALTER TABLE "OrganizationSettings"
  ADD COLUMN IF NOT EXISTS "checkoutRegistrationFeeName" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutRegistrationFeePence" INTEGER NOT NULL DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS "xeroTokenSetJson" TEXT,
  ADD COLUMN IF NOT EXISTS "xeroTenantId" TEXT;

ALTER TABLE "OrganizationSettings"
  ALTER COLUMN "checkoutRegistrationFeePence" SET DEFAULT 1800;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Application'
      AND column_name = 'fastTrackPaidAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Application'
      AND column_name = 'registrationFeePaidAt'
  ) THEN
    ALTER TABLE "Application"
      RENAME COLUMN "fastTrackPaidAt" TO "registrationFeePaidAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'VerificationStatus'
  ) AND EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'VerificationStatus'
      AND e.enumlabel = 'PENDING'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'VerificationStatus'
      AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE "VerificationStatus" RENAME VALUE 'PENDING' TO 'IN_PROGRESS';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'VerificationStatus'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'VerificationStatus'
      AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE "VerificationStatus" ADD VALUE 'IN_PROGRESS';
  END IF;
END $$;

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "registrationFeePaidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationRejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationProviderApplicantId" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationProviderSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedByStaffName" TEXT,
  ADD COLUMN IF NOT EXISTS "membershipRenewalPricePence" INTEGER,
  ADD COLUMN IF NOT EXISTS "xeroInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "xeroInvoiceFailed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Member"
  ADD COLUMN IF NOT EXISTS "verificationProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationRejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationProviderApplicantId" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationProviderSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "membershipRenewalPricePence" INTEGER,
  ADD COLUMN IF NOT EXISTS "xeroInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "xeroInvoiceFailed" BOOLEAN NOT NULL DEFAULT false;
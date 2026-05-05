-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'CONTACTED', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tvId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "vettingItems" JSONB,
    "verifiedSince" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "profileLogoStoredName" TEXT,
    "invoiceAddress" TEXT,
    "invoiceBankDetails" TEXT,
    "invoicePhone" TEXT,
    "invoiceEmail" TEXT,
    "vatNumber" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "documentAccentHex" TEXT,
    "documentLayout" TEXT,
    "loginEmail" TEXT,
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "membershipExpiresAt" TIMESTAMP(3),
    "membershipBillingType" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "membershipUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "policyNumber" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "graceExpiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "alertsSent" JSONB,
    "lastAlertSentAt" TIMESTAMP(3),
    "documentStoredName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberDocument" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "vettingChecklist" TEXT,
    "vettingState" JSONB,
    "fastTrackPaidAt" TIMESTAMP(3),
    "membershipSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "manualMembershipExpiresAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "pendingPortalPassword" TEXT,
    "pendingPortalPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdMemberId" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "revenueMtdCents" INTEGER NOT NULL DEFAULT 0,
    "outstandingCents" INTEGER NOT NULL DEFAULT 0,
    "workspaceName" TEXT,
    "siteDisplayName" TEXT,
    "publicSiteUrl" TEXT,
    "announcementEmail" TEXT,
    "adminNotifyEmails" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "mailFrom" TEXT,
    "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePublishableKey" TEXT,
    "stripeSecretKey" TEXT,
    "stripeWebhookSecret" TEXT,
    "checkoutMembershipName" TEXT,
    "checkoutFastTrackName" TEXT,
    "checkoutMembershipPence" INTEGER NOT NULL DEFAULT 1500,
    "checkoutFastTrackPence" INTEGER NOT NULL DEFAULT 4000,
    "recaptchaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recaptchaSiteKey" TEXT,
    "recaptchaSecretKey" TEXT,
    "staffRequire2fa" BOOLEAN NOT NULL DEFAULT false,
    "brandingLogoStoredName" TEXT,
    "invoiceLegalName" TEXT,
    "invoiceVatNumber" TEXT,
    "invoiceAddress" TEXT,
    "invoiceFooterNote" TEXT,
    "stripeBrandingLogoFileId" TEXT,
    "googleAnalyticsMeasurementId" TEXT,
    "googleAnalyticsPropertyId" TEXT,
    "googleAnalyticsServiceAccountJson" TEXT,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "readTime" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Member_slug_key" ON "Member"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tvId_key" ON "Member"("tvId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_loginEmail_key" ON "Member"("loginEmail");

-- CreateIndex
CREATE INDEX "Insurance_memberId_idx" ON "Insurance"("memberId");

-- CreateIndex
CREATE INDEX "Insurance_status_idx" ON "Insurance"("status");

-- CreateIndex
CREATE INDEX "Insurance_expiryDate_idx" ON "Insurance"("expiryDate");

-- CreateIndex
CREATE INDEX "MemberDocument_memberId_idx" ON "MemberDocument"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_createdMemberId_key" ON "Application"("createdMemberId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "_CategoryToMember_B_index" ON "_CategoryToMember"("B");

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDocument" ADD CONSTRAINT "MemberDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdMemberId_fkey" FOREIGN KEY ("createdMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToMember" ADD CONSTRAINT "_CategoryToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToMember" ADD CONSTRAINT "_CategoryToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;


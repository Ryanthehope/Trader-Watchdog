-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN "siteDisplayName" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "publicSiteUrl" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "adminNotifyEmails" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "OrganizationSettings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrganizationSettings" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "smtpPass" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "mailFrom" TEXT;

-- AddColumns: passwordResetToken and passwordResetExpiry on Member
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);

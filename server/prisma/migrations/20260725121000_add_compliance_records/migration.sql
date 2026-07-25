-- CreateTable
CREATE TABLE "ComplianceRecord" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "referenceNumber" TEXT,
  "expiryDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceRecord_memberId_idx" ON "ComplianceRecord"("memberId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_expiryDate_idx" ON "ComplianceRecord"("expiryDate");

-- AddForeignKey
ALTER TABLE "ComplianceRecord"
ADD CONSTRAINT "ComplianceRecord_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
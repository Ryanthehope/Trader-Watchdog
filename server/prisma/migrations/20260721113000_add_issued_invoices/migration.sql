-- CreateTable: IssuedInvoice
CREATE TABLE IF NOT EXISTS "IssuedInvoice" (
  "id" SERIAL NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IssuedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IssuedInvoice_paymentReference_key" ON "IssuedInvoice"("paymentReference");

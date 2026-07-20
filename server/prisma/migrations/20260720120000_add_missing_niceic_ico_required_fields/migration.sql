-- Repair: niceicRequired, niceicNumber, and icoRequired were added to the Prisma
-- schema and referenced in prisma.application.create() but were never included in
-- any prior migration, causing a 500 on every new application submission and on
-- every applicant-summary query (SELECT * against a missing column).

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "niceicRequired" TEXT,
  ADD COLUMN IF NOT EXISTS "niceicNumber"   TEXT,
  ADD COLUMN IF NOT EXISTS "icoRequired"    TEXT;

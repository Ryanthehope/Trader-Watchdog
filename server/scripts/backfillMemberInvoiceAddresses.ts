import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(scriptDir, "..", ".env") });
dotenv.config();

async function main() {
  const { prisma } = await import("../src/db.js");

  const rows = await prisma.application.findMany({
    where: { createdMemberId: { not: null } },
    select: {
      id: true,
      company: true,
      tradingAddress: true,
      createdMemberId: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const memberId = row.createdMemberId;
    const tradingAddress = row.tradingAddress?.trim() || "";

    if (!memberId || !tradingAddress) {
      skipped += 1;
      continue;
    }

    const result = await prisma.member.updateMany({
      where: {
        id: memberId,
        OR: [{ invoiceAddress: null }, { invoiceAddress: "" }],
      },
      data: {
        invoiceAddress: tradingAddress,
      },
    });

    if (result.count > 0) {
      updated += result.count;
      continue;
    }

    skipped += 1;
  }

  console.log(
    `Backfilled ${updated} member invoice address(es); skipped ${skipped} application(s).`
  );
}

main()
  .catch((error) => {
    console.error("Invoice address backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/db.js");
    await prisma.$disconnect();
  });
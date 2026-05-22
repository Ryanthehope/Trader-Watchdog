import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(scriptDir, "..", ".env") });
dotenv.config();

async function main() {
  const [{ prisma }, publicProfileHelpers] = await Promise.all([
    import("../src/db.js"),
    import("../src/lib/memberPublicProfileFromApplication.js"),
  ]);
  const {
    buildMemberBlurbFromApplication,
    buildMemberVettingItemsFromApplication,
  } = publicProfileHelpers;

  const rows = await prisma.application.findMany({
    where: { createdMemberId: { not: null } },
    select: {
      id: true,
      company: true,
      trade: true,
      phone: true,
      postcode: true,
      wasteCarrierRequired: true,
      wasteCarrierNumber: true,
      gasSafeRequired: true,
      gasSafeNumber: true,
      icoNumber: true,
      businessDescription: true,
      createdMemberId: true,
    },
  });

  let updated = 0;
  for (const row of rows) {
    if (!row.createdMemberId) continue;
    await prisma.member.update({
      where: { id: row.createdMemberId },
      data: {
        blurb: buildMemberBlurbFromApplication(row),
        vettingItems: buildMemberVettingItemsFromApplication(row),
      },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} member profile(s) from source applications.`);
}

main()
  .catch((error) => {
    console.error("Backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/db.js");
    await prisma.$disconnect();
  });
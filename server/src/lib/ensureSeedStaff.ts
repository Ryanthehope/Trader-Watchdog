import bcrypt from "bcryptjs";
import { prisma } from "../db.js";

export async function ensureSeedStaffFromEnv() {
  const email = process.env.STAFF_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.STAFF_SEED_PASSWORD?.trim();
  const name = process.env.STAFF_SEED_NAME?.trim() || "Administrator";

  if (!email || !password) {
    return { configured: false as const };
  }

  const hash = await bcrypt.hash(password, 12);
  const staff = await prisma.staff.upsert({
    where: { email },
    create: { email, password: hash, name },
    update: { password: hash, name },
  });

  return {
    configured: true as const,
    email: staff.email,
    name: staff.name,
  };
}
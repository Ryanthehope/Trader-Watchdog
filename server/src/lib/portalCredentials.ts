import bcrypt from "bcryptjs";

export async function hashPortalPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

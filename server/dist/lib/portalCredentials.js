import bcrypt from "bcryptjs";
export async function hashPortalPassword(plain) {
    return bcrypt.hash(plain, 12);
}

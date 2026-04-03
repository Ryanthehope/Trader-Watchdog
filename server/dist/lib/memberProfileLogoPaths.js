import fs from "fs";
import path from "path";
const rootBase = process.env.MEMBER_PROFILE_LOGO_DIR?.trim() ||
    path.join(process.cwd(), "uploads", "member-profile-logos");
export function memberProfileLogoDir(memberId) {
    const dir = path.join(rootBase, memberId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
export function memberProfileLogoFilePath(memberId, storedName) {
    const safe = path.basename(storedName);
    const resolved = path.resolve(memberProfileLogoDir(memberId), safe);
    const base = path.resolve(memberProfileLogoDir(memberId));
    if (!resolved.startsWith(base)) {
        throw new Error("Invalid path");
    }
    return resolved;
}

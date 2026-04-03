import fs from "fs";
import path from "path";
const root = process.env.ORG_BRANDING_DIR?.trim() ||
    path.join(process.cwd(), "uploads", "org-branding");
export function orgBrandingDir() {
    fs.mkdirSync(root, { recursive: true });
    return root;
}
export function orgBrandingFilePath(storedName) {
    const safe = path.basename(storedName);
    return path.join(orgBrandingDir(), safe);
}

import fs from "fs";
import path from "path";
import { defaultUploadPath } from "./uploadPaths.js";

const root =
  process.env.ORG_BRANDING_DIR?.trim() ||
  defaultUploadPath("org-branding");

export function orgBrandingDir(): string {
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function orgBrandingFilePath(storedName: string): string {
  const safe = path.basename(storedName);
  return path.join(orgBrandingDir(), safe);
}

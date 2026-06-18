import path from "path";
import { fileURLToPath } from "url";

const serverRootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export function defaultUploadPath(...parts: string[]): string {
  return path.join(serverRootDir, "uploads", ...parts);
}
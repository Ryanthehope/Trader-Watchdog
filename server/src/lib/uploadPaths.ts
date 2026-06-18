import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const serverRootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const legacyRootDir = process.cwd();

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((value) => path.resolve(value)))];
}

export function uploadPathCandidates(...parts: string[]): string[] {
  return uniquePaths([
    path.join(serverRootDir, "uploads", ...parts),
    path.join(legacyRootDir, "uploads", ...parts),
  ]);
}

export function defaultUploadPath(...parts: string[]): string {
  const candidates = uploadPathCandidates(...parts);
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing ?? candidates[0];
}
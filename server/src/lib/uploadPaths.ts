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
    path.join(serverRootDir, "tmp", "uploads", ...parts),
    path.join(legacyRootDir, "uploads", ...parts),
    path.join(legacyRootDir, "tmp", "uploads", ...parts),
  ]);
}

export function resolveStoredUploadPath(
  baseDirs: string[],
  storedName: string
): string | null {
  const rawStoredName = String(storedName ?? "").trim();
  if (!rawStoredName) return null;

  const relativeCandidates = [...new Set([
    rawStoredName.replace(/\\/g, "/"),
    path.basename(rawStoredName),
  ])];

  for (const candidateBase of uniquePaths(baseDirs)) {
    const base = path.resolve(candidateBase);
    for (const relativeName of relativeCandidates) {
      const resolved = path.resolve(base, relativeName);
      if ((!resolved.startsWith(base + path.sep) && resolved !== base) || !fs.existsSync(resolved)) {
        continue;
      }
      return resolved;
    }
  }

  const absoluteCandidate = path.resolve(rawStoredName);
  if (path.isAbsolute(rawStoredName) && fs.existsSync(absoluteCandidate)) {
    return absoluteCandidate;
  }

  return null;
}

export function defaultUploadPath(...parts: string[]): string {
  const candidates = uploadPathCandidates(...parts);
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing ?? candidates[0];
}
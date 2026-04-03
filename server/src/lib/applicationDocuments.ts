import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { Express } from "express";
import { prisma } from "../db.js";

const UPLOAD_ROOT =
  process.env.APPLICATION_UPLOAD_DIR?.trim() ||
  path.join(process.cwd(), "uploads", "application-documents");

export const ALLOWED_APPLICATION_DOC_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const MAX_APPLICATION_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_APPLICATION_FILES = 8;

export function applicationDocDir(applicationId: string) {
  return path.join(UPLOAD_ROOT, applicationId);
}

/** Resolved absolute path to a stored file, or null if outside the app folder. */
export function applicationDocumentResolvedPath(
  applicationId: string,
  storedName: string
): string | null {
  const base = path.resolve(applicationDocDir(applicationId));
  const resolved = path.resolve(base, path.basename(storedName));
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return null;
  }
  return resolved;
}

export function ensureApplicationDocDir(applicationId: string) {
  const dir = applicationDocDir(applicationId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function removeApplicationUploadDir(applicationId: string) {
  const dir = applicationDocDir(applicationId);
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export async function persistApplicationDocuments(
  applicationId: string,
  files: Express.Multer.File[]
) {
  if (!files.length) return;
  const dir = ensureApplicationDocDir(applicationId);
  for (const file of files) {
    const ext = path.extname(file.originalname || "").slice(0, 12) || "";
    const storedName = `${randomUUID()}${ext}`;
    await fs.promises.writeFile(path.join(dir, storedName), file.buffer);
    await prisma.applicationDocument.create({
      data: {
        applicationId,
        storedName,
        originalName: (file.originalname || "upload").slice(0, 255),
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }
}

import { prisma } from "../db.js";
import { removeApplicationUploadDir } from "./applicationDocuments.js";
export async function deleteApplicationById(id) {
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing)
        return "not_found";
    await removeApplicationUploadDir(id);
    await prisma.application.delete({ where: { id } });
    return "ok";
}

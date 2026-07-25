import { Router } from "express";
import { prisma } from "../db.js";
import { requireStaff } from "../middleware/requireStaff.js";

const router = Router();

function serializeRecord(record: {
  id: string;
  memberId: string;
  type: string;
  referenceNumber: string | null;
  expiryDate: Date | null;
  notes: string | null;
  sourceDocumentKind: string | null;
  sourceDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    memberId: record.memberId,
    type: record.type,
    referenceNumber: record.referenceNumber,
    expiryDate: record.expiryDate?.toISOString() ?? null,
    notes: record.notes,
    sourceDocumentKind: record.sourceDocumentKind,
    sourceDocumentId: record.sourceDocumentId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

router.get("/:memberId", requireStaff, async (req, res) => {
  try {
    const { memberId } = req.params;
    const records = await prisma.complianceRecord.findMany({
      where: { memberId },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    });
    res.json(records.map(serializeRecord));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not fetch compliance records" });
  }
});

router.post("/", requireStaff, async (req, res) => {
  try {
    const {
      memberId,
      type,
      referenceNumber,
      expiryDate,
      notes,
      sourceDocumentKind,
      sourceDocumentId,
    } = req.body;

    if (!memberId || typeof memberId !== "string") {
      res.status(400).json({ error: "Member ID is required" });
      return;
    }
    if (!type || typeof type !== "string" || !type.trim()) {
      res.status(400).json({ error: "Type is required" });
      return;
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        sourceApplication: { select: { id: true } },
      },
    });
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    let normalizedSourceKind: "member" | "application" | null = null;
    let normalizedSourceId: string | null = null;
    const rawSourceKind =
      typeof sourceDocumentKind === "string" ? sourceDocumentKind.trim().toLowerCase() : "";
    const rawSourceId =
      typeof sourceDocumentId === "string" ? sourceDocumentId.trim() : "";

    if (rawSourceKind || rawSourceId) {
      if (!rawSourceKind || !rawSourceId) {
        res.status(400).json({ error: "Linked document kind and ID must be provided together" });
        return;
      }
      if (rawSourceKind !== "member" && rawSourceKind !== "application") {
        res.status(400).json({ error: "Linked document kind must be member or application" });
        return;
      }

      if (rawSourceKind === "member") {
        const doc = await prisma.memberDocument.findFirst({
          where: { id: rawSourceId, memberId },
          select: { id: true },
        });
        if (!doc) {
          res.status(400).json({ error: "Selected member portal upload was not found for this trader" });
          return;
        }
      } else {
        const sourceApplicationId = member.sourceApplication?.id;
        if (!sourceApplicationId) {
          res.status(400).json({ error: "This trader has no linked application uploads to attach" });
          return;
        }
        const doc = await prisma.applicationDocument.findFirst({
          where: { id: rawSourceId, applicationId: sourceApplicationId },
          select: { id: true },
        });
        if (!doc) {
          res.status(400).json({ error: "Selected application upload was not found for this trader" });
          return;
        }
      }

      normalizedSourceKind = rawSourceKind;
      normalizedSourceId = rawSourceId;
    }

    let parsedExpiryDate: Date | null = null;
    if (expiryDate !== undefined && expiryDate !== null && String(expiryDate).trim()) {
      parsedExpiryDate = new Date(String(expiryDate));
      if (Number.isNaN(parsedExpiryDate.getTime())) {
        res.status(400).json({ error: "Expiry date is invalid" });
        return;
      }
    }

    const record = await prisma.complianceRecord.create({
      data: {
        memberId,
        type: type.trim(),
        referenceNumber:
          typeof referenceNumber === "string" && referenceNumber.trim()
            ? referenceNumber.trim()
            : null,
        expiryDate: parsedExpiryDate,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        sourceDocumentKind: normalizedSourceKind,
        sourceDocumentId: normalizedSourceId,
      },
    });

    res.status(201).json(serializeRecord(record));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create compliance record" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const existing = await prisma.complianceRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Compliance record not found" });
      return;
    }

    await prisma.complianceRecord.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not delete compliance record" });
  }
});

export default router;
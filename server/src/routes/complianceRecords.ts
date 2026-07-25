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
    const { memberId, type, referenceNumber, expiryDate, notes } = req.body;

    if (!memberId || typeof memberId !== "string") {
      res.status(400).json({ error: "Member ID is required" });
      return;
    }
    if (!type || typeof type !== "string" || !type.trim()) {
      res.status(400).json({ error: "Type is required" });
      return;
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
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
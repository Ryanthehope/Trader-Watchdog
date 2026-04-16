import { Router } from "express";
import { prisma } from "../db.js";
import { requireStaff } from "../middleware/requireStaff.js";

const router = Router();

// GET /api/insurance/:memberId - get all insurance records for a member (admin only)
router.get("/:memberId", requireStaff, async (req, res) => {
    try {
        const { memberId } = req.params;

        const policies = await prisma.insurance.findMany({
            where: { memberId },
            orderBy: { expiryDate: 'asc' },
        });

        res.json(policies);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not fetch insurance policies" });
    }
});

// POST /api/insurance - create new insurance record (admin only)
router.post("/", requireStaff, async (req, res) => {
    try {
        const { memberId, type, provider, policyNumber, expiryDate } = req.body;

        //Validation
        if (!memberId || typeof memberId !== "string") {
            res.status(400).json({ error: "Member ID is required" });
            return;
        }
        if (!type || typeof type !== "string") {
            res.status(400).json({ error: "Insurance type is required" });
            return;
        }
        if (!expiryDate) {
            res.status(400).json({ error: "Expiry date is required" });
            return;
        }

        //Check if member exists
        const member = await prisma.member.findUnique({
            where: { id: memberId },
        });
        if (!member) {
            res.status(404).json({ error: "Member not found" });
            return;
        }

        //Calculate initial status based on expiry date
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status = "active";
        let graceExpiryDate = null;
        
        if (daysUntilExpiry < 0) {
            // Expired - check if in grace period (14 days)
            const daysExpired = Math.abs(daysUntilExpiry);
            if (daysExpired <= 14) {
                status = "in_grace";
                graceExpiryDate = new Date(expiry.getTime() + (14 * 24 * 60 * 60 * 1000));
            } else {
                status = "expired";
            }
        } else if (daysUntilExpiry <= 30) {
            status = "expiring_soon";
        }

        // Create insurance record
        const insurance = await prisma.insurance.create({
            data: {
                memberId,
                type: type.trim(),
                provider: provider ? provider.trim() : null,
                policyNumber: policyNumber ? policyNumber.trim() : null,
                expiryDate: expiry,
                graceExpiryDate,
                status,
            },
        });

        res.status(201).json(insurance);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not create insurance record" });
    }
});

// PUT /api/insurance/:id - update insurance record (admin only)
router.put("/:id", requireStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, provider, policyNumber, expiryDate } = req.body;

        // Check if insurance record exists
        const existing = await prisma.insurance.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({ error: "Insurance policy not found" });
            return;
        }

        // Prepare update data
        const updateData: any = {};
        if (type) updateData.type = type.trim();
        if (provider !== undefined) updateData.provider = provider ? provider.trim() : null;
        if (policyNumber !== undefined) updateData.policyNumber = policyNumber ? policyNumber.trim() : null;

        // If expiry date changes, recalculate status and grace period
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            const today = new Date();
            const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            updateData.expiryDate = expiry;

            // Calculate status
            if (daysUntilExpiry < 0) {
                // Expired - check if in grace period (14 days)
                const daysExpired = Math.abs(daysUntilExpiry);
                if (daysExpired <= 14) {
                    updateData.status = "in_grace";
                    updateData.graceExpiryDate = new Date(expiry.getTime() + (14 * 24 * 60 * 60 * 1000));
                }else {
                    updateData.status = "expired";
                    updateData.graceExpiryDate = null;
                }
            }
            else if (daysUntilExpiry <= 30) {
                updateData.status = "expiring_soon";
                updateData.graceExpiryDate = null;
            }   else {
                updateData.status = "active";
                updateData.graceExpiryDate = null;
            }
        }

        // Update insurance record
        const insurance = await prisma.insurance.update({
            where: { id },
            data: updateData,
        });

        res.json(insurance);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Could not update insurance policy" });
    }
});

// DELETE /api/insurance/:id - delete insurance policy (admin only)
router.delete("/:id", requireStaff, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if insurance record exists
        const existing = await prisma.insurance.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({ error: "Insurance policy not found" });
            return;
        }
        // Delete insurance record
        await prisma.insurance.delete({
            where: { id },
        });

        res.status(204).end();
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Could not delete insurance policy" });

    }

});

// POST /api/insurance/:id/send-alert - manually send alert email for an insurance policy (admin only)
router.post("/:id/send-alert", requireStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { alertType } = req.body;

        // Validate alertType
        const validAlertTypes = ["90days" , "60days", "30days", "grace"];
        if (!alertType || !validAlertTypes.includes(alertType)) {
            res.status(400).json({ error: "Invalid alertType is required and must be one of: 90days, 60days, 30days, grace" });
            return;
        }

        // Check if insurance exists
        const insurance = await prisma.insurance.findUnique({
            where: { id },
            include: { member: { select: { name: true, loginEmail: true } } }
        });

        if (!insurance) {
            res.status(404).json({ error: "Insurance policy not found" });
            return;
        }

        if (!insurance.member.loginEmail) {
            res.status(400).json({ error: "Member does not have an email address" });
            return;
        }

        // Import and send alert

        const { sendInsuranceAlertEmail } = await import("../lib/insuranceAlerts.js");
        const success = await sendInsuranceAlertEmail(id, alertType);

        if (success) {
            res.json({ 
                message: `Alert email sent successfully to ${insurance.member.name}`,
                alertType,
                sentTo: insurance.member.loginEmail 
            });
        } else {
            res.status(500).json({ error: "Failed to send alert email" });
        }
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Could not send alert email" });
    }
});

export default router;
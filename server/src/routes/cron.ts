import { Router } from "express";
import { checkInsuranceExpiries } from "../lib/insuranceAlerts.js";

const router = Router();

/**
 * POST /api/cron/check-insurance
 * Daily cron job to check insurance expiries and send alerts
 * Called by Vercel Cron (configured in vercel.json)
 */
router.post("/check-insurance", async (req, res) => {
    try {
        // Verify cron secret to prevent unauthorized access
        const cronSecret = process.env.CRON_SECRET || "dev-secret-123";
        const authHeader = req.headers.authorization;
        
        if (authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        console.log("🔄 Running insurance expiry check...");
        
        const results = await checkInsuranceExpiries();
        
        console.log(`✅ Cron job complete: ${results.checked} policies checked, ${results.alertsSent} alerts sent, ${results.statusesUpdated} statuses updated`);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error) {
        console.error("Error in cron job:", error);
        res.status(500).json({ error: "Cron job failed" });
    }
});

export default router;
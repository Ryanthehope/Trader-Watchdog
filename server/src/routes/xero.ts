import { Router }  from 'express';
import { prisma } from "../db.js";
import { requireStaff } from "../middleware/requireStaff.js";
import { consumePendingAuthClient } from "../lib/xeroClient.js";

const router = Router();

// Step 1: Staff clicks "Connect Xero" - now handled via /api/admin/xero-consent-url
// This route is kept for direct-link fallback but requires auth header
router.get("/connect", requireStaff, async (_req, res) => {
  const { buildConsentUrlAndStore } = await import("../lib/xeroClient.js");
  const url = await buildConsentUrlAndStore();
  res.redirect(url);
});

// Step 2: Xero redirects back here after Nigel approves
router.get("/callback", async (req, res) => {
    try {
        const client = consumePendingAuthClient();
        const tokenSet = await client.apiCallback(
            `${process.env.XERO_REDIRECT_URI}?${new URLSearchParams(req.query as Record<string, string>).toString()}`
        );

// Get the list of orgs the token has access to and save the first one
       await client.setTokenSet(tokenSet);
    const tenants = await client.updateTenants(false);
    const tenantId = tenants[0]?.tenantId;

    if (!tenantId) {
        res.status(400).send("No Xero organisation found. Make sure Nigel approved access.");
      return;
    }

    await prisma.organizationSettings.update({
        where: { id: "default" },
        data: {
            xeroTokenSetJson: JSON.stringify(tokenSet),
            xeroTenantId: tenantId,
        },
    });

    res.send("Xero connected successfully! You can close this tab.");
} catch (err) {
    console.error("[xero] OAuth callback error", err);
    res.status(500).send("Failed to connect Xero. Check server logs.");
}
});

export default router;
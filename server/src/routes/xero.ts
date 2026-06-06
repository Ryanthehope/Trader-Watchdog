import { Router }  from 'express';
import { prisma } from "../db.js";
import { requireStaff } from "../middleware/requireStaff.js";
import { buildXeroClient } from "../lib/xeroClient.js";

const router = Router();

// Step 1: Staff clicks "Connect Xo" - redirects to Xero for OAuth2
router.get("/connect", requireStaff, async (_req, res) => {
  const client = buildXeroClient();
  const consentUrl = await client.buildConsentUrl();
  res.redirect(consentUrl);
});

// Step 2: Xero redirects back here after Nigel approves
router.get("/callback", async (req, res) => {
    try {
        const client = buildXeroClient();
        const tokenSet = await client.apiCallback(
            `${process.env.XERO_REDIRECT_URI}?${new URLSearchParams(req.query as Record<string, string>).toString()}`
        );

// Get the list of orgs the token has access to and save the first one
       await client.setTokenSet(tokenSet);
    const tenants = await client.updateTenants();
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
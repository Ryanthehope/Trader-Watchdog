import { XeroClient} from "xero-node";
import { prisma} from "../db.js"

export function buildXeroClient(): XeroClient {
    return new XeroClient({
        clientId: process.env.XERO_CLIENT_ID!,
        clientSecret: process.env.XERO_CLIENT_SECRET!,
        redirectUris: [process.env.XERO_REDIRECT_URI!],
        scopes: ["offline_access", "accounting.invoices", "accounting.payments", "accounting.contacts"],
    });
}

export async function getAuthorisedXeroClient(): Promise<XeroClient> {
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { xeroTokenSetJson: true },
  });
  if (!settings?.xeroTokenSetJson) {
    throw new Error("Xero is not connected. Complete OAuth2 setup first.");
  }

  const client = buildXeroClient();
  const tokenSet = JSON.parse(settings.xeroTokenSetJson);
  await client.setTokenSet(tokenSet);

  //Refresh if expired
  if (client.readTokenSet().expired()) {
    const refreshed = await client.refreshToken();
    await prisma.organizationSettings.update({
        where: { id: "default"},
        data: { xeroTokenSetJson: JSON.stringify(refreshed) },
    });
  }

  return client;
}

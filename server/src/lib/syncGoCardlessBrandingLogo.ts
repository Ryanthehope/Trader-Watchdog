import fs from "fs";
import path from "path";
import { getGoCardlessClient } from "./billingSettings.js";

/**
 * Uploads a logo file to GoCardless and sets it as the platform account invoice/checkout branding logo.
 * Requires GoCardless secret key; logo must meet GoCardless's business_logo rules (PNG/JPG, typically ≤512KB).
 */
export async function syncLogoFileToGoCardlessAccount(
  absolutePath: string
): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  const goCardless = await getGoCardlessClient();
  if (!goCardless) {
    return { ok: false, error: "GoCardless is not configured" };
  }
  try {
    const data = fs.readFileSync(absolutePath);
    const name = path.basename(absolutePath);
    const file = await goCardless.files.create({
      file: { data, name, type: "application/octet-stream" },
      purpose: "business_logo",
    });
    const account = await goCardless.accounts.retrieve();
    await goCardless.accounts.update(account.id, {
      settings: {
        branding: {
          logo: file.id,
        },
      },
    });
    return { ok: true, fileId: file.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

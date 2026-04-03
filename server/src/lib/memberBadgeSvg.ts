function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Strip XML-invalid control chars (legacy rows or bad imports). */
function xmlSafeText(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

const W = 320;
const H = 88;

/**
 * Horizontal emerald trust ribbon: white seal + check, wordmark, TV ID,
 * trade + business name — flat green, prints well on stickers and PDFs.
 */
export function buildTradeVerifyBadgeSvg(opts: {
  name: string;
  tvId: string;
  trade: string;
}): string {
  const name = escapeXml(xmlSafeText(String(opts.name ?? "")).slice(0, 36));
  const tv = escapeXml(xmlSafeText(String(opts.tvId ?? "")));
  const trade = escapeXml(xmlSafeText(String(opts.trade ?? "")).slice(0, 28));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="TradeVerify verified member">
  <rect width="${W}" height="${H}" rx="14" fill="#047857"/>
  <circle cx="44" cy="44" r="28" fill="#ffffff"/>
  <path d="M30 44 L38 52 L58 32" fill="none" stroke="#047857" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="84" y="32" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="17" font-weight="800" letter-spacing="-0.02em">TradeVerify</text>
  <text x="84" y="48" fill="#d1fae5" font-family="system-ui,Segoe UI,sans-serif" font-size="9.5" font-weight="700" letter-spacing="0.14em">VERIFIED MEMBER</text>
  <text x="84" y="70" fill="#ffffff" font-family="ui-monospace,Cascadia Code,Consolas,monospace" font-size="12.5" font-weight="700">${tv}</text>
  <text x="${W - 16}" y="30" fill="#a7f3d0" font-family="system-ui,Segoe UI,sans-serif" font-size="9.5" font-weight="600" text-anchor="end">${trade}</text>
  <text x="${W - 16}" y="50" fill="#ecfdf5" font-family="system-ui,Segoe UI,sans-serif" font-size="11" font-weight="600" text-anchor="end">${name}</text>
</svg>`;
}

/** Minimal SVG if full badge generation throws (never throws). */
export function fallbackMemberBadgeSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="TradeVerify">
  <rect width="${W}" height="${H}" rx="14" fill="#047857"/>
  <text x="160" y="52" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800" text-anchor="middle">TradeVerify</text>
</svg>`;
}

/** Coerces DB values and never throws — returns full badge or fallback SVG. */
export function buildMemberBadgeSvgFromRow(row: {
  name: unknown;
  tvId: unknown;
  trade: unknown;
}): string {
  try {
    return buildTradeVerifyBadgeSvg({
      name: String(row.name ?? ""),
      tvId: String(row.tvId ?? ""),
      trade: String(row.trade ?? ""),
    });
  } catch (e) {
    console.error("[badge] buildTradeVerifyBadgeSvg threw", e);
    return fallbackMemberBadgeSvg();
  }
}

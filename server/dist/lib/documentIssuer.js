const DEFAULT_ACCENT = "#0d9488";
function normalizeHex(raw) {
    const s = String(raw ?? "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(s))
        return s.toLowerCase();
    return DEFAULT_ACCENT;
}
/** Payload for quote/invoice print views — customer-facing business branding. */
export function documentIssuerFromMember(m) {
    const email = m.invoiceEmail?.trim() || m.loginEmail?.trim() || null;
    const layoutRaw = String(m.documentLayout ?? "").trim().toLowerCase();
    const layout = layoutRaw === "bold" ? "bold" : "standard";
    return {
        businessName: m.name,
        trade: m.trade,
        slug: m.slug,
        tvId: m.tvId,
        hasLogo: Boolean(m.profileLogoStoredName?.trim()),
        address: m.invoiceAddress?.trim() || null,
        phone: m.invoicePhone?.trim() || null,
        email,
        vatNumber: m.vatNumber?.trim() || null,
        vatRegistered: Boolean(m.vatRegistered),
        /** For customer invoices — bank transfer details from Business details. */
        bankDetails: m.invoiceBankDetails?.trim() || null,
        accentHex: normalizeHex(m.documentAccentHex),
        layout,
    };
}

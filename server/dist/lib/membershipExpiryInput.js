/** Calendar date (YYYY-MM-DD) is stored as end of that UTC day. */
export function parseManualMembershipExpiryInput(raw) {
    const s = String(raw ?? "").trim();
    if (!s)
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T23:59:59.999Z`);
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime()))
        return null;
    return d;
}

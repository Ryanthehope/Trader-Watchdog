/** Normalise DB text so literal "null" / empty junk is not sent to clients. */
export function sanitizeNullableDbString(v) {
    if (v == null)
        return null;
    const t = v.trim();
    if (t === "")
        return null;
    const lower = t.toLowerCase();
    if (lower === "null" || lower === "undefined")
        return null;
    return t;
}

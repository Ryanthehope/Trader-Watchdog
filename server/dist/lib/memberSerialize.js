function slugId(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
}
function parseChecksJson(checks) {
    if (Array.isArray(checks))
        return checks.map(String);
    if (typeof checks === "string") {
        try {
            const p = JSON.parse(checks);
            return Array.isArray(p) ? p.map(String) : [];
        }
        catch {
            return [];
        }
    }
    return [];
}
export function parseVettingItems(raw) {
    if (!Array.isArray(raw))
        return null;
    const out = [];
    for (const cat of raw) {
        if (!cat || typeof cat !== "object")
            return null;
        const label = String(cat.label ?? "").trim();
        if (!label)
            return null;
        const id = String(cat.id ?? "").trim() || slugId(label);
        const itemsRaw = cat.items;
        if (!Array.isArray(itemsRaw))
            return null;
        const items = [];
        for (const it of itemsRaw) {
            if (!it || typeof it !== "object")
                return null;
            const ilabel = String(it.label ?? "").trim();
            if (!ilabel)
                return null;
            const st = it.status;
            const status = st === "pending" ? "pending" : "verified";
            const detail = typeof it.detail === "string"
                ? it.detail
                : undefined;
            const value = typeof it.value === "string"
                ? it.value
                : undefined;
            let facts;
            const factsRaw = it.facts;
            if (Array.isArray(factsRaw)) {
                const parsed = [];
                for (const f of factsRaw) {
                    if (!f || typeof f !== "object")
                        continue;
                    const fl = String(f.label ?? "").trim();
                    const fv = String(f.value ?? "").trim();
                    if (fl && fv)
                        parsed.push({ label: fl, value: fv });
                }
                if (parsed.length)
                    facts = parsed;
            }
            items.push({
                id: String(it.id ?? "").trim() ||
                    slugId(`${id}-${ilabel}`),
                label: ilabel,
                status,
                detail,
                value,
                facts,
            });
        }
        out.push({ id, label, items });
    }
    return out.length ? out : null;
}
function checksToFallbackCategories(checks) {
    return [
        {
            id: "summary",
            label: "Verification summary",
            items: checks.map((c, i) => ({
                id: `check-${i}`,
                label: c,
                status: "verified",
                detail: "This point was independently confirmed as part of our verification process before this profile went live.",
            })),
        },
    ];
}
export function memberToPublic(m) {
    const checks = parseChecksJson(m.checks);
    const parsed = parseVettingItems(m.vettingItems);
    const vettingCategories = parsed ?? (checks.length ? checksToFallbackCategories(checks) : []);
    return {
        slug: m.slug,
        tvId: m.tvId,
        name: m.name,
        trade: m.trade,
        location: m.location,
        categories: Array.isArray(m.categories) ? m.categories : [],
        checks,
        vettingCategories,
        verifiedSince: m.verifiedSince,
        blurb: m.blurb,
        profileLogo: Boolean(m.profileLogoStoredName?.trim()),
    };
}
export function guideToPublic(g) {
    const body = Array.isArray(g.body)
        ? g.body.map(String)
        : typeof g.body === "string"
            ? JSON.parse(g.body)
            : [];
    return {
        slug: g.slug,
        title: g.title,
        excerpt: g.excerpt,
        readTime: g.readTime,
        body,
    };
}

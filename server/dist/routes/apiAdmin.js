import { Router } from "express";
import { prisma } from "../db.js";
import { deleteApplicationById } from "../lib/applicationDelete.js";
import { hashPortalPassword } from "../lib/portalCredentials.js";
import { guideToPublic, memberToPublic } from "../lib/memberSerialize.js";
import { parseManualMembershipExpiryInput } from "../lib/membershipExpiryInput.js";
import { requireStaff } from "../middleware/requireStaff.js";
import adminOps from "./adminOps.js";
import { registerStaff2faRoutes } from "./staff2fa.js";
const router = Router();
router.use(requireStaff);
registerStaff2faRoutes(router);
/** Registered on this router (before adminOps) so DELETE is never dropped by nested router / hosting quirks. */
async function applicationDeleteHandler(req, res) {
    try {
        const result = await deleteApplicationById(req.params.id);
        if (result === "not_found") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "P2025") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(500).json({ error: "Could not delete application" });
    }
}
router.delete("/applications/:id", applicationDeleteHandler);
router.post("/applications/:id/delete", applicationDeleteHandler);
router.use(adminOps);
function parseChecks(body) {
    if (Array.isArray(body))
        return body.map(String).filter(Boolean);
    if (typeof body === "string") {
        const lines = body
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        return lines.length ? lines : null;
    }
    return null;
}
function parseGuideBody(body) {
    return parseChecks(body);
}
/** Members */
router.get("/members", async (_req, res) => {
    try {
        const rows = await prisma.member.findMany({ orderBy: { updatedAt: "desc" } });
        res.json({
            members: rows.map((m) => ({
                id: m.id,
                ...memberToPublic(m),
                loginEmail: m.loginEmail,
                portalEnabled: Boolean(m.loginEmail && m.passwordHash),
                membershipUnlimited: m.membershipUnlimited,
                membershipBillingType: m.membershipBillingType,
                membershipExpiresAt: m.membershipExpiresAt?.toISOString() ?? null,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list members" });
    }
});
router.get("/members/:id", async (req, res) => {
    try {
        const m = await prisma.member.findUnique({ where: { id: req.params.id } });
        if (!m) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json({
            member: {
                id: m.id,
                ...memberToPublic(m),
                loginEmail: m.loginEmail,
                portalEnabled: Boolean(m.loginEmail && m.passwordHash),
                membershipUnlimited: m.membershipUnlimited,
                membershipBillingType: m.membershipBillingType,
                membershipExpiresAt: m.membershipExpiresAt?.toISOString() ?? null,
                stripeSubscriptionStatus: m.stripeSubscriptionStatus,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load member" });
    }
});
router.post("/members", async (req, res) => {
    try {
        const { slug, tvId, name, trade, location, checks, verifiedSince, blurb, loginEmail, portalPassword, } = req.body ?? {};
        const checkList = parseChecks(checks);
        if (!slug ||
            !tvId ||
            !name ||
            !trade ||
            !location ||
            !checkList?.length ||
            !verifiedSince ||
            !blurb) {
            res.status(400).json({
                error: "slug, tvId, name, trade, location, checks (array or newline list), verifiedSince, and blurb are required",
            });
            return;
        }
        const portalPw = String(portalPassword ?? "").trim();
        const portalEmail = String(loginEmail ?? "")
            .trim()
            .toLowerCase();
        if (portalPw && !portalEmail) {
            res.status(400).json({
                error: "Portal login email is required when setting a portal password",
            });
            return;
        }
        const m = await prisma.member.create({
            data: {
                slug: String(slug).trim(),
                tvId: String(tvId).trim(),
                name: String(name).trim(),
                trade: String(trade).trim(),
                location: String(location).trim(),
                checks: checkList,
                verifiedSince: String(verifiedSince).trim(),
                blurb: String(blurb).trim(),
                ...(portalPw && portalEmail
                    ? {
                        loginEmail: portalEmail,
                        passwordHash: await hashPortalPassword(portalPw),
                    }
                    : {}),
            },
        });
        res.status(201).json({
            member: {
                id: m.id,
                ...memberToPublic(m),
                loginEmail: m.loginEmail,
                portalEnabled: Boolean(m.loginEmail && m.passwordHash),
            },
        });
    }
    catch (e) {
        console.error(e);
        const msg = typeof e === "object" && e && "code" in e && e.code === "P2002"
            ? "A member with this slug or TradeVerify ID already exists"
            : "Could not create member";
        res.status(400).json({ error: msg });
    }
});
router.put("/members/:id", async (req, res) => {
    try {
        const { slug, tvId, name, trade, location, checks, verifiedSince, blurb, loginEmail, portalPassword, disablePortal, } = req.body ?? {};
        const checkList = parseChecks(checks);
        if (!slug ||
            !tvId ||
            !name ||
            !trade ||
            !location ||
            !checkList?.length ||
            !verifiedSince ||
            !blurb) {
            res.status(400).json({ error: "All fields are required for update" });
            return;
        }
        const portalPw = String(portalPassword ?? "").trim();
        const portalEmailRaw = loginEmail !== undefined
            ? String(loginEmail).trim().toLowerCase() || null
            : undefined;
        const portalOff = Boolean(disablePortal);
        const portalPatch = {};
        const { membershipUnlimited, membershipAccessMode, membershipExpiresAt, clearStripeSubscription, } = req.body ?? {};
        const membershipPatch = {};
        if (typeof membershipUnlimited === "boolean") {
            membershipPatch.membershipUnlimited = membershipUnlimited;
        }
        const accessMode = typeof membershipAccessMode === "string"
            ? membershipAccessMode.trim().toLowerCase()
            : "";
        if (accessMode === "legacy") {
            membershipPatch.membershipBillingType = null;
            membershipPatch.membershipExpiresAt = null;
            if (clearStripeSubscription === true) {
                membershipPatch.stripeSubscriptionId = null;
                membershipPatch.stripeSubscriptionStatus = null;
                membershipPatch.stripeCustomerId = null;
            }
        }
        else if (accessMode === "manual" || accessMode === "fast_track") {
            const exp = parseManualMembershipExpiryInput(membershipExpiresAt);
            if (!exp) {
                res.status(400).json({
                    error: "membershipExpiresAt (YYYY-MM-DD or ISO) is required for manual and fast_track access modes",
                });
                return;
            }
            membershipPatch.membershipBillingType =
                accessMode === "fast_track" ? "fast_track" : "manual";
            membershipPatch.membershipExpiresAt = exp;
            if (clearStripeSubscription === true) {
                membershipPatch.stripeSubscriptionId = null;
                membershipPatch.stripeSubscriptionStatus = null;
            }
        }
        if (portalOff) {
            portalPatch.loginEmail = null;
            portalPatch.passwordHash = null;
        }
        else if (portalPw) {
            const em = portalEmailRaw ??
                (await prisma.member.findUnique({
                    where: { id: req.params.id },
                    select: { loginEmail: true },
                }))?.loginEmail;
            if (!em) {
                res.status(400).json({
                    error: "Set a portal login email before assigning a password, or include loginEmail in this request",
                });
                return;
            }
            portalPatch.passwordHash = await hashPortalPassword(portalPw);
            if (portalEmailRaw)
                portalPatch.loginEmail = portalEmailRaw;
        }
        else if (portalEmailRaw !== undefined) {
            portalPatch.loginEmail = portalEmailRaw;
            if (!portalEmailRaw)
                portalPatch.passwordHash = null;
        }
        const m = await prisma.member.update({
            where: { id: req.params.id },
            data: {
                slug: String(slug).trim(),
                tvId: String(tvId).trim(),
                name: String(name).trim(),
                trade: String(trade).trim(),
                location: String(location).trim(),
                checks: checkList,
                verifiedSince: String(verifiedSince).trim(),
                blurb: String(blurb).trim(),
                ...portalPatch,
                ...membershipPatch,
            },
        });
        res.json({
            member: {
                id: m.id,
                ...memberToPublic(m),
                loginEmail: m.loginEmail,
                portalEnabled: Boolean(m.loginEmail && m.passwordHash),
                membershipUnlimited: m.membershipUnlimited,
                membershipBillingType: m.membershipBillingType,
                membershipExpiresAt: m.membershipExpiresAt?.toISOString() ?? null,
                stripeSubscriptionStatus: m.stripeSubscriptionStatus,
            },
        });
    }
    catch (e) {
        console.error(e);
        const msg = typeof e === "object" && e && "code" in e && e.code === "P2002"
            ? "Slug or TradeVerify ID conflicts with another member"
            : "Could not update member";
        res.status(400).json({ error: msg });
    }
});
router.delete("/members/:id", async (req, res) => {
    try {
        await prisma.member.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "P2025") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(500).json({ error: "Could not delete member" });
    }
});
/** Guides */
router.get("/guides", async (_req, res) => {
    try {
        const rows = await prisma.guide.findMany({ orderBy: { updatedAt: "desc" } });
        res.json({
            guides: rows.map((g) => ({
                id: g.id,
                ...guideToPublic(g),
                createdAt: g.createdAt.toISOString(),
                updatedAt: g.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list guides" });
    }
});
router.get("/guides/:id", async (req, res) => {
    try {
        const g = await prisma.guide.findUnique({ where: { id: req.params.id } });
        if (!g) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json({
            guide: {
                id: g.id,
                ...guideToPublic(g),
                createdAt: g.createdAt.toISOString(),
                updatedAt: g.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load guide" });
    }
});
router.post("/guides", async (req, res) => {
    try {
        const { slug, title, excerpt, readTime, body } = req.body ?? {};
        const paragraphs = parseGuideBody(body);
        if (!slug || !title || !excerpt || !readTime || !paragraphs?.length) {
            res.status(400).json({
                error: "slug, title, excerpt, readTime, and body (array of strings or newline-separated paragraphs) are required",
            });
            return;
        }
        const g = await prisma.guide.create({
            data: {
                slug: String(slug).trim(),
                title: String(title).trim(),
                excerpt: String(excerpt).trim(),
                readTime: String(readTime).trim(),
                body: paragraphs,
            },
        });
        res.status(201).json({ guide: { id: g.id, ...guideToPublic(g) } });
    }
    catch (e) {
        console.error(e);
        const msg = typeof e === "object" && e && "code" in e && e.code === "P2002"
            ? "A guide with this slug already exists"
            : "Could not create guide";
        res.status(400).json({ error: msg });
    }
});
router.put("/guides/:id", async (req, res) => {
    try {
        const { slug, title, excerpt, readTime, body } = req.body ?? {};
        const paragraphs = parseGuideBody(body);
        if (!slug || !title || !excerpt || !readTime || !paragraphs?.length) {
            res.status(400).json({ error: "All fields are required" });
            return;
        }
        const g = await prisma.guide.update({
            where: { id: req.params.id },
            data: {
                slug: String(slug).trim(),
                title: String(title).trim(),
                excerpt: String(excerpt).trim(),
                readTime: String(readTime).trim(),
                body: paragraphs,
            },
        });
        res.json({ guide: { id: g.id, ...guideToPublic(g) } });
    }
    catch (e) {
        console.error(e);
        const msg = typeof e === "object" && e && "code" in e && e.code === "P2002"
            ? "Slug conflicts with another guide"
            : "Could not update guide";
        res.status(400).json({ error: msg });
    }
});
router.delete("/guides/:id", async (req, res) => {
    try {
        await prisma.guide.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "P2025") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(500).json({ error: "Could not delete guide" });
    }
});
router.get("/me", async (req, res) => {
    try {
        const id = req.staffId;
        const staff = await prisma.staff.findUnique({ where: { id } });
        if (!staff) {
            res.status(401).json({ error: "Staff account not found" });
            return;
        }
        res.json({
            staff: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                totpEnabled: staff.totpEnabled,
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load profile" });
    }
});
export default router;

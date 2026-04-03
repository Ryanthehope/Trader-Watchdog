import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { mergeVettingStateFromDb, mergeVettingStateFromInput, vettingStateToPrismaJson, } from "../lib/applicationVettingState.js";
import { applicationDocumentResolvedPath } from "../lib/applicationDocuments.js";
import { tryProvisionMemberForApplication } from "../lib/provisionMemberFromApplication.js";
import { sanitizeNullableDbString } from "../lib/sanitizeDbText.js";
import { getStripeClient } from "../lib/billingSettings.js";
import { serverStartedAt } from "../lib/serverMeta.js";
import { fetchStripeFinancialSnapshot } from "../lib/stripeFinancialSnapshot.js";
import { parseManualMembershipExpiryInput } from "../lib/membershipExpiryInput.js";
import { orgBrandingDir, orgBrandingFilePath } from "../lib/orgBrandingPaths.js";
import { syncLogoFileToStripeAccount } from "../lib/syncStripeBrandingLogo.js";
import { fetchGa4OverviewReport } from "../lib/ga4DataApi.js";
import { invalidateSmtpTransportCache, notifyApplicationDecision, notifyNewLead, } from "../lib/adminMail.js";
const router = Router();
const orgLogoUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, orgBrandingDir());
        },
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            const useExt = ext === ".png" || ext === ".jpg" || ext === ".jpeg" ? ext : ".png";
            cb(null, `${randomUUID()}${useExt}`);
        },
    }),
    limits: { fileSize: 512 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = file.mimetype === "image/png" ||
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/jpg";
        if (ok)
            cb(null, true);
        else
            cb(new Error("Only PNG or JPEG (max 512 KB) for Stripe invoice branding"));
    },
});
async function ensureOrgSettings() {
    return prisma.organizationSettings.upsert({
        where: { id: "default" },
        create: { id: "default" },
        update: {},
    });
}
router.get("/dashboard", async (_req, res) => {
    try {
        const [membersTotal, membersPortal, guidesTotal, applicationsPending, settings, inboxUnread, recentApps, recentMembers, recentGuides, reviewsPending,] = await Promise.all([
            prisma.member.count(),
            prisma.member.count({
                where: { loginEmail: { not: null }, passwordHash: { not: null } },
            }),
            prisma.guide.count(),
            prisma.application.count({ where: { status: "PENDING" } }),
            ensureOrgSettings(),
            prisma.inboxMessage.count({ where: { read: false } }),
            prisma.application.findMany({
                orderBy: { createdAt: "desc" },
                take: 8,
                select: { id: true, company: true, status: true, createdAt: true },
            }),
            prisma.member.findMany({
                orderBy: { updatedAt: "desc" },
                take: 8,
                select: { id: true, name: true, updatedAt: true },
            }),
            prisma.guide.findMany({
                orderBy: { updatedAt: "desc" },
                take: 8,
                select: { id: true, title: true, updatedAt: true },
            }),
            prisma.memberReview.count({ where: { status: "PENDING" } }),
        ]);
        const activity = [
            ...recentApps.map((a) => ({
                at: a.createdAt.toISOString(),
                label: `Application: ${a.company} (${a.status})`,
                href: "/staff/applications",
            })),
            ...recentMembers.map((m) => ({
                at: m.updatedAt.toISOString(),
                label: `Member updated: ${m.name}`,
                href: `/staff/members/${m.id}`,
            })),
            ...recentGuides.map((g) => ({
                at: g.updatedAt.toISOString(),
                label: `Article updated: ${g.title}`,
                href: `/staff/guides/${g.id}`,
            })),
        ]
            .sort((x, y) => (x.at < y.at ? 1 : -1))
            .slice(0, 15);
        let revenueMtdCents = settings.revenueMtdCents;
        let outstandingCents = settings.outstandingCents;
        let financialSource = "fallback";
        let financialError = null;
        const stripe = await getStripeClient();
        if (stripe) {
            const snap = await fetchStripeFinancialSnapshot(stripe);
            if (snap.ok) {
                revenueMtdCents = snap.revenueMtdCents;
                outstandingCents = snap.outstandingCents;
                financialSource = "stripe";
            }
            else {
                financialError = snap.error;
            }
        }
        res.json({
            membersTotal,
            membersPortalEnabled: membersPortal,
            guidesTotal,
            applicationsPending,
            revenueMtdCents,
            outstandingCents,
            financialSource,
            financialError,
            inboxUnread,
            reviewsPending,
            activity,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load dashboard" });
    }
});
function publicOrgSettings(s) {
    return {
        ...s,
        stripeSecretKey: null,
        stripeWebhookSecret: null,
        recaptchaSecretKey: null,
        smtpPass: null,
        googleAnalyticsServiceAccountJson: null,
        hasStripeSecret: Boolean(s.stripeSecretKey?.trim()),
        hasStripeWebhookSecret: Boolean(s.stripeWebhookSecret?.trim()),
        hasRecaptchaSecret: Boolean(s.recaptchaSecretKey?.trim()),
        hasSmtpPassword: Boolean(s.smtpPass?.trim()),
        hasGoogleAnalyticsServiceAccount: Boolean(s.googleAnalyticsServiceAccountJson?.trim()),
    };
}
router.get("/stripe-financial", async (_req, res) => {
    try {
        const settings = await ensureOrgSettings();
        const stripe = await getStripeClient();
        if (!stripe) {
            res.json({
                stripeConnected: false,
                revenueMtdCents: settings.revenueMtdCents,
                outstandingCents: settings.outstandingCents,
                paymentCountMtd: 0,
                openInvoiceCount: 0,
                currency: "gbp",
                fetchedAt: null,
                error: "Add your Stripe secret key in Integrations (or STRIPE_SECRET_KEY in .env).",
            });
            return;
        }
        const snap = await fetchStripeFinancialSnapshot(stripe);
        if (!snap.ok) {
            res.json({
                stripeConnected: true,
                revenueMtdCents: settings.revenueMtdCents,
                outstandingCents: settings.outstandingCents,
                paymentCountMtd: 0,
                openInvoiceCount: 0,
                currency: "gbp",
                fetchedAt: null,
                error: snap.error,
                usedFallback: true,
            });
            return;
        }
        res.json({
            stripeConnected: true,
            revenueMtdCents: snap.revenueMtdCents,
            outstandingCents: snap.outstandingCents,
            paymentCountMtd: snap.paymentCountMtd,
            openInvoiceCount: snap.openInvoiceCount,
            currency: snap.currency,
            fetchedAt: snap.fetchedAt,
            error: null,
            usedFallback: false,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load Stripe financials" });
    }
});
router.get("/organization-settings", async (_req, res) => {
    try {
        const s = await ensureOrgSettings();
        res.json({ settings: publicOrgSettings(s) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load settings" });
    }
});
async function patchOrganizationSettings(req, res) {
    try {
        const body = req.body ?? {};
        const workspaceName = typeof body.workspaceName === "string"
            ? body.workspaceName.trim() || null
            : undefined;
        const announcementEmail = typeof body.announcementEmail === "string"
            ? body.announcementEmail.trim() || null
            : undefined;
        const siteDisplayName = typeof body.siteDisplayName === "string"
            ? body.siteDisplayName.trim() || null
            : undefined;
        const publicSiteUrl = typeof body.publicSiteUrl === "string"
            ? body.publicSiteUrl.trim().replace(/\/$/, "") || null
            : undefined;
        const adminNotifyEmails = typeof body.adminNotifyEmails === "string"
            ? body.adminNotifyEmails.trim() || null
            : undefined;
        const smtpHost = typeof body.smtpHost === "string"
            ? body.smtpHost.trim() || null
            : undefined;
        let smtpPort = undefined;
        if (Object.prototype.hasOwnProperty.call(body, "smtpPort")) {
            const raw = body.smtpPort;
            if (raw === null || raw === "") {
                smtpPort = null;
            }
            else if (typeof raw === "number" && Number.isFinite(raw)) {
                smtpPort = Math.floor(raw);
            }
            else if (typeof raw === "string") {
                const t = raw.trim();
                if (t === "")
                    smtpPort = null;
                else {
                    const n = Math.floor(Number(t));
                    smtpPort = Number.isFinite(n) ? n : null;
                }
            }
        }
        const smtpSecure = typeof body.smtpSecure === "boolean" ? body.smtpSecure : undefined;
        const smtpUser = typeof body.smtpUser === "string"
            ? body.smtpUser.trim() || null
            : undefined;
        const mailFrom = typeof body.mailFrom === "string"
            ? body.mailFrom.trim() || null
            : undefined;
        const smtpPassRaw = body.smtpPass;
        const smtpPass = typeof smtpPassRaw === "string" && smtpPassRaw.trim()
            ? smtpPassRaw.trim()
            : undefined;
        const clearSmtpPassword = body.clearSmtpPassword === true;
        const billingEnabled = typeof body.billingEnabled === "boolean"
            ? body.billingEnabled
            : undefined;
        const stripePublishableKey = typeof body.stripePublishableKey === "string"
            ? body.stripePublishableKey.trim() || null
            : undefined;
        const checkoutMembershipName = typeof body.checkoutMembershipName === "string"
            ? body.checkoutMembershipName.trim() || null
            : undefined;
        const checkoutFastTrackName = typeof body.checkoutFastTrackName === "string"
            ? body.checkoutFastTrackName.trim() || null
            : undefined;
        const checkoutMembershipPence = typeof body.checkoutMembershipPence === "number" &&
            Number.isFinite(body.checkoutMembershipPence)
            ? Math.floor(body.checkoutMembershipPence)
            : undefined;
        const checkoutFastTrackPence = typeof body.checkoutFastTrackPence === "number" &&
            Number.isFinite(body.checkoutFastTrackPence)
            ? Math.floor(body.checkoutFastTrackPence)
            : undefined;
        const stripeSecretKey = typeof body.stripeSecretKey === "string"
            ? body.stripeSecretKey.trim() || null
            : undefined;
        const stripeWebhookSecret = typeof body.stripeWebhookSecret === "string"
            ? body.stripeWebhookSecret.trim() || null
            : undefined;
        const recaptchaEnabled = typeof body.recaptchaEnabled === "boolean"
            ? body.recaptchaEnabled
            : undefined;
        const recaptchaSiteKey = typeof body.recaptchaSiteKey === "string"
            ? body.recaptchaSiteKey.trim() || null
            : undefined;
        const recaptchaSecretKey = typeof body.recaptchaSecretKey === "string"
            ? body.recaptchaSecretKey.trim() || null
            : undefined;
        const staffRequire2fa = typeof body.staffRequire2fa === "boolean"
            ? body.staffRequire2fa
            : undefined;
        const invoiceLegalName = typeof body.invoiceLegalName === "string"
            ? body.invoiceLegalName.trim() || null
            : undefined;
        const invoiceVatNumber = typeof body.invoiceVatNumber === "string"
            ? body.invoiceVatNumber.trim() || null
            : undefined;
        const invoiceAddress = typeof body.invoiceAddress === "string"
            ? body.invoiceAddress.trim() || null
            : undefined;
        const invoiceFooterNote = typeof body.invoiceFooterNote === "string"
            ? body.invoiceFooterNote.trim() || null
            : undefined;
        let googleAnalyticsMeasurementId = undefined;
        if (Object.prototype.hasOwnProperty.call(body, "googleAnalyticsMeasurementId")) {
            const raw = body.googleAnalyticsMeasurementId;
            if (raw === null || raw === "") {
                googleAnalyticsMeasurementId = null;
            }
            else if (typeof raw === "string") {
                const t = raw.replace(/\s/g, "").trim();
                if (!t) {
                    googleAnalyticsMeasurementId = null;
                }
                else if (/^G-[A-Z0-9]+$/i.test(t)) {
                    googleAnalyticsMeasurementId = t.toUpperCase();
                }
                else {
                    res.status(400).json({
                        error: "Invalid Google Analytics Measurement ID. Use your GA4 ID (format G-XXXXXXXXXX).",
                    });
                    return;
                }
            }
        }
        let googleAnalyticsPropertyId = undefined;
        if (Object.prototype.hasOwnProperty.call(body, "googleAnalyticsPropertyId")) {
            const raw = body.googleAnalyticsPropertyId;
            if (raw === null || raw === "") {
                googleAnalyticsPropertyId = null;
            }
            else if (typeof raw === "string") {
                const t = raw.replace(/\s/g, "");
                if (!t) {
                    googleAnalyticsPropertyId = null;
                }
                else if (/^\d{5,12}$/.test(t)) {
                    googleAnalyticsPropertyId = t;
                }
                else {
                    res.status(400).json({
                        error: "GA4 Property ID must be numeric only (find it under GA4 → Admin → Property settings).",
                    });
                    return;
                }
            }
        }
        let googleAnalyticsServiceAccountJson = undefined;
        if (Object.prototype.hasOwnProperty.call(body, "googleAnalyticsServiceAccountJson")) {
            const raw = body.googleAnalyticsServiceAccountJson;
            if (raw === null || raw === "") {
                googleAnalyticsServiceAccountJson = null;
            }
            else if (typeof raw === "string") {
                const t = raw.trim();
                if (!t) {
                    googleAnalyticsServiceAccountJson = null;
                }
                else {
                    try {
                        const o = JSON.parse(t);
                        if (typeof o.private_key !== "string" ||
                            typeof o.client_email !== "string") {
                            res.status(400).json({
                                error: "Service account JSON must include client_email and private_key (paste the full file from Google Cloud).",
                            });
                            return;
                        }
                        googleAnalyticsServiceAccountJson = t;
                    }
                    catch {
                        res.status(400).json({
                            error: "Service account JSON is not valid JSON.",
                        });
                        return;
                    }
                }
            }
        }
        const secretPatch = {};
        if (stripeSecretKey !== undefined) {
            secretPatch.stripeSecretKey = stripeSecretKey;
        }
        if (stripeWebhookSecret !== undefined) {
            secretPatch.stripeWebhookSecret = stripeWebhookSecret;
        }
        if (recaptchaSecretKey !== undefined) {
            secretPatch.recaptchaSecretKey = recaptchaSecretKey;
        }
        if (clearSmtpPassword) {
            secretPatch.smtpPass = null;
        }
        else if (smtpPass !== undefined) {
            secretPatch.smtpPass = smtpPass;
        }
        const s = await prisma.organizationSettings.upsert({
            where: { id: "default" },
            create: {
                id: "default",
                ...(workspaceName !== undefined ? { workspaceName } : {}),
                ...(siteDisplayName !== undefined ? { siteDisplayName } : {}),
                ...(publicSiteUrl !== undefined ? { publicSiteUrl } : {}),
                ...(announcementEmail !== undefined ? { announcementEmail } : {}),
                ...(adminNotifyEmails !== undefined ? { adminNotifyEmails } : {}),
                ...(smtpHost !== undefined ? { smtpHost } : {}),
                ...(smtpPort !== undefined ? { smtpPort } : {}),
                ...(smtpSecure !== undefined ? { smtpSecure } : {}),
                ...(smtpUser !== undefined ? { smtpUser } : {}),
                ...(mailFrom !== undefined ? { mailFrom } : {}),
                ...(billingEnabled !== undefined ? { billingEnabled } : {}),
                ...(stripePublishableKey !== undefined
                    ? { stripePublishableKey }
                    : {}),
                ...(checkoutMembershipName !== undefined
                    ? { checkoutMembershipName }
                    : {}),
                ...(checkoutFastTrackName !== undefined
                    ? { checkoutFastTrackName }
                    : {}),
                ...(checkoutMembershipPence !== undefined
                    ? { checkoutMembershipPence }
                    : {}),
                ...(checkoutFastTrackPence !== undefined
                    ? { checkoutFastTrackPence }
                    : {}),
                ...secretPatch,
                ...(recaptchaEnabled !== undefined ? { recaptchaEnabled } : {}),
                ...(recaptchaSiteKey !== undefined ? { recaptchaSiteKey } : {}),
                ...(staffRequire2fa !== undefined ? { staffRequire2fa } : {}),
                ...(invoiceLegalName !== undefined ? { invoiceLegalName } : {}),
                ...(invoiceVatNumber !== undefined ? { invoiceVatNumber } : {}),
                ...(invoiceAddress !== undefined ? { invoiceAddress } : {}),
                ...(invoiceFooterNote !== undefined ? { invoiceFooterNote } : {}),
                ...(googleAnalyticsMeasurementId !== undefined
                    ? { googleAnalyticsMeasurementId }
                    : {}),
                ...(googleAnalyticsPropertyId !== undefined
                    ? { googleAnalyticsPropertyId }
                    : {}),
                ...(googleAnalyticsServiceAccountJson !== undefined
                    ? { googleAnalyticsServiceAccountJson }
                    : {}),
            },
            update: {
                ...(workspaceName !== undefined ? { workspaceName } : {}),
                ...(siteDisplayName !== undefined ? { siteDisplayName } : {}),
                ...(publicSiteUrl !== undefined ? { publicSiteUrl } : {}),
                ...(announcementEmail !== undefined ? { announcementEmail } : {}),
                ...(adminNotifyEmails !== undefined ? { adminNotifyEmails } : {}),
                ...(smtpHost !== undefined ? { smtpHost } : {}),
                ...(smtpPort !== undefined ? { smtpPort } : {}),
                ...(smtpSecure !== undefined ? { smtpSecure } : {}),
                ...(smtpUser !== undefined ? { smtpUser } : {}),
                ...(mailFrom !== undefined ? { mailFrom } : {}),
                ...(billingEnabled !== undefined ? { billingEnabled } : {}),
                ...(stripePublishableKey !== undefined
                    ? { stripePublishableKey }
                    : {}),
                ...(checkoutMembershipName !== undefined
                    ? { checkoutMembershipName }
                    : {}),
                ...(checkoutFastTrackName !== undefined
                    ? { checkoutFastTrackName }
                    : {}),
                ...(checkoutMembershipPence !== undefined
                    ? { checkoutMembershipPence }
                    : {}),
                ...(checkoutFastTrackPence !== undefined
                    ? { checkoutFastTrackPence }
                    : {}),
                ...secretPatch,
                ...(recaptchaEnabled !== undefined ? { recaptchaEnabled } : {}),
                ...(recaptchaSiteKey !== undefined ? { recaptchaSiteKey } : {}),
                ...(staffRequire2fa !== undefined ? { staffRequire2fa } : {}),
                ...(invoiceLegalName !== undefined ? { invoiceLegalName } : {}),
                ...(invoiceVatNumber !== undefined ? { invoiceVatNumber } : {}),
                ...(invoiceAddress !== undefined ? { invoiceAddress } : {}),
                ...(invoiceFooterNote !== undefined ? { invoiceFooterNote } : {}),
                ...(googleAnalyticsMeasurementId !== undefined
                    ? { googleAnalyticsMeasurementId }
                    : {}),
                ...(googleAnalyticsPropertyId !== undefined
                    ? { googleAnalyticsPropertyId }
                    : {}),
                ...(googleAnalyticsServiceAccountJson !== undefined
                    ? { googleAnalyticsServiceAccountJson }
                    : {}),
            },
        });
        invalidateSmtpTransportCache();
        res.json({ settings: publicOrgSettings(s) });
    }
    catch (e) {
        console.error(e);
        const detail = e instanceof Error ? e.message : String(e);
        res.status(500).json({
            error: "Could not save settings",
            detail,
        });
    }
}
router.post("/organization-branding/logo", (req, res, next) => {
    orgLogoUpload.single("logo")(req, res, (err) => {
        if (err) {
            res.status(400).json({
                error: err instanceof Error ? err.message : "Upload failed",
            });
            return;
        }
        next();
    });
}, async (_req, res) => {
    try {
        const file = _req.file;
        if (!file) {
            res.status(400).json({ error: "logo file is required (field name: logo)" });
            return;
        }
        const s = await ensureOrgSettings();
        if (s.brandingLogoStoredName) {
            const oldPath = orgBrandingFilePath(s.brandingLogoStoredName);
            fs.unlink(oldPath, () => { });
        }
        const storedName = path.basename(file.filename);
        const sync = await syncLogoFileToStripeAccount(file.path);
        let stripeFileId = null;
        let stripeError = null;
        if (sync.ok) {
            stripeFileId = sync.fileId;
        }
        else {
            stripeError = sync.error;
        }
        const updated = await prisma.organizationSettings.update({
            where: { id: "default" },
            data: {
                brandingLogoStoredName: storedName,
                stripeBrandingLogoFileId: stripeFileId,
            },
        });
        res.json({
            settings: publicOrgSettings(updated),
            stripeSync: stripeFileId
                ? { ok: true, fileId: stripeFileId }
                : { ok: false, error: stripeError },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save logo" });
    }
});
router.delete("/organization-branding/logo", async (_req, res) => {
    try {
        const s = await ensureOrgSettings();
        if (s.brandingLogoStoredName) {
            const p = orgBrandingFilePath(s.brandingLogoStoredName);
            fs.unlink(p, () => { });
        }
        const updated = await prisma.organizationSettings.update({
            where: { id: "default" },
            data: {
                brandingLogoStoredName: null,
                stripeBrandingLogoFileId: null,
            },
        });
        res.json({ settings: publicOrgSettings(updated) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not remove logo" });
    }
});
router.post("/organization-branding/sync-stripe", async (_req, res) => {
    try {
        const s = await ensureOrgSettings();
        if (!s.brandingLogoStoredName) {
            res.status(400).json({ error: "Upload a logo first" });
            return;
        }
        const abs = orgBrandingFilePath(s.brandingLogoStoredName);
        if (!fs.existsSync(abs)) {
            res.status(400).json({ error: "Logo file missing on disk — upload again" });
            return;
        }
        const sync = await syncLogoFileToStripeAccount(abs);
        if (!sync.ok) {
            res.status(400).json({ error: sync.error });
            return;
        }
        const updated = await prisma.organizationSettings.update({
            where: { id: "default" },
            data: { stripeBrandingLogoFileId: sync.fileId },
        });
        res.json({
            settings: publicOrgSettings(updated),
            stripeSync: { ok: true, fileId: sync.fileId },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Stripe sync failed" });
    }
});
router.patch("/organization-settings", patchOrganizationSettings);
/** POST alias: some reverse proxies/WAFs block PATCH; same body as PATCH. */
router.post("/organization-settings", patchOrganizationSettings);
/** Prefer this URL in the app: avoids proxies that return 406 on POST to the same path as GET. */
router.post("/organization-settings/save", patchOrganizationSettings);
router.get("/analytics-summary", async (_req, res) => {
    try {
        const byTrade = await prisma.member.groupBy({
            by: ["trade"],
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
        });
        const [membersTotal, guidesTotal, applicationsByStatus] = await Promise.all([
            prisma.member.count(),
            prisma.guide.count(),
            prisma.application.groupBy({
                by: ["status"],
                _count: { id: true },
            }),
        ]);
        const org = await ensureOrgSettings();
        res.json({
            membersTotal,
            guidesTotal,
            membersByTrade: byTrade.map((r) => ({
                trade: r.trade,
                count: r._count.id,
            })),
            applicationsByStatus: applicationsByStatus.map((r) => ({
                status: r.status,
                count: r._count.id,
            })),
            googleAnalyticsMeasurementId: org.googleAnalyticsMeasurementId?.trim() || null,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load analytics" });
    }
});
/** GA4 Data API — env and/or Integrations (DB) credentials. */
router.get("/analytics-ga-report", async (_req, res) => {
    try {
        const org = await ensureOrgSettings();
        const report = await fetchGa4OverviewReport(org);
        res.json(report);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({
            error: "Could not load Google Analytics report",
            detail: e instanceof Error ? e.message : String(e),
        });
    }
});
router.get("/system-info", async (_req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL ?? "";
        const masked = dbUrl.replace(/:([^:@/]+)@/, ":****@");
        res.json({
            nodeVersion: process.version,
            uptimeSeconds: Math.floor((Date.now() - serverStartedAt) / 1000),
            databaseUrlHint: masked,
            env: process.env.NODE_ENV ?? "development",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load system info" });
    }
});
/** Staff accounts (team) */
router.get("/staff-accounts", async (_req, res) => {
    try {
        const rows = await prisma.staff.findMany({
            orderBy: { email: "asc" },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        res.json({
            staff: rows.map((s) => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list staff" });
    }
});
router.post("/staff-accounts", async (req, res) => {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        const password = String(req.body?.password ?? "");
        const name = String(req.body?.name ?? "").trim() || null;
        if (!email || !password || password.length < 8) {
            res.status(400).json({
                error: "Email and password (min 8 characters) are required",
            });
            return;
        }
        const hash = await bcrypt.hash(password, 12);
        const s = await prisma.staff.create({
            data: { email, password: hash, name },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        res.status(201).json({
            staff: { ...s, createdAt: s.createdAt.toISOString() },
        });
    }
    catch (e) {
        console.error(e);
        const dup = typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "P2002";
        res.status(400).json({ error: dup ? "Email already in use" : "Could not create staff" });
    }
});
router.delete("/staff-accounts/:id", async (req, res) => {
    try {
        const myId = req.staffId;
        if (req.params.id === myId) {
            res.status(400).json({ error: "You cannot delete your own account" });
            return;
        }
        const count = await prisma.staff.count();
        if (count <= 1) {
            res.status(400).json({ error: "Cannot remove the last staff account" });
            return;
        }
        await prisma.staff.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete staff" });
    }
});
/** Applications */
function serializeAdminApplication(a) {
    const { documents, createdMember, notes, vettingChecklist, approvedAt, createdAt, updatedAt, fastTrackPaidAt, manualMembershipExpiresAt: _manualMExp, vettingState, pendingPortalPassword: _pendingPw, pendingPortalPasswordExpires: _pendingPwExp, ...rest } = a;
    return {
        ...rest,
        notes: sanitizeNullableDbString(notes),
        vettingChecklist: sanitizeNullableDbString(vettingChecklist),
        vettingState: mergeVettingStateFromDb(vettingState),
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        approvedAt: approvedAt?.toISOString() ?? null,
        fastTrackPaidAt: fastTrackPaidAt?.toISOString() ?? null,
        manualMembershipExpiresAt: a.manualMembershipExpiresAt?.toISOString() ?? null,
        createdMember: createdMember
            ? {
                id: createdMember.id,
                slug: createdMember.slug,
                tvId: createdMember.tvId,
                membershipBillingType: createdMember.membershipBillingType ?? null,
                membershipExpiresAt: createdMember.membershipExpiresAt?.toISOString() ?? null,
                stripeSubscriptionStatus: createdMember.stripeSubscriptionStatus ?? null,
            }
            : null,
        documents: documents.map((d) => ({
            id: d.id,
            originalName: d.originalName,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            createdAt: d.createdAt.toISOString(),
        })),
    };
}
router.get("/applications", async (_req, res) => {
    try {
        const rows = await prisma.application.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                documents: { orderBy: { createdAt: "desc" } },
                createdMember: {
                    select: {
                        id: true,
                        slug: true,
                        tvId: true,
                        membershipBillingType: true,
                        membershipExpiresAt: true,
                        stripeSubscriptionStatus: true,
                    },
                },
            },
        });
        res.json({
            applications: rows.map((a) => serializeAdminApplication(a)),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list applications" });
    }
});
router.patch("/applications/:id", async (req, res) => {
    try {
        const before = await prisma.application.findUnique({
            where: { id: req.params.id },
        });
        if (!before) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const { status, notes } = req.body ?? {};
        const allowed = [
            "PENDING",
            "REVIEWING",
            "CONTACTED",
            "APPROVED",
            "DECLINED",
        ];
        const { vettingChecklist, vettingState: vettingStateBody } = req.body ?? {};
        const data = {};
        if (status !== undefined) {
            const s = String(status);
            if (!allowed.includes(s)) {
                res.status(400).json({ error: "Invalid status" });
                return;
            }
            data.status = s;
        }
        if (notes !== undefined) {
            data.notes = String(notes).trim() || null;
        }
        if (vettingChecklist !== undefined) {
            data.vettingChecklist = String(vettingChecklist).trim() || null;
        }
        if (vettingStateBody !== undefined) {
            data.vettingState = vettingStateToPrismaJson(mergeVettingStateFromInput(vettingStateBody));
        }
        const transitioningToApproved = data.status === "APPROVED" && before.status !== "APPROVED";
        const transitioningFromApproved = data.status !== undefined &&
            data.status !== "APPROVED" &&
            before.status === "APPROVED";
        if (transitioningToApproved) {
            data.approvedAt = new Date();
        }
        if (transitioningFromApproved) {
            data.approvedAt = null;
        }
        if (transitioningToApproved && !before.createdMemberId) {
            const taken = await prisma.member.findFirst({
                where: { loginEmail: before.email.trim().toLowerCase() },
                select: { id: true },
            });
            if (taken) {
                res.status(400).json({
                    error: "This work email already has a member portal login. Free or change that account first, then approve.",
                });
                return;
            }
        }
        await prisma.application.update({
            where: { id: req.params.id },
            data,
        });
        const full = await prisma.application.findUnique({
            where: { id: req.params.id },
            include: {
                documents: { orderBy: { createdAt: "desc" } },
                createdMember: {
                    select: {
                        id: true,
                        slug: true,
                        tvId: true,
                        membershipBillingType: true,
                        membershipExpiresAt: true,
                        stripeSubscriptionStatus: true,
                    },
                },
            },
        });
        if (!full) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (data.status !== undefined &&
            before.status !== data.status &&
            (data.status === "APPROVED" || data.status === "DECLINED")) {
            notifyApplicationDecision(prisma, {
                id: full.id,
                company: full.company,
                trade: full.trade,
                email: full.email,
                status: full.status,
            });
        }
        res.json({
            application: serializeAdminApplication(full),
            memberProvisioned: null,
        });
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
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "NOT_FOUND") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(400).json({ error: "Could not update application" });
    }
});
/** Retry member creation after Stripe (or if webhook failed). Requires APPROVED + recorded payment. */
router.post("/applications/:id/provision-member", async (req, res) => {
    try {
        const id = req.params.id;
        const before = await prisma.application.findUnique({ where: { id } });
        if (!before) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (before.status !== "APPROVED") {
            res.status(400).json({ error: "Application must be approved first" });
            return;
        }
        if (!before.fastTrackPaidAt && !before.membershipSubscribed) {
            res.status(400).json({
                error: "No payment is recorded yet. The listing is created when the applicant completes checkout, or retry here after Stripe confirms payment.",
            });
            return;
        }
        const prov = await tryProvisionMemberForApplication(prisma, id);
        if (prov.kind === "email_in_use") {
            res.status(400).json({
                error: `The email ${prov.email} is already used for a member portal.`,
            });
            return;
        }
        if (prov.kind === "not_approved") {
            res.status(400).json({ error: "Application is not approved" });
            return;
        }
        let memberProvisioned = null;
        if (prov.kind === "created") {
            memberProvisioned = {
                temporaryPassword: prov.temporaryPassword,
                member: prov.member,
            };
        }
        else if (prov.kind === "already_linked") {
            memberProvisioned = {
                member: prov.member,
                alreadyProvisioned: true,
            };
        }
        const full = await prisma.application.findUnique({
            where: { id },
            include: {
                documents: { orderBy: { createdAt: "desc" } },
                createdMember: {
                    select: {
                        id: true,
                        slug: true,
                        tvId: true,
                        membershipBillingType: true,
                        membershipExpiresAt: true,
                        stripeSubscriptionStatus: true,
                    },
                },
            },
        });
        res.json({
            memberProvisioned,
            application: full ? serializeAdminApplication(full) : undefined,
        });
    }
    catch (e) {
        console.error(e);
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "NOT_FOUND") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(500).json({ error: "Could not create member profile" });
    }
});
/**
 * Record payment received outside Stripe (bank transfer, cash, phone, etc.).
 * Same outcome as a successful Checkout webhook: flags + provision when eligible.
 */
router.post("/applications/:id/record-manual-payment", async (req, res) => {
    try {
        const id = req.params.id;
        const type = String(req.body?.type ?? "").trim();
        if (type !== "fast_track" && type !== "membership") {
            res
                .status(400)
                .json({ error: "type must be fast_track or membership" });
            return;
        }
        const before = await prisma.application.findUnique({ where: { id } });
        if (!before) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (before.status !== "APPROVED") {
            res.status(400).json({ error: "Application must be approved first" });
            return;
        }
        if (type === "fast_track") {
            if (before.fastTrackPaidAt) {
                res.status(400).json({ error: "Fast-track payment is already recorded" });
                return;
            }
            await prisma.application.update({
                where: { id },
                data: { fastTrackPaidAt: new Date() },
            });
        }
        else {
            const exp = parseManualMembershipExpiryInput(req.body?.membershipExpiresAt);
            if (!before.membershipSubscribed) {
                if (!exp) {
                    res.status(400).json({
                        error: "membershipExpiresAt is required for manual membership (YYYY-MM-DD or ISO date)",
                    });
                    return;
                }
                await prisma.application.update({
                    where: { id },
                    data: {
                        membershipSubscribed: true,
                        manualMembershipExpiresAt: exp,
                    },
                });
            }
            else {
                if (!exp) {
                    res.status(400).json({
                        error: "membershipExpiresAt is required to update manual membership expiry",
                    });
                    return;
                }
                if (before.manualMembershipExpiresAt == null) {
                    res.status(400).json({
                        error: "This membership was recorded via Stripe. Manage renewal in Stripe or have the member subscribe from the portal.",
                    });
                    return;
                }
                const memberRow = before.createdMemberId
                    ? await prisma.member.findUnique({
                        where: { id: before.createdMemberId },
                        select: { id: true, membershipBillingType: true },
                    })
                    : null;
                if (memberRow?.membershipBillingType === "stripe") {
                    res.status(400).json({
                        error: "This member is on Stripe billing; dates sync from the subscription.",
                    });
                    return;
                }
                await prisma.application.update({
                    where: { id },
                    data: { manualMembershipExpiresAt: exp },
                });
                if (memberRow) {
                    await prisma.member.update({
                        where: { id: memberRow.id },
                        data: {
                            membershipBillingType: "manual",
                            membershipExpiresAt: exp,
                        },
                    });
                }
            }
        }
        const prov = await tryProvisionMemberForApplication(prisma, id);
        if (prov.kind === "email_in_use") {
            res.status(400).json({
                error: `The email ${prov.email} is already used for a member portal.`,
            });
            return;
        }
        if (prov.kind === "not_approved") {
            res.status(400).json({ error: "Application is not approved" });
            return;
        }
        let memberProvisioned = null;
        if (prov.kind === "created") {
            memberProvisioned = {
                temporaryPassword: prov.temporaryPassword,
                member: prov.member,
            };
        }
        else if (prov.kind === "already_linked") {
            memberProvisioned = {
                member: prov.member,
                alreadyProvisioned: true,
            };
        }
        const full = await prisma.application.findUnique({
            where: { id },
            include: {
                documents: { orderBy: { createdAt: "desc" } },
                createdMember: {
                    select: {
                        id: true,
                        slug: true,
                        tvId: true,
                        membershipBillingType: true,
                        membershipExpiresAt: true,
                        stripeSubscriptionStatus: true,
                    },
                },
            },
        });
        res.json({
            memberProvisioned,
            application: full ? serializeAdminApplication(full) : undefined,
        });
    }
    catch (e) {
        console.error(e);
        if (typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "NOT_FOUND") {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(500).json({ error: "Could not record manual payment" });
    }
});
router.get("/applications/:applicationId/documents/:documentId/file", async (req, res) => {
    try {
        const doc = await prisma.applicationDocument.findFirst({
            where: {
                id: req.params.documentId,
                applicationId: req.params.applicationId,
            },
        });
        if (!doc) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const resolved = applicationDocumentResolvedPath(doc.applicationId, doc.storedName);
        if (!resolved || !fs.existsSync(resolved)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName).replace(/'/g, "%27")}"`);
        res.type(doc.mimeType);
        res.sendFile(resolved);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load file" });
    }
});
/** Leads */
router.get("/leads", async (_req, res) => {
    try {
        const rows = await prisma.lead.findMany({
            where: {
                /** Hide per-trade copies of posted jobs — staff sees the aggregate row only. */
                NOT: { AND: [{ source: "job_post" }, { memberId: { not: null } }] },
            },
            orderBy: { createdAt: "desc" },
            include: {
                member: { select: { id: true, name: true, tvId: true, slug: true } },
            },
        });
        res.json({
            leads: rows.map((l) => ({
                ...l,
                member: l.member,
                createdAt: l.createdAt.toISOString(),
                updatedAt: l.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list leads" });
    }
});
router.post("/leads", async (req, res) => {
    try {
        const { name, email, phone, source, status, notes, jobTitle, jobDescription, jobPostcode, } = req.body ?? {};
        if (!name || !String(name).trim()) {
            res.status(400).json({ error: "Name is required" });
            return;
        }
        const l = await prisma.lead.create({
            data: {
                name: String(name).trim(),
                email: email ? String(email).trim() : null,
                phone: phone ? String(phone).trim() : null,
                source: source ? String(source).trim() : "manual",
                status: status ? String(status).trim() : "NEW",
                notes: notes ? String(notes).trim() : null,
                jobTitle: jobTitle ? String(jobTitle).trim() : null,
                jobDescription: jobDescription ? String(jobDescription).trim() : null,
                jobPostcode: jobPostcode ? String(jobPostcode).trim() : null,
            },
        });
        notifyNewLead(prisma, {
            id: l.id,
            name: l.name,
            source: l.source,
            email: l.email,
            phone: l.phone,
            notes: l.notes,
            jobTitle: l.jobTitle,
            jobPostcode: l.jobPostcode,
        });
        res.status(201).json({
            lead: {
                ...l,
                createdAt: l.createdAt.toISOString(),
                updatedAt: l.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: "Could not create lead" });
    }
});
router.put("/leads/:id", async (req, res) => {
    try {
        const { name, email, phone, source, status, notes, jobTitle, jobDescription, jobPostcode, } = req.body ?? {};
        if (!name || !String(name).trim()) {
            res.status(400).json({ error: "Name is required" });
            return;
        }
        const l = await prisma.lead.update({
            where: { id: req.params.id },
            data: {
                name: String(name).trim(),
                email: email !== undefined ? String(email || "").trim() || null : undefined,
                phone: phone !== undefined ? String(phone || "").trim() || null : undefined,
                source: source !== undefined ? String(source || "").trim() : undefined,
                status: status !== undefined ? String(status || "").trim() : undefined,
                notes: notes !== undefined ? String(notes || "").trim() || null : undefined,
                jobTitle: jobTitle !== undefined
                    ? String(jobTitle || "").trim() || null
                    : undefined,
                jobDescription: jobDescription !== undefined
                    ? String(jobDescription || "").trim() || null
                    : undefined,
                jobPostcode: jobPostcode !== undefined
                    ? String(jobPostcode || "").trim() || null
                    : undefined,
            },
        });
        res.json({
            lead: {
                ...l,
                createdAt: l.createdAt.toISOString(),
                updatedAt: l.updatedAt.toISOString(),
            },
        });
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
        res.status(400).json({ error: "Could not update lead" });
    }
});
async function deleteLeadById(req, res) {
    try {
        await prisma.lead.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete lead" });
    }
}
router.delete("/leads/:id", async (req, res) => {
    await deleteLeadById(req, res);
});
/** POST fallback — some proxies/clients block DELETE reliably */
router.post("/leads/:id/delete", async (req, res) => {
    await deleteLeadById(req, res);
});
/** Inbox */
router.get("/inbox", async (_req, res) => {
    try {
        const rows = await prisma.inboxMessage.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json({
            messages: rows.map((m) => ({
                ...m,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load inbox" });
    }
});
router.post("/inbox", async (req, res) => {
    try {
        const { subject, body, fromEmail, fromName } = req.body ?? {};
        if (!subject || !body || !String(subject).trim() || !String(body).trim()) {
            res.status(400).json({ error: "Subject and body are required" });
            return;
        }
        const m = await prisma.inboxMessage.create({
            data: {
                subject: String(subject).trim(),
                body: String(body).trim(),
                fromEmail: fromEmail ? String(fromEmail).trim() : null,
                fromName: fromName ? String(fromName).trim() : null,
            },
        });
        res.status(201).json({
            message: {
                ...m,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: "Could not create message" });
    }
});
router.patch("/inbox/:id", async (req, res) => {
    try {
        const { read } = req.body ?? {};
        const data = {};
        if (typeof read === "boolean")
            data.read = read;
        const m = await prisma.inboxMessage.update({
            where: { id: req.params.id },
            data,
        });
        res.json({
            message: {
                ...m,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            },
        });
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
        res.status(400).json({ error: "Could not update message" });
    }
});
router.delete("/inbox/:id", async (req, res) => {
    try {
        await prisma.inboxMessage.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete message" });
    }
});
/** AI prompts */
router.get("/ai-prompts", async (_req, res) => {
    try {
        const rows = await prisma.aiPrompt.findMany({ orderBy: { updatedAt: "desc" } });
        res.json({
            prompts: rows.map((p) => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list prompts" });
    }
});
router.post("/ai-prompts", async (req, res) => {
    try {
        const { title, content } = req.body ?? {};
        if (!title || !content || !String(title).trim() || !String(content).trim()) {
            res.status(400).json({ error: "Title and content are required" });
            return;
        }
        const p = await prisma.aiPrompt.create({
            data: {
                title: String(title).trim(),
                content: String(content).trim(),
            },
        });
        res.status(201).json({
            prompt: {
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: "Could not create prompt" });
    }
});
router.put("/ai-prompts/:id", async (req, res) => {
    try {
        const { title, content } = req.body ?? {};
        if (!title || !content || !String(title).trim() || !String(content).trim()) {
            res.status(400).json({ error: "Title and content are required" });
            return;
        }
        const p = await prisma.aiPrompt.update({
            where: { id: req.params.id },
            data: {
                title: String(title).trim(),
                content: String(content).trim(),
            },
        });
        res.json({
            prompt: {
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            },
        });
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
        res.status(400).json({ error: "Could not update prompt" });
    }
});
router.delete("/ai-prompts/:id", async (req, res) => {
    try {
        await prisma.aiPrompt.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete prompt" });
    }
});
/** Planner */
router.get("/planner-events", async (_req, res) => {
    try {
        const rows = await prisma.plannerEvent.findMany({
            orderBy: { eventDate: "asc" },
        });
        res.json({
            events: rows.map((ev) => ({
                ...ev,
                eventDate: ev.eventDate.toISOString(),
                createdAt: ev.createdAt.toISOString(),
                updatedAt: ev.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list events" });
    }
});
router.post("/planner-events", async (req, res) => {
    try {
        const { title, eventDate, notes } = req.body ?? {};
        if (!title || !eventDate || !String(title).trim()) {
            res.status(400).json({ error: "Title and eventDate are required" });
            return;
        }
        const d = new Date(String(eventDate));
        if (Number.isNaN(d.getTime())) {
            res.status(400).json({ error: "Invalid eventDate" });
            return;
        }
        const ev = await prisma.plannerEvent.create({
            data: {
                title: String(title).trim(),
                eventDate: d,
                notes: notes ? String(notes).trim() : null,
            },
        });
        res.status(201).json({
            event: {
                ...ev,
                eventDate: ev.eventDate.toISOString(),
                createdAt: ev.createdAt.toISOString(),
                updatedAt: ev.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: "Could not create event" });
    }
});
router.put("/planner-events/:id", async (req, res) => {
    try {
        const { title, eventDate, notes } = req.body ?? {};
        if (!title || !eventDate || !String(title).trim()) {
            res.status(400).json({ error: "Title and eventDate are required" });
            return;
        }
        const d = new Date(String(eventDate));
        if (Number.isNaN(d.getTime())) {
            res.status(400).json({ error: "Invalid eventDate" });
            return;
        }
        const ev = await prisma.plannerEvent.update({
            where: { id: req.params.id },
            data: {
                title: String(title).trim(),
                eventDate: d,
                notes: notes !== undefined ? String(notes || "").trim() || null : undefined,
            },
        });
        res.json({
            event: {
                ...ev,
                eventDate: ev.eventDate.toISOString(),
                createdAt: ev.createdAt.toISOString(),
                updatedAt: ev.updatedAt.toISOString(),
            },
        });
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
        res.status(400).json({ error: "Could not update event" });
    }
});
router.delete("/planner-events/:id", async (req, res) => {
    try {
        await prisma.plannerEvent.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete event" });
    }
});
/** Dispatch */
router.get("/dispatch-tasks", async (_req, res) => {
    try {
        const rows = await prisma.dispatchTask.findMany({
            orderBy: { createdAt: "desc" },
            include: { member: { select: { id: true, name: true, tvId: true } } },
        });
        res.json({
            tasks: rows.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                notes: t.notes,
                memberId: t.memberId,
                scheduledAt: t.scheduledAt?.toISOString() ?? null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
                member: t.member,
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not list tasks" });
    }
});
router.post("/dispatch-tasks", async (req, res) => {
    try {
        const { title, status, notes, memberId, scheduledAt } = req.body ?? {};
        if (!title || !String(title).trim()) {
            res.status(400).json({ error: "Title is required" });
            return;
        }
        let sched = null;
        if (scheduledAt) {
            const d = new Date(String(scheduledAt));
            if (!Number.isNaN(d.getTime()))
                sched = d;
        }
        const t = await prisma.dispatchTask.create({
            data: {
                title: String(title).trim(),
                status: status ? String(status).trim() : "PENDING",
                notes: notes ? String(notes).trim() : null,
                memberId: memberId ? String(memberId) : null,
                scheduledAt: sched,
            },
        });
        res.status(201).json({
            task: {
                ...t,
                scheduledAt: t.scheduledAt?.toISOString() ?? null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: "Could not create task" });
    }
});
router.put("/dispatch-tasks/:id", async (req, res) => {
    try {
        const { title, status, notes, memberId, scheduledAt } = req.body ?? {};
        if (!title || !String(title).trim()) {
            res.status(400).json({ error: "Title is required" });
            return;
        }
        let sched = undefined;
        if (scheduledAt !== undefined) {
            if (!scheduledAt)
                sched = null;
            else {
                const d = new Date(String(scheduledAt));
                sched = Number.isNaN(d.getTime()) ? null : d;
            }
        }
        const t = await prisma.dispatchTask.update({
            where: { id: req.params.id },
            data: {
                title: String(title).trim(),
                status: status !== undefined ? String(status).trim() : undefined,
                notes: notes !== undefined ? String(notes || "").trim() || null : undefined,
                memberId: memberId !== undefined
                    ? memberId
                        ? String(memberId)
                        : null
                    : undefined,
                ...(sched !== undefined ? { scheduledAt: sched } : {}),
            },
        });
        res.json({
            task: {
                ...t,
                scheduledAt: t.scheduledAt?.toISOString() ?? null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            },
        });
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
        res.status(400).json({ error: "Could not update task" });
    }
});
router.delete("/dispatch-tasks/:id", async (req, res) => {
    try {
        await prisma.dispatchTask.delete({ where: { id: req.params.id } });
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
        res.status(500).json({ error: "Could not delete task" });
    }
});
router.get("/members-options", async (_req, res) => {
    try {
        const rows = await prisma.member.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, tvId: true },
        });
        res.json({ members: rows });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load members" });
    }
});
/** Member reviews (moderation) */
router.get("/reviews", async (_req, res) => {
    try {
        const rows = await prisma.memberReview.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            include: {
                member: { select: { id: true, name: true, slug: true, tvId: true } },
            },
        });
        res.json({
            reviews: rows.map((r) => ({
                id: r.id,
                status: r.status,
                rating: r.rating,
                title: r.title,
                body: r.body,
                authorName: r.authorName,
                authorEmail: r.authorEmail,
                createdAt: r.createdAt.toISOString(),
                member: r.member,
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load reviews" });
    }
});
router.patch("/reviews/:id", async (req, res) => {
    try {
        const status = String(req.body?.status ?? "").trim();
        if (status !== "APPROVED" && status !== "REJECTED") {
            res.status(400).json({ error: "status must be APPROVED or REJECTED" });
            return;
        }
        const row = await prisma.memberReview.update({
            where: { id: req.params.id },
            data: { status: status },
            include: {
                member: { select: { id: true, name: true, slug: true, tvId: true } },
            },
        });
        res.json({
            review: {
                id: row.id,
                status: row.status,
                rating: row.rating,
                title: row.title,
                body: row.body,
                authorName: row.authorName,
                authorEmail: row.authorEmail,
                createdAt: row.createdAt.toISOString(),
                member: row.member,
            },
        });
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
        res.status(400).json({ error: "Could not update review" });
    }
});
export default router;

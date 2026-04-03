import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { ALLOWED_APPLICATION_DOC_MIME, MAX_APPLICATION_DOC_BYTES, MAX_APPLICATION_FILES, persistApplicationDocuments, removeApplicationUploadDir, } from "../lib/applicationDocuments.js";
import { billingReady, getOrgBilling, getStripeSecretKey, } from "../lib/billingSettings.js";
import { buildMemberBadgeSvgFromRow, buildTradeVerifyBadgeSvg, } from "../lib/memberBadgeSvg.js";
import { memberProfileLogoFilePath } from "../lib/memberProfileLogoPaths.js";
import { orgBrandingFilePath } from "../lib/orgBrandingPaths.js";
import { findMembersMatchingJobTrade, isValidJobTradeSlug, jobTradeLabelForSlug, JOB_TRADE_CATEGORIES, } from "../lib/jobPostTradeRouting.js";
import { isMemberPublicListingVisible } from "../lib/memberMembership.js";
import { guideToPublic, memberToPublic } from "../lib/memberSerialize.js";
import { verifyRecaptchaV2 } from "../lib/verifyRecaptcha.js";
import { getBrandName, notifyNewApplication, notifyNewLead, publicSiteBase, } from "../lib/adminMail.js";
const router = Router();
router.get("/site-meta", async (_req, res) => {
    try {
        const brandName = await getBrandName(prisma);
        const publicSiteUrl = await publicSiteBase(prisma);
        const row = await prisma.organizationSettings.findUnique({
            where: { id: "default" },
            select: { googleAnalyticsMeasurementId: true },
        });
        const googleAnalyticsMeasurementId = row?.googleAnalyticsMeasurementId?.trim() || null;
        res.json({ brandName, publicSiteUrl, googleAnalyticsMeasurementId });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load site configuration" });
    }
});
/** Fields required to decide if a member profile is shown on the public site. */
const MEMBER_PUBLIC_VISIBILITY_SELECT = {
    membershipUnlimited: true,
    membershipBillingType: true,
    membershipExpiresAt: true,
    stripeSubscriptionStatus: true,
};
/** Public diagnostic: open in a browser when the site shows "Could not load members". */
router.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRawUnsafe("SELECT 1");
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[health] database connection failed", e);
        res.status(503).json({
            ok: false,
            step: "connect",
            detail: msg,
            hint: "Check server/.env DATABASE_URL (SQLite: file:/absolute/path/to/app.db). Run: npx prisma db push on the server.",
        });
        return;
    }
    try {
        const memberCount = await prisma.member.count();
        res.json({
            ok: true,
            database: "connected",
            memberTable: true,
            memberCount,
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[health] member table", e);
        res.status(503).json({
            ok: false,
            step: "member_table",
            detail: msg,
            hint: "Run on the server: cd server && npx prisma db push",
        });
    }
});
const appApplyUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_APPLICATION_DOC_BYTES,
        files: MAX_APPLICATION_FILES,
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_APPLICATION_DOC_MIME.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error("Only PDF and common image types are allowed"));
    },
});
function isApplicationMultipart(req) {
    return (req.headers["content-type"] || "").includes("multipart/form-data");
}
router.get("/public-config", async (_req, res) => {
    const contactEmail = process.env.CONTACT_EMAIL?.trim() ||
        process.env.PUBLIC_CONTACT_EMAIL?.trim() ||
        null;
    try {
        const s = await getOrgBilling();
        const stripeOk = Boolean(await getStripeSecretKey());
        res.json({
            recaptchaSiteKey: s.recaptchaEnabled && s.recaptchaSiteKey?.trim()
                ? s.recaptchaSiteKey.trim()
                : null,
            billingAvailable: billingReady(s) && stripeOk,
            contactEmail,
            hasBrandingLogo: Boolean(s.brandingLogoStoredName?.trim()),
            invoiceLegalName: s.invoiceLegalName?.trim() || null,
            jobTradeCategories: JOB_TRADE_CATEGORIES,
        });
    }
    catch (e) {
        console.error(e);
        /** Billing/DB issues must not hide contact email (still useful for Contact page). */
        res.json({
            recaptchaSiteKey: null,
            billingAvailable: false,
            contactEmail,
            hasBrandingLogo: false,
            invoiceLegalName: null,
            jobTradeCategories: JOB_TRADE_CATEGORIES,
        });
    }
});
/** Organization logo for invoices / site (PNG or JPEG). */
router.get("/public/branding/logo", async (_req, res) => {
    try {
        const s = await getOrgBilling();
        if (!s.brandingLogoStoredName?.trim()) {
            res.status(404).end();
            return;
        }
        const abs = orgBrandingFilePath(s.brandingLogoStoredName);
        const resolved = path.resolve(abs);
        if (!fs.existsSync(resolved)) {
            res.status(404).end();
            return;
        }
        res.setHeader("Cache-Control", "public, max-age=3600");
        const ext = path.extname(resolved).toLowerCase();
        res.type(ext === ".png" ? "image/png" : "image/jpeg");
        res.sendFile(resolved);
    }
    catch (e) {
        console.error(e);
        res.status(500).end();
    }
});
/** Confirms a join session still matches a row (both id + email required). */
router.post("/applications/verify", async (req, res) => {
    try {
        const applicationId = String(req.body?.applicationId ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        if (!applicationId || !email) {
            res.status(400).json({ error: "applicationId and email are required" });
            return;
        }
        const row = await prisma.application.findUnique({
            where: { id: applicationId },
        });
        const exists = Boolean(row && row.email.toLowerCase() === email.toLowerCase());
        res.json({ exists });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not verify application" });
    }
});
/** Applicant-facing status for /join (id + email must match). */
router.post("/applications/applicant-summary", async (req, res) => {
    let billingAvailable = false;
    try {
        const s = await getOrgBilling();
        const stripeOk = Boolean(await getStripeSecretKey());
        billingAvailable = billingReady(s) && stripeOk;
    }
    catch {
        billingAvailable = false;
    }
    try {
        const applicationId = String(req.body?.applicationId ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        if (!applicationId || !email) {
            res.status(400).json({ error: "applicationId and email are required" });
            return;
        }
        const row = await prisma.application.findUnique({
            where: { id: applicationId },
        });
        if (!row || row.email.toLowerCase() !== email) {
            res.json({
                exists: false,
                billingAvailable,
                canCheckout: false,
                hasPayment: false,
                profileLive: false,
                oneTimePassword: null,
            });
            return;
        }
        const hasPayment = Boolean(row.fastTrackPaidAt) || Boolean(row.membershipSubscribed);
        const profileLive = Boolean(row.createdMemberId);
        const canCheckout = billingAvailable &&
            row.status === "APPROVED" &&
            !hasPayment &&
            !profileLive;
        const now = new Date();
        const oneTimePassword = profileLive &&
            row.pendingPortalPassword &&
            row.pendingPortalPasswordExpires &&
            row.pendingPortalPasswordExpires > now
            ? row.pendingPortalPassword
            : null;
        res.json({
            exists: true,
            status: String(row.status),
            billingAvailable,
            canCheckout,
            hasPayment,
            profileLive,
            oneTimePassword,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load application status" });
    }
});
async function forwardApplicationWebhook(payload) {
    const url = process.env.APPLICATION_WEBHOOK_URL?.trim();
    if (!url)
        return;
    const secret = process.env.APPLICATION_WEBHOOK_SECRET?.trim();
    const headers = { "Content-Type": "application/json" };
    if (secret)
        headers.Authorization = `Bearer ${secret}`;
    try {
        await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
    }
    catch (e) {
        console.warn("[tradeverify] application webhook forward failed", e);
    }
}
router.post("/applications", (req, res, next) => {
    if (!isApplicationMultipart(req)) {
        next();
        return;
    }
    appApplyUpload.array("files", MAX_APPLICATION_FILES)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                res
                    .status(400)
                    .json({ error: "A file is too large (max 10 MB each)" });
                return;
            }
            if (err.code === "LIMIT_FILE_COUNT") {
                res.status(400).json({
                    error: `At most ${MAX_APPLICATION_FILES} files per application`,
                });
                return;
            }
            res.status(400).json({ error: err.message });
            return;
        }
        if (err) {
            res.status(400).json({
                error: err instanceof Error ? err.message : "Upload failed",
            });
            return;
        }
        next();
    });
}, async (req, res) => {
    try {
        const company = String(req.body?.company ?? "").trim();
        const trade = String(req.body?.trade ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const postcode = String(req.body?.postcode ?? "").trim();
        const recaptchaToken = req.body?.recaptchaToken;
        if (!company || !trade || !email || !postcode) {
            res.status(400).json({
                error: "company, trade, email, and postcode are required",
            });
            return;
        }
        const org = await getOrgBilling();
        if (org.recaptchaEnabled) {
            const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ||
                org.recaptchaSecretKey?.trim();
            if (!secret) {
                res.status(500).json({ error: "reCAPTCHA is misconfigured" });
                return;
            }
            const ok = await verifyRecaptchaV2(secret, recaptchaToken);
            if (!ok) {
                res.status(400).json({ error: "reCAPTCHA verification failed" });
                return;
            }
        }
        const files = isApplicationMultipart(req)
            ? (req.files ?? [])
            : [];
        let row = null;
        try {
            row = await prisma.application.create({
                data: { company, trade, email, postcode },
            });
            await persistApplicationDocuments(row.id, files);
        }
        catch (persistErr) {
            if (row) {
                await prisma.application.delete({ where: { id: row.id } }).catch(() => { });
                await removeApplicationUploadDir(row.id);
            }
            throw persistErr;
        }
        void forwardApplicationWebhook({
            source: "tradeverify-join",
            company,
            trade,
            email,
            postcode,
            submittedAt: row.createdAt.toISOString(),
            id: row.id,
            documentCount: files.length,
        });
        notifyNewApplication(prisma, {
            id: row.id,
            company: row.company,
            trade: row.trade,
            email: row.email,
            postcode: row.postcode,
        });
        const stripeOk = Boolean(await getStripeSecretKey());
        const billingAvailable = billingReady(org) && stripeOk;
        res.status(201).json({
            application: {
                id: row.id,
                company: row.company,
                trade: row.trade,
                email: row.email,
                postcode: row.postcode,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
            },
            billingAvailable,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save application" });
    }
});
router.get("/members", async (_req, res) => {
    try {
        const rows = await prisma.member.findMany({ orderBy: { name: "asc" } });
        const visible = rows.filter((m) => isMemberPublicListingVisible(m));
        res.json({ members: visible.map(memberToPublic) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load members" });
    }
});
async function memberBadgeSvgHandler(req, res) {
    let slug = String(req.params.slug ?? "").trim();
    try {
        slug = decodeURIComponent(slug);
    }
    catch {
        /* keep raw */
    }
    try {
        const m = await prisma.member.findUnique({
            where: { slug },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).type("text/plain").send("Not found");
            return;
        }
        const svg = buildMemberBadgeSvgFromRow({
            name: m.name,
            tvId: m.tvId,
            trade: m.trade,
        });
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(svg);
    }
    catch (e) {
        console.error("[badge] handler failed", { slug, err: e });
        res.status(500).type("text/plain").send("Error");
    }
}
router.get("/members/by-slug/:slug/badge.svg", memberBadgeSvgHandler);
/** Alias: some proxies rewrite `by-slug` → `by_slug`; browsers may cache old URLs. */
router.get("/members/by_slug/:slug/badge.svg", memberBadgeSvgHandler);
/** Sample badge for marketing (homepage) — same SVG generator as live member badges. */
router.get("/badge-preview.svg", (_req, res) => {
    const svg = buildTradeVerifyBadgeSvg({
        name: "Sample Verified Ltd",
        tvId: "TV-2847",
        trade: "Electrical",
    });
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
});
function decodeSlugParam(raw) {
    let slug = String(raw ?? "").trim();
    try {
        slug = decodeURIComponent(slug);
    }
    catch {
        /* keep raw */
    }
    return slug;
}
async function memberProfileLogoGetHandler(req, res) {
    try {
        const slug = decodeSlugParam(req.params.slug);
        const m = await prisma.member.findUnique({
            where: { slug },
            select: {
                id: true,
                profileLogoStoredName: true,
                ...MEMBER_PUBLIC_VISIBILITY_SELECT,
            },
        });
        if (!m?.profileLogoStoredName?.trim() ||
            !isMemberPublicListingVisible(m)) {
            res.status(404).end();
            return;
        }
        const abs = memberProfileLogoFilePath(m.id, m.profileLogoStoredName);
        if (!fs.existsSync(abs)) {
            res.status(404).end();
            return;
        }
        res.setHeader("Cache-Control", "public, max-age=600");
        const ext = path.extname(abs).toLowerCase();
        const t = ext === ".png"
            ? "image/png"
            : ext === ".webp"
                ? "image/webp"
                : "image/jpeg";
        res.type(t);
        res.sendFile(path.resolve(abs));
    }
    catch (e) {
        console.error(e);
        res.status(500).end();
    }
}
router.get("/members/by-slug/:slug/profile-logo", memberProfileLogoGetHandler);
router.get("/members/by_slug/:slug/profile-logo", memberProfileLogoGetHandler);
async function memberReviewsGetHandler(req, res) {
    try {
        const slug = decodeSlugParam(req.params.slug);
        const m = await prisma.member.findUnique({
            where: { slug },
            select: { id: true, ...MEMBER_PUBLIC_VISIBILITY_SELECT },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const approved = await prisma.memberReview.findMany({
            where: { memberId: m.id, status: "APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                rating: true,
                title: true,
                body: true,
                authorName: true,
                createdAt: true,
                businessReply: true,
                businessRepliedAt: true,
            },
        });
        const agg = await prisma.memberReview.aggregate({
            where: { memberId: m.id, status: "APPROVED" },
            _avg: { rating: true },
            _count: true,
        });
        res.json({
            summary: {
                averageRating: agg._avg.rating ?? null,
                count: agg._count,
            },
            reviews: approved.map((r) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
                businessRepliedAt: r.businessRepliedAt?.toISOString() ?? null,
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load reviews" });
    }
}
async function memberReviewsPostHandler(req, res) {
    try {
        const slug = decodeSlugParam(req.params.slug);
        const m = await prisma.member.findUnique({
            where: { slug },
            select: { id: true, ...MEMBER_PUBLIC_VISIBILITY_SELECT },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const rating = Number(req.body?.rating);
        const body = String(req.body?.body ?? "").trim();
        const authorName = String(req.body?.authorName ?? "").trim();
        const authorEmail = String(req.body?.authorEmail ?? "").trim();
        const title = String(req.body?.title ?? "").trim();
        const recaptchaToken = req.body?.recaptchaToken;
        const org = await getOrgBilling();
        if (org.recaptchaEnabled) {
            const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ||
                org.recaptchaSecretKey?.trim();
            if (!secret) {
                res.status(500).json({ error: "reCAPTCHA is misconfigured" });
                return;
            }
            const ok = await verifyRecaptchaV2(secret, recaptchaToken);
            if (!ok) {
                res.status(400).json({ error: "reCAPTCHA verification failed" });
                return;
            }
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            res.status(400).json({ error: "rating must be between 1 and 5" });
            return;
        }
        if (body.length < 20) {
            res
                .status(400)
                .json({ error: "Please write at least a few sentences (20+ characters)." });
            return;
        }
        if (body.length > 2000) {
            res.status(400).json({ error: "Review is too long (max 2000 characters)." });
            return;
        }
        if (!authorName || authorName.length > 120) {
            res.status(400).json({ error: "Your name is required (max 120 characters)." });
            return;
        }
        if (authorEmail && authorEmail.length > 254) {
            res.status(400).json({ error: "Email is too long." });
            return;
        }
        const titleNorm = title.length > 0 ? title.slice(0, 160) : null;
        const row = await prisma.memberReview.create({
            data: {
                memberId: m.id,
                rating: Math.round(rating),
                body,
                authorName,
                authorEmail: authorEmail || null,
                title: titleNorm,
                status: "PENDING",
            },
        });
        res.status(201).json({
            ok: true,
            review: {
                id: row.id,
                status: row.status,
            },
            message: "Thanks — your review was submitted and will appear after TradeVerify moderation.",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save review" });
    }
}
router.get("/members/by-slug/:slug/reviews", memberReviewsGetHandler);
router.get("/members/by_slug/:slug/reviews", memberReviewsGetHandler);
router.post("/members/by-slug/:slug/reviews", memberReviewsPostHandler);
router.post("/members/by_slug/:slug/reviews", memberReviewsPostHandler);
/** Contact this trade — creates a lead tied to the member (shown in their portal). */
async function memberInquiryPostHandler(req, res) {
    try {
        const slug = decodeSlugParam(req.params.slug);
        const m = await prisma.member.findUnique({
            where: { slug },
            select: { id: true, name: true, ...MEMBER_PUBLIC_VISIBILITY_SELECT },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const name = String(req.body?.name ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const phone = String(req.body?.phone ?? "").trim();
        const message = String(req.body?.message ?? "").trim();
        const recaptchaToken = req.body?.recaptchaToken;
        if (!name || !message) {
            res.status(400).json({ error: "name and message are required" });
            return;
        }
        if (!email && !phone) {
            res
                .status(400)
                .json({ error: "Please provide an email address or phone number." });
            return;
        }
        const org = await getOrgBilling();
        if (org.recaptchaEnabled) {
            const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ||
                org.recaptchaSecretKey?.trim();
            if (!secret) {
                res.status(500).json({ error: "reCAPTCHA is misconfigured" });
                return;
            }
            const ok = await verifyRecaptchaV2(secret, recaptchaToken);
            if (!ok) {
                res.status(400).json({ error: "reCAPTCHA verification failed" });
                return;
            }
        }
        const leadRow = await prisma.lead.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                source: "member_inquiry",
                status: "NEW",
                notes: `[${m.name}] ${message}`,
                memberId: m.id,
            },
        });
        notifyNewLead(prisma, {
            id: leadRow.id,
            name: leadRow.name,
            source: leadRow.source,
            email: leadRow.email,
            phone: leadRow.phone,
            notes: leadRow.notes,
            jobTitle: leadRow.jobTitle,
            jobPostcode: leadRow.jobPostcode,
        });
        res.status(201).json({
            ok: true,
            message: "Your message was sent. The business will get back to you using your contact details.",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not send message" });
    }
}
router.post("/members/by-slug/:slug/inquiries", memberInquiryPostHandler);
router.post("/members/by_slug/:slug/inquiries", memberInquiryPostHandler);
/** Public availability calendar for a verified member profile */
async function memberAvailabilityGetHandler(req, res) {
    try {
        const slug = decodeSlugParam(req.params.slug);
        const month = String(req.query.month ?? "").trim();
        if (!/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({ error: "month query must be YYYY-MM" });
            return;
        }
        const m = await prisma.member.findUnique({
            where: { slug },
            select: { id: true, ...MEMBER_PUBLIC_VISIBILITY_SELECT },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const [y, mo] = month.split("-").map(Number);
        const last = new Date(y, mo, 0).getDate();
        const start = `${month}-01`;
        const end = `${month}-${String(last).padStart(2, "0")}`;
        const rows = await prisma.memberAvailabilityDay.findMany({
            where: { memberId: m.id, date: { gte: start, lte: end } },
            orderBy: { date: "asc" },
        });
        res.json({
            month,
            days: rows.map((r) => ({ date: r.date, status: r.status })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load availability" });
    }
}
router.get("/members/by-slug/:slug/availability", memberAvailabilityGetHandler);
router.get("/members/by_slug/:slug/availability", memberAvailabilityGetHandler);
/** Homeowner job request — staff lead + one lead per matching verified trade (by category). */
router.post("/job-posts", async (req, res) => {
    try {
        const name = String(req.body?.name ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const phone = String(req.body?.phone ?? "").trim();
        const jobTitle = String(req.body?.jobTitle ?? "").trim();
        const jobDescription = String(req.body?.jobDescription ?? "").trim();
        const jobPostcode = String(req.body?.jobPostcode ?? "").trim();
        const tradeCategory = String(req.body?.tradeCategory ?? "")
            .trim()
            .toLowerCase();
        const recaptchaToken = req.body?.recaptchaToken;
        if (!name || !jobTitle || !jobDescription || !jobPostcode) {
            res.status(400).json({
                error: "name, jobTitle, jobDescription, and jobPostcode are required",
            });
            return;
        }
        if (!tradeCategory || !isValidJobTradeSlug(tradeCategory)) {
            res.status(400).json({
                error: "tradeCategory is required — pick the type of trade you need",
            });
            return;
        }
        if (!email && !phone) {
            res
                .status(400)
                .json({ error: "Please provide at least an email address or phone number." });
            return;
        }
        const org = await getOrgBilling();
        if (org.recaptchaEnabled) {
            const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ||
                org.recaptchaSecretKey?.trim();
            if (!secret) {
                res.status(500).json({ error: "reCAPTCHA is misconfigured" });
                return;
            }
            const ok = await verifyRecaptchaV2(secret, recaptchaToken);
            if (!ok) {
                res.status(400).json({ error: "reCAPTCHA verification failed" });
                return;
            }
        }
        const batchId = randomUUID();
        const label = jobTradeLabelForSlug(tradeCategory);
        const matches = await findMembersMatchingJobTrade(prisma, tradeCategory);
        const staffNotes = matches.length > 0
            ? `Routed to ${matches.length} verified trade profile(s) for “${label}”.`
            : `No matching live trade profile for “${label}” — staff follow-up.`;
        const baseLead = {
            name,
            email: email || null,
            phone: phone || null,
            source: "job_post",
            status: "NEW",
            jobTitle,
            jobDescription,
            jobPostcode,
            jobTradeCategory: tradeCategory,
            jobPostBatchId: batchId,
        };
        const staffRow = prisma.lead.create({
            data: {
                ...baseLead,
                memberId: null,
                notes: staffNotes,
            },
        });
        const memberRows = matches.map((m) => prisma.lead.create({
            data: {
                ...baseLead,
                memberId: m.id,
                notes: `[Posted job · ${label}] Homeowner asked for this trade type — contact them to quote.`,
            },
        }));
        const created = await prisma.$transaction([staffRow, ...memberRows]);
        const staffLead = created[0];
        notifyNewLead(prisma, {
            id: staffLead.id,
            name: staffLead.name,
            source: staffLead.source,
            email: staffLead.email,
            phone: staffLead.phone,
            notes: staffLead.notes,
            jobTitle: staffLead.jobTitle,
            jobPostcode: staffLead.jobPostcode,
        });
        res.status(201).json({
            ok: true,
            id: staffLead.id,
            batchId,
            routedToTrades: matches.length,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save your request" });
    }
});
async function memberBySlugHandler(req, res) {
    try {
        const m = await prisma.member.findUnique({
            where: { slug: req.params.slug },
        });
        if (!m || !isMemberPublicListingVisible(m)) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json({ member: memberToPublic(m) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load member" });
    }
}
router.get("/members/by-slug/:slug", memberBySlugHandler);
router.get("/members/by_slug/:slug", memberBySlugHandler);
router.get("/guides", async (_req, res) => {
    try {
        const rows = await prisma.guide.findMany({ orderBy: { title: "asc" } });
        res.json({ guides: rows.map((g) => guideToPublic(g)) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load guides" });
    }
});
async function guideBySlugHandler(req, res) {
    try {
        const g = await prisma.guide.findUnique({
            where: { slug: req.params.slug },
        });
        if (!g) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json({ guide: guideToPublic(g) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load guide" });
    }
}
router.get("/guides/by-slug/:slug", guideBySlugHandler);
router.get("/guides/by_slug/:slug", guideBySlugHandler);
export default router;

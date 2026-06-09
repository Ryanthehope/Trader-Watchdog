import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { Express, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import {
  ALLOWED_APPLICATION_DOC_MIME,
  MAX_APPLICATION_DOC_BYTES,
  MAX_APPLICATION_FILES,
  persistApplicationDocuments,
  removeApplicationUploadDir,
} from "../lib/applicationDocuments.js";
import {
  billingReady,
  getOrgBilling,
  getGoCardlessSecretKey,
} from "../lib/billingSettings.js";
// import { buildMemberBadgeSvgFromRow, buildTraderWatchdogBadgeSvg } from "../lib/memberBadgeSvg.js";
import { isMemberPublicListingVisible } from "../lib/memberMembership.js";
import { orgBrandingFilePath } from "../lib/orgBrandingPaths.js";
import { guideToPublic, memberToPublic } from "../lib/memberSerialize.js";
import { verifyRecaptchaV2 } from "../lib/verifyRecaptcha.js";
import {
  getBrandName,
  notifyApplicantSubmissionReceived,
  notifyNewApplication,
  notifyApplicantVerificationLink,
  publicSiteBase,
} from "../lib/adminMail.js";
import { checkoutLineConfig } from "../lib/billingSettings.js";
import { clampCheckoutPence } from "../lib/billingSettings.js";
import { getLaunchWindow } from "../lib/launchWindow.js";
import { ensureSumsubApplicantForApplication } from "../lib/ensureSumsubApplicant.js";
import { generateSumsubWebSdkLink, isSumsubConfigured } from "../lib/sumsub.js";

const router = Router();

router.get("/site-meta", async (_req, res) => {
  try {
    const brandName = await getBrandName(prisma);
    const publicSiteUrl = await publicSiteBase(prisma);
    const row = await prisma.organizationSettings.findUnique({
      where: { id: "default" },
      select: { googleAnalyticsMeasurementId: true },
    });
    const googleAnalyticsMeasurementId =
      row?.googleAnalyticsMeasurementId?.trim() || null;
    res.json({ brandName, publicSiteUrl, googleAnalyticsMeasurementId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load site configuration" });
  }
});

/** Fields required to decide if a member profile is shown on the public site. */
const MEMBER_PUBLIC_VISIBILITY_SELECT = {
  membershipUnlimited: true,
  membershipBillingType: true,
  membershipExpiresAt: true,
  goCardlessSubscriptionStatus: true,
} as const;

/** Public diagnostic: open in a browser when the site shows "Could not load members". */
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[health] database connection failed", e);
    res.status(503).json({
      ok: false,
      step: "connect",
      detail: msg,
      hint:
        "Check server/.env DATABASE_URL (SQLite: file:/absolute/path/to/app.db). Run: npx prisma db push on the server.",
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
  } catch (e) {
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

function isApplicationMultipart(req: { headers: { "content-type"?: string } }) {
  return (req.headers["content-type"] || "").includes("multipart/form-data");
}

function parseBooleanish(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

router.get("/public-config", async (_req, res) => {
  const contactEmail =
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.PUBLIC_CONTACT_EMAIL?.trim() ||
    null;
  try {
    const s = await getOrgBilling();
    const goCardlessOk = Boolean(await getGoCardlessSecretKey());
    const lines = checkoutLineConfig(s);
    const { launchDiscountActive } = getLaunchWindow();
    const baseMembershipPence = clampCheckoutPence(s.checkoutMembershipPence);

    res.json({
      recaptchaSiteKey:
        s.recaptchaEnabled && s.recaptchaSiteKey?.trim()
          ? s.recaptchaSiteKey.trim()
          : null,
      billingAvailable: billingReady(s) && goCardlessOk,
      contactEmail,
      hasBrandingLogo: Boolean(s.brandingLogoStoredName?.trim()),
      invoiceLegalName: s.invoiceLegalName?.trim() || null,
      registrationFeePricePence: lines.registrationFeePence,
      membershipPricePence: lines.membershipPence,
      baseMembershipPricePence: baseMembershipPence,
      launchDiscountActive,
    });
  } catch (e) {
    console.error(e);
    /** Billing/DB issues must not hide contact email (still useful for Contact page). */
    res.json({
      recaptchaSiteKey: null,
      billingAvailable: false,
      contactEmail,
      hasBrandingLogo: false,
      invoiceLegalName: null,
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
  } catch (e) {
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
    const exists = Boolean(
      row && row.email.toLowerCase() === email.toLowerCase()
    );
    res.json({ exists });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not verify application" });
  }
});

/** Applicant-facing status for /join (id + email must match). */
router.post("/applications/applicant-summary", async (req, res) => {
  let billingAvailable = false;
  try {
    const s = await getOrgBilling();
    const goCardlessOk = Boolean(await getGoCardlessSecretKey());
    billingAvailable = billingReady(s) && goCardlessOk;
  } catch {
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
        canCheckoutRegistrationFee: false,
        canCheckoutMembership: false,
        hasRegistrationFeePayment: false,
        hasMembershipPayment: false,
        profileLive: false,
        oneTimePassword: null,
      });
      return;
    }
    const hasRegistrationFeePayment = Boolean(row.registrationFeePaidAt);
    const hasMembershipPayment =
      Boolean(row.membershipSubscribed);  
    const profileLive = Boolean(row.createdMemberId);
    // True when an off-session GC payment was created on approval but the
    // Bacs confirmation webhook hasn't fired yet (~3-5 working days).
    const membershipAutoChargePending =
      Boolean(row.membershipAutoChargeInitiatedAt) &&
      !hasMembershipPayment &&
      !profileLive;
    const canCheckoutRegistrationFee =
      billingAvailable &&
      row.status !== "DECLINED" &&
      !hasRegistrationFeePayment &&
      !profileLive;
    const canCheckoutMembership =
      billingAvailable &&
      row.status === "APPROVED" &&
      hasRegistrationFeePayment &&
      !hasMembershipPayment &&
      !membershipAutoChargePending &&
      !profileLive;
    const now = new Date();
    const oneTimePassword =
      profileLive &&
      row.pendingPortalPassword &&
      row.pendingPortalPasswordExpires &&
      row.pendingPortalPasswordExpires > now
        ? row.pendingPortalPassword
        : null;
    res.json({
      exists: true,
      status: String(row.status),
      billingAvailable,
      canCheckoutRegistrationFee,
      canCheckoutMembership,
      membershipAutoChargePending,
      hasRegistrationFeePayment,
      hasMembershipPayment,
      profileLive,
      oneTimePassword,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load application status" });
  }
});

/**
 * Applicant-facing: get (or create) a Sumsub verification link.
 * Authenticated by applicationId + email match, and reg fee must be paid.
 */
router.post("/applications/verification-link", async (req, res) => {
  try {
    if (!isSumsubConfigured()) {
      res.status(400).json({ error: "Identity verification is not available yet" });
      return;
    }
    const applicationId = String(req.body?.applicationId ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!applicationId || !email) {
      res.status(400).json({ error: "applicationId and email are required" });
      return;
    }
    const row = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { email: true, registrationFeePaidAt: true, status: true },
    });
    if (!row || row.email.toLowerCase() !== email) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    if (!row.registrationFeePaidAt) {
      res.status(400).json({ error: "Verification starts after the registration fee is paid" });
      return;
    }
    if (row.status === "DECLINED") {
      res.status(400).json({ error: "This application is closed" });
      return;
    }
    const ensured = await ensureSumsubApplicantForApplication(prisma, applicationId);
    if (ensured.kind === "not_found") {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const link = await generateSumsubWebSdkLink({
      userId: ensured.externalUserId,
      email: ensured.email,
      phone: ensured.phone,
      lang: "en",
    });
    res.json({ url: link.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create verification link" });
  }
});

async function forwardApplicationWebhook(payload: Record<string, unknown>) {
  const url = process.env.APPLICATION_WEBHOOK_URL?.trim();
  if (!url) return;
  const secret = process.env.APPLICATION_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  try {
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("[Trader Watchdog] application webhook forward failed", e);
  }
}

router.post(
  "/applications",
  (req, res, next) => {
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
  },
  async (req, res) => {
    try {
      const company = String(req.body?.company ?? "").trim();
      const legalStructure = String(req.body?.legalStructure ?? "").trim();
      const tradingAddress = String(req.body?.tradingAddress ?? "").trim();
      const trade = String(req.body?.trade ?? "").trim();
      const employeeCountRaw = String(req.body?.employeeCount ?? "").trim();
      const employeeCount = employeeCountRaw
        ? Number.parseInt(employeeCountRaw, 10)
        : 1;
      const identifiablePerson = String(req.body?.identifiablePerson ?? "").trim();
      const identifiablePersonAddress = String(
        req.body?.identifiablePersonAddress ?? ""
      ).trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const phone = String(req.body?.phone ?? "").trim();
      const postcode = String(req.body?.postcode ?? "").trim();
      const wasteCarrierRequired = String(
        req.body?.wasteCarrierRequired ?? ""
      ).trim();
      const wasteCarrierNumber = String(req.body?.wasteCarrierNumber ?? "").trim();
      const gasSafeRequired = String(req.body?.gasSafeRequired ?? "").trim();
      const gasSafeNumber = String(req.body?.gasSafeNumber ?? "").trim();
      const icoRequired = String(req.body?.icoRequired ?? "").trim();
      const icoNumber = String(req.body?.icoNumber ?? "").trim();
      const businessDescription = String(
        req.body?.businessDescription ?? ""
      ).trim();
      const documentsConfirmed = parseBooleanish(req.body?.documentsConfirmed);
      const agreementAccepted = parseBooleanish(req.body?.agreementAccepted);
      const enquiriesAccepted = parseBooleanish(req.body?.enquiriesAccepted);
      const recaptchaToken = req.body?.recaptchaToken as string | undefined;
      if (!company || !trade || !email || !phone || !postcode) {
        res.status(400).json({
          error: "company, trade, email, phone, and postcode are required",
        });
        return;
      }
      if (employeeCountRaw && (!Number.isInteger(employeeCount) || employeeCount < 1)) {
        res.status(400).json({
          error: "Please enter the number of employees, including yourself.",
        });
        return;
      }

      const hasExtendedFields = Boolean(
        legalStructure ||
          tradingAddress ||
          employeeCountRaw ||
          identifiablePerson ||
          identifiablePersonAddress ||
          wasteCarrierRequired ||
          wasteCarrierNumber ||
          gasSafeRequired ||
          gasSafeNumber ||
          icoRequired ||
          icoNumber ||
          businessDescription ||
          Object.prototype.hasOwnProperty.call(req.body ?? {}, "documentsConfirmed") ||
          Object.prototype.hasOwnProperty.call(req.body ?? {}, "agreementAccepted") ||
          Object.prototype.hasOwnProperty.call(req.body ?? {}, "enquiriesAccepted")
      );

      if (
        hasExtendedFields &&
        (!legalStructure ||
          !tradingAddress ||
          !identifiablePerson ||
          !identifiablePersonAddress ||
          !wasteCarrierRequired ||
          !gasSafeRequired ||
          !icoRequired)
      ) {
        res.status(400).json({
          error:
            "Please complete the business structure, address, identifiable person, and licence requirement fields.",
        });
        return;
      }

      if (
        hasExtendedFields &&
        (!documentsConfirmed || !agreementAccepted || !enquiriesAccepted)
      ) {
        res.status(400).json({
          error: "Please confirm the required declaration boxes before submitting.",
        });
        return;
      }

      const org = await getOrgBilling();
      if (org.recaptchaEnabled) {
        const secret =
          process.env.TURNSTILE_SECRET_KEY?.trim() ||
          process.env.RECAPTCHA_SECRET_KEY?.trim() ||
          org.recaptchaSecretKey?.trim();
        if (!secret) {
          res.status(500).json({ error: "Turnstile is misconfigured" });
          return;
        }
        const ok = await verifyRecaptchaV2(secret, recaptchaToken);
        if (!ok) {
          res.status(400).json({ error: "Bot verification failed. Please try again." });
          return;
        }
      }

      const files = isApplicationMultipart(req)
        ? ((req.files as Express.Multer.File[]) ?? [])
        : [];

      let row: Awaited<ReturnType<typeof prisma.application.create>> | null =
        null;
      try {
        row = await prisma.application.create({
          data: {
            company,
            legalStructure: legalStructure || null,
            tradingAddress: tradingAddress || null,
            trade,
            employeeCount,
            identifiablePerson: identifiablePerson || null,
            identifiablePersonAddress: identifiablePersonAddress || null,
            email,
            phone,
            postcode,
            wasteCarrierRequired: wasteCarrierRequired || null,
            wasteCarrierNumber: wasteCarrierNumber || null,
            gasSafeRequired: gasSafeRequired || null,
            gasSafeNumber: gasSafeNumber || null,
            icoRequired: icoRequired || null,
            icoNumber: icoNumber || null,
            businessDescription: businessDescription || null,
            documentsConfirmed,
            agreementAccepted,
            enquiriesAccepted,
          },
        });
        await persistApplicationDocuments(row.id, files);
      } catch (persistErr) {
        if (row) {
          await prisma.application.delete({ where: { id: row.id } }).catch(() => {});
          await removeApplicationUploadDir(row.id);
        }
        throw persistErr;
      }

      void forwardApplicationWebhook({
        source: "Trader Watchdog-join",
        company,
        legalStructure,
        tradingAddress,
        trade,
        employeeCount,
        identifiablePerson,
        identifiablePersonAddress,
        email,
        phone,
        postcode,
        wasteCarrierRequired,
        wasteCarrierNumber,
        gasSafeRequired,
        gasSafeNumber,
        icoRequired,
        icoNumber,
        businessDescription,
        documentsConfirmed,
        agreementAccepted,
        enquiriesAccepted,
        submittedAt: row.createdAt.toISOString(),
        id: row.id,
        documentCount: files.length,
      });
      notifyNewApplication(prisma, {
        id: row.id,
        company: row.company,
        trade: row.trade,
        email: row.email,
        phone: row.phone,
        postcode: row.postcode,
      });
      notifyApplicantSubmissionReceived(prisma, {
        id: row.id,
        company: row.company,
        traderName: row.identifiablePerson,
        trade: row.trade,
        email: row.email,
      });
      const goCardlessOk = Boolean(await getGoCardlessSecretKey());
      const billingAvailable = billingReady(org) && goCardlessOk;
      res.status(201).json({
        application: {
          id: row.id,
          company: row.company,
          trade: row.trade,
          email: row.email,
          phone: row.phone,
          postcode: row.postcode,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        },
        billingAvailable,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not save application" });
    }
  }
);

router.get("/members", async (_req, res) => {
  try {
    const rows = await prisma.member.findMany({
      orderBy: { name: "asc" },
      include: {
        insurancePolicies: {
          select: { type: true, status: true },
          where: { status: { not: "expired" } },
        },
        sourceApplication: {
          select: {
            tradingAddress: true,
            identifiablePersonAddress: true,
          },
        },
      },
    });
    res.json({
      members: rows
        .filter((member) => isMemberPublicListingVisible(member))
        .map(memberToPublic),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load members" });
  }
});

// Badge SVG endpoints removed

function decodeSlugParam(raw: string): string {
  let slug = String(raw ?? "").trim();
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep raw */
  }
  return slug;
}

async function memberBySlugHandler(
  req: Request<{ slug: string }>,
  res: Response
): Promise<void> {
  try {
    const m = await prisma.member.findUnique({
      where: { slug: req.params.slug },
      include: {
        insurancePolicies: {
          select: { type: true, status: true },
          where: { status: { not: "expired" } },
        },
        sourceApplication: {
          select: {
            tradingAddress: true,
            identifiablePersonAddress: true,
          },
        },
      },
    });
    if (!m || !isMemberPublicListingVisible(m)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ member: memberToPublic(m) });
  } catch (e) {
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load guides" });
  }
});

async function guideBySlugHandler(
  req: Request<{ slug: string }>,
  res: Response
): Promise<void> {
  try {
    const g = await prisma.guide.findUnique({
      where: { slug: req.params.slug },
    });
    if (!g) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ guide: guideToPublic(g) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load guide" });
  }
}

router.get("/guides/by-slug/:slug", guideBySlugHandler);
router.get("/guides/by_slug/:slug", guideBySlugHandler);

export default router;

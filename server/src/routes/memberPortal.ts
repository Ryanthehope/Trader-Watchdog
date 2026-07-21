import { Router } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import multer from "multer";
import QRCode from "qrcode";
import sharp from "sharp";
import { prisma } from "../db.js";
import {
  billingReady,
  checkoutLineConfig,
  getOrgBilling,
} from "../lib/billingSettings.js";
import { getStripeClient } from "../lib/stripeClient.js";
import { createStripeCheckoutSession } from "../lib/stripeCheckoutSession.js";
import { stripeErrorDetails } from "../lib/stripeErrors.js";
import { documentIssuerFromMember } from "../lib/documentIssuer.js";
import {
  isMemberPublicListingVisible,
  membershipSummaryForMember,
} from "../lib/memberMembership.js";
import { addOneCalendarYearEndUtc } from "../lib/membershipPeriod.js";
import { memberToPublic } from "../lib/memberSerialize.js";
import { defaultUploadPath } from "../lib/uploadPaths.js";
import { requireMember } from "../middleware/requireMember.js";
import { requireMemberMembershipActive } from "../middleware/requireMemberMembershipActive.js";

const UPLOAD_ROOT =
  process.env.MEMBER_UPLOAD_DIR?.trim() ||
  defaultUploadPath("member-documents");

const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_MEMBER_DOCUMENTS = 5;

const QR_STICKER_SIZE_PX = 886; // 75mm at 300 DPI.
const QR_SMALL_SIZE_PX = 236; // 20mm at 300 DPI.

type QrVariant = "sticker" | "small";

const BADGE_WITH_QR_CONFIG = {
  templateFile: "Badge TW1.webp",
  panelLeft: 154,
  panelTop: 68,
  panelSize: 188,
  qrInset: 10,
} as const;

const BADGE_BLANK_TEMPLATE_FILE = "badge-preview.svg";

const ASSETS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets"
);
const PUBLIC_DIR = path.join(process.cwd(), "public");

// Sticker composite configurations.
// QR box coordinates are measured in pixels within the template images.
// Sticker 1 uses the bitmap stationery template; sticker 2 uses the 300 DPI template.
const VAN_STICKER_CONFIGS = {
  "1": {
    templateFile: "bitmap stationery blank.png",
    downloadSuffix: "vehicle-sticker-1",
    panelLeft: 514,
    panelTop: 36,
    panelSize: 328,
    qrInset: 10,
  },
  "2": {
    templateFile: "300dpi.png",
    downloadSuffix: "vehicle-sticker-2",
    panelLeft: 107,
    panelTop: 349,
    panelSize: 370,
    qrInset: 12,
  },
} as const;

function resolveStickerTemplatePath(templateFile: string) {
  const publicPath = path.join(PUBLIC_DIR, templateFile);
  if (fs.existsSync(publicPath)) return publicPath;
  return path.join(ASSETS_DIR, templateFile);
}

async function buildQrPng(profileUrl: string, sizePx: number, margin = 1) {
  return QRCode.toBuffer(profileUrl, {
    type: "png",
    errorCorrectionLevel: "H",
    margin,
    width: sizePx,
    color: { dark: "#000000", light: "#FFFFFFFF" },
  });
}

async function buildQrPanel(panelSize: number, qrInset: number, profileUrl: string) {
  const qrSize = panelSize - qrInset * 2;
  const qrPngBuffer = await buildQrPng(profileUrl, qrSize);

  return sharp({
    create: {
      width: panelSize,
      height: panelSize,
      channels: 4,
      background: "#FFFFFF",
    },
  })
    .composite([
      {
        input: qrPngBuffer,
        left: qrInset,
        top: qrInset,
      },
    ])
    .png()
    .toBuffer();
}

async function buildStickerQrPanel(cfg: (typeof VAN_STICKER_CONFIGS)[VanStickerId], profileUrl: string) {
  return buildQrPanel(cfg.panelSize, cfg.qrInset, profileUrl);
}

type VanStickerId = keyof typeof VAN_STICKER_CONFIGS;

function memberDocDir(memberId: string) {
  return path.join(UPLOAD_ROOT, memberId);
}

function ensureMemberDocDir(memberId: string) {
  const dir = memberDocDir(memberId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const docStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const memberId = (req as unknown as { memberId: string }).memberId;
    try {
      cb(null, ensureMemberDocDir(memberId));
    } catch (e) {
      cb(e as Error, UPLOAD_ROOT);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(0, 12) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: MAX_DOC_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF and common image types are allowed"));
  },
});

const router = Router();
router.use(requireMember);

async function siteOrigin(req: {
  get: (h: string) => string | undefined;
}) {
  const fromHeader = req.get("origin")?.trim();
  if (fromHeader) return fromHeader.replace(/\/$/, "");
  const org = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { publicSiteUrl: true },
  });
  const fromDb = org?.publicSiteUrl?.trim();
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim();
  const u = fromDb || fromEnv || "http://localhost:5173";
  return u.replace(/\/$/, "");
}

function isMemberQrEligible(m: {
  verificationStatus: string;
  membershipUnlimited: boolean;
  membershipBillingType: string | null;
  membershipExpiresAt: Date | null;
}) {
  // Block only if explicitly rejected — admin approval is the real verification gate.
  if (m.verificationStatus === "REJECTED") return false;
  return isMemberPublicListingVisible({
    membershipUnlimited: m.membershipUnlimited,
    membershipBillingType: m.membershipBillingType,
    membershipExpiresAt: m.membershipExpiresAt,
  });
}

async function memberPublicProfileAbsoluteUrl(
  req: { get: (h: string) => string | undefined },
  slug: string
) {
  const origin = await siteOrigin(req);
  return `${origin}/m/${encodeURIComponent(slug)}`;
}

function qrVariantConfig(variant: QrVariant) {
  if (variant === "sticker") {
    return {
      sizePx: QR_STICKER_SIZE_PX,
      fileSuffix: "75mm",
    };
  }
  return {
    sizePx: QR_SMALL_SIZE_PX,
    fileSuffix: "20mm",
  };
}

router.get("/me", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    const profile = memberToPublic(m);
    const membership = membershipSummaryForMember({
      membershipUnlimited: m.membershipUnlimited,
      membershipBillingType: m.membershipBillingType,
      membershipExpiresAt: m.membershipExpiresAt,
    });
    const profileLive = isMemberPublicListingVisible({
      membershipUnlimited: m.membershipUnlimited,
      membershipBillingType: m.membershipBillingType,
      membershipExpiresAt: m.membershipExpiresAt,
    });
    const qrEligible = isMemberQrEligible(m);
    const publicProfileAbsoluteUrl = await memberPublicProfileAbsoluteUrl(req, m.slug);

    res.json({
      memberId: m.id,
      profile,
      profileLive,
      loginEmail: m.loginEmail,
      publicProfileUrl: publicProfileAbsoluteUrl,
      mustChangePassword: m.mustChangePassword,
      membership,
      verification: {
        provider: m.verificationProvider,
        status: m.verificationStatus,
        submittedAt: m.verificationSubmittedAt?.toISOString() ?? null,
        approvedAt: m.verificationApprovedAt?.toISOString() ?? null,
        rejectedAt: m.verificationRejectedAt?.toISOString() ?? null,
        providerApplicantId: m.verificationProviderApplicantId,
        providerSessionId: m.verificationProviderSessionId,
        failureReason: m.verificationFailureReason,
      },
      qr: {
        eligible: qrEligible,
        reason: qrEligible
          ? null
          : "QR downloads are available while your membership is active. Contact us if you need help.",
        profileUrl: publicProfileAbsoluteUrl,
        stickerDownloadUrl: "/api/member/portal/qr-code/sticker",
        smallDownloadUrl: "/api/member/portal/qr-code/small",
        svgDownloadUrl: "/api/member/portal/qr-code/svg",
        badgeWithQrDownloadUrl: "/api/member/portal/qr-code/badge-with-qr",
        badgeBlankDownloadUrl: "/api/member/portal/qr-code/badge-blank",
        van1DownloadUrl: "/api/member/portal/qr-code/van-sticker/1",
        van2DownloadUrl: "/api/member/portal/qr-code/van-sticker/2",
        stickerPixels: QR_STICKER_SIZE_PX,
        smallPixels: QR_SMALL_SIZE_PX,
      },
      documentBranding: {
        ...documentIssuerFromMember(m),
        documentAccentHex: m.documentAccentHex?.trim() || null,
        documentLayout: m.documentLayout === "bold" ? "bold" : "standard",
        invoiceAddress: m.invoiceAddress ?? "",
        invoiceBankDetails: m.invoiceBankDetails ?? "",
        invoicePhone: m.invoicePhone ?? "",
        invoiceEmail: m.invoiceEmail ?? "",
        vatNumber: m.vatNumber ?? "",
        vatRegistered: Boolean(m.vatRegistered),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load profile" });
  }
});

router.get("/qr-code/svg", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        slug: true,
        tvId: true,
        verificationStatus: true,
        membershipUnlimited: true,
        membershipBillingType: true,
        membershipExpiresAt: true,
      },
    });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (!isMemberQrEligible(m)) {
      res.status(403).json({
        error:
          "QR downloads are available while your membership is active. Contact us if you need help.",
      });
      return;
    }

    const profileUrl = await memberPublicProfileAbsoluteUrl(req, m.slug);
    const svg = await QRCode.toString(profileUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    const safeId = m.tvId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `trader-watchdog-${safeId}-qr.svg`;
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.type("image/svg+xml");
    res.send(svg);
  } catch (e) {
    console.error("[member portal] qr-code svg failed", e);
    res.status(500).json({ error: "Could not generate QR code" });
  }
});

router.get("/qr-code/badge-with-qr", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        slug: true,
        tvId: true,
        verificationStatus: true,
        membershipUnlimited: true,
        membershipBillingType: true,
        membershipExpiresAt: true,
      },
    });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (!isMemberQrEligible(m)) {
      res.status(403).json({
        error:
          "QR downloads are available while your membership is active. Contact us if you need help.",
      });
      return;
    }

    const profileUrl = await memberPublicProfileAbsoluteUrl(req, m.slug);
    const qrPanel = await buildQrPanel(
      BADGE_WITH_QR_CONFIG.panelSize,
      BADGE_WITH_QR_CONFIG.qrInset,
      profileUrl
    );
    const templatePath = resolveStickerTemplatePath(BADGE_WITH_QR_CONFIG.templateFile);
    const output = await sharp(templatePath)
      .composite([
        {
          input: qrPanel,
          left: BADGE_WITH_QR_CONFIG.panelLeft,
          top: BADGE_WITH_QR_CONFIG.panelTop,
        },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const safeId = m.tvId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `trader-watchdog-${safeId}-badge-with-qr.png`;
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.type("image/png");
    res.send(output);
  } catch (e) {
    console.error("[member portal] badge-with-qr download failed", e);
    res.status(500).json({ error: "Could not generate badge" });
  }
});

router.get("/qr-code/badge-blank", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        tvId: true,
        verificationStatus: true,
        membershipUnlimited: true,
        membershipBillingType: true,
        membershipExpiresAt: true,
      },
    });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (!isMemberQrEligible(m)) {
      res.status(403).json({
        error:
          "QR downloads are available while your membership is active. Contact us if you need help.",
      });
      return;
    }

    const templatePath = resolveStickerTemplatePath(BADGE_BLANK_TEMPLATE_FILE);
    const svg = fs.readFileSync(templatePath, "utf8");
    const safeId = m.tvId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `trader-watchdog-${safeId}-badge-blank.svg`;
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.type("image/svg+xml");
    res.send(svg);
  } catch (e) {
    console.error("[member portal] badge-blank download failed", e);
    res.status(500).json({ error: "Could not download badge artwork" });
  }
});

// Van sticker composite: QR code composited into the white box on the sticker template.
router.get("/qr-code/van-sticker/:id", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const idRaw = String(req.params.id ?? "").trim();
    if (idRaw !== "1" && idRaw !== "2") {
      res.status(400).json({ error: "Van sticker id must be 1 or 2" });
      return;
    }
    const stickerId = idRaw as VanStickerId;
    const cfg = VAN_STICKER_CONFIGS[stickerId];

    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        slug: true,
        tvId: true,
        verificationStatus: true,
        membershipUnlimited: true,
        membershipBillingType: true,
        membershipExpiresAt: true,
      },
    });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (!isMemberQrEligible(m)) {
      res.status(403).json({
        error:
          "QR downloads are available while your membership is active. Contact us if you need help.",
      });
      return;
    }

    const profileUrl = await memberPublicProfileAbsoluteUrl(req, m.slug);

    const qrPanelBuffer = await buildStickerQrPanel(cfg, profileUrl);

    // Place a white QR surround panel on top of the finished sticker artwork.
    const templatePath = resolveStickerTemplatePath(cfg.templateFile);
    const output = await sharp(templatePath)
      .composite([
        {
          input: qrPanelBuffer,
          left: cfg.panelLeft,
          top: cfg.panelTop,
        },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const safeId = m.tvId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `trader-watchdog-${safeId}-${cfg.downloadSuffix}.png`;
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.type("image/png");
    res.send(output);
  } catch (e) {
    console.error("[member portal] van sticker composite failed", e);
    res.status(500).json({ error: "Could not generate van sticker" });
  }
});

router.get("/qr-code/:variant", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const variantRaw = String(req.params.variant ?? "").trim().toLowerCase();
    if (variantRaw !== "sticker" && variantRaw !== "small") {
      res.status(400).json({ error: "Variant must be sticker or small" });
      return;
    }
    const variant = variantRaw as QrVariant;

    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        slug: true,
        tvId: true,
        verificationStatus: true,
        membershipUnlimited: true,
        membershipBillingType: true,
        membershipExpiresAt: true,
      },
    });
    if (!m) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (!isMemberQrEligible(m)) {
      res.status(403).json({
        error:
          "QR downloads are available while your membership is active. Contact us if you need help.",
      });
      return;
    }

    const profileUrl = await memberPublicProfileAbsoluteUrl(req, m.slug);
    const cfg = qrVariantConfig(variant);

    const png = await QRCode.toBuffer(profileUrl, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: cfg.sizePx,
      color: {
        dark: "#000000",
        light: "#FFFFFFFF",
      },
    });

    const safeId = m.tvId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `trader-watchdog-${safeId}-qr-${cfg.fileSuffix}.png`;
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.type("image/png");
    res.send(png);
  } catch (e) {
    console.error("[member portal] qr-code download failed", e);
    res.status(500).json({ error: "Could not generate QR code" });
  }
});

router.post("/membership/renew", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const m = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        loginEmail: true,
        name: true,
        stripeCustomerId: true,
        membershipExpiresAt: true,
        membershipRenewalPricePence: true,
      },
    });
    if (!m?.loginEmail?.trim()) {
      res.status(400).json({ error: "No login email on file" });
      return;
    }
    const settings = await getOrgBilling();
    if (!billingReady(settings)) {
      res.status(400).json({ error: "Online billing is not enabled" });
      return;
    }
    const stripe = await getStripeClient();
    if (!stripe) {
      res.status(400).json({ error: "Stripe is not configured" });
      return;
    }
    const origin = await siteOrigin(req);
    const lines = checkoutLineConfig(settings);
    const renewalAmountPence = m.membershipRenewalPricePence != null ? m.membershipRenewalPricePence : lines.membershipPence;

    // Free-membership holders (100% discount for life) — extend without Stripe.
    if (renewalAmountPence === 0) {
      const now = new Date();
      const baseDate = m.membershipExpiresAt && m.membershipExpiresAt > now ? m.membershipExpiresAt : now;
      await prisma.member.update({
        where: { id: memberId },
        data: {
          membershipBillingType: "manual",
          membershipExpiresAt: addOneCalendarYearEndUtc(baseDate),
        },
      });
      res.json({ url: `/member/billing?renewal=success` });
      return;
    }

    const flow = await createStripeCheckoutSession(stripe, {
      amountPence: renewalAmountPence,
      description: `${lines.membershipName} renewal`,
      email: m.loginEmail.trim().toLowerCase(),
      customerName: m.name,
      existingStripeCustomerId: m.stripeCustomerId,
      createCustomer: !m.stripeCustomerId,
      successRedirectUrl: `${origin}/member/billing?renewal=success`,
      cancelRedirectUrl: `${origin}/member/billing?renewal=cancelled`,
      metadata: {
        checkoutKind: "member_portal_renewal",
        memberId,
      },
    });
    res.json({ url: flow.url });
  } catch (e) {
    console.error("[billing] membership renewal failed", { error: e });
    const { statusCode, message } = stripeErrorDetails(e);
    res.status(statusCode).json({ error: message });
  }
});

/** Fields members may update themselves (verification data stays staff-only) */
router.put("/profile", requireMemberMembershipActive, async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const {
      name,
      trade,
      location,
      blurb,
      documentAccentHex,
      invoiceAddress,
      invoiceBankDetails,
      invoicePhone,
      invoiceEmail,
      vatNumber,
      vatRegistered,
      documentLayout,
    } = req.body ?? {};
    if (
      name === undefined ||
      trade === undefined ||
      location === undefined ||
      blurb === undefined
    ) {
      res.status(400).json({
        error: "name, trade, location, and blurb are required",
      });
      return;
    }
    const hexRaw =
      documentAccentHex !== undefined
        ? String(documentAccentHex).trim()
        : undefined;
    if (
      hexRaw !== undefined &&
      hexRaw !== "" &&
      !/^#[0-9A-Fa-f]{6}$/.test(hexRaw)
    ) {
      res.status(400).json({
        error:
          "Accent colour must be a hex value like #0d9488 (6 digits after #)",
      });
      return;
    }
    const m = await prisma.member.update({
      where: { id: memberId },
      data: {
        name: String(name).trim(),
        trade: String(trade).trim(),
        location: String(location).trim(),
        blurb: String(blurb).trim(),
        ...(documentAccentHex !== undefined
          ? {
              documentAccentHex:
                hexRaw === "" ? null : hexRaw!.toLowerCase(),
            }
          : {}),
        ...(invoiceAddress !== undefined
          ? {
              invoiceAddress:
                String(invoiceAddress ?? "").trim() || null,
            }
          : {}),
        ...(invoiceBankDetails !== undefined
          ? {
              invoiceBankDetails:
                String(invoiceBankDetails ?? "").trim() || null,
            }
          : {}),
        ...(invoicePhone !== undefined
          ? { invoicePhone: String(invoicePhone ?? "").trim() || null }
          : {}),
        ...(invoiceEmail !== undefined
          ? { invoiceEmail: String(invoiceEmail ?? "").trim() || null }
          : {}),
        ...(vatNumber !== undefined
          ? { vatNumber: String(vatNumber ?? "").trim() || null }
          : {}),
        ...(vatRegistered !== undefined
          ? { vatRegistered: Boolean(vatRegistered) }
          : {}),
        ...(documentLayout !== undefined
          ? {
              documentLayout: (() => {
                const v = String(documentLayout ?? "")
                  .trim()
                  .toLowerCase();
                if (v === "bold" || v === "standard") return v;
                return null;
              })(),
            }
          : {}),
      },
    });
    res.json({ profile: memberToPublic(m) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update profile" });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const current = String(req.body?.currentPassword ?? "");
    const next = String(req.body?.newPassword ?? "");
    if (!current || !next) {
      res.status(400).json({ error: "Current and new passwords are required" });
      return;
    }
    if (next.length < 10) {
      res
        .status(400)
        .json({ error: "New password must be at least 10 characters" });
      return;
    }
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m?.passwordHash) {
      res.status(400).json({ error: "Portal password is not set" });
      return;
    }
    const ok = await bcrypt.compare(current, m.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await bcrypt.hash(next, 12);
    await prisma.$transaction([
      prisma.member.update({
        where: { id: memberId },
        data: { passwordHash, mustChangePassword: false },
      }),
      prisma.application.updateMany({
        where: { createdMemberId: memberId },
        data: {
          pendingPortalPassword: null,
          pendingPortalPasswordExpires: null,
        },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not change password" });
  }
});

router.get("/documents", requireMemberMembershipActive, async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const rows = await prisma.memberDocument.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      documents: rows.map((d) => ({
        id: d.id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not list documents" });
  }
});

router.post("/documents", requireMemberMembershipActive, (req, res, next) => {
  docUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File too large (max 10 MB)" });
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
    const memberId = (req as unknown as { memberId: string }).memberId;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "file is required" });
      return;
    }
    const existingDocumentCount = await prisma.memberDocument.count({
      where: { memberId },
    });
    if (existingDocumentCount >= MAX_MEMBER_DOCUMENTS) {
      fs.unlink(file.path, () => {});
      res.status(400).json({
        error:
          "You can keep up to 5 insurance and qualification documents on your account. Delete one before uploading another.",
      });
      return;
    }
    const row = await prisma.memberDocument.create({
      data: {
        memberId,
        storedName: file.filename,
        originalName: file.originalname.slice(0, 255) || "upload",
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
    res.status(201).json({
      document: {
        id: row.id,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not save document" });
  }
});

router.get(
  "/documents/:id/file",
  requireMemberMembershipActive,
  async (req, res) => {
    try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const doc = await prisma.memberDocument.findFirst({
      where: { id: req.params.id, memberId },
    });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const filePath = path.join(memberDocDir(memberId), doc.storedName);
    const resolved = path.resolve(filePath);
    const base = path.resolve(memberDocDir(memberId));
    if (!resolved.startsWith(base) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(doc.originalName).replace(/'/g, "%27")}"`
    );
    res.type(doc.mimeType);
    res.sendFile(resolved);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not download file" });
    }
  }
);

async function invoiceBrandingPayload() {
  const org = await getOrgBilling();
  return {
    hasLogo: Boolean(org.brandingLogoStoredName?.trim()),
    legalName: org.invoiceLegalName?.trim() || null,
    vatNumber: org.invoiceVatNumber?.trim() || null,
    address: org.invoiceAddress?.trim() || null,
    footerNote: org.invoiceFooterNote?.trim() || null,
  };
}

/** Payment history — returns empty until Stripe invoice sync is implemented. */
router.get("/invoices", async (req, res) => {
  try {
    const branding = await invoiceBrandingPayload();
    res.json({
      invoices: [] as Array<Record<string, unknown>>,
      branding,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load billing history" });
  }
});

router.delete(
  "/documents/:id",
  requireMemberMembershipActive,
  async (req, res) => {
    try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const doc = await prisma.memberDocument.findFirst({
      where: { id: req.params.id, memberId },
    });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const filePath = path.join(memberDocDir(memberId), doc.storedName);
    await prisma.memberDocument.delete({ where: { id: doc.id } });
    fs.unlink(filePath, () => {});
    res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not delete document" });
    }
  }
);

/** Insurance */
router.get("/insurance", requireMemberMembershipActive, async (req, res) => {
  try {
    const memberId = (req as unknown as { memberId: string }).memberId;
    const policies = await prisma.insurance.findMany({
      where: { memberId },
      orderBy: { expiryDate: "asc" },
    });
    res.json({
      policies: policies.map((p) => ({
        id: p.id,
        type: p.type,
        provider: p.provider,
        policyNumber: p.policyNumber,
        expiryDate: p.expiryDate.toISOString(),
        graceExpiryDate: p.graceExpiryDate?.toISOString() ?? null,
        status: p.status,
        alertsSent: p.alertsSent,
        lastAlertSentAt: p.lastAlertSentAt?.toISOString() ?? null,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not list insurance policies" });
  }
});

export default router;

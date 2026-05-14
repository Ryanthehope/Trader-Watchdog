// @ts-nocheck
import type { Request, Response } from "express";
import { Router } from "express";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import {
  mergeVettingStateFromDb,
  mergeVettingStateFromInput,
  vettingStateToPrismaJson,
} from "../lib/applicationVettingState.js";
import { applicationDocumentResolvedPath } from "../lib/applicationDocuments.js";
import { tryProvisionMemberForApplication } from "../lib/provisionMemberFromApplication.js";
import { sanitizeNullableDbString } from "../lib/sanitizeDbText.js";
import { getStripeClient } from "../lib/billingSettings.js";
import { fetchStripeFinancialSnapshot } from "../lib/stripeFinancialSnapshot.js";
import { parseManualMembershipExpiryInput } from "../lib/membershipExpiryInput.js";
import { fetchGa4OverviewReport } from "../lib/ga4DataApi.js";
import {
  invalidateSmtpTransportCache,
  notifyApplicationDecision,
  notifyNewLead,
} from "../lib/adminMail.js";
import {
  createSumsubApplicant,
  generateSumsubWebSdkLink,
  getSumsubApplicantReview,
  isSumsubConfigured,
  mapSumsubReviewToVerificationData,
} from "../lib/sumsub.js";

const router = Router();

async function ensureOrgSettings() {
  return prisma.organizationSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

const inboxUnreadCount = 0;
const reviewsPendingCount = 0;

router.get("/dashboard", async (_req, res) => {
  try {
    const [
      membersTotal,
      membersPortal,
      guidesTotal,
      applicationsPending,
      settings,
      recentApps,
      recentMembers,
      recentGuides,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({
        where: { loginEmail: { not: null }, passwordHash: { not: null } },
      }),
      prisma.guide.count(),
      prisma.application.count({ where: { status: "PENDING" } }),
      ensureOrgSettings(),
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
    ]);

    type Act = { at: string; label: string; href: string };
    const activity: Act[] = [
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
    let financialSource: "stripe" | "fallback" = "fallback";
    let financialError: string | null = null;
    const stripe = await getStripeClient();
    if (stripe) {
      const snap = await fetchStripeFinancialSnapshot(stripe);
      if (snap.ok) {
        revenueMtdCents = snap.revenueMtdCents;
        outstandingCents = snap.outstandingCents;
        financialSource = "stripe";
      } else {
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
      inboxUnread: inboxUnreadCount,
      reviewsPending: reviewsPendingCount,
      activity,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load dashboard" });
  }
});

function publicOrgSettings(s: Awaited<ReturnType<typeof ensureOrgSettings>>) {
  return {
    ...s,
    stripeSecretKey: null as string | null,
    stripeWebhookSecret: null as string | null,
    recaptchaSecretKey: null as string | null,
    smtpPass: null as string | null,
    googleAnalyticsServiceAccountJson: null as string | null,
    hasStripeSecret: Boolean(s.stripeSecretKey?.trim()),
    hasStripeWebhookSecret: Boolean(s.stripeWebhookSecret?.trim()),
    hasRecaptchaSecret: Boolean(s.recaptchaSecretKey?.trim()),
    hasSmtpPassword: Boolean(s.smtpPass?.trim()),
    hasGoogleAnalyticsServiceAccount: Boolean(
      s.googleAnalyticsServiceAccountJson?.trim()
    ),
  };
};

router.get("/organization-settings", async (_req, res) => {
  try {
    const s = await ensureOrgSettings();
    res.json({ settings: publicOrgSettings(s) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load settings" });
  }
});

async function patchOrganizationSettings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body = req.body ?? {};
    const workspaceName =
      typeof body.workspaceName === "string"
        ? body.workspaceName.trim() || null
        : undefined;
    const announcementEmail =
      typeof body.announcementEmail === "string"
        ? body.announcementEmail.trim() || null
        : undefined;
    const siteDisplayName =
      typeof body.siteDisplayName === "string"
        ? body.siteDisplayName.trim() || null
        : undefined;
    const publicSiteUrl =
      typeof body.publicSiteUrl === "string"
        ? body.publicSiteUrl.trim().replace(/\/$/, "") || null
        : undefined;
    const adminNotifyEmails =
      typeof body.adminNotifyEmails === "string"
        ? body.adminNotifyEmails.trim() || null
        : undefined;
    const smtpHost =
      typeof body.smtpHost === "string"
        ? body.smtpHost.trim() || null
        : undefined;
    let smtpPort: number | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, "smtpPort")) {
      const raw = body.smtpPort as unknown;
      if (raw === null || raw === "") {
        smtpPort = null;
      } else if (typeof raw === "number" && Number.isFinite(raw)) {
        smtpPort = Math.floor(raw);
      } else if (typeof raw === "string") {
        const t = raw.trim();
        if (t === "") smtpPort = null;
        else {
          const n = Math.floor(Number(t));
          smtpPort = Number.isFinite(n) ? n : null;
        }
      }
    }
    const smtpSecure =
      typeof body.smtpSecure === "boolean" ? body.smtpSecure : undefined;
    const smtpUser =
      typeof body.smtpUser === "string"
        ? body.smtpUser.trim() || null
        : undefined;
    const mailFrom =
      typeof body.mailFrom === "string"
        ? body.mailFrom.trim() || null
        : undefined;
    const smtpPassRaw = body.smtpPass;
    const smtpPass =
      typeof smtpPassRaw === "string" && smtpPassRaw.trim()
        ? smtpPassRaw.trim()
        : undefined;
    const clearSmtpPassword = body.clearSmtpPassword === true;

    const billingEnabled =
      typeof body.billingEnabled === "boolean"
        ? body.billingEnabled
        : undefined;
    const stripePublishableKey =
      typeof body.stripePublishableKey === "string"
        ? body.stripePublishableKey.trim() || null
        : undefined;
    const checkoutMembershipName =
      typeof body.checkoutMembershipName === "string"
        ? body.checkoutMembershipName.trim() || null
        : undefined;
    const checkoutFastTrackName =
      typeof body.checkoutFastTrackName === "string"
        ? body.checkoutFastTrackName.trim() || null
        : undefined;
    const checkoutMembershipPence =
      typeof body.checkoutMembershipPence === "number" &&
      Number.isFinite(body.checkoutMembershipPence)
        ? Math.floor(body.checkoutMembershipPence)
        : undefined;
    const checkoutFastTrackPence =
      typeof body.checkoutFastTrackPence === "number" &&
      Number.isFinite(body.checkoutFastTrackPence)
        ? Math.floor(body.checkoutFastTrackPence)
        : undefined;
    const stripeSecretKey =
      typeof body.stripeSecretKey === "string"
        ? body.stripeSecretKey.trim() || null
        : undefined;
    const stripeWebhookSecret =
      typeof body.stripeWebhookSecret === "string"
        ? body.stripeWebhookSecret.trim() || null
        : undefined;
    const recaptchaEnabled =
      typeof body.recaptchaEnabled === "boolean"
        ? body.recaptchaEnabled
        : undefined;
    const recaptchaSiteKey =
      typeof body.recaptchaSiteKey === "string"
        ? body.recaptchaSiteKey.trim() || null
        : undefined;
    const recaptchaSecretKey =
      typeof body.recaptchaSecretKey === "string"
        ? body.recaptchaSecretKey.trim() || null
        : undefined;
    const staffRequire2fa =
      typeof body.staffRequire2fa === "boolean"
        ? body.staffRequire2fa
        : undefined;

    const invoiceLegalName =
      typeof body.invoiceLegalName === "string"
        ? body.invoiceLegalName.trim() || null
        : undefined;
    const invoiceVatNumber =
      typeof body.invoiceVatNumber === "string"
        ? body.invoiceVatNumber.trim() || null
        : undefined;
    const invoiceAddress =
      typeof body.invoiceAddress === "string"
        ? body.invoiceAddress.trim() || null
        : undefined;
    const invoiceFooterNote =
      typeof body.invoiceFooterNote === "string"
        ? body.invoiceFooterNote.trim() || null
        : undefined;

    let googleAnalyticsMeasurementId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, "googleAnalyticsMeasurementId")) {
      const raw = body.googleAnalyticsMeasurementId;
      if (raw === null || raw === "") {
        googleAnalyticsMeasurementId = null;
      } else if (typeof raw === "string") {
        const t = raw.replace(/\s/g, "").trim();
        if (!t) {
          googleAnalyticsMeasurementId = null;
        } else if (/^G-[A-Z0-9]+$/i.test(t)) {
          googleAnalyticsMeasurementId = t.toUpperCase();
        } else {
          res.status(400).json({
            error:
              "Invalid Google Analytics Measurement ID. Use your GA4 ID (format G-XXXXXXXXXX).",
          });
          return;
        }
      }
    }

    let googleAnalyticsPropertyId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, "googleAnalyticsPropertyId")) {
      const raw = body.googleAnalyticsPropertyId;
      if (raw === null || raw === "") {
        googleAnalyticsPropertyId = null;
      } else if (typeof raw === "string") {
        const t = raw.replace(/\s/g, "");
        if (!t) {
          googleAnalyticsPropertyId = null;
        } else if (/^\d{5,12}$/.test(t)) {
          googleAnalyticsPropertyId = t;
        } else {
          res.status(400).json({
            error:
              "GA4 Property ID must be numeric only (find it under GA4 → Admin → Property settings).",
          });
          return;
        }
      }
    }

    let googleAnalyticsServiceAccountJson: string | null | undefined = undefined;
    if (
      Object.prototype.hasOwnProperty.call(body, "googleAnalyticsServiceAccountJson")
    ) {
      const raw = body.googleAnalyticsServiceAccountJson;
      if (raw === null || raw === "") {
        googleAnalyticsServiceAccountJson = null;
      } else if (typeof raw === "string") {
        const t = raw.trim();
        if (!t) {
          googleAnalyticsServiceAccountJson = null;
        } else {
          try {
            const o = JSON.parse(t) as Record<string, unknown>;
            if (
              typeof o.private_key !== "string" ||
              typeof o.client_email !== "string"
            ) {
              res.status(400).json({
                error:
                  "Service account JSON must include client_email and private_key (paste the full file from Google Cloud).",
              });
              return;
            }
            googleAnalyticsServiceAccountJson = t;
          } catch {
            res.status(400).json({
              error: "Service account JSON is not valid JSON.",
            });
            return;
          }
        }
      }
    }

    const secretPatch: Record<string, string | null | undefined> = {};
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
    } else if (smtpPass !== undefined) {
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
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    res.status(500).json({
      error: "Could not save settings",
      detail,
    });
  }
}

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
      googleAnalyticsMeasurementId:
        org.googleAnalyticsMeasurementId?.trim() || null,
    });
  } catch (e) {
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
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "Could not load Google Analytics report",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});
/** Applications */
function serializeAdminApplication(a: {
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  fastTrackPaidAt: Date | null;
  manualMembershipExpiresAt?: Date | null;
  verificationProvider?: string | null;
  verificationStatus?: string | null;
  verificationSubmittedAt?: Date | null;
  verificationApprovedAt?: Date | null;
  verificationRejectedAt?: Date | null;
  verificationProviderApplicantId?: string | null;
  verificationProviderSessionId?: string | null;
  verificationFailureReason?: string | null;
  pendingPortalPassword?: string | null;
  pendingPortalPasswordExpires?: Date | null;
  vettingState: unknown;
  notes: string | null;
  vettingChecklist: string | null;
  documents: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }>;
  createdMember?: {
    id: string;
    slug: string;
    tvId: string;
    membershipBillingType?: string | null;
    membershipExpiresAt?: Date | null;
    stripeSubscriptionStatus?: string | null;
  } | null;
}) {
  const {
    documents,
    createdMember,
    notes,
    vettingChecklist,
    approvedAt,
    createdAt,
    updatedAt,
    fastTrackPaidAt,
    manualMembershipExpiresAt: _manualMExp,
    verificationProvider,
    verificationStatus,
    verificationSubmittedAt,
    verificationApprovedAt,
    verificationRejectedAt,
    verificationProviderApplicantId,
    verificationProviderSessionId,
    verificationFailureReason,
    vettingState,
    pendingPortalPassword: _pendingPw,
    pendingPortalPasswordExpires: _pendingPwExp,
    ...rest
  } = a;
  return {
    ...rest,
    notes: sanitizeNullableDbString(notes),
    vettingChecklist: sanitizeNullableDbString(vettingChecklist),
    vettingState: mergeVettingStateFromDb(vettingState),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    approvedAt: approvedAt?.toISOString() ?? null,
    fastTrackPaidAt: fastTrackPaidAt?.toISOString() ?? null,
    manualMembershipExpiresAt:
      a.manualMembershipExpiresAt?.toISOString() ?? null,
    verificationProvider: verificationProvider ?? null,
    verificationStatus: verificationStatus ?? "NOT_STARTED",
    verificationSubmittedAt: verificationSubmittedAt?.toISOString() ?? null,
    verificationApprovedAt: verificationApprovedAt?.toISOString() ?? null,
    verificationRejectedAt: verificationRejectedAt?.toISOString() ?? null,
    verificationProviderApplicantId: verificationProviderApplicantId ?? null,
    verificationProviderSessionId: verificationProviderSessionId ?? null,
    verificationFailureReason: verificationFailureReason ?? null,
    createdMember: createdMember
      ? {
          id: createdMember.id,
          slug: createdMember.slug,
          tvId: createdMember.tvId,
          membershipBillingType: createdMember.membershipBillingType ?? null,
          membershipExpiresAt:
            createdMember.membershipExpiresAt?.toISOString() ?? null,
          stripeSubscriptionStatus:
            createdMember.stripeSubscriptionStatus ?? null,
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
  } catch (e) {
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
    const allowed: ApplicationStatus[] = [
      "PENDING",
      "REVIEWING",
      "CONTACTED",
      "APPROVED",
      "DECLINED",
    ];
    const { vettingChecklist, vettingState: vettingStateBody } = req.body ?? {};
    const data: {
      status?: ApplicationStatus;
      notes?: string | null;
      vettingChecklist?: string | null;
      vettingState?: Prisma.InputJsonValue;
      approvedAt?: Date | null;
    } = {};
    if (status !== undefined) {
      const s = String(status) as ApplicationStatus;
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
      data.vettingState = vettingStateToPrismaJson(
        mergeVettingStateFromInput(vettingStateBody)
      );
    }

    const transitioningToApproved =
      data.status === "APPROVED" && before.status !== "APPROVED";
    const transitioningFromApproved =
      data.status !== undefined &&
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
          error:
            "This work email already has a member portal login. Free or change that account first, then approve.",
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

    if (
      data.status !== undefined &&
      before.status !== data.status &&
      (data.status === "APPROVED" || data.status === "DECLINED")
    ) {
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
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "NOT_FOUND"
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(400).json({ error: "Could not update application" });
  }
});

async function ensureSumsubApplicantForApplication(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      company: true,
      verificationProvider: true,
      verificationProviderApplicantId: true,
      verificationProviderSessionId: true,
    },
  });
  if (!application) {
    return { kind: "not_found" as const };
  }

  if (
    application.verificationProvider === "sumsub" &&
    application.verificationProviderApplicantId
  ) {
    return {
      kind: "existing" as const,
      application,
      applicantId: application.verificationProviderApplicantId,
      inspectionId: application.verificationProviderSessionId,
      externalUserId: application.id,
    };
  }

  const applicant = await createSumsubApplicant({
    externalUserId: application.id,
    email: application.email,
    phone: application.phone,
    firstName: application.company,
    lastName: null,
  });

  await prisma.application.update({
    where: { id: application.id },
    data: {
      verificationProvider: "sumsub",
      verificationStatus: "IN_PROGRESS",
      verificationSubmittedAt: new Date(),
      verificationApprovedAt: null,
      verificationRejectedAt: null,
      verificationProviderApplicantId: applicant.id,
      verificationProviderSessionId: applicant.inspectionId ?? null,
      verificationFailureReason: null,
    },
  });

  return {
    kind: "created" as const,
    application,
    applicantId: applicant.id,
    inspectionId: applicant.inspectionId ?? null,
    externalUserId: applicant.externalUserId ?? application.id,
  };
}

router.post("/applications/:id/sumsub-applicant", async (req, res) => {
  try {
    if (!isSumsubConfigured()) {
      res.status(400).json({ error: "Sumsub is not configured" });
      return;
    }
    const id = req.params.id;

    const ensured = await ensureSumsubApplicantForApplication(id);
    if (ensured.kind === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      applicantId: ensured.applicantId,
      inspectionId: ensured.inspectionId ?? null,
      externalUserId: ensured.externalUserId,
      reused: ensured.kind === "existing",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create Sumsub applicant" });
  }
});

router.post("/applications/:id/sumsub-link", async (req, res) => {
  try {
    if (!isSumsubConfigured()) {
      res.status(400).json({ error: "Sumsub is not configured" });
      return;
    }
    const id = req.params.id;
    const ensured = await ensureSumsubApplicantForApplication(id);
    if (ensured.kind === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const link = await generateSumsubWebSdkLink({
      userId: ensured.externalUserId,
      email: ensured.application.email,
      phone: ensured.application.phone,
      lang: "en",
    });

    res.json({
      url: link.url,
      applicantId: ensured.applicantId,
      inspectionId: ensured.inspectionId ?? null,
      externalUserId: ensured.externalUserId,
      reused: ensured.kind === "existing",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create Sumsub launch link" });
  }
});

router.post("/applications/:id/sumsub-sync", async (req, res) => {
  try {
    if (!isSumsubConfigured()) {
      res.status(400).json({ error: "Sumsub is not configured" });
      return;
    }
    const id = req.params.id;
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        createdMemberId: true,
        verificationProviderApplicantId: true,
      },
    });
    if (!application) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!application.verificationProviderApplicantId) {
      res.status(400).json({ error: "No Sumsub applicant is recorded yet" });
      return;
    }

    const review = await getSumsubApplicantReview(
      application.verificationProviderApplicantId
    );
    const verificationData = mapSumsubReviewToVerificationData(review);

    await prisma.application.update({
      where: { id: application.id },
      data: verificationData,
    });

    if (application.createdMemberId) {
      await prisma.member.update({
        where: { id: application.createdMemberId },
        data: verificationData,
      });
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
      reviewStatus: review.reviewStatus,
      application: full ? serializeAdminApplication(full) : undefined,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not sync Sumsub status" });
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
        error:
          "No payment is recorded yet. The listing is created when the applicant completes checkout, or retry here after Stripe confirms payment.",
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
    let memberProvisioned: {
      temporaryPassword?: string;
      member: { id: string; slug: string; tvId: string };
      alreadyProvisioned?: boolean;
    } | null = null;
    if (prov.kind === "created") {
      memberProvisioned = {
        temporaryPassword: prov.temporaryPassword,
        member: prov.member,
      };
    } else if (prov.kind === "already_linked") {
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
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "NOT_FOUND"
    ) {
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
    } else {
      const exp = parseManualMembershipExpiryInput(
        req.body?.membershipExpiresAt
      );
      if (!before.membershipSubscribed) {
        if (!exp) {
          res.status(400).json({
            error:
              "membershipExpiresAt is required for manual membership (YYYY-MM-DD or ISO date)",
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
      } else {
        if (!exp) {
          res.status(400).json({
            error:
              "membershipExpiresAt is required to update manual membership expiry",
          });
          return;
        }
        if (before.manualMembershipExpiresAt == null) {
          res.status(400).json({
            error:
              "This membership was recorded via Stripe. Manage renewal in Stripe or have the member subscribe from the portal.",
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
            error:
              "This member is on Stripe billing; dates sync from the subscription.",
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
    let memberProvisioned: {
      temporaryPassword?: string;
      member: { id: string; slug: string; tvId: string };
      alreadyProvisioned?: boolean;
    } | null = null;
    if (prov.kind === "created") {
      memberProvisioned = {
        temporaryPassword: prov.temporaryPassword,
        member: prov.member,
      };
    } else if (prov.kind === "already_linked") {
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
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "NOT_FOUND"
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(500).json({ error: "Could not record manual payment" });
  }
});

router.get(
  "/applications/:applicationId/documents/:documentId/file",
  async (req, res) => {
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
      const resolved = applicationDocumentResolvedPath(
        doc.applicationId,
        doc.storedName
      );
      if (!resolved || !fs.existsSync(resolved)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(doc.originalName).replace(/'/g, "%27")}"`
      );
      res.type(doc.mimeType);
      res.sendFile(resolved);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not load file" });
    }
  }
);

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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not list leads" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      source,
      status,
      notes,
      jobTitle,
      jobDescription,
      jobPostcode,
    } = req.body ?? {};
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
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Could not create lead" });
  }
});

router.put("/leads/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      source,
      status,
      notes,
      jobTitle,
      jobDescription,
      jobPostcode,
    } = req.body ?? {};
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
        jobTitle:
          jobTitle !== undefined
            ? String(jobTitle || "").trim() || null
            : undefined,
        jobDescription:
          jobDescription !== undefined
            ? String(jobDescription || "").trim() || null
            : undefined,
        jobPostcode:
          jobPostcode !== undefined
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
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(400).json({ error: "Could not update lead" });
  }
});

async function deleteLeadById(req: Request, res: Response): Promise<void> {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
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

export default router;

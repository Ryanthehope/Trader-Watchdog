import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { notifyApplicantVerificationOutcome } from "../lib/adminMail.js";
import {
  getSumsubWebhookSecret,
  mapSumsubReviewToVerificationData,
  parseSumsubDate,
  verifySumsubWebhookSignature,
  type SumsubWebhookPayload,
} from "../lib/sumsub.js";

const TRACKED_WEBHOOK_TYPES = new Set([
  "applicantCreated",
  "applicantPending",
  "applicantPrechecked",
  "applicantOnHold",
  "applicantAwaitingService",
  "applicantAwaitingUser",
  "applicantReviewed",
  "applicantReset",
  "applicantStepsReset",
  "applicantLevelChanged",
  "applicantWorkflowCompleted",
  "applicantWorkflowFailed",
  "applicantVerificationLinkOpened",
]);

function sumsubEventDate(payload: SumsubWebhookPayload): Date | null {
  return (
    parseSumsubDate(payload.createdAt) ??
    parseSumsubDate(payload.createdAtMs) ??
    null
  );
}

export async function sumsubWebhookHandler(req: Request, res: Response) {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).type("text/plain").send("Expected raw body");
    return;
  }

  const secret = getSumsubWebhookSecret();
  if (secret && !verifySumsubWebhookSignature(rawBody, req.headers, secret)) {
    res.status(400).type("text/plain").send("Bad signature");
    return;
  }

  let payload: SumsubWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as SumsubWebhookPayload;
  } catch {
    res.status(400).type("text/plain").send("Invalid JSON");
    return;
  }

  if (!payload.type || !payload.applicantId) {
    res.status(400).type("text/plain").send("Missing applicant payload fields");
    return;
  }

  if (!TRACKED_WEBHOOK_TYPES.has(payload.type)) {
    res.json({ received: true, ignored: true });
    return;
  }

  try {
    const applicationWhere = payload.externalUserId
      ? {
          OR: [
            { id: payload.externalUserId },
            { verificationProviderApplicantId: payload.applicantId },
          ],
        }
      : {
          verificationProviderApplicantId: payload.applicantId,
        };

    const application = await prisma.application.findFirst({
      where: applicationWhere,
      select: {
        id: true,
        company: true,
        email: true,
        createdMemberId: true,
        verificationStatus: true,
        verificationSubmittedAt: true,
        verificationProviderApplicantId: true,
        verificationProviderSessionId: true,
        createdMember: {
          select: { slug: true },
        },
      },
    });

    if (!application) {
      res.json({ received: true, ignored: true, reason: "application_not_found" });
      return;
    }

    const eventDate = sumsubEventDate(payload);
    const verificationData = {
      verificationProvider: "sumsub" as const,
      verificationSubmittedAt:
        application.verificationSubmittedAt ?? eventDate ?? new Date(),
      verificationProviderApplicantId:
        application.verificationProviderApplicantId ?? payload.applicantId,
      verificationProviderSessionId:
        payload.inspectionId ?? application.verificationProviderSessionId ?? null,
      ...mapSumsubReviewToVerificationData({
        reviewStatus: payload.reviewStatus,
        createdAt: payload.createdAt,
        createdAtMs: payload.createdAtMs,
        reviewResult: payload.reviewResult,
      }),
    };

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

    if (
      verificationData.verificationStatus &&
      verificationData.verificationStatus !== application.verificationStatus &&
      (verificationData.verificationStatus === "APPROVED" ||
        verificationData.verificationStatus === "REJECTED")
    ) {
      notifyApplicantVerificationOutcome(prisma, {
        company: application.company,
        email: application.email,
        status: verificationData.verificationStatus,
        failureReason: verificationData.verificationFailureReason ?? null,
        profileSlug: application.createdMember?.slug ?? null,
      });
    }

    res.json({ received: true });
  } catch (e) {
    console.error("[sumsub webhook] handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
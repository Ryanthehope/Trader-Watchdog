import type { PrismaClient } from "@prisma/client";
import { createSumsubApplicant } from "./sumsub.js";
import { splitFullName } from "./sumsubVerificationSync.js";

type EnsureResult =
  | { kind: "not_found" }
  | {
      kind: "existing" | "created";
      applicationId: string;
      email: string;
      phone: string | null;
      registrationFeePaidAt: Date | null;
      applicantId: string;
      inspectionId: string | null;
      externalUserId: string;
    };

/**
 * Shared helper used by both the admin router and the public API.
 * Creates a Sumsub applicant for an application (or returns the existing one).
 */
export async function ensureSumsubApplicantForApplication(
  prisma: PrismaClient,
  id: string
): Promise<EnsureResult> {
  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      company: true,
      identifiablePerson: true,
      identifiablePersonAddress: true,
      registrationFeePaidAt: true,
      verificationProvider: true,
      verificationProviderApplicantId: true,
      verificationProviderSessionId: true,
    },
  });

  if (!application) return { kind: "not_found" };

  if (
    application.verificationProvider === "sumsub" &&
    application.verificationProviderApplicantId
  ) {
    return {
      kind: "existing",
      applicationId: application.id,
      email: application.email,
      phone: application.phone,
      registrationFeePaidAt: application.registrationFeePaidAt,
      applicantId: application.verificationProviderApplicantId,
      inspectionId: application.verificationProviderSessionId,
      externalUserId: application.id,
    };
  }

  const personName = splitFullName(
    application.identifiablePerson || application.company
  );

  const applicant = await createSumsubApplicant({
    externalUserId: application.id,
    email: application.email,
    phone: application.phone,
    firstName: personName.firstName,
    lastName: personName.lastName,
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
      addressVerificationStatus: "NOT_STARTED",
      addressVerificationApprovedAt: null,
      addressVerificationRejectedAt: null,
      addressVerificationFailureReason: null,
      addressVerificationMatchedAddress: null,
      addressVerificationMatchedApplication: null,
    },
  });

  return {
    kind: "created",
    applicationId: application.id,
    email: application.email,
    phone: application.phone,
    registrationFeePaidAt: application.registrationFeePaidAt,
    applicantId: applicant.id,
    inspectionId: applicant.inspectionId ?? null,
    externalUserId: applicant.externalUserId ?? application.id,
  };
}

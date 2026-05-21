import {
  getSumsubApplicantData,
  getSumsubApplicantVerificationSteps,
  mapSumsubReviewToVerificationData,
  parseSumsubDate,
  type SumsubApplicantDataResponse,
  type SumsubApplicantReviewResponse,
  type SumsubApplicantStepStatusResponse,
} from "./sumsub.js";

type VerificationStatus = "NOT_STARTED" | "IN_PROGRESS" | "APPROVED" | "REJECTED";

type ApplicationVerificationContext = {
  identifiablePersonAddress?: string | null;
  verificationSubmittedAt?: Date | null;
  verificationProviderApplicantId?: string | null;
  verificationProviderSessionId?: string | null;
};

type ReviewFallback = Partial<
  Pick<
    SumsubApplicantReviewResponse,
    "reviewStatus" | "reviewDate" | "createDate" | "createdAt" | "createdAtMs" | "reviewResult"
  >
>;

type BuildSumsubVerificationUpdateOptions = {
  applicantId?: string | null;
  inspectionId?: string | null;
  eventDate?: Date | null;
  fallbackReview?: ReviewFallback;
};

type SumsubAddressVerificationUpdate = {
  addressVerificationStatus: VerificationStatus;
  addressVerificationApprovedAt: Date | null;
  addressVerificationRejectedAt: Date | null;
  addressVerificationFailureReason: string | null;
  addressVerificationMatchedAddress: string | null;
  addressVerificationMatchedApplication: boolean | null;
};

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function splitFullName(fullName: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  const parts = cleanText(fullName)
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }

  if (parts.length === 1) {
    return { firstName: parts[0] ?? null, lastName: null };
  }

  return {
    firstName: parts.slice(0, -1).join(" ") || null,
    lastName: parts.at(-1) ?? null,
  };
}

function buildComparableAddress(value: string | null | undefined): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bapt\b/g, "apartment")
    .replace(/\bflat\b/g, "apartment")
    .replace(/\brd\b/g, "road")
    .replace(/\bst\b/g, "street")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bln\b/g, "lane")
    .replace(/\bdr\b/g, "drive")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensForAddress(value: string): Set<string> {
  return new Set(
    value
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
  );
}

function addressMatchesApplication(
  applicationAddress: string | null | undefined,
  verifiedAddress: string | null | undefined
): boolean | null {
  const left = buildComparableAddress(applicationAddress);
  const right = buildComparableAddress(verifiedAddress);

  if (!left || !right) {
    return null;
  }

  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = tokensForAddress(left);
  const rightTokens = tokensForAddress(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return null;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size) >= 0.75;
}

function formatAddress(address: Record<string, unknown> | null | undefined): string | null {
  if (!address || typeof address !== "object") {
    return null;
  }

  const formatted = cleanText(String(address.formattedAddress ?? ""));
  if (formatted) {
    return formatted;
  }

  const parts = [
    address.buildingName,
    address.flatNumber,
    address.buildingNumber,
    address.subStreet,
    address.street,
    address.town,
    address.state,
    address.postCode,
    address.country,
  ]
    .map((value) => cleanText(typeof value === "string" ? value : null))
    .filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function pickVerifiedAddress(profile: SumsubApplicantDataResponse | null): string | null {
  if (!profile) {
    return null;
  }

  const scoredInfoAddresses = (profile.info?.addresses ?? [])
    .map((address) => ({
      value: formatAddress(address),
      rank:
        address.source === "proofOfAddress"
          ? 0
          : address.source === "gps"
            ? 1
            : address.source === "externalDb"
              ? 2
              : address.source === "proofOfIdentity"
                ? 3
                : 4,
    }))
    .filter((entry): entry is { value: string; rank: number } => Boolean(entry.value))
    .sort((left, right) => left.rank - right.rank);

  const idDocAddresses = (profile.info?.idDocs ?? [])
    .map((doc) => formatAddress(doc.address))
    .filter((value): value is string => Boolean(value));
  const fixedAddresses = (profile.fixedInfo?.addresses ?? [])
    .map((address) => formatAddress(address))
    .filter((value): value is string => Boolean(value));

  return scoredInfoAddresses[0]?.value ?? idDocAddresses[0] ?? fixedAddresses[0] ?? null;
}

function pickProofOfResidenceStep(
  steps: SumsubApplicantStepStatusResponse | null
): { reviewResult?: ReviewFallback["reviewResult"] } | null {
  if (!steps) {
    return null;
  }

  const candidates = [steps.PROOF_OF_RESIDENCE, steps.PROOF_OF_RESIDENCE2].filter(
    Boolean
  );
  if (candidates.length === 0) {
    return null;
  }

  const approved = candidates.find(
    (step) => step?.reviewResult?.reviewAnswer === "GREEN"
  );
  if (approved) {
    return approved;
  }

  const rejected = candidates.find(
    (step) => step?.reviewResult?.reviewAnswer === "RED"
  );
  return rejected ?? candidates[0] ?? null;
}

function mapAddressVerificationData(
  applicationAddress: string | null | undefined,
  profile: SumsubApplicantDataResponse | null,
  steps: SumsubApplicantStepStatusResponse | null,
  review: ReviewFallback | undefined,
  eventDate: Date | null | undefined
): SumsubAddressVerificationUpdate {
  const poaStep = pickProofOfResidenceStep(steps);
  const verifiedAddress = pickVerifiedAddress(profile);
  const matchedApplication = addressMatchesApplication(
    applicationAddress,
    verifiedAddress
  );
  const resolvedDate =
    parseSumsubDate(review?.reviewDate) ??
    parseSumsubDate(review?.createdAt) ??
    parseSumsubDate(review?.createdAtMs) ??
    parseSumsubDate(review?.createDate) ??
    eventDate ??
    null;

  if (!poaStep) {
    return {
      addressVerificationStatus: "NOT_STARTED",
      addressVerificationApprovedAt: null,
      addressVerificationRejectedAt: null,
      addressVerificationFailureReason: null,
      addressVerificationMatchedAddress: verifiedAddress,
      addressVerificationMatchedApplication: matchedApplication,
    };
  }

  const failureReason =
    poaStep.reviewResult?.moderationComment?.trim() ||
    poaStep.reviewResult?.clientComment?.trim() ||
    poaStep.reviewResult?.rejectLabels?.join(", ") ||
    null;

  if (poaStep.reviewResult?.reviewAnswer === "GREEN") {
    return {
      addressVerificationStatus: "APPROVED",
      addressVerificationApprovedAt: resolvedDate,
      addressVerificationRejectedAt: null,
      addressVerificationFailureReason: null,
      addressVerificationMatchedAddress: verifiedAddress,
      addressVerificationMatchedApplication: matchedApplication,
    };
  }

  if (poaStep.reviewResult?.reviewAnswer === "RED") {
    return {
      addressVerificationStatus: "REJECTED",
      addressVerificationApprovedAt: null,
      addressVerificationRejectedAt: resolvedDate,
      addressVerificationFailureReason: failureReason,
      addressVerificationMatchedAddress: verifiedAddress,
      addressVerificationMatchedApplication: matchedApplication,
    };
  }

  return {
    addressVerificationStatus: "IN_PROGRESS",
    addressVerificationApprovedAt: null,
    addressVerificationRejectedAt: null,
    addressVerificationFailureReason: null,
    addressVerificationMatchedAddress: verifiedAddress,
    addressVerificationMatchedApplication: matchedApplication,
  };
}

export async function buildSumsubVerificationUpdate(
  application: ApplicationVerificationContext,
  options: BuildSumsubVerificationUpdateOptions = {}
) {
  const applicantId =
    cleanText(options.applicantId) ||
    cleanText(application.verificationProviderApplicantId) ||
    null;
  if (!applicantId) {
    throw new Error("No Sumsub applicant ID is recorded yet");
  }

  const [profileResult, stepsResult] = await Promise.allSettled([
    getSumsubApplicantData(applicantId),
    getSumsubApplicantVerificationSteps(applicantId),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const steps = stepsResult.status === "fulfilled" ? stepsResult.value : null;
  const review = profile?.review ?? options.fallbackReview;
  const verificationData = mapSumsubReviewToVerificationData(review ?? {});
  const addressVerificationData = mapAddressVerificationData(
    application.identifiablePersonAddress,
    profile,
    steps,
    review,
    options.eventDate
  );

  return {
    verificationProvider: "sumsub" as const,
    verificationSubmittedAt:
      application.verificationSubmittedAt ?? options.eventDate ?? new Date(),
    verificationProviderApplicantId: applicantId,
    verificationProviderSessionId:
      options.inspectionId ??
      profile?.inspectionId ??
      application.verificationProviderSessionId ??
      null,
    ...verificationData,
    ...addressVerificationData,
  };
}
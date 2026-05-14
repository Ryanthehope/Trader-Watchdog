import { createHmac } from "crypto";
import type { IncomingHttpHeaders } from "http";

type SumsubConfig = {
  appToken: string;
  secretKey: string;
  levelName: string;
  baseUrl: string;
};

type SumsubApplicantInput = {
  externalUserId: string;
  email: string;
  phone?: string | null;
  firstName: string | null;
  lastName: string | null;
};

type SumsubApplicantResponse = {
  id: string;
  inspectionId?: string;
  externalUserId?: string;
};

type SumsubWebSdkLinkInput = {
  userId: string;
  email: string;
  phone?: string | null;
  lang?: string;
  ttlInSecs?: number;
};

type SumsubWebSdkLinkResponse = {
  url: string;
};

type SumsubReviewResult = {
  reviewAnswer?: "GREEN" | "RED";
  rejectLabels?: string[];
  moderationComment?: string;
  clientComment?: string;
  reviewRejectType?: "FINAL" | "RETRY";
};

export type SumsubVerificationUpdate = {
  verificationStatus: "IN_PROGRESS" | "APPROVED" | "REJECTED";
  verificationApprovedAt: Date | null;
  verificationRejectedAt: Date | null;
  verificationFailureReason: string | null;
};

export type SumsubApplicantReviewResponse = {
  createDate?: string;
  reviewDate?: string;
  createdAt?: string;
  createdAtMs?: string;
  reviewStatus:
    | "init"
    | "pending"
    | "prechecked"
    | "queued"
    | "completed"
    | "onHold"
    | "awaitingService"
    | "awaitingUser"
    | string;
  reviewResult?: SumsubReviewResult;
};

export type SumsubWebhookPayload = {
  applicantId?: string;
  inspectionId?: string;
  externalUserId?: string;
  type?: string;
  reviewStatus?: string;
  createdAt?: string;
  createdAtMs?: string;
  sandboxMode?: boolean;
  reviewResult?: SumsubReviewResult;
};

function cleanEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function isSumsubConfigured(): boolean {
  return Boolean(cleanEnv(process.env.SUMSUB_APP_TOKEN)) &&
    Boolean(cleanEnv(process.env.SUMSUB_SECRET_KEY)) &&
    Boolean(cleanEnv(process.env.SUMSUB_LEVEL_NAME));
}

export function getSumsubWebhookSecret(): string | null {
  return cleanEnv(process.env.SUMSUB_WEBHOOK_SECRET) || null;
}

export function getSumsubConfig(): SumsubConfig {
  const appToken = cleanEnv(process.env.SUMSUB_APP_TOKEN);
  const secretKey = cleanEnv(process.env.SUMSUB_SECRET_KEY);
  const levelName = cleanEnv(process.env.SUMSUB_LEVEL_NAME);
  const baseUrl = cleanEnv(process.env.SUMSUB_BASE_URL) || "https://api.sumsub.com";

  if (!appToken || !secretKey || !levelName) {
    throw new Error("Sumsub configuration is incomplete.");
  }

  return {
    appToken,
    secretKey,
    levelName,
    baseUrl,
  };
}

export function createSumsubHeaders(
  method: string,
  path: string,
  body = ""
): Record<string, string> {
  const { appToken, secretKey } = getSumsubConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  return {
    "X-App-Token": appToken,
    "X-App-Access-Sig": signature,
    "X-App-Access-Ts": timestamp,
    "Content-Type": "application/json",
  };
}

async function sumsubJsonRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: string
): Promise<T> {
  const { baseUrl } = getSumsubConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: createSumsubHeaders(method, path, body ?? ""),
    ...(body ? { body } : {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Sumsub request failed: ${response.status} ${message}`
    );
  }

  return (await response.json()) as T;
}

export async function createSumsubApplicant(
  input: SumsubApplicantInput
): Promise<SumsubApplicantResponse> {
  const { levelName } = getSumsubConfig();
  const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
  const body = JSON.stringify({
    externalUserId: input.externalUserId,
    email: input.email,
    phone: input.phone ?? undefined,
    fixedInfo: {
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
    },
  });

  return sumsubJsonRequest<SumsubApplicantResponse>("POST", path, body);
}

export async function generateSumsubWebSdkLink(
  input: SumsubWebSdkLinkInput
): Promise<SumsubWebSdkLinkResponse> {
  const { levelName } = getSumsubConfig();
  const lang = cleanEnv(input.lang) || "en";
  const path = `/resources/sdkIntegrations/levels/-/websdkLink?lang=${encodeURIComponent(lang)}&source=api`;
  const body = JSON.stringify({
    levelName,
    userId: input.userId,
    applicantIdentifiers: {
      email: input.email,
      phone: input.phone ?? undefined,
    },
    ttlInSecs: input.ttlInSecs ?? 1800,
  });

  return sumsubJsonRequest<SumsubWebSdkLinkResponse>("POST", path, body);
}

export async function getSumsubApplicantReview(
  applicantId: string
): Promise<SumsubApplicantReviewResponse> {
  const path = `/resources/applicants/${encodeURIComponent(applicantId)}/status`;
  return sumsubJsonRequest<SumsubApplicantReviewResponse>("GET", path);
}

export function parseSumsubDate(value: string | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
    : `${normalized}Z`;
  const date = new Date(withTimezone);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function mapSumsubReviewToVerificationData(review: {
  reviewStatus?: string;
  reviewDate?: string;
  createDate?: string;
  createdAt?: string;
  createdAtMs?: string;
  reviewResult?: {
    reviewAnswer?: string;
    moderationComment?: string;
    clientComment?: string;
    rejectLabels?: string[];
  };
}): SumsubVerificationUpdate {
  const resolvedReviewDate =
    parseSumsubDate(review.reviewDate) ??
    parseSumsubDate(review.createdAt) ??
    parseSumsubDate(review.createdAtMs) ??
    parseSumsubDate(review.createDate);
  const failureReason =
    review.reviewResult?.moderationComment?.trim() ||
    review.reviewResult?.clientComment?.trim() ||
    review.reviewResult?.rejectLabels?.join(", ") ||
    null;

  if (
    review.reviewStatus === "completed" &&
    review.reviewResult?.reviewAnswer === "GREEN"
  ) {
    return {
      verificationStatus: "APPROVED",
      verificationApprovedAt: resolvedReviewDate,
      verificationRejectedAt: null,
      verificationFailureReason: null,
    };
  }

  if (
    review.reviewStatus === "completed" &&
    review.reviewResult?.reviewAnswer === "RED"
  ) {
    return {
      verificationStatus: "REJECTED",
      verificationApprovedAt: null,
      verificationRejectedAt: resolvedReviewDate,
      verificationFailureReason: failureReason,
    };
  }

  return {
    verificationStatus: "IN_PROGRESS",
    verificationApprovedAt: null,
    verificationRejectedAt: null,
    verificationFailureReason: null,
  };
}

function resolveWebhookDigestAlgorithm(
  digestAlg: string | undefined
): "sha1" | "sha256" | "sha512" {
  switch (digestAlg) {
    case "HMAC_SHA1_HEX":
      return "sha1";
    case "HMAC_SHA512_HEX":
      return "sha512";
    case "HMAC_SHA256_HEX":
    case undefined:
      return "sha256";
    default:
      throw new Error(`Unsupported Sumsub webhook digest algorithm: ${digestAlg}`);
  }
}

export function verifySumsubWebhookSignature(
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
  secret = getSumsubWebhookSecret()
): boolean {
  if (!secret) {
    return true;
  }

  const digestHeader = headers["x-payload-digest"];
  const digest = Array.isArray(digestHeader) ? digestHeader[0] : digestHeader;
  if (!digest) {
    return false;
  }

  const digestAlgHeader = headers["x-payload-digest-alg"];
  const digestAlg = Array.isArray(digestAlgHeader)
    ? digestAlgHeader[0]
    : digestAlgHeader;
  const algorithm = resolveWebhookDigestAlgorithm(digestAlg);
  const calculatedDigest = createHmac(algorithm, secret)
    .update(rawBody)
    .digest("hex");

  return calculatedDigest === digest;
}
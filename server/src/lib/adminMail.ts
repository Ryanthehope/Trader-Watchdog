import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { PrismaClient } from "@prisma/client";

async function sendViaResend(
  apiKey: string,
  opts: { from: string; to: string; subject: string; text: string }
): Promise<void> {
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: opts.from,
    to: opts.to.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
    subject: opts.subject,
    text: opts.text,
  });
  if (result.error) {
    throw new Error(`Resend: ${result.error.message}`);
  }
}

let cachedTransport: nodemailer.Transporter | null | undefined;

/** Call after saving SMTP settings in the database. */
export function invalidateSmtpTransportCache(): void {
  cachedTransport = undefined;
}

async function getOrgSmtp(prisma: PrismaClient) {
  return prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPass: true,
      mailFrom: true,
    },
  });
}

async function getTransport(
  prisma: PrismaClient
): Promise<nodemailer.Transporter | null> {
  if (cachedTransport !== undefined) return cachedTransport;
  const org = await getOrgSmtp(prisma);
  const host =
    process.env.SMTP_HOST?.trim() || org?.smtpHost?.trim() || "";
  if (!host) {
    cachedTransport = null;
    return null;
  }
  const portRaw =
    process.env.SMTP_PORT?.trim() ||
    (org?.smtpPort != null ? String(org.smtpPort) : "");
  const port = Number(portRaw || "587") || 587;
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" ||
    secureEnv === "1" ||
    (org?.smtpSecure ?? false) ||
    port === 465;
  const user = process.env.SMTP_USER?.trim() || org?.smtpUser?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || org?.smtpPass?.trim() || "";
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user || pass
      ? {
          auth: {
            user: user || "",
            pass: pass || "",
          },
        }
      : {}),
  });
  return cachedTransport;
}

export async function getBrandName(prisma: PrismaClient): Promise<string> {
  const s = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { siteDisplayName: true, workspaceName: true },
  });
  const name =
    s?.siteDisplayName?.trim() ||
    s?.workspaceName?.trim() ||
    "";
  return name || "Trader Watchdog";
}

async function mailFrom(prisma: PrismaClient): Promise<string> {
  const env = process.env.MAIL_FROM?.trim();
  if (env) return env;
  const org = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { mailFrom: true },
  });
  const raw = org?.mailFrom?.trim();
  if (raw) return raw;
  const brand = await getBrandName(prisma);
  return `${brand} <noreply@localhost>`;
}

async function resolveRecipients(prisma: PrismaClient): Promise<string[]> {
  const envList = process.env.ADMIN_NOTIFY_EMAILS?.trim();
  if (envList) {
    return envList
      .split(/[,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const org = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: {
      adminNotifyEmails: true,
      announcementEmail: true,
    },
  });
  const multi = org?.adminNotifyEmails?.trim();
  if (multi) {
    return multi
      .split(/[,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const a = org?.announcementEmail?.trim().toLowerCase();
  if (a) return [a];
  const contact = process.env.CONTACT_EMAIL?.trim().toLowerCase();
  if (contact) return [contact];
  return [];
}

function resolveRedirectRecipients(): string[] {
  const envList = process.env.EMAIL_REDIRECT_TO?.trim();
  if (!envList) return [];
  return envList
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function redirectedText(originalTo: string, text: string): string {
  return [`[Email redirect active] Original recipient: ${originalTo}`, "", text].join(
    "\n"
  );
}

export async function publicSiteBase(prisma: PrismaClient): Promise<string> {
  const org = await prisma.organizationSettings.findUnique({
    where: { id: "default" },
    select: { publicSiteUrl: true },
  });
  const fromDb = org?.publicSiteUrl?.trim();
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim();
  const u = fromDb || fromEnv || "";
  return u.replace(/\/$/, "") || "http://localhost:5173";
}

/**
 * Sends a plain-text email to ops addresses when SMTP + at least one recipient exist.
 * Pass `overrideTo` to send to a specific address instead (used for SMTP testing).
 */
export async function sendAdminEmail(
  prisma: PrismaClient,
  opts: { subject: string; text: string; overrideTo?: string }
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const transport = resendKey ? null : await getTransport(prisma);
  if (!resendKey && !transport) {
    if (opts.overrideTo) {
      throw new Error("Email is not configured. Set RESEND_API_KEY or save SMTP settings first.");
    }
    console.warn(
      "[admin-mail] Skipped admin email: email is not configured"
    );
    return;
  }
  let to: string[];
  if (opts.overrideTo) {
    to = [opts.overrideTo];
  } else {
    const redirectedTo = resolveRedirectRecipients();
    to = redirectedTo.length > 0 ? redirectedTo : await resolveRecipients(prisma);
    if (to.length === 0) {
      console.warn(
        "[admin-mail] Skipped (no recipients): set EMAIL_REDIRECT_TO for test routing, ADMIN_NOTIFY_EMAILS env, Staff -> Settings notification emails / ops email, or CONTACT_EMAIL"
      );
      return;
    }
  }
  const brand = await getBrandName(prisma);
  const from = await mailFrom(prisma);
  const subject = opts.subject.startsWith("[")
    ? opts.subject
    : `[${brand}] ${opts.subject}`;
  const text = opts.overrideTo ? opts.text : (
    resolveRedirectRecipients().length > 0
      ? redirectedText("admin notification list", opts.text)
      : opts.text
  );
  if (resendKey) {
    await sendViaResend(resendKey, { from, to: to.join(", "), subject, text });
  } else {
    await transport!.sendMail({ from, to: to.join(", "), subject, text });
  }
}

export async function sendApplicantEmail(
  prisma: PrismaClient,
  opts: { to: string; subject: string; text: string }
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const transport = resendKey ? null : await getTransport(prisma);
  if (!resendKey && !transport) {
    console.warn(
      `[admin-mail] Skipped applicant email to ${opts.to || "(blank)"}: email is not configured`
    );
    return;
  }
  const originalTo = opts.to.trim().toLowerCase();
  if (!originalTo) {
    console.warn("[admin-mail] Skipped applicant email: recipient address is blank");
    return;
  }
  const redirectedTo = resolveRedirectRecipients();
  const to = redirectedTo.length > 0 ? redirectedTo.join(", ") : originalTo;
  const brand = await getBrandName(prisma);
  const from = await mailFrom(prisma);
  const subject = opts.subject.startsWith("[")
    ? opts.subject
    : `[${brand}] ${opts.subject}`;
  const text = redirectedTo.length > 0 ? redirectedText(originalTo, opts.text) : opts.text;
  if (resendKey) {
    await sendViaResend(resendKey, { from, to, subject, text });
  } else {
    await transport!.sendMail({ from, to, subject, text });
  }
}

export function notifyAdminsFireAndForget(
  prisma: PrismaClient,
  subject: string,
  text: string
): void {
  void sendAdminEmail(prisma, { subject, text }).catch((e) => {
    console.error("[admin-mail] send failed", e);
  });
}

export function notifyNewApplication(
  prisma: PrismaClient,
  row: {
    id: string;
    company: string;
    trade: string;
    email: string;
    phone?: string | null;
    postcode: string;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const text = [
      "A new membership application was submitted.",
      "",
      `Company: ${row.company}`,
      `Trade: ${row.trade}`,
      `Email: ${row.email}`,
      row.phone ? `Phone: ${row.phone}` : null,
      `Postcode: ${row.postcode}`,
      "",
      `Review: ${base}/staff/applications`,
      `Application id: ${row.id}`,
    ].filter(Boolean).join("\n");
    notifyAdminsFireAndForget(
      prisma,
      `New application — ${row.company}`,
      text
    );
  })();
}

export function notifyApplicationDecision(
  prisma: PrismaClient,
  row: {
    id: string;
    company: string;
    trade: string;
    email: string;
    status: string;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const text = [
      `Application status is now ${row.status}.`,
      "",
      `Company: ${row.company}`,
      `Trade: ${row.trade}`,
      `Applicant email: ${row.email}`,
      "",
      `Open: ${base}/staff/applications`,
      `Application id: ${row.id}`,
    ].join("\n");
    notifyAdminsFireAndForget(
      prisma,
      `Application ${row.status} — ${row.company}`,
      text
    );
  })();
}

export function notifyApplicantSubmissionReceived(
  prisma: PrismaClient,
  row: {
    id: string;
    company: string;
    traderName?: string | null;
    trade: string;
    email: string;
  }
): void {
  void (async () => {
    const traderName = row.traderName?.trim() || row.company;
    const supportEmail = process.env.CONTACT_EMAIL?.trim() || "support@traderwatchdog.co.uk";
    const text = [
      `Hi ${traderName},`,
      "",
      "Welcome to Trader Watchdog - great to have you with us. You've taken a big step toward showing customers you're genuine, insured, and accountable.",
      "",
      "We'll now start reviewing your documents. If we need anything else, we'll let you know.",
      "",
      `If you ever need help, just email us at ${supportEmail}.`,
      "",
      "Thanks again for joining us,",
      "The Trader Watchdog Team",
    ].join("\n");

    await sendApplicantEmail(prisma, {
      to: row.email,
      subject: "Welcome to Trader Watchdog - Let's Get You Verified",
      text,
    });
  })().catch((e) => {
    console.error("[admin-mail] applicant submission send failed", e);
  });
}

export function notifyApplicantVerificationOutcome(
  prisma: PrismaClient,
  row: {
    traderName?: string | null;
    company: string;
    email: string;
    status: "APPROVED" | "REJECTED";
    failureReason?: string | null;
    profileSlug?: string | null;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const memberLoginUrl = `${base}/member/login`;
    const traderName = row.traderName?.trim() || row.company;

    const subject =
      row.status === "APPROVED"
        ? "You're Verified - Your QR Is Ready"
        : "We Couldn't Complete Your Verification";

    const text =
      row.status === "APPROVED"
        ? [
            `Hi ${traderName},`,
            "",
            "Great news - you're now a verified Trader Watchdog member.",
            "",
            "Your verification page is live, and your QR code is ready to use on:",
            "- Vehicles",
            "- Websites",
            "- Social media",
            "- Flyers and business cards",
            "- Quotes and invoices",
            "",
            "This is your moment to stand out as a trusted, legitimate trader.",
            "",
            `Member login: ${memberLoginUrl}`,
            "",
            "If you need anything, we're here.",
            "The Trader Watchdog Team",
          ].join("\n")
        : [
            `Hi ${traderName},`,
            "",
            "We've reviewed your documents but unfortunately couldn't verify your account because:",
            row.failureReason
              ? `- ${row.failureReason}`
              : "- We still need corrected or additional evidence before we can approve the verification.",
            "",
            "If you can provide updated or correct documents, we're happy to review again.",
            "If you need help, just reply to this email.",
            "The Trader Watchdog Team",
          ].join("\n");

    await sendApplicantEmail(prisma, {
      to: row.email,
      subject,
      text,
    });
  })().catch((e) => {
    console.error("[admin-mail] applicant verification send failed", e);
  });
}

export function notifyApplicantApprovedForPayment(
  prisma: PrismaClient,
  row: {
    traderName?: string | null;
    company: string;
    email: string;
    registrationFeePaid: boolean;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const joinUrl = `${base}/join`;
    const traderName = row.traderName?.trim() || row.company;
    const nextStep = row.registrationFeePaid
      ? "Your registration fee has already been recorded. To complete setup, return to the join page using the same email address and pay the annual membership."
      : "To get started, return to the join page using the same email address to pay the registration fee. The annual membership step will then unlock automatically.";
    const text = [
      `Hi ${traderName},`,
      "",
      "Good news - your Trader Watchdog application has been approved.",
      "",
      nextStep,
      "",
      `Continue here: ${joinUrl}`,
      "",
      "Once payment is complete, your public listing and member login will be created.",
      "",
      "If you need help, just reply to this email.",
      "The Trader Watchdog Team",
    ].join("\n");

    await sendApplicantEmail(prisma, {
      to: row.email,
      subject: "Your Application Has Been Approved - Annual Membership Ready",
      text,
    });
  })().catch((e) => {
    console.error("[admin-mail] applicant approval send failed", e);
  });
}

export function notifyMemberWelcome(
  prisma: PrismaClient,
  row: {
    email: string;
    name: string;
    temporaryPassword: string;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const loginUrl = `${base}/member/login`;
    const brand = await getBrandName(prisma);
    const text = [
      `Hi ${row.name},`,
      "",
      `Your ${brand} member portal account is ready.`,
      "",
      "Sign in using the details below:",
      `  Email:    ${row.email}`,
      `  Password: ${row.temporaryPassword}`,
      "",
      `Log in here: ${loginUrl}`,
      "",
      "You will be asked to set a new password after your first sign-in. Save the password above before logging in.",
      "",
      "If you need any help, just reply to this email.",
      `The ${brand} Team`,
    ].join("\n");
    await sendApplicantEmail(prisma, {
      to: row.email,
      subject: "Your member portal is ready — sign-in details inside",
      text,
    });
  })().catch((e) => {
    console.error("[admin-mail] member welcome send failed", e);
  });
}

export async function sendPasswordResetEmail(
  prisma: PrismaClient,
  toEmail: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const transport = resendKey ? null : await getTransport(prisma);
  if (!resendKey && !transport) return;
  const brand = await getBrandName(prisma);
  const from = await mailFrom(prisma);
  const subject = `Reset your ${brand} password`;
  const text = [
    `Hi ${name},`,
    "",
    `Someone requested a password reset for your ${brand} member portal account.`,
    "",
    "Reset your password using the link below (expires in 1 hour):",
    resetUrl,
    "",
    "If you did not request this, you can safely ignore this email — your password will not change.",
    "",
    `The ${brand} Team`,
  ].join("\n");
  if (resendKey) {
    await sendViaResend(resendKey, { from, to: toEmail, subject, text });
  } else {
    await transport!.sendMail({ from, to: toEmail, subject, text });
  }
}

export function notifySubscriptionRenewed(
  prisma: PrismaClient,
  row: {
    traderName?: string | null;
    email: string;
    renewedUntil: Date;
  }
): void {
  void (async () => {
    const traderName = row.traderName?.trim() || "there";
    const renewedUntil = row.renewedUntil.toLocaleDateString("en-GB");
    const text = [
      `Hi ${traderName},`,
      "",
      "Your subscription has successfully renewed. Thanks for continuing to be part of Trader Watchdog - we're glad to have you with us.",
      "",
      `Your membership is now active until ${renewedUntil}.`,
      "",
      "If you need anything, we're here.",
      "The Trader Watchdog Team",
    ].join("\n");

    await sendApplicantEmail(prisma, {
      to: row.email,
      subject: "Your Subscription Has Renewed",
      text,
    });
  })().catch((e) => {
    console.error("[admin-mail] renewal confirmation send failed", e);
  });
}


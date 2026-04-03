import nodemailer from "nodemailer";
import type { PrismaClient } from "@prisma/client";

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
  return name || "TradeVerify";
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
 */
export async function sendAdminEmail(
  prisma: PrismaClient,
  opts: { subject: string; text: string }
): Promise<void> {
  const transport = await getTransport(prisma);
  if (!transport) {
    return;
  }
  const to = await resolveRecipients(prisma);
  if (to.length === 0) {
    console.warn(
      "[admin-mail] Skipped (no recipients): set ADMIN_NOTIFY_EMAILS env, or Staff → Settings → notification emails / ops email, or CONTACT_EMAIL"
    );
    return;
  }
  const brand = await getBrandName(prisma);
  const from = await mailFrom(prisma);
  const subject = opts.subject.startsWith("[")
    ? opts.subject
    : `[${brand}] ${opts.subject}`;
  await transport.sendMail({
    from,
    to: to.join(", "),
    subject,
    text: opts.text,
  });
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

export function notifyNewLead(
  prisma: PrismaClient,
  lead: {
    id: string;
    name: string;
    source: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    jobTitle: string | null;
    jobPostcode: string | null;
  }
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const lines = [
      `New lead (${lead.source})`,
      "",
      `Name: ${lead.name}`,
      lead.email ? `Email: ${lead.email}` : null,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.jobTitle ? `Job title: ${lead.jobTitle}` : null,
      lead.jobPostcode ? `Postcode: ${lead.jobPostcode}` : null,
      lead.notes ? `Notes: ${lead.notes}` : null,
      "",
      `Staff leads: ${base}/staff/outreach/leads`,
      `Lead id: ${lead.id}`,
    ].filter((x) => x !== null);
    notifyAdminsFireAndForget(
      prisma,
      `New lead — ${lead.name}`,
      lines.join("\n")
    );
  })();
}

export function notifyNewApplication(
  prisma: PrismaClient,
  row: {
    id: string;
    company: string;
    trade: string;
    email: string;
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
      `Postcode: ${row.postcode}`,
      "",
      `Review: ${base}/staff/applications`,
      `Application id: ${row.id}`,
    ].join("\n");
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

export function notifyStripeSubscriptionEnded(
  prisma: PrismaClient,
  member: {
    name: string;
    tvId: string;
    loginEmail: string | null;
  },
  stripeSubscriptionId: string
): void {
  void (async () => {
    const base = await publicSiteBase(prisma);
    const text = [
      "A member’s Stripe subscription ended or was cancelled.",
      "",
      `Business: ${member.name}`,
      `TV ID: ${member.tvId}`,
      member.loginEmail ? `Portal email: ${member.loginEmail}` : null,
      `Stripe subscription: ${stripeSubscriptionId}`,
      "",
      `Members: ${base}/staff/members`,
    ]
      .filter((x) => x !== null)
      .join("\n");
    notifyAdminsFireAndForget(
      prisma,
      `Membership subscription ended — ${member.name}`,
      text
    );
  })();
}

import nodemailer from "nodemailer";
let cachedTransport;
/** Call after saving SMTP settings in the database. */
export function invalidateSmtpTransportCache() {
    cachedTransport = undefined;
}
async function getOrgSmtp(prisma) {
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
async function getTransport(prisma) {
    if (cachedTransport !== undefined)
        return cachedTransport;
    const org = await getOrgSmtp(prisma);
    const host = process.env.SMTP_HOST?.trim() || org?.smtpHost?.trim() || "";
    if (!host) {
        cachedTransport = null;
        return null;
    }
    const portRaw = process.env.SMTP_PORT?.trim() ||
        (org?.smtpPort != null ? String(org.smtpPort) : "");
    const port = Number(portRaw || "587") || 587;
    const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
    const secure = secureEnv === "true" ||
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
export async function getBrandName(prisma) {
    const s = await prisma.organizationSettings.findUnique({
        where: { id: "default" },
        select: { siteDisplayName: true, workspaceName: true },
    });
    const name = s?.siteDisplayName?.trim() ||
        s?.workspaceName?.trim() ||
        "";
    return name || "Trader Watchdog";
}
async function mailFrom(prisma) {
    const env = process.env.MAIL_FROM?.trim();
    if (env)
        return env;
    const org = await prisma.organizationSettings.findUnique({
        where: { id: "default" },
        select: { mailFrom: true },
    });
    const raw = org?.mailFrom?.trim();
    if (raw)
        return raw;
    const brand = await getBrandName(prisma);
    return `${brand} <noreply@localhost>`;
}
async function resolveRecipients(prisma) {
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
    if (a)
        return [a];
    const contact = process.env.CONTACT_EMAIL?.trim().toLowerCase();
    if (contact)
        return [contact];
    return [];
}
function resolveRedirectRecipients() {
    const envList = process.env.EMAIL_REDIRECT_TO?.trim();
    if (!envList)
        return [];
    return envList
        .split(/[,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}
function redirectedText(originalTo, text) {
    return [`[Email redirect active] Original recipient: ${originalTo}`, "", text].join("\n");
}
export async function publicSiteBase(prisma) {
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
export async function sendAdminEmail(prisma, opts) {
    const transport = await getTransport(prisma);
    if (!transport) {
        return;
    }
    const redirectedTo = resolveRedirectRecipients();
    const to = redirectedTo.length > 0 ? redirectedTo : await resolveRecipients(prisma);
    if (to.length === 0) {
        console.warn("[admin-mail] Skipped (no recipients): set EMAIL_REDIRECT_TO for test routing, ADMIN_NOTIFY_EMAILS env, Staff -> Settings notification emails / ops email, or CONTACT_EMAIL");
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
        text: redirectedTo.length > 0
            ? redirectedText("admin notification list", opts.text)
            : opts.text,
    });
}
export async function sendApplicantEmail(prisma, opts) {
    const transport = await getTransport(prisma);
    if (!transport) {
        return;
    }
    const originalTo = opts.to.trim().toLowerCase();
    if (!originalTo) {
        return;
    }
    const redirectedTo = resolveRedirectRecipients();
    const to = redirectedTo.length > 0 ? redirectedTo.join(", ") : originalTo;
    const brand = await getBrandName(prisma);
    const from = await mailFrom(prisma);
    const subject = opts.subject.startsWith("[")
        ? opts.subject
        : `[${brand}] ${opts.subject}`;
    await transport.sendMail({
        from,
        to,
        subject,
        text: redirectedTo.length > 0
            ? redirectedText(originalTo, opts.text)
            : opts.text,
    });
}
export function notifyAdminsFireAndForget(prisma, subject, text) {
    void sendAdminEmail(prisma, { subject, text }).catch((e) => {
        console.error("[admin-mail] send failed", e);
    });
}
export function notifyNewApplication(prisma, row) {
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
        notifyAdminsFireAndForget(prisma, `New application — ${row.company}`, text);
    })();
}
export function notifyApplicationDecision(prisma, row) {
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
        notifyAdminsFireAndForget(prisma, `Application ${row.status} — ${row.company}`, text);
    })();
}
export function notifyApplicantSubmissionReceived(prisma, row) {
    void (async () => {
        const base = await publicSiteBase(prisma);
        const joinUrl = `${base}/join`;
        const text = [
            `Thanks for submitting your Trader Watchdog application for ${row.company}.`,
            "",
            "We have received your details and the team will now review the application, supporting documents, and verification requirements.",
            "",
            "What happens next:",
            "1. We review the business details, documents, and any checks needed for your trade.",
            "2. If we need anything else, we will contact you using this email address.",
            "3. Once approved, we will email you again with the next steps for payment and profile setup.",
            "",
            "Important:",
            "- No payment is taken at application stage.",
            `- Your application reference is: ${row.id}`,
            `- You can return to ${joinUrl} later to check progress using the same email address.`,
            "",
            `Trade / specialism: ${row.trade}`,
            `Work email: ${row.email}`,
            "",
            "If you need to update anything after submitting, reply to this email.",
        ].join("\n");
        await sendApplicantEmail(prisma, {
            to: row.email,
            subject: `Application received — ${row.company}`,
            text,
        });
    })().catch((e) => {
        console.error("[admin-mail] applicant submission send failed", e);
    });
}
export function notifyApplicantVerificationOutcome(prisma, row) {
    void (async () => {
        const base = await publicSiteBase(prisma);
        const memberLoginUrl = `${base}/member/login`;
        const joinUrl = `${base}/join`;
        const profileUrl = row.profileSlug ? `${base}/m/${row.profileSlug}` : null;
        const qrMessage = "Your verification page is live, and your Trader Watchdog QR code is ready to use on vehicles, websites, social media, flyers, business cards, quotes, and invoices.";
        const subject = row.status === "APPROVED"
            ? `Verification approved — ${row.company}`
            : `We could not complete verification — ${row.company}`;
        const text = row.status === "APPROVED"
            ? [
                `Your verification review for ${row.company} is complete.`,
                "",
                profileUrl
                    ? "Great news — your verification is approved and your Trader Watchdog profile is now live."
                    : "Great news — your verification is approved. We have completed the document and identity checks for your application.",
                "",
                qrMessage,
                "",
                profileUrl ? `Public profile: ${profileUrl}` : null,
                profileUrl ? `Member login: ${memberLoginUrl}` : `Check progress: ${joinUrl}`,
                "",
                "If you need anything, just reply to this email.",
            ]
                .filter(Boolean)
                .join("\n")
            : [
                `We reviewed the verification documents for ${row.company}, but could not complete verification at this time.`,
                "",
                row.failureReason
                    ? `Reason: ${row.failureReason}`
                    : "Reason: We still need corrected or additional evidence before we can approve the verification.",
                "",
                "If you can provide updated or correct documents, reply to this email and we will review them again.",
                `You can also return to ${joinUrl} using the same email address to check the application status.`,
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

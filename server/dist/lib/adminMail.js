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
export function notifyApplicantVerificationOutcome(prisma, row) {
    void (async () => {
        const base = await publicSiteBase(prisma);
        const memberLoginUrl = `${base}/member/login`;
        const traderName = row.traderName?.trim() || row.company;
        const subject = row.status === "APPROVED"
            ? "You're Verified - Your QR Is Ready"
            : "We Couldn't Complete Your Verification";
        const text = row.status === "APPROVED"
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
export function notifyApplicantApprovedForPayment(prisma, row) {
    void (async () => {
        const base = await publicSiteBase(prisma);
        const joinUrl = `${base}/join`;
        const traderName = row.traderName?.trim() || row.company;
        const text = [
            `Hi ${traderName},`,
            "",
            "Good news - your Trader Watchdog application has been approved.",
            "",
            "Your registration fee has already been recorded. To complete setup, return to the join page using the same email address and pay the annual membership.",
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
export function notifySubscriptionRenewed(prisma, row) {
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

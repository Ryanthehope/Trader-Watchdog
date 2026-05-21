import { prisma } from "../db.js";
import { getBrandName, publicSiteBase, sendApplicantEmail } from "./adminMail.js";

interface AlertsSent {
    "30days"?: string;
    "14days"?: string;
    grace?: string;
}

function generateAlertEmail(
    memberName: string,
    insuranceType: string,
    expiryDate: Date,
    daysUntilExpiry: number,
    brandName: string,
    memberLoginUrl: string
): { subject: string; text: string } {
    const expiryDateStr = expiryDate.toLocaleDateString("en-GB");

    let subject = "Your Insurance Renews Soon";
    let message = `Your ${insuranceType} is due to expire on ${expiryDateStr}. Please upload your renewed policy before the expiry date so your verified status stays active.`;

    if (daysUntilExpiry === 14) {
        subject = "Your Insurance Is About to Expire";
        message = `Your ${insuranceType} is due to expire on ${expiryDateStr}. To stay verified, please upload your renewed policy as soon as possible.`;
    } else if (daysUntilExpiry < 0) {
        subject = "Your Verification Has Been Paused";
        message = `Your ${insuranceType} expired on ${expiryDateStr}, so we have temporarily paused your verification. Upload your renewed policy and we will reactivate your verification once it has been reviewed.`;
    }

    return {
        subject,
        text: [
            `Hi ${memberName},`,
            "",
            message,
            "",
            `Insurance type: ${insuranceType}`,
            `Expiry date: ${expiryDateStr}`,
            "",
            `Log in to your ${brandName} account to manage your insurance details: ${memberLoginUrl}`,
            "",
            `Thanks,`,
            `The ${brandName} Team`,
        ].join("\n"),
    };
}

export async function sendInsuranceAlertEmail(
    insuranceId: string,
    alertType: "30days" | "14days" | "grace"
): Promise<boolean> {
    try {
        const insurance = await prisma.insurance.findUnique({
            where: { id: insuranceId },
            include: {
                member: {
                    select: {
                        id: true,
                        name: true,
                        loginEmail: true,
                    },
                },
            },
        });

        if (!insurance || !insurance.member.loginEmail) {
            console.error(
                `Insurance or member not found or member has no email: ${insuranceId}`
            );
            return false;
        }

        const today = new Date();
        const expiry = new Date(insurance.expiryDate);
        const daysUntil = Math.floor(
            (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const brandName = await getBrandName(prisma);
        const memberLoginUrl = `${await publicSiteBase(prisma)}/member/login`;
        const { subject, text } = generateAlertEmail(
            insurance.member.name,
            insurance.type,
            expiry,
            daysUntil,
            brandName,
            memberLoginUrl
        );

        await sendApplicantEmail(prisma, {
            to: insurance.member.loginEmail,
            subject,
            text,
        });

        const currentAlerts = (insurance.alertsSent as AlertsSent) || {};
        currentAlerts[alertType] = new Date().toISOString();

        await prisma.insurance.update({
            where: { id: insuranceId },
            data: {
                alertsSent: currentAlerts as any,
                lastAlertSentAt: new Date(),
            },
        });

        console.log(
            `✅ Sent ${alertType} alert for ${insurance.type} to ${insurance.member.name}`
        );
        return true;
    } catch (error) {
        console.error("Error sending insurance alert:", error);
        return false;
    }
}

export async function checkInsuranceExpiries(): Promise<{
    checked: number;
    alertsSent: number;
    statusesUpdated: number;
}> {
    try {
        const policies = await prisma.insurance.findMany({
            where: {
                status: { in: ["active", "expiring_soon", "in_grace"] },
            },
            include: {
                member: {
                    select: {
                        id: true,
                        name: true,
                        loginEmail: true,
                    },
                },
            },
        });

        let alertsSent = 0;
        let statusesUpdated = 0;

        for (const policy of policies) {
            const today = new Date();
            const expiry = new Date(policy.expiryDate);
            const daysUntilExpiry = Math.floor(
                (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            let newStatus = policy.status;
            if (daysUntilExpiry < 0) {
                if (policy.graceExpiryDate) {
                    const graceExpiry = new Date(policy.graceExpiryDate);
                    const daysUntilGraceExpiry = Math.floor(
                        (graceExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    newStatus = daysUntilGraceExpiry < 0 ? "expired" : "in_grace";
                } else {
                    newStatus = "expired";
                }
            } else if (daysUntilExpiry <= 30) {
                newStatus = "expiring_soon";
            } else {
                newStatus = "active";
            }

            if (newStatus !== policy.status) {
                await prisma.insurance.update({
                    where: { id: policy.id },
                    data: { status: newStatus },
                });
                statusesUpdated++;
            }

            const alerts = (policy.alertsSent as AlertsSent) || {};
            if (daysUntilExpiry === 30 && !alerts["30days"]) {
                const sent = await sendInsuranceAlertEmail(policy.id, "30days");
                if (sent) alertsSent++;
            }

            if (daysUntilExpiry === 14 && !alerts["14days"]) {
                const sent = await sendInsuranceAlertEmail(policy.id, "14days");
                if (sent) alertsSent++;
            }

            if (newStatus === "in_grace" && !alerts.grace) {
                const sent = await sendInsuranceAlertEmail(policy.id, "grace");
                if (sent) alertsSent++;
            }
        }

        console.log(
            `✅ Insurance check complete: ${policies.length} checked, ${alertsSent} alerts sent, ${statusesUpdated} statuses updated`
        );

        return {
            checked: policies.length,
            alertsSent,
            statusesUpdated,
        };
    } catch (error) {
        console.error("Error checking insurance expiries:", error);
        return { checked: 0, alertsSent: 0, statusesUpdated: 0 };
    }
}

export { AlertsSent, generateAlertEmail };

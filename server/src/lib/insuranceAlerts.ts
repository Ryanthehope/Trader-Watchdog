import { prisma } from "../db.js";
import { getBrandName } from "./adminMail.js";
import nodemailer from "nodemailer";

interface AlertsSent {
    "30days"?: string;
    "14days"?: string;
    "grace"?: string;
}

/**
*Get email transport (reusing from adminMail pattern)
*/

async function getTransport(): Promise<nodemailer.Transporter | null> {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT) || 587;
    const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
    const secure = secureEnv === "true" || port === 465;
    const user = process.env.SMTP_USER?.trim() || "";
    const pass = process.env.SMTP_PASS?.trim() || "";
    
    return nodemailer.createTransport({
        host,
        port,
        secure,
        ...(user || pass ? { auth: { user, pass } } : {}),
    });
}

/**
* Generate email content for insurance expiry alert
* */

function generateAlertEmail(
    memberName: string,
    insuranceType: string,
    expiryDate: Date,
    daysUntilExpiry: number,
    brandName: string)
: { subject: string; html: string; text: string } {
    const expiryDateStr = expiryDate.toLocaleDateString("en-gb"); 

    let urgency = "";
    let message = "";

    if (daysUntilExpiry === 30) {
        urgency = "30-Day Notice";
        message = `Your ${insuranceType} will expire in 30 days (${expiryDateStr}). Please ensure you renew it before expiry to maintain your verified status.`;
    } else if (daysUntilExpiry === 14) {
        urgency = "14-Day Notice";
        message = `Your ${insuranceType} will expire in 14 days (${expiryDateStr}). Please renew it now to avoid losing your verified status.`;
    } else if (daysUntilExpiry < 0) {
        urgency = "Expired Notice";
        message = `Your ${insuranceType} expired on ${expiryDateStr}. You have 14 days grace period to renew before your listing is removed from ${brandName}`;
    }
    const subject = `${urgency}: ${insuranceType} Expiry - ${memberName}`;
    const html = `
    <h2>${urgency}</h2>
    <p>Hello ${memberName},</p>
    <p>${message}</p>
    <p><strong>Insurance Details</strong></p>
    <ul>
    <li>Type: ${insuranceType}</li>
    <li>Expiry Date: ${expiryDateStr}</li>
    <li>Days ${daysUntilExpiry < 0 ? 'since expiry' : 'until expiry'}: ${Math.abs(daysUntilExpiry)}</li>
    </ul>
    <p>Please log into your ${brandName} account to manage your insurance details.</p>
    <p>Best Regards,<br>${brandName} Team</p>`;

    const text = `${urgency}\n\nHello ${memberName},\n\n${message}\n\nInsurance Details:\n- Type: ${insuranceType}\n- Expiry Date: ${expiryDateStr}\n- Days ${daysUntilExpiry < 0 ? 'since expiry' : 'until expiry'}: ${Math.abs(daysUntilExpiry)}\n\nPlease log into your ${brandName} account to manage your insurance details.\n\nBest Regards,\n${brandName} Team`;

    return { subject, html, text };
}

/**
 * *Send insurance expiry alert email
 * */

export async function sendInsuranceAlertEmail(
    insuranceId: string,
    alertType: "30days" | "14days" | "grace"
): Promise<boolean> {

    try {
        // Get insurance and member details
        const insurance = await prisma.insurance.findUnique({
            where: { id: insuranceId },
            include: {
                member: {
                    select: {
                        id: true,
                        name: true,
                        loginEmail: true,
                    }
                }
            }
        });

        if (!insurance || !insurance.member.loginEmail) {
            console.error(`Insurance or member not found or member has no email: ${insuranceId}`);
            return false;
        }

        // Calculate days until expiry
        const today = new Date();
        const expiry = new Date(insurance.expiryDate);
        const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Get transport and brand name
        const transport = await getTransport();
        if (!transport) {
            console.error("Email transport not configured");
            return false;
        }

        const brandName = await getBrandName(prisma);

        // Generate email content
        const { subject, html, text } = generateAlertEmail(
            insurance.member.name,
            insurance.type,
            expiry,
            daysUntil,
            brandName
        );

        // Send email
        const mailFrom = process.env.EMAIL_FROM?.trim() || `no-reply@${brandName.toLowerCase().replace(/\s+/g, "")}.com`;
        await transport.sendMail({
            from: mailFrom,
            to: insurance.member.loginEmail,
            subject,
            html,
            text
        });

        // Update alertsSent tracking to prevent duplicates
        const currentAlerts = (insurance.alertsSent as AlertsSent) || {};
        currentAlerts[alertType] = new Date().toISOString();

        await prisma.insurance.update({
            where: { id: insuranceId },
            data: {
                alertsSent: currentAlerts as any,
                lastAlertSentAt: new Date(),
            }
        });

        console.log(`✅ Sent ${alertType} alert for ${insurance.type} to ${insurance.member.name}`);
        return true;
    } catch (error) {
        console.error("Error sending insurance alert:", error);
        return false;
    }
}

/**
 * Check all insurance policies and send alerts if needed
 * This runs daily via cron job
 */
export async function checkInsuranceExpiries(): Promise<{
    checked: number;
    alertsSent: number;
    statusesUpdated: number;
}> {
    try{
        // Get all non-expired insurance policies
        const policies = await prisma.insurance.findMany({
            where: {
                status: { in: ["active", "expiring_soon", "in_grace"] }
},
include: {
    member: {
        select: {
            id: true,
            name: true,
            loginEmail: true,
        }
    }
}
        });

        let alertsSent = 0;
        let statusesUpdated = 0;

        for (const policy of policies) {
            const today = new Date();
            const expiry = new Date(policy.expiryDate);
            const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Determine new status
            let newStatus = policy.status;
            if (daysUntilExpiry < 0) {
                // Check if in grace period
                if (policy.graceExpiryDate) {
                    const graceExpiry = new Date(policy.graceExpiryDate);
                    const daysUntilGraceExpiry = Math.floor((graceExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysUntilGraceExpiry < 0) {
                        newStatus = "expired";
                    } else {
                        newStatus = "in_grace";
                    }
                } else {
                    newStatus = "expired";
                }
            } else if (daysUntilExpiry <= 30) {
                newStatus = "expiring_soon";
            } else {
                newStatus = "active";
            }

            // Update status if changed
            if (newStatus !== policy.status) {
                await prisma.insurance.update({
                    where: { id: policy.id },
                    data: { status: newStatus }
                });
                statusesUpdated++;
            }

            // Check if alert needs sending
            const alerts = (policy.alertsSent as AlertsSent) || {};
            // 30-day alert
            if (daysUntilExpiry === 30 && !alerts["30days"]) {
                const sent = await sendInsuranceAlertEmail(policy.id, "30days");
                if (sent) alertsSent++;
            }

            // 14-day alert
            if (daysUntilExpiry === 14 && !alerts["14days"]) {
                const sent = await sendInsuranceAlertEmail(policy.id, "14days");
                if (sent) alertsSent++;
            }
            
            // Grace period alert (send when first enters grace)
            if (newStatus === "in_grace" && !alerts["grace"]) {
                const sent = await sendInsuranceAlertEmail(policy.id, "grace");
                if (sent) alertsSent++;
            }
        }

        console.log(`✅ Insurance check complete: ${policies.length} checked, ${alertsSent} alerts sent, ${statusesUpdated} statuses updated`);
        
        return {
            checked: policies.length,
            alertsSent,
            statusesUpdated
        };
    } catch (error) {
        console.error("Error checking insurance expiries:", error);
        return { checked: 0, alertsSent: 0, statusesUpdated: 0 };
    }
}


export { AlertsSent, generateAlertEmail, getTransport };

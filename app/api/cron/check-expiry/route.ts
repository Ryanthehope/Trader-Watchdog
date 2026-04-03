import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { addDays, isBefore, isAfter } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const in30Days = addDays(today, 30);
    const in60Days = addDays(today, 60);
    const in90Days = addDays(today, 90);

    // Find policies expiring soon
    const expiringPolicies = await prisma.insurancePolicy.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: in90Days,
        },
        trader: {
          subscription: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        trader: {
          include: {
            user: true,
          },
        },
      },
    });

    const notifications = [];

    for (const policy of expiringPolicies) {
      const daysUntilExpiry = Math.ceil(
        (policy.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let shouldNotify = false;
      let notificationField: 'notified30Days' | 'notified60Days' | 'notified90Days' | null = null;

      if (daysUntilExpiry <= 30 && !policy.notified30Days) {
        shouldNotify = true;
        notificationField = 'notified30Days';
      } else if (daysUntilExpiry <= 60 && !policy.notified60Days) {
        shouldNotify = true;
        notificationField = 'notified60Days';
      } else if (daysUntilExpiry <= 90 && !policy.notified90Days) {
        shouldNotify = true;
        notificationField = 'notified90Days';
      }

      if (shouldNotify && notificationField) {
        // Send email
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: policy.trader.user.email,
          subject: `Insurance Policy Expiring in ${daysUntilExpiry} Days`,
          html: `
            <h2>Insurance Policy Expiry Warning</h2>
            <p>Your ${policy.policyType} insurance policy is expiring in <strong>${daysUntilExpiry} days</strong>.</p>
            <ul>
              <li><strong>Policy Number:</strong> ${policy.policyNumber}</li>
              <li><strong>Provider:</strong> ${policy.provider}</li>
              <li><strong>Expiry Date:</strong> ${policy.expiryDate.toLocaleDateString()}</li>
            </ul>
            <p>Please renew your policy to maintain your verified status on TradeVerify.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/insurance">Update Insurance Details</a></p>
          `,
        });

        // Mark as notified
        await prisma.insurancePolicy.update({
          where: { id: policy.id },
          data: { [notificationField]: true },
        });

        notifications.push({
          policyId: policy.id,
          email: policy.trader.user.email,
          daysUntilExpiry,
        });
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

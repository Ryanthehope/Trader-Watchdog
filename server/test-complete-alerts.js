import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateAllAlerts() {
    try {
        const policyId = process.argv[2];
        
        // Simulate all three warning alerts sent over time
        const alerts = {
            "90days": new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString(), // 60 days ago
            "60days": new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days ago
            "30days": new Date().toISOString() // Just now
        };
        
        const updated = await prisma.insurance.update({
            where: { id: policyId },
            data: {
                alertsSent: alerts,
                lastAlertSentAt: new Date()
            }
        });
        
        console.log('✅ Simulated complete alert history!');
        console.log('\nPolicy:', updated.type);
        console.log('Status:', updated.status);
        console.log('\nAlerts Sent:');
        const sentAlerts = updated.alertsSent;
        console.log('  90-day warning:', sentAlerts['90days'] ? new Date(sentAlerts['90days']).toLocaleDateString() : 'Not sent');
        console.log('  60-day warning:', sentAlerts['60days'] ? new Date(sentAlerts['60days']).toLocaleDateString() : 'Not sent');
        console.log('  30-day warning:', sentAlerts['30days'] ? new Date(sentAlerts['30days']).toLocaleDateString() : 'Not sent');
        console.log('  Grace alert:', sentAlerts['grace'] ? new Date(sentAlerts['grace']).toLocaleDateString() : 'Not sent');
        console.log('\nLast Alert Sent:', updated.lastAlertSentAt.toLocaleString());
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

simulateAllAlerts();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateAlertSent() {
    try {
        const policyId = process.argv[2];
        
        // Simulate what happens when 90-day alert is sent
        const updated = await prisma.insurance.update({
            where: { id: policyId },
            data: {
                alertsSent: {
                    "90days": new Date().toISOString()
                },
                lastAlertSentAt: new Date()
            }
        });
        
        console.log('✅ Simulated alert sent!');
        console.log('Policy:', updated.type);
        console.log('Alerts Sent:', updated.alertsSent);
        console.log('Last Alert:', updated.lastAlertSentAt);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

simulateAlertSent();

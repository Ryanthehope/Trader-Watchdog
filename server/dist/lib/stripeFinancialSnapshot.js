/** Month boundaries in UTC (Stripe `created` filters use Unix seconds). */
function startOfUtcMonthUnix() {
    const now = new Date();
    return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}
/**
 * Revenue MTD: sum of succeeded PaymentIntent amounts in GBP (gross before your payout).
 * Outstanding: sum of `amount_remaining` on open GBP invoices (uncollected).
 */
export async function fetchStripeFinancialSnapshot(stripe) {
    try {
        const startUnix = startOfUtcMonthUnix();
        const currency = "gbp";
        let revenueMtdCents = 0;
        let paymentCountMtd = 0;
        for await (const pi of stripe.paymentIntents.list({
            created: { gte: startUnix },
            limit: 100,
        })) {
            if (pi.status !== "succeeded")
                continue;
            if (pi.currency !== currency)
                continue;
            revenueMtdCents += pi.amount;
            paymentCountMtd += 1;
        }
        let outstandingCents = 0;
        let openInvoiceCount = 0;
        for await (const inv of stripe.invoices.list({
            status: "open",
            limit: 100,
        })) {
            if (inv.currency !== currency)
                continue;
            const remaining = inv.amount_remaining ?? 0;
            if (remaining <= 0)
                continue;
            outstandingCents += remaining;
            openInvoiceCount += 1;
        }
        return {
            ok: true,
            revenueMtdCents,
            outstandingCents,
            currency,
            paymentCountMtd,
            openInvoiceCount,
            fetchedAt: new Date().toISOString(),
        };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : "Stripe request failed";
        return { ok: false, error: msg };
    }
}

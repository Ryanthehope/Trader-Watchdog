import { Router } from "express";
import { documentIssuerFromMember } from "../lib/documentIssuer.js";
import { prisma } from "../db.js";
import { requireMemberMembershipActive } from "../middleware/requireMemberMembershipActive.js";
const router = Router();
function jsonLineItems(raw) {
    if (!Array.isArray(raw))
        return { ok: false };
    return { ok: true, items: raw };
}
function csvCell(s) {
    const t = String(s ?? "");
    if (/[",\r\n]/.test(t))
        return `"${t.replace(/"/g, '""')}"`;
    return t;
}
function lineItemsSummaryJson(lineItems) {
    if (!Array.isArray(lineItems))
        return "";
    const parts = [];
    for (const row of lineItems) {
        if (!row || typeof row !== "object")
            continue;
        const r = row;
        const d = String(r.description ?? "").trim();
        const p = Number(r.lineTotalPence);
        const gbp = Number.isFinite(p) ? (p / 100).toFixed(2) : "";
        if (d || gbp)
            parts.push(d ? `${d} (${gbp} GBP)` : gbp);
    }
    return parts.join("; ");
}
/** Quotes, invoices, leads — mini dashboard for the member portal */
router.get("/crm-summary", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const [quotes, invoices, leadCount] = await Promise.all([
            prisma.memberQuote.findMany({
                where: { memberId },
                select: { totalPence: true },
            }),
            prisma.memberTradeInvoice.findMany({
                where: { memberId },
                select: { totalPence: true, status: true },
            }),
            prisma.lead.count({ where: { memberId } }),
        ]);
        const quotesTotalPence = quotes.reduce((s, q) => s + q.totalPence, 0);
        const invoicesPaid = invoices.filter((i) => i.status === "paid");
        const invoicesUnpaid = invoices.filter((i) => i.status !== "paid");
        const paidTotalPence = invoicesPaid.reduce((s, i) => s + i.totalPence, 0);
        const outstandingPence = invoicesUnpaid.reduce((s, i) => s + i.totalPence, 0);
        res.json({
            quotes: { count: quotes.length, totalPence: quotesTotalPence },
            customerInvoices: {
                count: invoices.length,
                paidCount: invoicesPaid.length,
                unpaidCount: invoicesUnpaid.length,
                paidTotalPence,
                outstandingPence,
            },
            leads: { count: leadCount },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load summary" });
    }
});
async function nextRef(kind, memberId) {
    if (kind === "quote") {
        const n = await prisma.memberQuote.count({ where: { memberId } });
        return `Q-${n + 1}`;
    }
    const n = await prisma.memberTradeInvoice.count({ where: { memberId } });
    return `INV-${n + 1}`;
}
/** Approved reviews for this business + reply fields */
router.get("/reviews", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.memberReview.findMany({
            where: { memberId, status: "APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
                id: true,
                rating: true,
                title: true,
                body: true,
                authorName: true,
                createdAt: true,
                businessReply: true,
                businessRepliedAt: true,
            },
        });
        res.json({
            reviews: rows.map((r) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
                businessRepliedAt: r.businessRepliedAt?.toISOString() ?? null,
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load reviews" });
    }
});
router.put("/reviews/:reviewId/reply", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const reply = String(req.body?.reply ?? "").trim();
        if (reply.length < 1) {
            res.status(400).json({ error: "Reply text is required" });
            return;
        }
        if (reply.length > 2000) {
            res.status(400).json({ error: "Reply is too long (max 2000 characters)" });
            return;
        }
        const review = await prisma.memberReview.findFirst({
            where: { id: req.params.reviewId, memberId, status: "APPROVED" },
        });
        if (!review) {
            res.status(404).json({ error: "Review not found" });
            return;
        }
        const updated = await prisma.memberReview.update({
            where: { id: review.id },
            data: {
                businessReply: reply,
                businessRepliedAt: new Date(),
            },
        });
        res.json({
            review: {
                id: updated.id,
                businessReply: updated.businessReply,
                businessRepliedAt: updated.businessRepliedAt?.toISOString() ?? null,
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save reply" });
    }
});
router.get("/inquiries", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.lead.findMany({
            where: { memberId },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        res.json({
            inquiries: rows.map((l) => ({
                ...l,
                createdAt: l.createdAt.toISOString(),
                updatedAt: l.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load inquiries" });
    }
});
router.patch("/inquiries/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.lead.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const status = req.body?.status !== undefined
            ? String(req.body.status).trim()
            : undefined;
        const notes = req.body?.notes !== undefined
            ? String(req.body.notes ?? "").trim() || null
            : undefined;
        const row = await prisma.lead.update({
            where: { id: existing.id },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(notes !== undefined ? { notes } : {}),
            },
        });
        res.json({
            inquiry: {
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not update inquiry" });
    }
});
async function deleteMemberInquiry(req, res, memberId) {
    const existing = await prisma.lead.findFirst({
        where: { id: req.params.id, memberId },
    });
    if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    await prisma.lead.delete({ where: { id: existing.id } });
    res.status(204).end();
}
router.delete("/inquiries/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        await deleteMemberInquiry(req, res, memberId);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete enquiry" });
    }
});
router.post("/inquiries/:id/delete", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        await deleteMemberInquiry(req, res, memberId);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete enquiry" });
    }
});
router.get("/quotes/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const row = await prisma.memberQuote.findFirst({
            where: { id: req.params.id, memberId },
            include: { member: true },
        });
        if (!row) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const { member: issuerRow, ...q } = row;
        res.json({
            quote: {
                ...q,
                createdAt: q.createdAt.toISOString(),
                updatedAt: q.updatedAt.toISOString(),
            },
            issuer: documentIssuerFromMember(issuerRow),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load quote" });
    }
});
router.get("/quotes", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.memberQuote.findMany({
            where: { memberId },
            orderBy: { createdAt: "desc" },
        });
        res.json({
            quotes: rows.map((q) => ({
                ...q,
                createdAt: q.createdAt.toISOString(),
                updatedAt: q.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load quotes" });
    }
});
router.post("/quotes", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const customerName = String(req.body?.customerName ?? "").trim();
        const customerAddress = String(req.body?.customerAddress ?? "").trim();
        const title = String(req.body?.title ?? "").trim();
        const lineItemsRaw = req.body?.lineItems;
        const parsed = jsonLineItems(lineItemsRaw);
        if (!customerName || !customerAddress || !title || !parsed.ok) {
            res.status(400).json({
                error: "customerName, customerAddress, title, and lineItems (array) are required",
            });
            return;
        }
        let subtotal = 0;
        for (const row of parsed.items) {
            const r = row;
            const n = Number(r?.lineTotalPence);
            if (Number.isFinite(n))
                subtotal += Math.round(n);
        }
        const vatPence = Math.round(Number(req.body?.vatPence ?? 0) || 0);
        const totalPence = subtotal + vatPence;
        const ref = await nextRef("quote", memberId);
        const row = await prisma.memberQuote.create({
            data: {
                memberId,
                reference: ref,
                customerName,
                customerAddress,
                customerEmail: String(req.body?.customerEmail ?? "").trim() || null,
                customerPhone: String(req.body?.customerPhone ?? "").trim() || null,
                title,
                lineItems: parsed.items,
                subtotalPence: subtotal,
                vatPence,
                totalPence,
                status: String(req.body?.status ?? "draft").trim() || "draft",
                notes: String(req.body?.notes ?? "").trim() || null,
            },
        });
        res.status(201).json({
            quote: {
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not create quote" });
    }
});
router.put("/quotes/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.memberQuote.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const lineItemsRaw = req.body?.lineItems;
        const parsed = lineItemsRaw !== undefined ? jsonLineItems(lineItemsRaw) : null;
        let subtotal = existing.subtotalPence;
        if (parsed?.ok) {
            subtotal = 0;
            for (const row of parsed.items) {
                const r = row;
                const n = Number(r?.lineTotalPence);
                if (Number.isFinite(n))
                    subtotal += Math.round(n);
            }
        }
        const vatPence = req.body?.vatPence !== undefined
            ? Math.round(Number(req.body.vatPence) || 0)
            : existing.vatPence;
        const totalPence = subtotal + vatPence;
        if (req.body?.customerAddress !== undefined) {
            const ca = String(req.body.customerAddress ?? "").trim();
            if (!ca) {
                res.status(400).json({ error: "customerAddress cannot be empty" });
                return;
            }
        }
        const row = await prisma.memberQuote.update({
            where: { id: existing.id },
            data: {
                ...(req.body?.customerName !== undefined
                    ? { customerName: String(req.body.customerName).trim() }
                    : {}),
                ...(req.body?.customerAddress !== undefined
                    ? { customerAddress: String(req.body.customerAddress ?? "").trim() }
                    : {}),
                ...(req.body?.customerEmail !== undefined
                    ? {
                        customerEmail: String(req.body.customerEmail ?? "").trim() || null,
                    }
                    : {}),
                ...(req.body?.customerPhone !== undefined
                    ? {
                        customerPhone: String(req.body.customerPhone ?? "").trim() || null,
                    }
                    : {}),
                ...(req.body?.title !== undefined
                    ? { title: String(req.body.title).trim() }
                    : {}),
                ...(parsed?.ok
                    ? {
                        lineItems: parsed.items,
                        subtotalPence: subtotal,
                    }
                    : {}),
                vatPence,
                totalPence,
                ...(req.body?.status !== undefined
                    ? { status: String(req.body.status).trim() }
                    : {}),
                ...(req.body?.notes !== undefined
                    ? { notes: String(req.body.notes ?? "").trim() || null }
                    : {}),
            },
        });
        res.json({
            quote: {
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not update quote" });
    }
});
async function deleteMemberQuote(req, res, memberId) {
    const quoteId = String(req.params["id"] ?? "");
    const existing = await prisma.memberQuote.findFirst({
        where: { id: quoteId, memberId },
    });
    if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    await prisma.$transaction([
        prisma.memberTradeInvoice.updateMany({
            where: { memberId, quoteId: existing.id },
            data: { quoteId: null },
        }),
        prisma.memberJob.updateMany({
            where: { memberId, quoteId: existing.id },
            data: { quoteId: null },
        }),
        prisma.memberQuote.delete({ where: { id: existing.id } }),
    ]);
    res.status(204).end();
}
router.delete("/quotes/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        await deleteMemberQuote(req, res, memberId);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete quote" });
    }
});
/** POST fallback — some proxies/clients block DELETE reliably */
router.post("/quotes/:id/delete", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        await deleteMemberQuote(req, res, memberId);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete quote" });
    }
});
/** Accountant-friendly CSV — must be registered before `/trade-invoices/:id`. */
router.get("/trade-invoices/export", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.memberTradeInvoice.findMany({
            where: { memberId },
            orderBy: { createdAt: "desc" },
        });
        const header = [
            "Reference",
            "Created date (UTC)",
            "Customer name",
            "Customer address",
            "Customer email",
            "Customer phone",
            "Status",
            "Subtotal GBP",
            "VAT GBP",
            "Total GBP",
            "Due date",
            "Paid date",
            "Payment method",
            "Line items summary",
            "Notes",
        ];
        const lines = [header.join(",")];
        for (const x of rows) {
            const sub = (x.subtotalPence / 100).toFixed(2);
            const vat = (x.vatPence / 100).toFixed(2);
            const tot = (x.totalPence / 100).toFixed(2);
            lines.push([
                csvCell(x.reference),
                csvCell(x.createdAt.toISOString().slice(0, 10)),
                csvCell(x.customerName),
                csvCell(x.customerAddress ?? ""),
                csvCell(x.customerEmail ?? ""),
                csvCell(x.customerPhone ?? ""),
                csvCell(x.status),
                csvCell(sub),
                csvCell(vat),
                csvCell(tot),
                csvCell(x.dueDate ? x.dueDate.toISOString().slice(0, 10) : ""),
                csvCell(x.paidAt ? x.paidAt.toISOString().slice(0, 10) : ""),
                csvCell(x.paymentMethod ?? ""),
                csvCell(lineItemsSummaryJson(x.lineItems)),
                csvCell(x.notes ?? ""),
            ].join(","));
        }
        const body = lines.join("\r\n") + "\r\n";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="customer-invoices-export.csv"');
        res.send(body);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not export invoices" });
    }
});
router.get("/trade-invoices/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const row = await prisma.memberTradeInvoice.findFirst({
            where: { id: req.params.id, memberId },
            include: { member: true },
        });
        if (!row) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const { member: issuerRow, ...inv } = row;
        res.json({
            invoice: {
                ...inv,
                dueDate: inv.dueDate?.toISOString() ?? null,
                paidAt: inv.paidAt?.toISOString() ?? null,
                createdAt: inv.createdAt.toISOString(),
                updatedAt: inv.updatedAt.toISOString(),
            },
            issuer: documentIssuerFromMember(issuerRow),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load invoice" });
    }
});
router.get("/trade-invoices", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.memberTradeInvoice.findMany({
            where: { memberId },
            orderBy: { createdAt: "desc" },
        });
        res.json({
            invoices: rows.map((x) => ({
                ...x,
                dueDate: x.dueDate?.toISOString() ?? null,
                paidAt: x.paidAt?.toISOString() ?? null,
                createdAt: x.createdAt.toISOString(),
                updatedAt: x.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load invoices" });
    }
});
router.post("/trade-invoices", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: { vatRegistered: true },
        });
        const vatOk = Boolean(member?.vatRegistered);
        const customerName = String(req.body?.customerName ?? "").trim();
        const customerAddress = String(req.body?.customerAddress ?? "").trim();
        const lineItemsRaw = req.body?.lineItems;
        const parsed = jsonLineItems(lineItemsRaw);
        if (!customerName || !customerAddress || !parsed.ok) {
            res.status(400).json({
                error: "customerName, customerAddress, and lineItems (array) are required",
            });
            return;
        }
        let subtotal = 0;
        for (const row of parsed.items) {
            const r = row;
            const n = Number(r?.lineTotalPence);
            if (Number.isFinite(n))
                subtotal += Math.round(n);
        }
        let vatPence = Math.round(Number(req.body?.vatPence ?? 0) || 0);
        if (!vatOk)
            vatPence = 0;
        const totalPence = subtotal + vatPence;
        const ref = await nextRef("inv", memberId);
        const dueRaw = req.body?.dueDate;
        const dueDate = typeof dueRaw === "string" && dueRaw.trim()
            ? new Date(dueRaw)
            : null;
        const paymentMethod = String(req.body?.paymentMethod ?? "").trim() || null;
        const row = await prisma.memberTradeInvoice.create({
            data: {
                memberId,
                reference: ref,
                customerName,
                customerAddress,
                customerEmail: String(req.body?.customerEmail ?? "").trim() || null,
                customerPhone: String(req.body?.customerPhone ?? "").trim() || null,
                lineItems: parsed.items,
                subtotalPence: subtotal,
                vatPence,
                totalPence,
                status: String(req.body?.status ?? "unpaid").trim() || "unpaid",
                dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
                quoteId: String(req.body?.quoteId ?? "").trim() || null,
                notes: String(req.body?.notes ?? "").trim() || null,
                paymentMethod,
            },
        });
        res.status(201).json({
            invoice: {
                ...row,
                dueDate: row.dueDate?.toISOString() ?? null,
                paidAt: row.paidAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not create invoice" });
    }
});
router.put("/trade-invoices/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: { vatRegistered: true },
        });
        const vatOk = Boolean(member?.vatRegistered);
        const existing = await prisma.memberTradeInvoice.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (existing.status === "paid") {
            res.status(400).json({
                error: "This invoice is marked paid. You can add notes via the quick edit, but amounts and line items cannot be changed.",
            });
            return;
        }
        const customerName = String(req.body?.customerName ?? "").trim();
        const customerAddress = String(req.body?.customerAddress ?? "").trim();
        const lineItemsRaw = req.body?.lineItems;
        const parsed = jsonLineItems(lineItemsRaw);
        if (!customerName || !customerAddress || !parsed.ok) {
            res.status(400).json({
                error: "customerName, customerAddress, and lineItems (array) are required",
            });
            return;
        }
        let subtotal = 0;
        for (const row of parsed.items) {
            const r = row;
            const n = Number(r?.lineTotalPence);
            if (Number.isFinite(n))
                subtotal += Math.round(n);
        }
        let vatPence = Math.round(Number(req.body?.vatPence ?? 0) || 0);
        if (!vatOk)
            vatPence = 0;
        const totalPence = subtotal + vatPence;
        const dueRaw = req.body?.dueDate;
        const dueDate = typeof dueRaw === "string" && dueRaw.trim()
            ? new Date(dueRaw)
            : null;
        const paymentMethod = String(req.body?.paymentMethod ?? "").trim() || null;
        const row = await prisma.memberTradeInvoice.update({
            where: { id: existing.id },
            data: {
                customerName,
                customerAddress,
                customerEmail: String(req.body?.customerEmail ?? "").trim() || null,
                customerPhone: String(req.body?.customerPhone ?? "").trim() || null,
                lineItems: parsed.items,
                subtotalPence: subtotal,
                vatPence,
                totalPence,
                dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
                notes: String(req.body?.notes ?? "").trim() || null,
                paymentMethod,
            },
        });
        res.json({
            invoice: {
                ...row,
                dueDate: row.dueDate?.toISOString() ?? null,
                paidAt: row.paidAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not update invoice" });
    }
});
router.patch("/trade-invoices/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.memberTradeInvoice.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const status = req.body?.status !== undefined
            ? String(req.body.status).trim()
            : undefined;
        const markPaid = req.body?.markPaid === true;
        const row = await prisma.memberTradeInvoice.update({
            where: { id: existing.id },
            data: {
                ...(status !== undefined ? { status } : {}),
                ...(markPaid
                    ? {
                        status: "paid",
                        paidAt: new Date(),
                    }
                    : {}),
                ...(req.body?.notes !== undefined
                    ? { notes: String(req.body.notes ?? "").trim() || null }
                    : {}),
            },
        });
        res.json({
            invoice: {
                ...row,
                dueDate: row.dueDate?.toISOString() ?? null,
                paidAt: row.paidAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not update invoice" });
    }
});
router.delete("/trade-invoices/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.memberTradeInvoice.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        await prisma.memberTradeInvoice.delete({ where: { id: existing.id } });
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete invoice" });
    }
});
router.get("/availability", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const month = String(req.query.month ?? "").trim();
        if (!/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({ error: "month query must be YYYY-MM" });
            return;
        }
        const [y, m] = month.split("-").map(Number);
        const start = `${month}-01`;
        const last = new Date(y, m, 0).getDate();
        const end = `${month}-${String(last).padStart(2, "0")}`;
        const rows = await prisma.memberAvailabilityDay.findMany({
            where: { memberId, date: { gte: start, lte: end } },
            orderBy: { date: "asc" },
        });
        res.json({
            month,
            days: rows.map((r) => ({ date: r.date, status: r.status })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load availability" });
    }
});
router.put("/availability", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const date = String(req.body?.date ?? "").trim();
        const status = String(req.body?.status ?? "").trim().toLowerCase();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            res.status(400).json({ error: "date must be YYYY-MM-DD" });
            return;
        }
        if (!["available", "busy", "clear"].includes(status)) {
            res
                .status(400)
                .json({ error: "status must be available, busy, or clear" });
            return;
        }
        if (status === "clear") {
            await prisma.memberAvailabilityDay.deleteMany({
                where: { memberId, date },
            });
            res.json({ ok: true, date, status: null });
            return;
        }
        const row = await prisma.memberAvailabilityDay.upsert({
            where: { memberId_date: { memberId, date } },
            create: { memberId, date, status },
            update: { status },
        });
        res.json({ ok: true, date: row.date, status: row.status });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not save availability" });
    }
});
router.get("/jobs", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const rows = await prisma.memberJob.findMany({
            where: { memberId },
            orderBy: { createdAt: "desc" },
            include: {
                lead: {
                    select: { id: true, name: true, email: true, phone: true, notes: true },
                },
            },
        });
        res.json({
            jobs: rows.map((j) => ({
                ...j,
                scheduledAt: j.scheduledAt?.toISOString() ?? null,
                createdAt: j.createdAt.toISOString(),
                updatedAt: j.updatedAt.toISOString(),
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not load jobs" });
    }
});
router.post("/jobs", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const title = String(req.body?.title ?? "").trim();
        if (!title) {
            res.status(400).json({ error: "title is required" });
            return;
        }
        const leadId = String(req.body?.leadId ?? "").trim() || null;
        if (leadId) {
            const lead = await prisma.lead.findFirst({
                where: { id: leadId, memberId },
            });
            if (!lead) {
                res.status(400).json({ error: "Invalid lead" });
                return;
            }
        }
        const quoteId = String(req.body?.quoteId ?? "").trim() || null;
        if (quoteId) {
            const q = await prisma.memberQuote.findFirst({
                where: { id: quoteId, memberId },
            });
            if (!q) {
                res.status(400).json({ error: "Invalid quote" });
                return;
            }
        }
        const row = await prisma.memberJob.create({
            data: {
                memberId,
                title,
                description: String(req.body?.description ?? "").trim() || null,
                status: String(req.body?.status ?? "open").trim() || "open",
                leadId,
                quoteId,
                scheduledAt: (() => {
                    const s = String(req.body?.scheduledAt ?? "").trim();
                    if (!s)
                        return null;
                    const d = new Date(s);
                    return Number.isNaN(d.getTime()) ? null : d;
                })(),
            },
            include: {
                lead: {
                    select: { id: true, name: true, email: true, phone: true, notes: true },
                },
            },
        });
        res.status(201).json({
            job: {
                ...row,
                scheduledAt: row.scheduledAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not create job" });
    }
});
router.patch("/jobs/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.memberJob.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const row = await prisma.memberJob.update({
            where: { id: existing.id },
            data: {
                ...(req.body?.title !== undefined
                    ? { title: String(req.body.title).trim() }
                    : {}),
                ...(req.body?.description !== undefined
                    ? {
                        description: String(req.body.description ?? "").trim() || null,
                    }
                    : {}),
                ...(req.body?.status !== undefined
                    ? { status: String(req.body.status).trim() }
                    : {}),
                ...(req.body?.scheduledAt !== undefined
                    ? {
                        scheduledAt: (() => {
                            const s = String(req.body.scheduledAt ?? "").trim();
                            if (!s)
                                return null;
                            const d = new Date(s);
                            return Number.isNaN(d.getTime()) ? null : d;
                        })(),
                    }
                    : {}),
            },
            include: {
                lead: {
                    select: { id: true, name: true, email: true, phone: true, notes: true },
                },
            },
        });
        res.json({
            job: {
                ...row,
                scheduledAt: row.scheduledAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not update job" });
    }
});
router.delete("/jobs/:id", requireMemberMembershipActive, async (req, res) => {
    try {
        const memberId = req.memberId;
        const existing = await prisma.memberJob.findFirst({
            where: { id: req.params.id, memberId },
        });
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        await prisma.memberJob.delete({ where: { id: existing.id } });
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not delete job" });
    }
});
export default router;

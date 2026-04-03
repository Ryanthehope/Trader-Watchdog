import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiGetMember,
  apiGetMemberBlob,
  apiSendMember,
} from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";

type Inv = {
  id: string;
  reference: string;
  customerName: string;
  totalPence: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type LineRow = { description: string; amountGbp: string };

type CrmSummary = {
  quotes: { count: number; totalPence: number };
  customerInvoices: {
    count: number;
    outstandingPence: number;
    paidTotalPence: number;
    unpaidCount: number;
    paidCount: number;
  };
  leads: { count: number };
};

type FullInvoice = {
  id: string;
  reference: string;
  customerName: string;
  customerAddress: string;
  customerEmail: string | null;
  customerPhone: string | null;
  lineItems: unknown;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  status: string;
  notes: string | null;
  paymentMethod: string | null;
  dueDate: string | null;
};

function lineRowsFromInvoice(inv: FullInvoice): LineRow[] {
  const raw = inv.lineItems;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ description: "Services", amountGbp: "0" }];
  }
  const out: LineRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as { description?: unknown; lineTotalPence?: unknown };
    const p = Number(r.lineTotalPence);
    const gbp = Number.isFinite(p) ? (p / 100).toFixed(2) : "0";
    out.push({
      description: String(r.description ?? "").trim(),
      amountGbp: gbp,
    });
  }
  return out.length ? out : [{ description: "Services", amountGbp: "0" }];
}

function buildLineItems(rows: LineRow[]) {
  return rows.map((r) => {
    const line = Math.round(parseFloat(r.amountGbp) * 100) || 0;
    const desc = r.description.trim() || "Services";
    return {
      description: desc,
      quantity: 1,
      unitPence: line,
      lineTotalPence: line,
    };
  });
}

const PAYMENT_PRESETS = [
  "",
  "Bank transfer",
  "Card payment",
  "Cash",
  "Cheque",
] as const;

export function MemberTradeInvoices() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentPreset, setPaymentPreset] = useState("");
  const [paymentCustom, setPaymentCustom] = useState("");
  const [lineRows, setLineRows] = useState<LineRow[]>([
    { description: "", amountGbp: "100" },
  ]);
  const [vatGbp, setVatGbp] = useState("0");

  const loadSummary = useCallback(() => {
    apiGetMember<CrmSummary>("/api/member/portal/crm-summary")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    apiGetMember<{ invoices: Inv[] }>("/api/member/portal/trade-invoices")
      .then((d) => setRows(d.invoices))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    loadSummary();
    apiGetMember<{ documentBranding?: { vatRegistered?: boolean } }>(
      "/api/member/portal/me"
    )
      .then((d) => setVatRegistered(Boolean(d.documentBranding?.vatRegistered)))
      .catch(() => {});
  }, [load, loadSummary]);

  const resetForm = () => {
    setEditId(null);
    setCustomerName("");
    setCustomerAddress("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDueDate("");
    setNotes("");
    setPaymentPreset("");
    setPaymentCustom("");
    setLineRows([{ description: "", amountGbp: "100" }]);
    setVatGbp("0");
    setSaving(false);
    setLoadingInvoice(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const paymentMethodResolved = () => {
    if (paymentPreset && paymentPreset !== "__custom__") return paymentPreset;
    return paymentCustom.trim() || null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const lineItems = buildLineItems(lineRows);
    const vat = vatRegistered
      ? Math.round(parseFloat(vatGbp) * 100) || 0
      : 0;
    const pm = paymentMethodResolved();
    const body: Record<string, unknown> = {
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      lineItems,
      vatPence: vat,
      notes: notes.trim() || null,
      paymentMethod: pm,
      dueDate: dueDate.trim() || null,
    };

    try {
      setSaving(true);
      if (editId) {
        await apiSendMember(`/api/member/portal/trade-invoices/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiSendMember("/api/member/portal/trade-invoices", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      closeForm();
      load();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (id: string) => {
    setError(null);
    setFormOpen(true);
    setEditId(id);
    setCustomerName("");
    setCustomerAddress("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDueDate("");
    setNotes("");
    setPaymentPreset("");
    setPaymentCustom("");
    setLineRows([{ description: "", amountGbp: "0" }]);
    setVatGbp("0");
    setLoadingInvoice(true);
    try {
      const d = await apiGetMember<{ invoice: FullInvoice }>(
        `/api/member/portal/trade-invoices/${id}`
      );
      const inv = d.invoice;
      setCustomerName(inv.customerName);
      setCustomerAddress(inv.customerAddress ?? "");
      setCustomerEmail(inv.customerEmail ?? "");
      setCustomerPhone(inv.customerPhone ?? "");
      setNotes(inv.notes ?? "");
      setLineRows(lineRowsFromInvoice(inv));
      setVatGbp((inv.vatPence / 100).toFixed(2));
      setDueDate(
        inv.dueDate ? inv.dueDate.slice(0, 10) : ""
      );
      const pm = inv.paymentMethod?.trim() ?? "";
      const presetList = PAYMENT_PRESETS as readonly string[];
      if (pm && presetList.includes(pm)) {
        setPaymentPreset(pm);
        setPaymentCustom("");
      } else if (pm) {
        setPaymentPreset("__custom__");
        setPaymentCustom(pm);
      } else {
        setPaymentPreset("");
        setPaymentCustom("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
      closeForm();
    } finally {
      setLoadingInvoice(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer invoice? This cannot be undone.")) return;
    try {
      await apiSendMember(`/api/member/portal/trade-invoices/${id}`, {
        method: "DELETE",
      });
      load();
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const markPaid = async (id: string) => {
    try {
      await apiSendMember(`/api/member/portal/trade-invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ markPaid: true }),
      });
      load();
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await apiGetMemberBlob(
        "/api/member/portal/trade-invoices/export"
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customer-invoices-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    }
  };

  const updateLine = (i: number, patch: Partial<LineRow>) => {
    setLineRows((prev) =>
      prev.map((row, j) => (j === i ? { ...row, ...patch } : row))
    );
  };

  const addLine = () => {
    setLineRows((prev) => [...prev, { description: "", amountGbp: "0" }]);
  };

  const removeLine = (i: number) => {
    setLineRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Customer invoices
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Invoices you send to your customers — not your TradeVerify
            membership. Add your address, logo, VAT settings, and colours under{" "}
            <Link
              to="/member/business"
              className="font-medium text-emerald-700 hover:underline"
            >
              Business details
            </Link>
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto sm:py-2"
          >
            Export for accountants (CSV)
          </button>
          <button
            type="button"
            onClick={() => (formOpen ? closeForm() : openCreate())}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto sm:py-2"
          >
            {formOpen ? "Cancel" : "New invoice"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
      {summary ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Outstanding
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {formatGBPFromCents(summary.customerInvoices.outstandingPence)}
            </p>
            <p className="text-xs text-slate-500">
              {summary.customerInvoices.unpaidCount} unpaid invoice
              {summary.customerInvoices.unpaidCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Collected (paid)
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {formatGBPFromCents(summary.customerInvoices.paidTotalPence)}
            </p>
            <p className="text-xs text-slate-500">
              {summary.customerInvoices.paidCount} marked paid
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              All customer invoices
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.customerInvoices.count}
            </p>
            <p className="text-xs text-slate-500">Total issued</p>
          </div>
        </div>
      ) : null}
      {formOpen ? (
        <form
          onSubmit={submit}
          className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            {editId ? "Edit invoice" : "New invoice"}
          </h2>
          {loadingInvoice ? (
            <p className="text-sm text-slate-500">Loading invoice…</p>
          ) : null}
          <input
            required
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="block text-xs text-slate-600">
            Customer address (required on invoice)
            <textarea
              required
              rows={3}
              placeholder="Street, town, postcode"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Customer email (optional)
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Customer phone (optional)
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-700">
              Services / line items
            </p>
            <p className="text-xs text-slate-500">
              Describe each charge and its amount (ex. VAT if you use VAT).
            </p>
            <div className="mt-2 space-y-2">
              {lineRows.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-end"
                >
                  <label className="min-w-0 flex-1 text-xs text-slate-600">
                    Description
                    <input
                      value={row.description}
                      onChange={(e) =>
                        updateLine(i, { description: e.target.value })
                      }
                      placeholder="e.g. Boiler service, materials"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="w-full text-xs text-slate-600 sm:w-36">
                    Amount (GBP)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.amountGbp}
                      onChange={(e) =>
                        updateLine(i, { amountGbp: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={lineRows.length <= 1}
                    onClick={() => removeLine(i)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
            >
              + Add line
            </button>
          </div>

          {vatRegistered ? (
            <label className="block text-xs text-slate-600">
              VAT (GBP) — total for this invoice
              <input
                type="number"
                step="0.01"
                min="0"
                value={vatGbp}
                onChange={(e) => setVatGbp(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              VAT is hidden because your business is not marked as VAT
              registered. You can change this under{" "}
              <Link
                to="/member/business"
                className="font-medium text-emerald-700 hover:underline"
              >
                Business details
              </Link>
              .
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Due date (optional)
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Payment method
              <select
                value={paymentPreset}
                onChange={(e) => setPaymentPreset(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {PAYMENT_PRESETS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
            </label>
          </div>
          {paymentPreset === "__custom__" ? (
            <label className="block text-xs text-slate-600">
              Payment instructions
              <textarea
                rows={3}
                value={paymentCustom}
                onChange={(e) => setPaymentCustom(e.target.value)}
                placeholder="e.g. Pay when work is complete"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          <p className="text-xs text-slate-500">
            For bank transfer, add your sort code, account number and payee name
            under{" "}
            <Link
              to="/member/business"
              className="font-medium text-emerald-700 hover:underline"
            >
              Business details
            </Link>{" "}
            — they appear in a &quot;Bank details for payment&quot; box on the
            PDF.
          </p>

          <label className="block text-xs text-slate-600">
            Notes (optional, shown on PDF)
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || loadingInvoice}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editId
                  ? "Save changes"
                  : "Create invoice"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      <ul className="mt-8 space-y-2">
        {rows.map((x) => (
          <li
            key={x.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
          >
            <div className="min-w-0">
              <span className="font-mono text-xs text-slate-500">
                {x.reference}
              </span>
              <p className="font-medium text-slate-900">{x.customerName}</p>
              <p className="text-xs text-slate-500">
                {x.status === "paid" && x.paidAt
                  ? `Paid ${new Date(x.paidAt).toLocaleDateString("en-GB")}`
                  : x.status}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-sm font-semibold">
                {formatGBPFromCents(x.totalPence)}
              </span>
              <Link
                to={`/member/quotes-invoices/invoices/${x.id}/print`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Print / PDF
              </Link>
              {x.status !== "paid" ? (
                <button
                  type="button"
                  onClick={() => void startEdit(x.id)}
                  className="text-sm font-medium text-slate-800 hover:underline"
                >
                  Edit
                </button>
              ) : null}
              {x.status !== "paid" ? (
                <button
                  type="button"
                  onClick={() => void markPaid(x.id)}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Mark paid
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void remove(x.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !formOpen ? (
        <p className="mt-8 text-sm text-slate-500">No customer invoices yet.</p>
      ) : null}
    </div>
  );
}

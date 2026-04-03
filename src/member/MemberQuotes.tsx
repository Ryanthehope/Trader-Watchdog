import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetMember, apiSendMember } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";

type Quote = {
  id: string;
  reference: string;
  customerName: string;
  title: string;
  totalPence: number;
  status: string;
  createdAt: string;
};

type CrmSummary = {
  quotes: { count: number; totalPence: number };
  customerInvoices: {
    count: number;
    outstandingPence: number;
    paidTotalPence: number;
  };
  leads: { count: number };
};

export function MemberQuotes() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amountGbp, setAmountGbp] = useState("100");
  const [vatGbp, setVatGbp] = useState("0");

  const loadSummary = useCallback(() => {
    apiGetMember<CrmSummary>("/api/member/portal/crm-summary")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    return apiGetMember<{ quotes: Quote[] }>("/api/member/portal/quotes")
      .then((d) => setRows(d.quotes))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    loadSummary();
  }, [load, loadSummary]);

  const remove = async (id: string) => {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    try {
      setError(null);
      await apiSendMember(
        `/api/member/portal/quotes/${encodeURIComponent(id)}/delete`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      await load();
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const line = Math.round(parseFloat(amountGbp) * 100) || 0;
    const vat = Math.round(parseFloat(vatGbp) * 100) || 0;
    const lineItems = [
      {
        description: desc || title,
        quantity: 1,
        unitPence: line,
        lineTotalPence: line,
      },
    ];
    try {
      await apiSendMember("/api/member/portal/quotes", {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerAddress,
          title,
          lineItems,
          vatPence: vat,
        }),
      });
      setOpen(false);
      setCustomerName("");
      setCustomerAddress("");
      setTitle("");
      setDesc("");
      load();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
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
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Quotes</h1>
          <p className="mt-2 text-sm text-slate-600">
            Build quotes for your customers. Your logo, address, and brand colour
            come from{" "}
            <Link
              to="/member/business"
              className="font-medium text-emerald-700 hover:underline"
            >
              Business details
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full shrink-0 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto sm:py-2"
        >
          {open ? "Cancel" : "New quote"}
        </button>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
      {summary ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Quotes
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.quotes.count}
            </p>
            <p className="text-xs text-slate-500">
              Total value {formatGBPFromCents(summary.quotes.totalPence)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Customer invoices (outstanding)
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {formatGBPFromCents(summary.customerInvoices.outstandingPence)}
            </p>
            <p className="text-xs text-slate-500">
              Paid in {formatGBPFromCents(summary.customerInvoices.paidTotalPence)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Profile leads
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {summary.leads.count}
            </p>
            <Link
              to="/member/leads"
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              View leads →
            </Link>
          </div>
        </div>
      ) : null}
      {open ? (
        <form
          onSubmit={create}
          className="mt-6 max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input
            required
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            required
            placeholder="Customer address (street, town, postcode)"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Quote title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Line description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <label className="flex-1 text-xs">
              Amount (GBP ex. VAT)
              <input
                type="number"
                step="0.01"
                min={0}
                value={amountGbp}
                onChange={(e) => setAmountGbp(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex-1 text-xs">
              VAT (GBP)
              <input
                type="number"
                step="0.01"
                min={0}
                value={vatGbp}
                onChange={(e) => setVatGbp(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Create quote
          </button>
        </form>
      ) : null}
      <ul className="mt-8 space-y-2">
        {rows.map((q) => (
          <li
            key={q.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
          >
            <div className="min-w-0">
              <span className="font-mono text-xs text-slate-500">
                {q.reference}
              </span>
              <p className="font-medium text-slate-900">{q.title}</p>
              <p className="text-xs text-slate-500">{q.customerName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-sm font-semibold text-slate-800">
                {formatGBPFromCents(q.totalPence)}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-600">
                {q.status}
              </span>
              <Link
                to={`/member/quotes-invoices/quotes/${q.id}/print`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Print / PDF
              </Link>
              <button
                type="button"
                onClick={() => void remove(q.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !open ? (
        <p className="mt-8 text-sm text-slate-500">No quotes yet.</p>
      ) : null}
    </div>
  );
}

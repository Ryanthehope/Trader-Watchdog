import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";

type StripeFinancial = {
  stripeConnected: boolean;
  revenueMtdCents: number;
  outstandingCents: number;
  paymentCountMtd: number;
  openInvoiceCount: number;
  currency: string;
  fetchedAt: string | null;
  error: string | null;
  usedFallback?: boolean;
};

export function StaffFinancial() {
  const [data, setData] = useState<StripeFinancial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetAuth<StripeFinancial>("/api/admin/stripe-financial")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-slate-500">Loading…</p>;
  }
  if (error && !data) {
    return (
      <div>
        <p className="text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data) return <p className="text-slate-500">No data</p>;

  const live = data.stripeConnected && !data.usedFallback && !data.error;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Financial
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Revenue this month and amounts still due on open invoices.
      </p>

      {data.error ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p>Live figures couldn&apos;t be loaded. Amounts below may be outdated.</p>
          <p className="mt-1 text-xs text-amber-200/70">{data.error}</p>
        </div>
      ) : null}

      {!data.stripeConnected ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/50 px-4 py-3 text-sm text-slate-300">
          Connect card payments in{" "}
          <Link
            to="/staff/integrations"
            className="font-medium text-brand-400 hover:text-brand-300"
          >
            Integrations
          </Link>{" "}
          to see live totals here.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-ink-900/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Revenue (MTD)
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-white">
            {formatGBPFromCents(data.revenueMtdCents)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {live
              ? `${data.paymentCountMtd} payment${
                  data.paymentCountMtd === 1 ? "" : "s"
                } this month`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outstanding (open invoices)
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-white">
            {formatGBPFromCents(data.outstandingCents)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {live
              ? `${data.openInvoiceCount} open invoice${
                  data.openInvoiceCount === 1 ? "" : "s"
                }`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh figures"}
        </button>
        <a
          href="https://dashboard.stripe.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          Open payments dashboard
        </a>
      </div>

      {data.fetchedAt ? (
        <p className="mt-4 text-xs text-slate-600">
          Updated {new Date(data.fetchedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

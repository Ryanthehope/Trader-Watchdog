import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { VerifiedMember } from "../types/content";
import { apiGetMember } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";
import { useMemberAuth } from "./MemberAuthContext";

type CrmSummary = {
  quotes: { count: number; totalPence: number };
  customerInvoices: {
    outstandingPence: number;
    paidTotalPence: number;
  };
  leads: { count: number };
};

export function MemberOverview() {
  const { member } = useMemberAuth();
  const [data, setData] = useState<{
    profile: VerifiedMember;
    publicProfileUrl: string;
  } | null>(null);
  const [crm, setCrm] = useState<CrmSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetMember<{
      profile: VerifiedMember;
      publicProfileUrl: string;
    }>("/api/member/portal/me")
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetMember<CrmSummary>("/api/member/portal/crm-summary")
      .then((s) => {
        if (!cancelled) setCrm(s);
      })
      .catch(() => {
        if (!cancelled) setCrm(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Welcome back, {member?.name ?? p.name}
          </h1>
          <p className="mt-1 text-slate-500">Your TradeVerify membership overview</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          TradeVerify checked — your profile is live
        </span>
      </div>

      {crm ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/member/quotes-invoices/quotes"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quotes
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{crm.quotes.count}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatGBPFromCents(crm.quotes.totalPence)} total
            </p>
          </Link>
          <Link
            to="/member/trade-invoices"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Outstanding invoices
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatGBPFromCents(crm.customerInvoices.outstandingPence)}
            </p>
            <p className="mt-1 text-sm text-slate-600">Customer balances due</p>
          </Link>
          <Link
            to="/member/quotes-invoices/invoices"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paid (customers)
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatGBPFromCents(crm.customerInvoices.paidTotalPence)}
            </p>
            <p className="mt-1 text-sm text-slate-600">Recorded as received</p>
          </Link>
          <Link
            to="/member/leads"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Profile leads
            </p>
            <p className="mt-2 text-2xl font-bold text-sky-700">{crm.leads.count}</p>
            <p className="mt-1 text-sm text-slate-600">From your public page</p>
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Profile summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-slate-500">TradeVerify ID</dt>
              <dd className="font-mono font-medium text-slate-900">{p.tvId}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-slate-500">Trade</dt>
              <dd className="font-medium text-slate-900">{p.trade}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium text-slate-900">{p.location}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Member since</dt>
              <dd className="font-medium text-slate-900">{p.verifiedSince}</dd>
            </div>
          </dl>
          <Link
            to={data.publicProfileUrl}
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            View public profile →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Independent checks
            </h2>
            <span className="text-xs font-semibold text-emerald-600">
              {p.checks.length}/{p.checks.length} passed
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {p.checks.map((c) => (
              <li
                key={c}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Verification lines are maintained by TradeVerify staff. Contact us if
            something needs updating after a renewal.
          </p>
        </div>
      </div>
    </div>
  );
}

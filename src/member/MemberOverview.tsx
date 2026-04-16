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
    <div>
      {/* Header section - white background */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Welcome back, {member?.name ?? p.name}
            </h1>
            <p className="mt-2 text-base text-slate-600">Your Trader Watchdog membership overview</p>
          </div>
          <span className="inline-flex items-center rounded-lg bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            Trader Watchdog checked — your profile is live
          </span>
        </div>
      </div>

      {/* Stats section - light gray background */}
      {crm ? (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-10 sm:px-10 sm:py-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/member/quotes-invoices/quotes"
              className="rounded-lg border border-slate-300/60 bg-white p-6 transition hover:border-brand-500/50 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quotes
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{crm.quotes.count}</p>
              <p className="mt-2 text-sm text-slate-600">
                {formatGBPFromCents(crm.quotes.totalPence)} total
              </p>
            </Link>
            <Link
              to="/member/trade-invoices"
              className="rounded-lg border border-slate-300/60 bg-white p-6 transition hover:border-amber-500/50 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outstanding invoices
              </p>
              <p className="mt-3 text-3xl font-bold text-amber-700">
                {formatGBPFromCents(crm.customerInvoices.outstandingPence)}
              </p>
              <p className="mt-2 text-sm text-slate-600">Customer balances due</p>
            </Link>
            <Link
              to="/member/quotes-invoices/invoices"
              className="rounded-lg border border-slate-300/60 bg-white p-6 transition hover:border-emerald-500/50 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Paid (customers)
              </p>
              <p className="mt-3 text-3xl font-bold text-emerald-700">
                {formatGBPFromCents(crm.customerInvoices.paidTotalPence)}
              </p>
              <p className="mt-2 text-sm text-slate-600">Recorded as received</p>
            </Link>
            <Link
              to="/member/leads"
              className="rounded-lg border border-slate-300/60 bg-white p-6 transition hover:border-sky-500/50 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Profile leads
              </p>
              <p className="mt-3 text-3xl font-bold text-sky-700">{crm.leads.count}</p>
              <p className="mt-2 text-sm text-slate-600">From your public page</p>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Profile details section - white background */}
      <div className="bg-white px-6 py-10 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              Profile summary
            </h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Trader Watchdog ID</dt>
                <dd className="font-mono font-semibold text-slate-900">{p.tvId}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Trade</dt>
                <dd className="font-semibold text-slate-900">{p.trade}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Location</dt>
                <dd className="font-semibold text-slate-900">{p.location}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-1">
                <dt className="text-slate-600">Member since</dt>
                <dd className="font-semibold text-slate-900">{p.verifiedSince}</dd>
              </div>
            </dl>
            <Link
              to={data.publicProfileUrl}
              className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              View public profile →
            </Link>
          </div>

          <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Independent checks
              </h2>
              <span className="text-sm font-bold text-emerald-600">
                {p.checks.length}/{p.checks.length} passed
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {p.checks.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 text-sm text-slate-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-lg text-emerald-600">
                    ✓
                  </span>
                  <span className="font-medium">{c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-slate-600">
              Verification lines are maintained by Trader Watchdog staff. Contact us if
              something needs updating after a renewal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

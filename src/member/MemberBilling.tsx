import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGetMember, apiSendMember, publicApiUrl } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";
import { useMemberAuth } from "./MemberAuthContext";

type Branding = {
  hasLogo: boolean;
  legalName: string | null;
  vatNumber: string | null;
  address: string | null;
  footerNote: string | null;
};

type InvoiceRow = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  total: number | null;
  currency: string;
  created: number;
  description: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export function MemberBilling() {
  const { member, refreshMember } = useMemberAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  const renewalState = searchParams.get("renewal");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetMember<{
      invoices: InvoiceRow[];
      branding: Branding;
    }>("/api/member/portal/invoices")
      .then((d) => {
        setInvoices(d.invoices);
        setInvoicesLoaded(true);
        setBranding(d.branding);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (renewalState !== "success") return;
    void refreshMember().catch(() => undefined);
  }, [renewalState, refreshMember]);

  useEffect(() => {
    if (!renewalState) return;
    const timer = setTimeout(() => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete("renewal");
        return next;
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [renewalState, setSearchParams]);

  const startRenewalCheckout = async () => {
    setRenewing(true);
    setError(null);
    try {
      const { url } = await apiSendMember<{ url: string }>(
        "/api/member/portal/membership/renew",
        { method: "POST", body: "{}" }
      );
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start renewal checkout");
      setRenewing(false);
    }
  };

  const expiryLabel = member?.membershipExpiresAt
    ? new Date(member.membershipExpiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-slate-900">
        Billing &amp; payments
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">
        Payment history shown here is for your registration fee, annual
        membership payments, and any future annual renewals processed online.
      </p>

      {renewalState === "success" ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Renewal payment received. Your membership term is being updated now.
        </p>
      ) : null}

      {renewalState === "cancelled" ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Renewal checkout was cancelled. You can try again when ready.
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-900">Membership renewal</p>
        <p className="mt-2 text-sm text-slate-600">
          {expiryLabel
            ? `Your current membership term runs until ${expiryLabel}.`
            : "No active membership end date is recorded yet."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void startRenewalCheckout()}
            disabled={renewing}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renewing ? "Redirecting…" : "Pay annual renewal"}
          </button>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Refresh list
          </button>
        </div>
      </div>

      {branding &&
      (branding.hasLogo ||
        branding.legalName ||
        branding.vatNumber ||
        branding.address ||
        branding.footerNote) ? (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start">
          {branding.hasLogo ? (
            <img
              src={publicApiUrl("/api/public/branding/logo")}
              alt=""
              className="h-16 max-w-[180px] object-contain"
            />
          ) : null}
          <div className="min-w-0 text-sm text-slate-700">
            {branding.legalName ? (
              <p className="font-semibold text-slate-900">{branding.legalName}</p>
            ) : null}
            {branding.vatNumber ? (
              <p className="mt-1">VAT: {branding.vatNumber}</p>
            ) : null}
            {branding.address ? (
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                {branding.address}
              </p>
            ) : null}
            {branding.footerNote ? (
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {branding.footerNote}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {invoicesLoaded && invoices.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No payments recorded yet. Your registration fee, annual membership
          payment, and future renewals will appear here once processed.
        </p>
      ) : null}

      {invoices.length > 0 ? (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const pence = inv.amountPaid || inv.total || inv.amountDue || 0;
                const when = new Date(inv.created * 1000);
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 text-slate-700">
                      {when.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {inv.description ?? "Payment"}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {inv.status ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatGBPFromCents(pence)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

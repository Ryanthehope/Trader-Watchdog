import { FormEvent, useEffect, useState } from "react";
import type { VerifiedMember } from "../types/content";
import {
  apiGetMember,
  apiPostMemberForm,
  apiSendMember,
  publicApiUrl,
} from "../lib/api";

export function MemberBusiness() {
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [location, setLocation] = useState("");
  const [blurb, setBlurb] = useState("");
  const [readOnly, setReadOnly] = useState({
    tvId: "",
    slug: "",
    checks: [] as string[],
  });
  const [profileLogo, setProfileLogo] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [documentAccentHex, setDocumentAccentHex] = useState("#0d9488");
  const [documentLayout, setDocumentLayout] = useState<"standard" | "bold">(
    "standard"
  );
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoiceBankDetails, setInvoiceBankDetails] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetMember<{
      profile: VerifiedMember;
      documentBranding?: {
        documentAccentHex: string | null;
        documentLayout?: "standard" | "bold";
        invoiceAddress: string;
        invoiceBankDetails?: string;
        invoicePhone: string;
        invoiceEmail: string;
        vatNumber: string;
        vatRegistered?: boolean;
      };
    }>("/api/member/portal/me")
      .then((d) => {
        if (cancelled) return;
        const p = d.profile;
        setName(p.name);
        setTrade(p.trade);
        setLocation(p.location);
        setBlurb(p.blurb);
        setReadOnly({ tvId: p.tvId, slug: p.slug, checks: p.checks });
        setProfileLogo(Boolean(p.profileLogo));
        const b = d.documentBranding;
        if (b) {
          setDocumentAccentHex(b.documentAccentHex?.trim() || "#0d9488");
          setInvoiceAddress(b.invoiceAddress ?? "");
          setInvoiceBankDetails(b.invoiceBankDetails ?? "");
          setInvoicePhone(b.invoicePhone ?? "");
          setInvoiceEmail(b.invoiceEmail ?? "");
          setVatNumber(b.vatNumber ?? "");
          setVatRegistered(Boolean(b.vatRegistered));
          setDocumentLayout(
            b.documentLayout === "bold" ? "bold" : "standard"
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await apiSendMember("/api/member/portal/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          trade,
          location,
          blurb,
          documentAccentHex,
          documentLayout,
          invoiceAddress,
          invoiceBankDetails,
          invoicePhone,
          invoiceEmail,
          vatNumber,
          vatRegistered,
        }),
      });
      setMessage("Saved. Your public profile will show these updates.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
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
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Business details</h1>
      <p className="mt-1 text-slate-500">
        Update how your business appears on your public profile. TradeVerify ID,
        URL slug, and verification checks are managed by our team.
      </p>

      <div className="mt-5 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Profile logo</h2>
          <p className="mt-1 text-xs text-slate-500">
            Optional image shown on your public TradeVerify profile (PNG, JPEG, or
            WebP, max 2 MB).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {profileLogo ? (
              <img
                src={publicApiUrl(
                  `/api/members/by-slug/${encodeURIComponent(readOnly.slug)}/profile-logo`
                )}
                alt=""
                className="h-20 w-20 rounded-lg border border-slate-200 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                No logo
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                {logoBusy ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={logoBusy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setLogoBusy(true);
                    setError(null);
                    setMessage(null);
                    try {
                      const fd = new FormData();
                      fd.append("logo", file);
                      const d = await apiPostMemberForm<{ profile: VerifiedMember }>(
                        "/api/member/portal/profile-logo",
                        fd
                      );
                      setProfileLogo(Boolean(d.profile.profileLogo));
                      setMessage("Logo updated.");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Upload failed"
                      );
                    } finally {
                      setLogoBusy(false);
                    }
                  }}
                />
              </label>
              {profileLogo ? (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={async () => {
                    setLogoBusy(true);
                    setError(null);
                    try {
                      const d = await apiSendMember<{ profile: VerifiedMember }>(
                        "/api/member/portal/profile-logo",
                        { method: "DELETE" }
                      );
                      setProfileLogo(Boolean(d.profile.profileLogo));
                      setMessage("Logo removed.");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Remove failed"
                      );
                    } finally {
                      setLogoBusy(false);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-3 text-amber-950 shadow-sm sm:px-4 sm:py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">
            Staff-managed
          </p>
          <p className="mt-1.5 font-mono text-[13px] leading-snug text-amber-950">
            {readOnly.tvId} · /m/{readOnly.slug}
          </p>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs leading-snug text-amber-900/85 sm:max-h-none">
            {readOnly.checks.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form className="mt-6 max-w-5xl space-y-4" onSubmit={onSubmit}>
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="min-w-0">
            <div className="h-min rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Business profile
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                How your business appears on your public TradeVerify listing.
              </p>
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-slate-700">
                      Business name
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-slate-700">
                      Trade
                    </label>
                    <input
                      required
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Profile summary
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value)}
                    className="mt-1 max-h-64 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="min-w-0">
            <div className="h-min rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Quotes &amp; customer invoices
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                On customer PDFs — not your membership bill. Uses your profile
                logo.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                  Business address
                  <textarea
                    value={invoiceAddress}
                    onChange={(e) => setInvoiceAddress(e.target.value)}
                    rows={2}
                    placeholder="Street, town, postcode"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Phone on documents
                  <input
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Email on documents
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="Uses portal login if empty"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                  Bank details for customer invoices
                  <textarea
                    value={invoiceBankDetails}
                    onChange={(e) => setInvoiceBankDetails(e.target.value)}
                    rows={4}
                    placeholder="Account name, sort code, account number — and payment reference if you use one"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <span className="mt-1 block text-[11px] font-normal leading-snug text-slate-500">
                    Shown on printed/PDF invoices so customers can pay you by bank
                    transfer. You are responsible for accuracy.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={vatRegistered}
                    onChange={(e) => setVatRegistered(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="text-xs font-medium text-slate-700">
                      VAT registered
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      Customer invoices show VAT lines and your VAT number on PDFs
                      when enabled.
                    </span>
                  </span>
                </label>
                {vatRegistered ? (
                  <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                    VAT number (optional)
                    <input
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className="mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                ) : null}
                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <span className="text-xs font-medium text-slate-600">
                    Accent colour
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(documentAccentHex)
                          ? documentAccentHex
                          : "#0d9488"
                      }
                      onChange={(e) => setDocumentAccentHex(e.target.value)}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                      title="Pick colour"
                    />
                    <input
                      value={documentAccentHex}
                      onChange={(e) => setDocumentAccentHex(e.target.value)}
                      placeholder="#0d9488"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>
                <label className="block text-xs font-medium text-slate-600 sm:col-span-1">
                  PDF layout
                  <select
                    value={documentLayout}
                    onChange={(e) =>
                      setDocumentLayout(
                        e.target.value === "bold" ? "bold" : "standard"
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="standard">
                      Standard — clean border accent
                    </option>
                    <option value="bold">
                      Bold — tinted header and solid table heading bar
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </aside>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

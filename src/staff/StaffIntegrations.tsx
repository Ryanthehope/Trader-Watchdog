import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGetAuth, apiSend, authHeaders } from "../lib/api";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

type Settings = {
  billingEnabled: boolean;
  stripePublishableKey: string | null;
  checkoutMembershipName: string | null;
  checkoutFastTrackName: string | null;
  checkoutMembershipPence: number;
  checkoutFastTrackPence: number;
  hasStripeSecret: boolean;
  hasStripeWebhookSecret: boolean;
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string | null;
  hasRecaptchaSecret: boolean;
  staffRequire2fa: boolean;
  brandingLogoStoredName: string | null;
  invoiceLegalName: string | null;
  invoiceVatNumber: string | null;
  invoiceAddress: string | null;
  invoiceFooterNote: string | null;
  stripeBrandingLogoFileId: string | null;
  googleAnalyticsMeasurementId: string | null;
  /** Numeric GA4 Property ID (Data API), not G-XXXXXXXX */
  googleAnalyticsPropertyId: string | null;
  hasGoogleAnalyticsServiceAccount: boolean;
};

const INTEGRATION_TABS = [
  { id: "payments" as const, label: "Payments" },
  { id: "branding" as const, label: "Branding" },
  { id: "captcha" as const, label: "reCAPTCHA" },
  { id: "ga" as const, label: "Google Analytics" },
  { id: "policy" as const, label: "Staff policy" },
  { id: "2fa" as const, label: "My 2FA" },
];

type IntegrationTabId = (typeof INTEGRATION_TABS)[number]["id"];

function isIntegrationTabId(s: string | null): s is IntegrationTabId {
  return (
    s !== null &&
    INTEGRATION_TABS.some((t) => t.id === (s as IntegrationTabId))
  );
}

/** Strip spaces; empty → null. Does not validate format (server does). */
function normalizeGaMeasurementId(
  v: string | null | undefined
): string | null {
  if (v == null) return null;
  const t = String(v).replace(/\s/g, "").trim();
  return t ? t.toUpperCase() : null;
}

function normalizeGaPropertyId(
  v: string | null | undefined
): string | null {
  if (v == null) return null;
  const t = String(v).replace(/\s/g, "");
  return t ? t : null;
}

export function StaffIntegrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: IntegrationTabId = isIntegrationTabId(rawTab)
    ? rawTab
    : "payments";

  const setTab = (id: IntegrationTabId) => {
    setSearchParams({ tab: id }, { replace: true });
  };
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stripeSecret, setStripeSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [recaptchaSecret, setRecaptchaSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  /** Paste new key only; empty on save = leave DB unchanged unless removing. */
  const [gaServiceAccountDraft, setGaServiceAccountDraft] = useState("");
  const [gaServiceAccountRemoveRequested, setGaServiceAccountRemoveRequested] =
    useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [setupOtpauthUrl, setSetupOtpauthUrl] = useState<string | null>(null);
  const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false);
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [meTotp, setMeTotp] = useState(false);
  const [disablePw, setDisablePw] = useState("");

  const load = () => {
    apiGetAuth<{ settings: Settings }>("/api/admin/organization-settings")
      .then((d) => {
        setSettings({
          ...d.settings,
          googleAnalyticsMeasurementId:
            d.settings.googleAnalyticsMeasurementId ?? null,
          googleAnalyticsPropertyId:
            d.settings.googleAnalyticsPropertyId ?? null,
          hasGoogleAnalyticsServiceAccount:
            Boolean(d.settings.hasGoogleAnalyticsServiceAccount),
        });
        setGaServiceAccountDraft("");
        setGaServiceAccountRemoveRequested(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
    apiGetAuth<{ staff: { totpEnabled: boolean } }>("/api/admin/me")
      .then((d) => setMeTotp(d.staff.totpEnabled))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const onSaveIntegrations = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        billingEnabled: settings.billingEnabled,
        stripePublishableKey: settings.stripePublishableKey || null,
        checkoutMembershipName: settings.checkoutMembershipName || null,
        checkoutFastTrackName: settings.checkoutFastTrackName || null,
        checkoutMembershipPence: settings.checkoutMembershipPence,
        checkoutFastTrackPence: settings.checkoutFastTrackPence,
        recaptchaEnabled: settings.recaptchaEnabled,
        recaptchaSiteKey: settings.recaptchaSiteKey || null,
        staffRequire2fa: settings.staffRequire2fa,
      };
      if (stripeSecret.trim()) body.stripeSecretKey = stripeSecret.trim();
      if (webhookSecret.trim()) body.stripeWebhookSecret = webhookSecret.trim();
      if (recaptchaSecret.trim())
        body.recaptchaSecretKey = recaptchaSecret.trim();

      body.invoiceLegalName = settings.invoiceLegalName || null;
      body.invoiceVatNumber = settings.invoiceVatNumber || null;
      body.invoiceAddress = settings.invoiceAddress || null;
      body.invoiceFooterNote = settings.invoiceFooterNote || null;

      const gaNormalized = normalizeGaMeasurementId(
        settings.googleAnalyticsMeasurementId
      );
      if (
        gaNormalized &&
        !/^G-[A-Z0-9]+$/i.test(gaNormalized)
      ) {
        setError(
          "Measurement ID must look like G-XXXXXXXXXX (from GA4 → Admin → Data streams)."
        );
        setSaving(false);
        return;
      }
      body.googleAnalyticsMeasurementId = gaNormalized;

      const propNormalized = normalizeGaPropertyId(
        settings.googleAnalyticsPropertyId
      );
      if (
        propNormalized &&
        !/^\d{5,12}$/.test(propNormalized)
      ) {
        setError(
          "GA4 Property ID must be digits only (5–12), from GA4 → Admin → Property settings."
        );
        setSaving(false);
        return;
      }
      body.googleAnalyticsPropertyId = propNormalized;

      if (gaServiceAccountRemoveRequested) {
        body.googleAnalyticsServiceAccountJson = null;
      } else if (gaServiceAccountDraft.trim()) {
        body.googleAnalyticsServiceAccountJson =
          gaServiceAccountDraft.trim();
      }

      const d = await apiSend<{ settings: Settings }>(
        "/api/admin/organization-settings/save",
        { method: "POST", body: JSON.stringify(body) }
      );
      setSettings({
        ...d.settings,
        googleAnalyticsMeasurementId:
          d.settings.googleAnalyticsMeasurementId ?? null,
        googleAnalyticsPropertyId: d.settings.googleAnalyticsPropertyId ?? null,
        hasGoogleAnalyticsServiceAccount: Boolean(
          d.settings.hasGoogleAnalyticsServiceAccount
        ),
      });
      setGaServiceAccountDraft("");
      setGaServiceAccountRemoveRequested(false);
      setStripeSecret("");
      setWebhookSecret("");
      setRecaptchaSecret("");
      setMessage("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const clearTwoFaSetup = () => {
    setTwoFaSetupOpen(false);
    setQrDataUrl(null);
    setSetupOtpauthUrl(null);
    setTotpCode("");
    setTwoFaError(null);
  };

  const start2fa = async () => {
    setError(null);
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const d = await apiSend<{ qrDataUrl?: string; otpauthUrl?: string }>(
        "/api/admin/me/2fa/setup",
        { method: "POST", body: "{}" }
      );
      const url =
        typeof d.otpauthUrl === "string" && d.otpauthUrl.trim()
          ? d.otpauthUrl.trim()
          : "";
      if (!url) {
        throw new Error(
          "Server returned an invalid 2FA setup response. Check the network tab for POST /api/admin/me/2fa/setup."
        );
      }
      const qr =
        typeof d.qrDataUrl === "string" && d.qrDataUrl.trim().length > 0
          ? d.qrDataUrl.trim()
          : null;
      setTwoFaSetupOpen(true);
      setSetupOtpauthUrl(url);
      setQrDataUrl(qr);
      setTotpCode("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      setTwoFaError(msg);
      setError(msg);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirm2fa = async () => {
    setError(null);
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      await apiSend("/api/admin/me/2fa/confirm", {
        method: "POST",
        body: JSON.stringify({ code: totpCode.replace(/\s/g, "") }),
      });
      clearTwoFaSetup();
      setMeTotp(true);
      setMessage("Two-factor authentication is now on for your account.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setTwoFaError(msg);
      setError(msg);
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disable2fa = async () => {
    setError(null);
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      await apiSend("/api/admin/me/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: disablePw }),
      });
      setDisablePw("");
      setMeTotp(false);
      setMessage("2FA disabled.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setTwoFaError(msg);
      setError(msg);
    } finally {
      setTwoFaBusy(false);
    }
  };

  if (!settings) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">
          Integrations
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Payments, analytics, join-form protection, and how staff sign in.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Integration sections"
        className="-mx-4 border-b border-white/10 px-4 sm:mx-0 sm:px-0"
      >
        <div className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {INTEGRATION_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`integration-tab-${id}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === id
                  ? "bg-brand-500/20 text-brand-100 ring-1 ring-brand-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSaveIntegrations} className="space-y-8">
        <div
          className={tab === "payments" ? "block" : "hidden"}
          role="tabpanel"
          id="integration-panel-payments"
          aria-labelledby="integration-tab-payments"
        >
        <section className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Card payments
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Checkout uses Stripe&apos;s inline line items (product name + amount
            in GBP) — no pre-created Price IDs needed. Webhook:{" "}
            <code className="text-slate-400">/api/stripe/webhook</code>, event{" "}
            <span className="text-slate-400">checkout.session.completed</span>.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.billingEnabled}
              onChange={(e) =>
                setSettings({ ...settings, billingEnabled: e.target.checked })
              }
              className="rounded border-white/20 bg-ink-950"
            />
            Enable checkout links on the join thank-you page
          </label>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">
                Publishable key
              </label>
              <input
                value={settings.stripePublishableKey ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripePublishableKey: e.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
                placeholder="pk_live_… or pk_test_…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Secret key {settings.hasStripeSecret ? "(saved — enter to replace)" : ""}
              </label>
              <input
                type="password"
                value={stripeSecret}
                onChange={(e) => setStripeSecret(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
                placeholder="sk_live_… or sk_test_…"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Webhook signing secret {settings.hasStripeWebhookSecret ? "(saved)" : ""}
              </label>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
                placeholder="whsec_…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Monthly membership — line item name (Checkout)
              </label>
              <input
                value={settings.checkoutMembershipName ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkoutMembershipName: e.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
                placeholder="TradeVerify monthly membership"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Monthly membership — amount (GBP)
              </label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={(
                  (settings.checkoutMembershipPence ?? 1500) / 100
                ).toFixed(2)}
                onChange={(e) => {
                  const gbp = parseFloat(e.target.value);
                  const prev = settings.checkoutMembershipPence ?? 1500;
                  setSettings({
                    ...settings,
                    checkoutMembershipPence: Number.isFinite(gbp)
                      ? Math.round(gbp * 100)
                      : prev,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Fast-track — line item name (Checkout)
              </label>
              <input
                value={settings.checkoutFastTrackName ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkoutFastTrackName: e.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
                placeholder="TradeVerify fast-track vetting"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Fast-track — amount (GBP, one-time)
              </label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={(
                  (settings.checkoutFastTrackPence ?? 4000) / 100
                ).toFixed(2)}
                onChange={(e) => {
                  const gbp = parseFloat(e.target.value);
                  const prev = settings.checkoutFastTrackPence ?? 4000;
                  setSettings({
                    ...settings,
                    checkoutFastTrackPence: Number.isFinite(gbp)
                      ? Math.round(gbp * 100)
                      : prev,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Values set in the server environment override fields saved here.
          </p>
        </section>
        </div>

        <div
          className={tab === "branding" ? "block" : "hidden"}
          role="tabpanel"
          id="integration-panel-branding"
          aria-labelledby="integration-tab-branding"
        >
        <section className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Invoices & branding
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            PDF invoices and receipts are generated by Stripe. Upload a{" "}
            <strong className="text-slate-400">PNG or JPEG (max 512 KB)</strong>{" "}
            logo — we push it to your Stripe account so it appears on hosted
            invoices, checkout, and emails. Also set legal lines shown in the
            member billing area.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {settings.brandingLogoStoredName ? (
              <img
                src={`${apiBase()}/api/public/branding/logo`}
                alt=""
                className="h-16 max-w-[200px] rounded border border-white/10 bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-white/20 text-xs text-slate-600">
                No logo
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
                {logoBusy ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
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
                      const res = await fetch(
                        `${apiBase()}/api/admin/organization-branding/logo`,
                        {
                          method: "POST",
                          headers: authHeaders() as HeadersInit,
                          body: fd,
                        }
                      );
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        throw new Error(
                          typeof data?.error === "string"
                            ? data.error
                            : "Upload failed"
                        );
                      }
                      setSettings(data.settings);
                      if (data.stripeSync?.ok) {
                        setMessage(
                          "Logo saved and applied to Stripe invoice branding."
                        );
                      } else {
                        setMessage(
                          `Logo saved on TradeVerify. Stripe sync: ${data.stripeSync?.error ?? "skipped — check secret key"}.`
                        );
                      }
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
              {settings.brandingLogoStoredName ? (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={async () => {
                    if (!confirm("Remove organization logo?")) return;
                    setLogoBusy(true);
                    setError(null);
                    try {
                      const d = await apiSend<{ settings: Settings }>(
                        "/api/admin/organization-branding/logo",
                        { method: "DELETE" }
                      );
                      setSettings(d.settings);
                      setMessage("Logo removed.");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Remove failed"
                      );
                    } finally {
                      setLogoBusy(false);
                    }
                  }}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Remove
                </button>
              ) : null}
              {settings.brandingLogoStoredName ? (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={async () => {
                    setLogoBusy(true);
                    setError(null);
                    try {
                      const data = await apiSend<{
                        settings: Settings;
                        stripeSync: { ok: boolean; fileId?: string; error?: string };
                      }>("/api/admin/organization-branding/sync-stripe", {
                        method: "POST",
                        body: "{}",
                      });
                      setSettings(data.settings);
                      setMessage(
                        data.stripeSync?.ok
                          ? "Logo re-synced to Stripe."
                          : "Sync failed."
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Sync failed"
                      );
                    } finally {
                      setLogoBusy(false);
                    }
                  }}
                  className="rounded-lg border border-brand-500/40 px-3 py-2 text-sm text-brand-300 hover:bg-brand-500/10"
                >
                  Re-sync to Stripe
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">
                Legal name on invoices (e.g. Ltd name)
              </label>
              <input
                value={settings.invoiceLegalName ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoiceLegalName: e.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                VAT number (optional)
              </label>
              <input
                value={settings.invoiceVatNumber ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoiceVatNumber: e.target.value || null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Registered address (optional)
              </label>
              <textarea
                value={settings.invoiceAddress ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoiceAddress: e.target.value || null,
                  })
                }
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Footer note (optional, e.g. payment terms)
              </label>
              <textarea
                value={settings.invoiceFooterNote ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoiceFooterNote: e.target.value || null,
                  })
                }
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Save integration settings below to persist legal lines. Logo uploads
            save immediately.
          </p>
        </section>
        </div>

        <div
          className={tab === "captcha" ? "block" : "hidden"}
          role="tabpanel"
          id="integration-panel-captcha"
          aria-labelledby="integration-tab-captcha"
        >
        <section className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Join form protection
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Google reCAPTCHA keys (standard “I’m not a robot” checkbox).
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.recaptchaEnabled}
              onChange={(e) =>
                setSettings({ ...settings, recaptchaEnabled: e.target.checked })
              }
              className="rounded border-white/20 bg-ink-950"
            />
            Require on join form
          </label>
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500">
              Site key (public)
            </label>
            <input
              value={settings.recaptchaSiteKey ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  recaptchaSiteKey: e.target.value || null,
                })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-slate-500">
              Secret key {settings.hasRecaptchaSecret ? "(saved)" : ""}
            </label>
            <input
              type="password"
              value={recaptchaSecret}
              onChange={(e) => setRecaptchaSecret(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
            />
            <p className="mt-1 text-xs text-slate-600">
              Or <code className="text-slate-500">RECAPTCHA_SECRET_KEY</code> in env.
            </p>
          </div>
        </section>
        </div>

        <div
          className={tab === "ga" ? "block" : "hidden"}
          role="tabpanel"
          id="integration-panel-ga"
          aria-labelledby="integration-tab-ga"
        >
          <section className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-white">
              Google Analytics (GA4)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter your{" "}
              <strong className="text-slate-400">Measurement ID</strong> from
              Google Analytics → Admin → Data streams → Web. This loads the
              official gtag script on the public site (home, directory, join,
              member portal). The staff console is not tracked.
            </p>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500">
                Measurement ID
              </label>
              <input
                value={settings.googleAnalyticsMeasurementId ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    googleAnalyticsMeasurementId: e.target.value.trim()
                      ? e.target.value.trim()
                      : null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
                placeholder="G-XXXXXXXXXX"
                autoComplete="off"
              />
              <p className="mt-2 text-xs text-slate-600">
                Leave empty to disable. Format: <code className="text-slate-500">G-</code>{" "}
                followed by letters and numbers. Reports appear in your Google
                Analytics property — use the{" "}
                <strong className="text-slate-500">Analytics</strong> page here
                for a link and on-site database totals.
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-slate-300">
                Staff Analytics (Data API)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Optional: show GA4 totals on <strong className="text-slate-400">Staff → Analytics</strong>.
                Use the numeric <strong className="text-slate-400">Property ID</strong> (not{" "}
                <code className="text-slate-500">G-…</code>) from GA4 → Admin → Property
                settings, plus a Google Cloud service account JSON with the Analytics
                Data API enabled. Grant that account <strong className="text-slate-400">Viewer</strong> on
                the property (Admin → Property access management).
              </p>
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500">
                  GA4 Property ID (numeric)
                </label>
                <input
                  value={settings.googleAnalyticsPropertyId ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      googleAnalyticsPropertyId: e.target.value.trim()
                        ? e.target.value
                        : null,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white"
                  placeholder="e.g. 345678901"
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500">
                  Service account JSON key{" "}
                  {settings.hasGoogleAnalyticsServiceAccount &&
                  !gaServiceAccountRemoveRequested
                    ? "(saved — paste to replace)"
                    : ""}
                </label>
                <textarea
                  value={gaServiceAccountDraft}
                  onChange={(e) => {
                    setGaServiceAccountRemoveRequested(false);
                    setGaServiceAccountDraft(e.target.value);
                  }}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-xs text-white"
                  placeholder='Paste full JSON from Google Cloud → IAM → Keys (includes "private_key" and "client_email")'
                  spellCheck={false}
                  autoComplete="off"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {settings.hasGoogleAnalyticsServiceAccount &&
                  !gaServiceAccountRemoveRequested ? (
                    <button
                      type="button"
                      aria-label="Remove saved Google Analytics service account key"
                      onClick={() => {
                        setGaServiceAccountRemoveRequested(true);
                        setGaServiceAccountDraft("");
                      }}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-300"
                    >
                      Remove saved key
                    </button>
                  ) : null}
                  {gaServiceAccountRemoveRequested ? (
                    <span className="text-xs text-amber-400/90">
                      Saved key will be removed when you save integration settings.
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Alternatively set <code className="text-slate-500">GA4_PROPERTY_ID</code> and{" "}
                  <code className="text-slate-500">GOOGLE_APPLICATION_CREDENTIALS</code> in server{" "}
                  <code className="text-slate-500">.env</code> (overrides when the key file exists).
                </p>
              </div>
            </div>
          </section>
        </div>

        <div
          className={tab === "policy" ? "block" : "hidden"}
          role="tabpanel"
          id="integration-panel-policy"
          aria-labelledby="integration-tab-policy"
        >
        <section className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Staff policy
          </h2>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.staffRequire2fa}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  staffRequire2fa: e.target.checked,
                })
              }
              className="rounded border-white/20 bg-ink-950"
            />
            Require 2FA for staff (documented policy — enforce per user below)
          </label>
        </section>
        </div>

        {tab !== "2fa" ? (
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50 sm:w-auto sm:py-2.5"
          >
            {saving ? "Saving…" : "Save integration settings"}
          </button>
        ) : null}
      </form>

      {tab === "2fa" ? (
      <section
        className="rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:p-6"
        role="tabpanel"
        id="integration-panel-2fa"
        aria-labelledby="integration-tab-2fa"
      >
        <h2 className="font-display text-lg font-semibold text-white">
          Your 2FA (authenticator app)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Status:{" "}
          <span className={meTotp ? "text-emerald-400" : "text-amber-400"}>
            {meTotp ? "Enabled" : "Off"}
          </span>
        </p>
        {twoFaError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {twoFaError}
          </p>
        ) : null}
        {!twoFaSetupOpen ? (
          <button
            type="button"
            disabled={twoFaBusy}
            onClick={() => start2fa()}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
          >
            {twoFaBusy
              ? "Starting…"
              : meTotp
                ? "Rotate / re-scan QR (disables until confirmed)"
                : "Set up 2FA"}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-400">
              Scan with Authy, Google Authenticator, etc., then enter the 6-digit
              code.
            </p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="2FA QR"
                className="h-44 w-44 rounded-lg bg-white p-2"
              />
            ) : setupOtpauthUrl ? (
              <p className="text-sm text-slate-300">
                QR image could not be generated on the server.{" "}
                <a
                  href={setupOtpauthUrl}
                  className="text-brand-400 underline hover:text-brand-300"
                >
                  Open this link in your authenticator app
                </a>{" "}
                or add the account manually using the secret from that link.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-40 rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
              />
              <button
                type="button"
                disabled={twoFaBusy}
                onClick={() => confirm2fa()}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {twoFaBusy ? "Checking…" : "Confirm & enable"}
              </button>
              <button
                type="button"
                disabled={twoFaBusy}
                onClick={() => clearTwoFaSetup()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {meTotp ? (
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-sm text-slate-500">Disable 2FA</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="password"
                value={disablePw}
                onChange={(e) => setDisablePw(e.target.value)}
                placeholder="Current password"
                className="w-full min-w-0 rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white sm:w-auto sm:min-w-[200px]"
              />
              <button
                type="button"
                disabled={twoFaBusy}
                onClick={() => disable2fa()}
                className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {twoFaBusy ? "…" : "Disable 2FA"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}

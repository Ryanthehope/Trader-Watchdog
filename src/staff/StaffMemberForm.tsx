import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

export function StaffMemberForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new" || !id;

  const [slug, setSlug] = useState("");
  const [tvId, setTvId] = useState("");
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [location, setLocation] = useState("");
  const [checksText, setChecksText] = useState("");
  const [verifiedSince, setVerifiedSince] = useState("");
  const [blurb, setBlurb] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [disablePortal, setDisablePortal] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(false);

  const [portalMembershipUnlimited, setPortalMembershipUnlimited] =
    useState(false);
  const [portalAccessMode, setPortalAccessMode] = useState<
    "keep" | "legacy" | "manual" | "fast_track"
  >("legacy");
  const [portalExpiresAt, setPortalExpiresAt] = useState("");
  const [clearStripeSubscription, setClearStripeSubscription] = useState(false);
  const [loadedStripeSubscriptionStatus, setLoadedStripeSubscriptionStatus] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAuth<{
          member: {
            slug: string;
            tvId: string;
            name: string;
            trade: string;
            location: string;
            checks: string[];
            verifiedSince: string;
            blurb: string;
            loginEmail: string | null;
            portalEnabled?: boolean;
            membershipUnlimited?: boolean;
            membershipBillingType?: string | null;
            membershipExpiresAt?: string | null;
            stripeSubscriptionStatus?: string | null;
          };
        }>(`/api/admin/members/${id}`);
        if (cancelled) return;
        const m = data.member;
        setSlug(m.slug);
        setTvId(m.tvId);
        setName(m.name);
        setTrade(m.trade);
        setLocation(m.location);
        setChecksText(m.checks.join("\n"));
        setVerifiedSince(m.verifiedSince);
        setBlurb(m.blurb);
        setLoginEmail(m.loginEmail ?? "");
        setPortalEnabled(Boolean(m.portalEnabled));
        setPortalMembershipUnlimited(Boolean(m.membershipUnlimited));
        const bt = (m.membershipBillingType ?? "").trim().toLowerCase();
        const mode =
          bt === "stripe"
            ? "keep"
            : bt === "manual"
              ? "manual"
              : bt === "fast_track"
                ? "fast_track"
                : "legacy";
        setPortalAccessMode(mode);
        setPortalExpiresAt(
          m.membershipExpiresAt ? m.membershipExpiresAt.slice(0, 10) : ""
        );
        setClearStripeSubscription(false);
        setLoadedStripeSubscriptionStatus(
          m.stripeSubscriptionStatus?.trim() || null
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const checks = checksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!checks.length) {
      setError("Add at least one check (one per line).");
      return;
    }
    const basePayload = {
      slug,
      tvId,
      name,
      trade,
      location,
      checks,
      verifiedSince,
      blurb,
    };
    const portalPw = portalPassword.trim();
    const emailTrim = loginEmail.trim().toLowerCase();

    if (isNew) {
      if (portalPw && !emailTrim) {
        setError("Portal login email is required when setting a portal password.");
        return;
      }
    } else {
      if (
        (portalAccessMode === "manual" ||
          portalAccessMode === "fast_track") &&
        !portalExpiresAt.trim()
      ) {
        setError(
          "Access end date is required for manual and one-off (fast-track) modes."
        );
        return;
      }
      if (disablePortal) {
        /* ok */
      } else if (portalPw && !emailTrim) {
        setError("Portal login email is required when setting a new portal password.");
        return;
      }
    }

    const payload =
      isNew
        ? {
            ...basePayload,
            ...(portalPw && emailTrim
              ? { loginEmail: emailTrim, portalPassword: portalPw }
              : {}),
          }
        : {
            ...basePayload,
            ...(disablePortal
              ? { disablePortal: true }
              : {
                  loginEmail: emailTrim,
                  ...(portalPw ? { portalPassword: portalPw } : {}),
                }),
            membershipUnlimited: portalMembershipUnlimited,
            membershipAccessMode: portalAccessMode,
            membershipExpiresAt:
              portalAccessMode === "manual" ||
              portalAccessMode === "fast_track"
                ? portalExpiresAt.trim() || null
                : null,
            clearStripeSubscription: clearStripeSubscription,
          };

    setSaving(true);
    try {
      if (isNew) {
        await apiSend("/api/admin/members", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiSend(`/api/admin/members/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      navigate("/staff/members");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div>
      <Link
        to="/staff/members"
        className="text-sm text-brand-300 hover:text-brand-200"
      >
        ← Members
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-white">
        {isNew ? "Add member" : "Edit member"}
      </h1>

      <form className="mt-8 max-w-2xl space-y-5" onSubmit={onSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300">
              URL slug
            </label>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. riverside-electrical-2847"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used in /m/<span className="font-mono">{slug || "your-slug"}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              TradeVerify ID
            </label>
            <input
              required
              value={tvId}
              onChange={(e) => setTvId(e.target.value)}
              placeholder="TW-2847"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 font-mono text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Member since
            </label>
            <input
              required
              value={verifiedSince}
              onChange={(e) => setVerifiedSince(e.target.value)}
              placeholder="November 2024"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300">
              Business name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Trade
            </label>
            <input
              required
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Location
            </label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300">
              Checks (one per line)
            </label>
            <textarea
              required
              rows={5}
              value={checksText}
              onChange={(e) => setChecksText(e.target.value)}
              placeholder="Local address confirmed&#10;Insurance verified"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300">
              Profile summary (blurb)
            </label>
            <textarea
              required
              rows={4}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          {!isNew ? (
            <div className="sm:col-span-2 rounded-xl border border-slate-500/25 bg-slate-950/30 p-5">
              <h2 className="text-sm font-semibold text-slate-200">
                Portal membership access
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Controls how long the member can use the dashboard (documents,
                profile edits, etc.). One-off fast-track payments default to one
                calendar month unless you change this.
              </p>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={portalMembershipUnlimited}
                  onChange={(e) =>
                    setPortalMembershipUnlimited(e.target.checked)
                  }
                  className="rounded border-white/20 bg-ink-900"
                />
                Unlimited portal access (staff override — ignores dates)
              </label>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300">
                  Access mode
                </label>
                <select
                  value={portalAccessMode}
                  onChange={(e) =>
                    setPortalAccessMode(
                      e.target.value as typeof portalAccessMode
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  <option value="keep">
                    Stripe — keep synced from Stripe (no local change)
                  </option>
                  <option value="legacy">
                    Unspecified / legacy (no expiry record)
                  </option>
                  <option value="manual">Manual term (set end date)</option>
                  <option value="fast_track">
                    One-off window (fast-track style — set end date)
                  </option>
                </select>
              </div>
              {portalAccessMode === "manual" ||
              portalAccessMode === "fast_track" ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Access until (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={portalExpiresAt}
                    onChange={(e) => setPortalExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              ) : null}
              {portalAccessMode === "legacy" ||
              portalAccessMode === "manual" ||
              portalAccessMode === "fast_track" ? (
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={clearStripeSubscription}
                    onChange={(e) =>
                      setClearStripeSubscription(e.target.checked)
                    }
                    className="rounded border-white/20 bg-ink-900"
                  />
                  Clear Stripe subscription link on save (use when moving off
                  Stripe or resetting billing)
                </label>
              ) : null}
              {portalAccessMode === "keep" && loadedStripeSubscriptionStatus ? (
                <p className="mt-3 text-xs text-slate-500">
                  Stripe status:{" "}
                  <span className="font-mono text-slate-400">
                    {loadedStripeSubscriptionStatus}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="sm:col-span-2 rounded-xl border border-brand-500/20 bg-brand-950/20 p-5">
            <h2 className="text-sm font-semibold text-brand-200">
              Member portal login
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Lets this business sign in at{" "}
              <span className="font-mono text-slate-400">/login</span> (Member tab)
              to view their dashboard and edit allowed profile fields.
            </p>
            {!isNew && portalEnabled ? (
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={disablePortal}
                  onChange={(e) => setDisablePortal(e.target.checked)}
                  className="rounded border-white/20 bg-ink-900"
                />
                Remove portal access (they will not be able to sign in)
              </label>
            ) : null}
            {!disablePortal ? (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Portal email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="contact@theirbusiness.co.uk"
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Portal password
                  </label>
                  <input
                    type="password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    placeholder={
                      isNew
                        ? "Optional — set to enable portal"
                        : "Leave blank to keep current password"
                    }
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            to="/staff/members"
            className="rounded-xl border border-white/15 px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

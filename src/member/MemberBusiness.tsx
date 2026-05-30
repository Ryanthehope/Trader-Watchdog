import { FormEvent, useEffect, useState } from "react";
import type { VerifiedMember } from "../types/content";
import {
  apiGetMember,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetMember<{ profile: VerifiedMember }>("/api/member/portal/me")
      .then((d) => {
        if (cancelled) return;
        const p = d.profile;
        setName(p.name);
        setTrade(p.trade);
        setLocation(p.location);
        setBlurb(p.blurb);
        setReadOnly({ tvId: p.tvId, slug: p.slug, checks: p.checks });
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
        body: JSON.stringify({ name, trade, location, blurb }),
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
        Update how your business appears on your public profile. Trader Watchdog ID,
        URL slug, and verification checks are managed by our team.
      </p>

      <div className="mt-5 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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

        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Business profile
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                How your business appears on your public Trader Watchdog listing.
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

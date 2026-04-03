import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecaptchaToken } from "../lib/submitApplication";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

type TradeCat = { slug: string; label: string };

/** If API is older and omits jobTradeCategories, keep form usable. */
const FALLBACK_TRADE_CATEGORIES: TradeCat[] = [
  { slug: "it", label: "IT & technology" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing & heating" },
  { slug: "building", label: "Building & construction" },
  { slug: "carpentry", label: "Carpentry & joinery" },
  { slug: "roofing", label: "Roofing" },
  { slug: "decorating", label: "Painting & decorating" },
  { slug: "landscaping", label: "Landscaping & gardening" },
  { slug: "security", label: "Security & alarms" },
  { slug: "cleaning", label: "Cleaning" },
  { slug: "other", label: "Other / general (broad match)" },
];

export function PostJob() {
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string | null>(null);
  const [tradeCategories, setTradeCategories] = useState<TradeCat[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [routedToTrades, setRoutedToTrades] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/api/public-config`)
      .then((r) => r.json())
      .then(
        (d: {
          recaptchaSiteKey?: string | null;
          jobTradeCategories?: TradeCat[];
        }) => {
          if (d.recaptchaSiteKey) setRecaptchaSiteKey(d.recaptchaSiteKey);
          setTradeCategories(
            Array.isArray(d.jobTradeCategories) && d.jobTradeCategories.length
              ? d.jobTradeCategories
              : FALLBACK_TRADE_CATEGORIES
          );
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!recaptchaSiteKey) return;
    if (document.querySelector('script[src*="google.com/recaptcha"]')) return;
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [recaptchaSiteKey]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const phone = String(fd.get("phone") ?? "").trim();
    const jobTitle = String(fd.get("jobTitle") ?? "").trim();
    const jobDescription = String(fd.get("jobDescription") ?? "").trim();
    const jobPostcode = String(fd.get("jobPostcode") ?? "").trim();
    const tradeCategory = String(fd.get("tradeCategory") ?? "").trim();
    const recaptchaToken = recaptchaSiteKey
      ? getRecaptchaToken()
      : undefined;
    if (recaptchaSiteKey && !recaptchaToken) {
      setError("Please complete the “I’m not a robot” check.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/job-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          jobTitle,
          jobDescription,
          jobPostcode,
          tradeCategory,
          recaptchaToken,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        routedToTrades?: number;
      };
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Could not send request"
        );
      }
      setDone(true);
      setRoutedToTrades(
        typeof data.routedToTrades === "number" ? data.routedToTrades : null
      );
      if (recaptchaSiteKey) {
        try {
          window.grecaptcha?.reset?.();
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Homeowners
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Post a job
      </h1>
      <p className="mt-3 text-slate-400">
        Tell us what you need and which trade type it is. Your request is shared
        with verified TradeVerify members in that category so they can contact
        you to quote. We also keep a copy for our team. There is no charge for
        submitting this form.
      </p>
      <div className="mt-6 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-slate-300">
        <p className="font-medium text-white">Prefer one business?</p>
        <p className="mt-1 text-slate-400">
          Search the directory and open their profile — you can{" "}
          <strong className="text-slate-200">contact them directly</strong>.
          That message goes only to that business as a lead in their portal.
        </p>
      </div>

      {done ? (
        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-center">
          <p className="text-lg font-semibold text-white">Request received</p>
          <p className="mt-2 text-sm text-slate-300">
            {routedToTrades != null && routedToTrades > 0 ? (
              <>
                We&apos;ve sent this to{" "}
                <strong className="text-white">
                  {routedToTrades} verified trade
                  {routedToTrades === 1 ? "" : "s"}
                </strong>{" "}
                in the category you chose — they may reach out using your
                contact details.
              </>
            ) : (
              <>
                We&apos;ll review your request. If we don&apos;t have a matching
                verified trade on the directory yet, our team will follow up with
                you directly.
              </>
            )}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-ink-900/40 p-6 sm:p-8"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Type of trade you need *
            </label>
            <select
              name="tradeCategory"
              required
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
            >
              <option value="" disabled>
                Select a category…
              </option>
              {tradeCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              We route your job to verified members whose profile matches this
              trade (e.g. IT, electrical).
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Your name *
            </label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                name="email"
                type="email"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                name="phone"
                type="tel"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Provide at least one of email or phone so trades can reply.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Job title *
            </label>
            <input
              name="jobTitle"
              required
              placeholder="e.g. Bathroom refit"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Job postcode *
            </label>
            <input
              name="jobPostcode"
              required
              placeholder="e.g. SW1A 1AA"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Describe the work *
            </label>
            <textarea
              name="jobDescription"
              required
              rows={5}
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white"
              placeholder="Rough size, timescale, access, anything we should know…"
            />
          </div>
          {recaptchaSiteKey ? (
            <div
              className="g-recaptcha"
              data-sitekey={recaptchaSiteKey}
            />
          ) : null}
          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {submitting ? "Sending…" : "Submit request"}
          </button>
        </form>
      )}
    </main>
  );
}

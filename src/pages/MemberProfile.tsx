import { Link, useParams } from "react-router-dom";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSiteData } from "../context/SiteDataContext";
import { apiGet, apiPostPublic, publicApiUrl } from "../lib/api";
import { getRecaptchaResponse } from "../lib/submitApplication";
import { PublicAvailabilityCalendar } from "../components/PublicAvailabilityCalendar";
import type {
  VettingCategoryPublic,
  VettingFactPublic,
  VettingItemPublic,
} from "../types/content";

const DISCLAIMER =
  "Trader Watchdog independently checks that tradespeople are local, insured, and hold the accreditations they claim. Trader Watchdog does not rate quality of workmanship. Always obtain multiple quotes and conduct your own due diligence.";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(full)}
      {"☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function StatusIcon({ status }: { status: VettingItemPublic["status"] }) {
  if (status === "verified") {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-sm shadow-emerald-900/30"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-sm font-bold text-slate-400"
      aria-hidden
    >
      —
    </span>
  );
}

function FactValue({ value }: { value: string }) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-medium text-emerald-700 underline decoration-emerald-700/40 underline-offset-2 hover:text-emerald-800"
      >
        {trimmed}
      </a>
    );
  }
  return <span className="text-slate-800">{value}</span>;
}

function VettingFacts({ facts }: { facts: VettingFactPublic[] }) {
  return (
    <dl className="space-y-3.5">
      {facts.map((f, i) => (
        <div key={`${i}-${f.label}`}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {f.label}
          </dt>
          <dd className="mt-1 text-sm leading-snug">
            <FactValue value={f.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function VettingAccordion({
  categories,
}: {
  categories: VettingCategoryPublic[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey((k) => (k === key ? null : key));
  };

  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <div key={cat.id}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {cat.label}
          </p>
          <ul className="mt-3 space-y-2">
            {cat.items.map((item) => {
              const key = `${cat.id}:${item.id}`;
              const open = openKey === key;
              const hasFacts = Boolean(item.facts?.length);
              const expandable =
                Boolean(item.detail?.trim()) ||
                Boolean(item.value?.trim()) ||
                hasFacts;
              const showPhoneIcon =
                item.id === "contact" ||
                item.label.toLowerCase().includes("contact number");
              return (
                <li key={item.id}>
                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                    <button
                      type="button"
                      disabled={!expandable}
                      onClick={() => expandable && toggle(key)}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                        expandable
                          ? "hover:bg-slate-50"
                          : "cursor-default opacity-95"
                      }`}
                      aria-expanded={expandable ? open : undefined}
                    >
                      <StatusIcon status={item.status} />
                      <span
                        className={`min-w-0 flex-1 text-sm font-medium ${
                          item.status === "verified"
                            ? "text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {item.label}
                      </span>
                      {expandable ? <Chevron open={open} /> : null}
                    </button>
                    {expandable && open ? (
                      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 pl-[4.25rem] text-sm text-slate-600">
                        {item.detail ? (
                          <p className="leading-relaxed">{item.detail}</p>
                        ) : null}
                        {item.value ? (
                          <p
                            className={`flex items-center gap-2 font-medium text-slate-800 ${
                              item.detail ? "mt-3" : ""
                            }`}
                          >
                            {showPhoneIcon ? (
                              <span
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
                                aria-hidden
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                              </span>
                            ) : null}
                            <FactValue value={item.value} />
                          </p>
                        ) : null}
                        {hasFacts && item.facts ? (
                          <div
                            className={
                              item.detail?.trim() || item.value?.trim()
                                ? "mt-4 border-t border-slate-200/90 pt-4"
                                : ""
                            }
                          >
                            <VettingFacts facts={item.facts} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string;
  businessReply: string | null;
  businessRepliedAt: string | null;
};

export function MemberProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { members, loading, error, reload } = useSiteData();
  const member = members.find((m) => m.slug === slug);

  const [reviewSummary, setReviewSummary] = useState<{
    averageRating: number | null;
    count: number;
  } | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string | null>(
    null
  );
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null);

  const reviewCaptchaHostRef = useRef<HTMLDivElement>(null);
  const inquiryCaptchaHostRef = useRef<HTMLDivElement>(null);
  const reviewCaptchaWidgetIdRef = useRef<number | null>(null);
  const inquiryCaptchaWidgetIdRef = useRef<number | null>(null);
  const recaptchaRenderedRef = useRef(false);

  useEffect(() => {
    fetch(`${apiBase()}/api/public-config`)
      .then((r) => r.json())
      .then((d: { recaptchaSiteKey?: string | null }) => {
        if (d.recaptchaSiteKey) setRecaptchaSiteKey(d.recaptchaSiteKey);
      })
      .catch(() => {});
  }, []);

  /** Explicit render — automatic `.g-recaptcha` often never mounts with React, and two widgets need separate IDs for `getResponse`. */
  useEffect(() => {
    if (!recaptchaSiteKey || !member) return;

    const mountWidgets = () => {
      const g = window.grecaptcha;
      if (!g?.ready) return;
      g.ready(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const h1 = reviewCaptchaHostRef.current;
            const h2 = inquiryCaptchaHostRef.current;
            if (!h1 || !h2 || recaptchaRenderedRef.current) return;
            try {
              reviewCaptchaWidgetIdRef.current = g.render(h1, {
                sitekey: recaptchaSiteKey,
                theme: "dark",
              });
              inquiryCaptchaWidgetIdRef.current = g.render(h2, {
                sitekey: recaptchaSiteKey,
                theme: "dark",
              });
              recaptchaRenderedRef.current = true;
            } catch (e) {
              console.error("reCAPTCHA render failed:", e);
            }
          });
        });
      });
    };

    let scriptEl: HTMLScriptElement | null = null;
    const onScriptLoad = () => mountWidgets();

    if (window.grecaptcha?.render) {
      mountWidgets();
    } else {
      scriptEl = document.querySelector(
        'script[src*="google.com/recaptcha/api.js"]'
      ) as HTMLScriptElement | null;
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.src =
          "https://www.google.com/recaptcha/api.js?render=explicit";
        scriptEl.async = true;
        scriptEl.defer = true;
        document.body.appendChild(scriptEl);
      }
      scriptEl.addEventListener("load", onScriptLoad);
      setTimeout(() => {
        if (window.grecaptcha?.render && !recaptchaRenderedRef.current) {
          mountWidgets();
        }
      }, 0);
    }

    return () => {
      scriptEl?.removeEventListener("load", onScriptLoad);
      recaptchaRenderedRef.current = false;
      reviewCaptchaWidgetIdRef.current = null;
      inquiryCaptchaWidgetIdRef.current = null;
      if (reviewCaptchaHostRef.current) {
        reviewCaptchaHostRef.current.innerHTML = "";
      }
      if (inquiryCaptchaHostRef.current) {
        inquiryCaptchaHostRef.current.innerHTML = "";
      }
    };
  }, [recaptchaSiteKey, member]);

  useEffect(() => {
    if (!slug || !member) return;
    let cancelled = false;
    setReviewsLoading(true);
    apiGet<{
      summary: { averageRating: number | null; count: number };
      reviews: PublicReview[];
    }>(`/api/members/by-slug/${encodeURIComponent(slug)}/reviews`)
      .then((d) => {
        if (cancelled) return;
        setReviewSummary(d.summary);
        setReviews(d.reviews);
      })
      .catch(() => {
        if (!cancelled) {
          setReviewSummary(null);
          setReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, member]);

  const badgeSrc = useMemo(
    () =>
      slug
        ? publicApiUrl(
            `/api/members/by-slug/${encodeURIComponent(slug)}/badge.svg`
          )
        : "",
    [slug]
  );

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-slate-400">Loading profile…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-semibold text-white">
          Directory unavailable
        </h1>
        <p className="mt-3 text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => reload()}
          className="mt-8 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Retry
        </button>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trader Watchdog
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">
          Profile not found
        </h1>
        <p className="mt-3 text-slate-400">
          There is no verified listing for that link. Check the Trader Watchdog ID
          spelling or search from the home page.
        </p>
        <Link
          to="/#verify"
          className="mt-8 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Back to verify
        </Link>
      </main>
    );
  }

  const categories =
    member.vettingCategories.length > 0
      ? member.vettingCategories
      : [
          {
            id: "summary",
            label: "Verification summary",
            items: [
              {
                id: "placeholder",
                label: "Verification details",
                status: "verified" as const,
                detail:
                  "This business is listed as Trader Watchdog checked. Detailed checklist items will appear here once configured.",
              },
            ],
          },
        ];

  return (
    <main className="border-b border-white/5 pb-20">
      <div className="border-b border-white/5 bg-gradient-to-br from-brand-950/40 to-ink-950 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            to="/#verify"
            className="text-sm font-medium text-brand-300 hover:text-brand-200"
          >
            ← Verify another business
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-4">
                  {member.profileLogo ? (
                    <img
                      src={publicApiUrl(
                        `/api/members/by-slug/${encodeURIComponent(member.slug)}/profile-logo`
                      )}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl border border-white/15 bg-slate-900/50 object-contain ring-1 ring-white/10 sm:h-20 sm:w-20"
                    />
                  ) : null}
                  <div className="min-w-0">
                <p className="inline-flex rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold tracking-wide text-white">
                  {member.tvId}
                </p>
                <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                  {member.name}
                </h1>
                <p className="mt-2 text-lg text-slate-400">
                  {member.trade} · {member.location}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Checked since {member.verifiedSince}
                </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-center sm:justify-end">
                <div className="overflow-hidden rounded-xl shadow-lg shadow-black/30 ring-1 ring-emerald-500/35">
                  <img
                    src={badgeSrc}
                    width={320}
                    height={88}
                    alt=""
                    className="h-auto max-w-[min(100%,320px)]"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-emerald-600/40 bg-emerald-600 px-6 py-3.5 sm:px-8">
              <svg
                className="h-5 w-5 shrink-0 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-sm font-semibold text-white">
                This business has been Trader Watchdog checked.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-8 lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-white">
            What we checked
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Each item below was independently audited by Trader Watchdog before this
            business was approved.
          </p>

          <div className="mt-8">
            <VettingAccordion categories={categories} />
          </div>

          <p className="mt-10 border-t border-white/10 pt-8 text-xs leading-relaxed text-slate-500">
            {DISCLAIMER}
          </p>

          <p className="mt-8 text-sm leading-relaxed text-slate-400">
            {member.blurb}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Member since {member.verifiedSince}. Information reflects checks at
            enrolment; members must keep credentials current and notify
            Trader Watchdog of material changes.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-ink-900/50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-white">
            Customer reviews
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Short feedback from homeowners who hired this business. Reviews are
            moderated and are not the same as Trader Watchdog&apos;s verification
            checks — always get your own quotes.
          </p>
          {reviewsLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading reviews…</p>
          ) : reviewSummary && reviewSummary.count > 0 ? (
            <div className="mt-6 flex flex-wrap items-baseline gap-2">
              <Stars rating={reviewSummary.averageRating ?? 0} />
              <span className="text-sm text-slate-300">
                {reviewSummary.averageRating != null
                  ? reviewSummary.averageRating.toFixed(1)
                  : "—"}{" "}
                ({reviewSummary.count}{" "}
                {reviewSummary.count === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              No published reviews yet.
            </p>
          )}
          <ul className="mt-6 space-y-5">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  {r.title ? (
                    <span className="font-medium text-white">{r.title}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {r.body}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {r.authorName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {r.businessReply ? (
                  <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/95">
                      Response from the business
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      {r.businessReply}
                    </p>
                    {r.businessRepliedAt ? (
                      <p className="mt-1.5 text-xs text-slate-500">
                        {new Date(r.businessRepliedAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-white/10 pt-8">
            <h3 className="text-sm font-semibold text-white">
              Leave a review
            </h3>
            <form
              className="mt-4 space-y-3"
              noValidate
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const form = e.currentTarget;
                if (!slug) return;
                setReviewFormError(null);
                setReviewMessage(null);
                const fd = new FormData(form);
                const rating = Number(fd.get("rating"));
                const body = String(fd.get("body") ?? "").trim();
                const authorName = String(fd.get("authorName") ?? "").trim();
                const authorEmail = String(fd.get("authorEmail") ?? "").trim();
                const title = String(fd.get("title") ?? "").trim();

                if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                  setReviewFormError("Please choose a star rating.");
                  return;
                }
                if (!authorName) {
                  setReviewFormError("Please enter your name.");
                  return;
                }
                if (body.length < 20) {
                  setReviewFormError(
                    "Please write at least 20 characters about your experience."
                  );
                  return;
                }
                if (body.length > 2000) {
                  setReviewFormError("Review is too long (max 2000 characters).");
                  return;
                }

                const recaptchaToken = recaptchaSiteKey
                  ? getRecaptchaResponse(reviewCaptchaWidgetIdRef.current)
                  : undefined;
                if (recaptchaSiteKey) {
                  if (reviewCaptchaWidgetIdRef.current == null) {
                    setReviewFormError(
                      "Security check is still loading — wait a moment and try again."
                    );
                    return;
                  }
                  if (!recaptchaToken) {
                    setReviewFormError(
                      "Please complete the reCAPTCHA (I'm not a robot) above."
                    );
                    return;
                  }
                }

                setReviewSubmitting(true);
                try {
                  await apiPostPublic<{
                    ok: boolean;
                    message?: string;
                  }>(
                    `/api/members/by-slug/${encodeURIComponent(slug)}/reviews`,
                    {
                      rating,
                      body,
                      authorName,
                      authorEmail,
                      title,
                      recaptchaToken,
                    }
                  );
                  setReviewMessage(
                    "Thanks — your review was submitted for moderation."
                  );
                  form.reset();
                  if (
                    recaptchaSiteKey &&
                    reviewCaptchaWidgetIdRef.current != null
                  ) {
                    try {
                      window.grecaptcha?.reset?.(
                        reviewCaptchaWidgetIdRef.current
                      );
                    } catch {
                      /* ignore */
                    }
                  }
                } catch (err) {
                  setReviewFormError(
                    err instanceof Error ? err.message : "Could not submit"
                  );
                } finally {
                  setReviewSubmitting(false);
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  Rating
                  <select
                    name="rating"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} — {n === 5 ? "Excellent" : n === 1 ? "Poor" : "…"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-slate-400 sm:col-span-2">
                  Title (optional)
                  <input
                    name="title"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                    placeholder="Short headline"
                  />
                </label>
              </div>
              <label className="block text-xs text-slate-400">
                Your experience
                <textarea
                  name="body"
                  required
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  placeholder="What work was done? How did it go? (at least 20 characters)"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  Your name
                  <input
                    name="authorName"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Email (optional)
                  <input
                    name="authorEmail"
                    type="email"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  />
                </label>
              </div>
              {recaptchaSiteKey ? (
                <div className="min-h-[78px]">
                  <div ref={reviewCaptchaHostRef} className="inline-block" />
                </div>
              ) : null}
              <div
                id="review-form-feedback"
                className="space-y-2"
                aria-live="polite"
              >
                {reviewFormError ? (
                  <p className="text-sm text-red-300">{reviewFormError}</p>
                ) : null}
                {reviewMessage ? (
                  <p className="text-sm text-emerald-300">{reviewMessage}</p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
              >
                {reviewSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        </div>
          </div>

          <aside className="space-y-6 lg:col-span-1">
            <div className="sticky top-6 space-y-6">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/50 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-white">
                Contact this trade
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Send a message and your details. The business can reply using
                the contact information you provide.
              </p>
              <form
                className="mt-4 space-y-3"
                noValidate
                onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  if (!slug) return;
                  setInquiryError(null);
                  setInquirySuccess(null);
                  const fd = new FormData(form);
                  const name = String(fd.get("inquiryName") ?? "").trim();
                  const email = String(fd.get("inquiryEmail") ?? "")
                    .trim()
                    .toLowerCase();
                  const phone = String(fd.get("inquiryPhone") ?? "").trim();
                  const message = String(fd.get("inquiryMessage") ?? "").trim();

                  if (!name) {
                    setInquiryError("Please enter your name.");
                    return;
                  }
                  if (!email && !phone) {
                    setInquiryError(
                      "Please enter an email address or phone number."
                    );
                    return;
                  }
                  if (message.length < 10) {
                    setInquiryError(
                      "Please write at least 10 characters in your message."
                    );
                    return;
                  }

                  const recaptchaToken = recaptchaSiteKey
                    ? getRecaptchaResponse(inquiryCaptchaWidgetIdRef.current)
                    : undefined;
                  if (recaptchaSiteKey) {
                    if (inquiryCaptchaWidgetIdRef.current == null) {
                      setInquiryError(
                        "Security check is still loading — wait a moment and try again."
                      );
                      return;
                    }
                    if (!recaptchaToken) {
                      setInquiryError(
                        "Please complete the reCAPTCHA (I'm not a robot) below."
                      );
                      return;
                    }
                  }

                  setInquirySubmitting(true);
                  try {
                    await apiPostPublic<{ ok?: boolean; message?: string }>(
                      `/api/members/by-slug/${encodeURIComponent(slug)}/inquiries`,
                      {
                        name,
                        email: email || undefined,
                        phone: phone || undefined,
                        message,
                        recaptchaToken,
                      }
                    );
                    setInquirySuccess(
                      "Message sent — the trade will respond using your contact details."
                    );
                    form.reset();
                    if (
                      recaptchaSiteKey &&
                      inquiryCaptchaWidgetIdRef.current != null
                    ) {
                      try {
                        window.grecaptcha?.reset?.(
                          inquiryCaptchaWidgetIdRef.current
                        );
                      } catch {
                        /* ignore */
                      }
                    }
                  } catch (err) {
                    setInquiryError(
                      err instanceof Error ? err.message : "Could not send"
                    );
                  } finally {
                    setInquirySubmitting(false);
                  }
                }}
              >
                <label className="block text-xs text-slate-400">
                  Your name
                  <input
                    name="inquiryName"
                    required
                    autoComplete="name"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Email
                  <input
                    name="inquiryEmail"
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Phone
                  <input
                    name="inquiryPhone"
                    type="tel"
                    autoComplete="tel"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  Provide an email or phone (or both) so they can reply.
                </p>
                <label className="block text-xs text-slate-400">
                  Message
                  <textarea
                    name="inquiryMessage"
                    required
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-white"
                    placeholder="Describe the job or ask a question… (at least 10 characters)"
                  />
                </label>
                {recaptchaSiteKey ? (
                  <div className="min-h-[78px]">
                    <div ref={inquiryCaptchaHostRef} className="inline-block" />
                  </div>
                ) : null}
                {inquiryError ? (
                  <p className="text-sm text-red-300">{inquiryError}</p>
                ) : null}
                {inquirySuccess ? (
                  <p className="text-sm text-emerald-300">{inquirySuccess}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={inquirySubmitting}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {inquirySubmitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>
            {slug ? (
              <PublicAvailabilityCalendar slug={slug} />
            ) : null}
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-ink-900/20 p-6 text-center">
          <p className="text-sm text-slate-400">
            Hiring this trade? Confirm their Trader Watchdog ID on this site before
            you pay a deposit.
          </p>
          <Link
            to="/#verify"
            className="mt-4 inline-flex text-sm font-semibold text-brand-300 hover:text-brand-200"
          >
            Verify another ID →
          </Link>
        </div>
      </div>
    </main>
  );
}

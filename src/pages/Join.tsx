import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getRecaptchaToken,
  submitApplication,
} from "../lib/submitApplication";
import { getLaunchWindow } from "../lib/launchWindow";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

const JOIN_STORAGE_KEY = "Trader Watchdog_join_apply";

type ApplicantSummary = {
  exists: boolean;
  status?: string;
  billingAvailable: boolean;
  canCheckoutRegistrationFee: boolean;
  canCheckoutMembership: boolean;
  hasRegistrationFeePayment: boolean;
  hasMembershipPayment: boolean;
  profileLive: boolean;
  /** Shown until first portal login or expiry; not stored in the browser. */
  oneTimePassword: string | null;
};

const traderBenefits = [
  "Protect your reputation and show customers your business is insured, compliant, and real.",
  "One fee regardless of employee count, with no area caps and fair visibility for all traders.",
  "Help reduce rogue trading in your community while giving householders one place to check your business.",
  "Receive renewal reminders for insurance, licences, memberships, and your Trader Watchdog annual renewal.",
];

const validationSteps = [
  {
    title: "Register the business details you actually advertise",
    body: "Apply using your trading name, main trading postcode, work email, and the telephone number customers will search for.",
  },
  {
    title: "Upload supporting evidence",
    body: "Insurance evidence is required before approval. Qualifications, memberships, and relevant scheme registrations help support your application.",
  },
  {
    title: "Complete verification checks",
    body: "Identity, address, and liveness checks are handled during verification. We also review insurance and, where relevant, ICO, waste carrier, Gas Safe, and Competent Person evidence.",
  },
  {
    title: "Pay only after approval",
    body: "No payment is taken until your credentials are validated and your application is approved. Once payment completes, your public profile and member portal are created.",
  },
];

const customerOutcomes = [
  {
    title: "Verified listing",
    tone: "emerald",
    body: "Customers can find your business by name or telephone number, view your live Trader Watchdog profile, and review the checks shown there before agreeing work.",
  },
  {
    title: "No verified listing",
    tone: "red",
    body: "If a trader is not verified, customers are told to proceed cautiously and ask to see the evidence directly before agreeing work or paying money.",
  },
];

export function Join() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [membershipPricePence, setMembershipPricePence] = useState<number | null>(null);
  const [baseMembershipPricePence, setBaseMembershipPricePence] = useState<number | null>(null);
  const [launchDiscountActive, setLaunchDiscountActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentVia, setSentVia] = useState<"api" | "webhook" | "mailto" | null>(
    null
  );
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<
    "registration" | "member" | null
  >(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [applicantSummary, setApplicantSummary] =
    useState<ApplicantSummary | null>(null);
  /** First applicant-summary fetch finished for this applicationId (avoids clearing before we know they can pay). */
  const [applicantSummaryReady, setApplicantSummaryReady] = useState(false);

  const paidNotice = searchParams.get("paid");
  const cancelled = searchParams.get("cancelled");
  const { beforeLaunch, launchDiscountActive: launchWindowDiscountActive, publicSearchEnabled } =
    getLaunchWindow();

  const applyStoredJoinSession = useCallback(
    (p: { applicationId: string; email: string }) => {
      setSent(true);
      setSentVia("api");
      setApplicationId(p.applicationId);
      setSavedEmail(p.email);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem(JOIN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (!raw) {
        if (!cancelled) setSessionChecked(true);
        return;
      }
      let parsed: {
        applicationId?: string;
        email?: string;
        billingAvailable?: boolean;
      };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        try {
          sessionStorage.removeItem(JOIN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        if (!cancelled) setSessionChecked(true);
        return;
      }
      const { applicationId, email } = parsed;
      if (!applicationId?.trim() || !email?.trim()) {
        if (!cancelled) setSessionChecked(true);
        return;
      }
      const id = applicationId.trim();
      const em = email.trim().toLowerCase();
      try {
        const res = await fetch(`${apiBase()}/api/applications/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: id, email: em }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          exists?: boolean;
        };
        if (cancelled) return;
        if (res.ok && data.exists) {
          applyStoredJoinSession({
            applicationId: id,
            email: em,
          });
        } else {
          /** Deleted app, wrong email, bad response, or offline — drop stale client session. */
          try {
            sessionStorage.removeItem(JOIN_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (cancelled) return;
        try {
          sessionStorage.removeItem(JOIN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [applyStoredJoinSession]);

  const refreshApplicantSummary = useCallback(async () => {
    if (!applicationId || !savedEmail) return;
    try {
      const res = await fetch(`${apiBase()}/api/applications/applicant-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          email: savedEmail,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ApplicantSummary>;
      if (!res.ok || typeof data.exists !== "boolean") return;
      const summary: ApplicantSummary = {
        exists: data.exists,
        status: data.status,
        billingAvailable: Boolean(data.billingAvailable),
        canCheckoutRegistrationFee: Boolean(data.canCheckoutRegistrationFee),
        canCheckoutMembership: Boolean(data.canCheckoutMembership),
        hasRegistrationFeePayment: Boolean(data.hasRegistrationFeePayment),
        hasMembershipPayment: Boolean(data.hasMembershipPayment),
        profileLive: Boolean(data.profileLive),
        oneTimePassword:
          typeof data.oneTimePassword === "string" && data.oneTimePassword
            ? data.oneTimePassword
            : null,
      };
      setApplicantSummary(summary);
    } catch {
      /* ignore */
    }
  }, [applicationId, savedEmail]);

  useEffect(() => {
    if (!sent || sentVia !== "api" || !applicationId || !savedEmail) {
      setApplicantSummaryReady(false);
      return;
    }
    setApplicantSummaryReady(false);
    let cancelled = false;
    const runFirst = async () => {
      await refreshApplicantSummary();
      if (!cancelled) setApplicantSummaryReady(true);
    };
    void runFirst();
    const t = setInterval(() => void refreshApplicantSummary(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [
    sent,
    sentVia,
    applicationId,
    savedEmail,
    refreshApplicantSummary,
    paidNotice,
  ]);

  useEffect(() => {
    fetch(`${apiBase()}/api/public-config`)
      .then((r) => r.json())
      .then(
        (d: {
          recaptchaSiteKey?: string | null;
          membershipPricePence?: number;
          baseMembershipPricePence?: number;
          launchDiscountActive?: boolean;
        }) => {
        if (d.recaptchaSiteKey) setRecaptchaSiteKey(d.recaptchaSiteKey);
          if (typeof d.membershipPricePence === "number") {
            setMembershipPricePence(d.membershipPricePence);
          }
          if (typeof d.baseMembershipPricePence === "number") {
            setBaseMembershipPricePence(d.baseMembershipPricePence);
          }
          setLaunchDiscountActive(Boolean(d.launchDiscountActive));
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

  useEffect(() => {
    return undefined;
  }, [paidNotice]);

  const clearJoinNotice = () => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.delete("paid");
      n.delete("app");
      n.delete("cancelled");
      return n;
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const company = String(fd.get("company") ?? "").trim();
    const legalStructure = String(fd.get("legalStructure") ?? "").trim();
    const tradingAddress = String(fd.get("tradingAddress") ?? "").trim();
    const trade = String(fd.get("trade") ?? "").trim();
    const identifiablePerson = String(fd.get("identifiablePerson") ?? "").trim();
    const identifiablePersonAddress = String(
      fd.get("identifiablePersonAddress") ?? ""
    ).trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const postcode = String(fd.get("postcode") ?? "").trim();
    const wasteCarrierRequired = String(
      fd.get("wasteCarrierRequired") ?? ""
    ).trim();
    const wasteCarrierNumber = String(fd.get("wasteCarrierNumber") ?? "").trim();
    const gasSafeRequired = String(fd.get("gasSafeRequired") ?? "").trim();
    const gasSafeNumber = String(fd.get("gasSafeNumber") ?? "").trim();
    const icoNumber = String(fd.get("icoNumber") ?? "").trim();
    const businessDescription = String(
      fd.get("businessDescription") ?? ""
    ).trim();
    const documentsConfirmed = fd.get("documentsConfirmed") === "on";
    const agreementAccepted = fd.get("agreementAccepted") === "on";
    const enquiriesAccepted = fd.get("enquiriesAccepted") === "on";
    const filesRaw = fd.getAll("files").filter((x): x is File => x instanceof File);
    const files = filesRaw.filter((f) => f.size > 0);

    if (files.length > 8) {
      setFormError("Please upload no more than 8 supporting documents.");
      return;
    }

    const oversizedFile = files.find((f) => f.size > 10 * 1024 * 1024);

    if (oversizedFile) {
      setFormError(
        `Each file must be 10 MB or less. ${oversizedFile.name} is too large.`
      );
      return;
    }

    if (!agreementAccepted || !enquiriesAccepted || !documentsConfirmed) {
      setFormError(
        "Please confirm the required declaration boxes before submitting."
      );
      return;
    }

    const recaptchaToken = recaptchaSiteKey
      ? getRecaptchaToken()
      : undefined;
    if (recaptchaSiteKey && !recaptchaToken) {
      setFormError("Please tick the box to confirm you're not a robot.");
      return;
    }

    setSubmitting(true);
    const result = await submitApplication(
      {
        company,
        legalStructure,
        tradingAddress,
        phone,
        identifiablePerson,
        identifiablePersonAddress,
        email,
        trade,
        postcode,
        wasteCarrierRequired,
        wasteCarrierNumber,
        gasSafeRequired,
        gasSafeNumber,
        icoNumber,
        businessDescription,
        documentsConfirmed,
        agreementAccepted,
        enquiriesAccepted,
        submittedAt: new Date().toISOString(),
        recaptchaToken,
      },
      files
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setApplicantSummary(null);
    setApplicantSummaryReady(false);
    setSentVia(result.via);
    setSent(true);
    if (result.applicationId) setApplicationId(result.applicationId);
    const emailNorm = email.toLowerCase();
    setSavedEmail(emailNorm);
    if (result.applicationId && result.via === "api") {
      try {
        sessionStorage.setItem(
          JOIN_STORAGE_KEY,
          JSON.stringify({
            applicationId: result.applicationId,
            email: emailNorm,
            billingAvailable: Boolean(result.billingAvailable),
          })
        );
      } catch {
        /* ignore */
      }
    }
    if (recaptchaSiteKey) {
      try {
        window.grecaptcha?.reset?.();
      } catch {
        /* ignore */
      }
    }
  };

  const clearJoinSession = () => {
    try {
      sessionStorage.removeItem(JOIN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSent(false);
    setSentVia(null);
    setApplicationId(null);
    setSavedEmail("");
    setFormError(null);
    setApplicantSummary(null);
    setApplicantSummaryReady(false);
  };

  const startCheckout = async (kind: "registration" | "member") => {
    if (!applicationId || !savedEmail) return;
    setCheckoutLoading(kind);
    setFormError(null);
    try {
      const path =
        kind === "registration"
          ? "/api/billing/checkout-registration-fee"
          : "/api/billing/checkout-membership";
      const res = await fetch(`${apiBase()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, email: savedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof data?.error === "string"
            ? data.error
            : "Could not start checkout"
        );
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
      }
    } catch {
      setFormError("Network error starting checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const inbox = import.meta.env.VITE_APPLICATION_INBOX_EMAIL?.trim();

  /**
   * Only offer a fresh application when it won’t drop an in-flight approval/payment.
   * (Strict `status === "APPROVED"` missed some cases; positive allow-list is safer.)
   */
  const applicantStatus = String(applicantSummary?.status ?? "").toUpperCase();
  const hasAnyPayment = Boolean(
    applicantSummary?.hasRegistrationFeePayment || applicantSummary?.hasMembershipPayment);
  const hasBothPayments = Boolean(
  applicantSummary?.hasRegistrationFeePayment && applicantSummary?.hasMembershipPayment);
  const canCheckoutAny = Boolean(
  applicantSummary?.canCheckoutRegistrationFee || applicantSummary?.canCheckoutMembership);
  const showSubmitAnother =
    sentVia === "api" &&
    applicantSummaryReady &&
    applicantSummary != null &&
    !canCheckoutAny &&
    !applicantSummary.profileLive &&
    (applicantStatus === "DECLINED" ||
      (applicantSummary.exists && applicantStatus !== "APPROVED"));

  const formatPence = (value: number | null) =>
    value == null ? null : `£${(value / 100).toFixed(2)}`;

  const membershipPriceLabel = formatPence(membershipPricePence);
  const introBody = "Trader Watchdog gives householders confidence that they are dealing with an honest, legitimate trader. We do not sell leads, do not limit the number of traders in an area, and no payment is taken until your credentials are validated and your application is approved.";
  const introSupport = publicSearchEnabled
    ? "One fee regardless of employee count, fair visibility for all, annual renewal reminders for insurance, licences, and membership, and public search by business name or telephone number once your profile is approved."
    : "One fee regardless of employee count, fair visibility for all, annual renewal reminders for insurance, licences, and membership, and a searchable public profile using your business name and advertised telephone number once public search is enabled.";
  const pricingHeading = "Annual membership";

  return (
    <main className="border-b border-white/5 pb-24">
      <div className="border-b border-white/5 bg-gradient-to-br from-brand-950/50 to-ink-950 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            For tradespeople
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Apply to become a verified Trader Watchdog business
          </h1>
          <p className="mt-4 text-slate-400">
            {introBody}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            {introSupport}
          </p>
          {membershipPriceLabel ? (
            <div className="mt-6 rounded-xl border border-brand-400/20 bg-brand-500/10 px-4 py-4 text-left">
              <p className="text-sm font-semibold text-white">{pricingHeading}</p>
              <p className="mt-2 text-sm text-slate-300">
                Annual membership: <span className="font-semibold text-white">{membershipPriceLabel}</span> after approval.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Renewals are handled annually rather than on a monthly subscription.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="border-b border-white/5 bg-ink-950/40 py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Why register with Trader Watchdog?
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              An affordable public platform for legitimate traders
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {traderBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300"
                >
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/10 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
              What this means for your business
            </p>
            <ul className="mt-5 space-y-4 text-sm text-slate-200">
              <li>Show customers you are insured, licensed, and compliant before they pick up the phone.</li>
              <li>Build trust without paying for leads or competing for paid placement in your area.</li>
              <li>Stay visible with a searchable public profile once your application is approved.</li>
              <li>Get 30 and 14 day reminders before key renewal dates.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-ink-950/20 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              How validation works
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              A clearer version of the process traders actually go through
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {validationSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-ink-900/60 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-ink-950/40 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              What customers will see
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              Your public result needs to be clear at a glance
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {customerOutcomes.map((outcome) => (
              <div
                key={outcome.title}
                className={
                  outcome.tone === "emerald"
                    ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6"
                    : "rounded-2xl border border-red-500/30 bg-red-500/10 p-6"
                }
              >
                <p
                  className={
                    outcome.tone === "emerald"
                      ? "text-sm font-semibold uppercase tracking-wider text-emerald-200"
                      : "text-sm font-semibold uppercase tracking-wider text-red-200"
                  }
                >
                  {outcome.title}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                  {outcome.body}
                </p>
              </div>
            ))}
            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 md:col-span-2">
              <p className="text-sm leading-relaxed text-slate-400">
                If customers contact you after checking your profile, we ask them to mention Trader Watchdog. The public-facing experience is designed to show proof first, not sell leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-xl px-4 pt-12 sm:px-6">
        {cancelled ? (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span>
              Checkout was cancelled. When you&apos;re ready, complete payment from
              this page (after approval).
            </span>
            <button
              type="button"
              onClick={clearJoinNotice}
              className="shrink-0 rounded-full border border-amber-200/20 px-2.5 py-1 text-xs font-medium text-amber-100/90 hover:bg-amber-500/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {paidNotice === "registration_fee" ? (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span>
              Registration fee received. We&apos;re creating your Trader Watchdog
              listing — refresh in a moment or check your email.
            </span>
            <button
              type="button"
              onClick={clearJoinNotice}
              className="shrink-0 rounded-full border border-emerald-200/20 px-2.5 py-1 text-xs font-medium text-emerald-100/90 hover:bg-emerald-500/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {paidNotice === "membership" ? (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span>
              Membership payment received. Your member profile should appear
              shortly; you can log in with your work email once it&apos;s ready.
            </span>
            <button
              type="button"
              onClick={clearJoinNotice}
              className="shrink-0 rounded-full border border-emerald-200/20 px-2.5 py-1 text-xs font-medium text-emerald-100/90 hover:bg-emerald-500/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {!sessionChecked ? (
          <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-8 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : sent ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <p className="font-display text-lg font-semibold text-white">
              Application received
            </p>
            {sentVia === "api" ? (
              applicantSummary?.profileLive ? (
                <p className="mt-2 text-sm text-slate-400">
                  Your public listing is live and your member portal is ready.
                  {applicantSummary?.oneTimePassword ? (
                    <>
                      {" "}
                      Use the one-time password below for your first sign-in,
                      then you&apos;ll choose a new password.
                    </>
                  ) : (
                    <>
                      {" "}
                      Sign in with the password you chose (or the one Trader Watchdog
                      gave you if you haven&apos;t changed it yet).
                    </>
                  )}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-400">
                    Your application is saved. Our team will run vetting
                    (insurance, identity, and trade checks) and email you when
                    you&apos;re approved. After approval, return to this page to
                    pay your registration fee and annual membership — your public listing and
                    member login are created when payment completes.
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Tip: bookmark this tab or keep your confirmation email so you
                    can open this page again easily.
                  </p>
                </>
              )
            ) : sentVia === "mailto" ? (
              <p className="mt-2 text-sm text-slate-400">
                Your email app should open with a pre-filled message. Send it to
                complete your application. If nothing opened, email{" "}
                {inbox ? (
                  <a
                    href={`mailto:${inbox}`}
                    className="text-brand-300 hover:text-brand-200"
                  >
                    {inbox}
                  </a>
                ) : (
                  "us"
                )}{" "}
                with your business name, trade, and postcode.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Thank you. Our team will review your details and contact you at
                the work email you provided.
              </p>
            )}

            {sentVia === "api" && applicationId ? (
              <div className="mt-8 space-y-4 text-left">
                {applicantSummary?.exists &&
                applicantSummary.status === "DECLINED" ? (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100/95">
                    This application was not approved. If you think this is a
                    mistake, reply to the email from our team or use{" "}
                    <Link
                      to="/contact"
                      className="font-medium text-amber-200 underline decoration-amber-500/40"
                    >
                      Contact
                    </Link>
                    .
                  </div>
                ) : null}
                {applicantSummary?.exists && applicantSummary.profileLive ? (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-sm text-emerald-100/95">
                    <p className="font-semibold text-white">
                      Your Trader Watchdog profile is live
                    </p>
                    <p className="mt-2 text-emerald-100/85">
                      Sign in with your work email:{" "}
                      <span className="text-white">{savedEmail}</span>
                    </p>
                    {applicantSummary.oneTimePassword ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-ink-950/70 p-4 text-left">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          One-time password
                        </p>
                        <p className="mt-2 break-all font-mono text-base text-white">
                          {applicantSummary.oneTimePassword}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Save this now — it disappears after you sign in or
                          after 14 days. You will be asked to set a new password
                          before using the portal.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard.writeText(
                              applicantSummary.oneTimePassword ?? ""
                            )
                          }
                          className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                        >
                          Copy password
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        No one-time password is shown here after your{" "}
                        <strong className="text-slate-400">first successful</strong>{" "}
                        portal login (it is removed for security), or if this
                        listing was set up before passwords were shown on this
                        page. Use the password you set at first login; forgot it?{" "}
                        <Link
                          to="/contact"
                          className="text-brand-300 hover:text-brand-200"
                        >
                          Contact
                        </Link>{" "}
                        Trader Watchdog.
                      </p>
                    )}
                    <Link
                      to="/login"
                      className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-slate-100"
                    >
                      Log in
                    </Link>
                  </div>
                ) : null}
                {applicantSummary?.exists &&
                hasBothPayments &&
                !applicantSummary.profileLive &&
                applicantSummary.status === "APPROVED" ? (
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-6 text-sm text-slate-400">
                    <p className="font-medium text-white">Payment received</p>
                    <p className="mt-2">
                      We&apos;re finalising your member profile. This usually
                      takes under a minute — this page updates automatically, or
                      refresh shortly.
                    </p>
                  </div>
                ) : null}
                {applicantSummary?.exists &&
                hasAnyPayment &&
                !applicantSummary.profileLive &&
                applicantSummary.status &&
                applicantSummary.status !== "APPROVED" ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-100/90">
                    <p className="font-medium text-amber-100">
                      Payment on file
                    </p>
                    <p className="mt-2 text-amber-100/80">
                      Your card payment is recorded. Your listing is created
                      after Trader Watchdog approves your application; this page will
                      update when you&apos;re approved and we&apos;ve finished
                      setup.
                    </p>
                  </div>
                ) : null}
                {canCheckoutAny ? (
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-6">
                    <p className="text-sm font-semibold text-white">
                      You&apos;re approved — complete the remaining payment steps
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Secure card checkout. Use the same email as on your
                      application ({savedEmail}).
                    </p>
                    <p className="mt-3 text-xs text-slate-600">
                      Use this page to pay. Starting another application clears
                      this link until that new application is approved.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      {applicantSummary?.canCheckoutRegistrationFee ? (
                        <button
                          type="button"
                          disabled={checkoutLoading !== null}
                          onClick={() => startCheckout("registration")}
                          className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-ink-900 hover:bg-amber-400 disabled:opacity-50"
                        >
                          {checkoutLoading === "registration"
                            ? "Redirecting…"
                            : "Registration fee £18"}
                        </button>
                      ) : null}
                      {applicantSummary?.canCheckoutMembership ? (
                        <button
                          type="button"
                          disabled={checkoutLoading !== null}
                          onClick={() => startCheckout("member")}
                          className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
                        >
                          {checkoutLoading === "member"
                            ? "Redirecting…"
                            : `${membershipPriceLabel ?? "Annual membership"}`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {applicantSummary?.exists &&
                applicantSummary.status === "APPROVED" &&
                !canCheckoutAny &&
                !hasAnyPayment &&
                !applicantSummary.profileLive &&
                !applicantSummary.billingAvailable ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
                    You&apos;re approved, but online card payment isn&apos;t
                    available right now. Please use{" "}
                    <Link
                      to="/contact"
                      className="font-medium text-amber-200 underline"
                    >
                      Contact
                    </Link>{" "}
                    to arrange payment.
                  </div>
                ) : null}
                {sentVia === "api" &&
                applicantSummary === null &&
                savedEmail &&
                applicationId ? (
                  <p className="text-center text-xs text-slate-500">
                    Checking approval and payment status…
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink-900 hover:bg-slate-100"
              >
                Back to home
              </Link>
              {showSubmitAnother ? (
                <button
                  type="button"
                  onClick={clearJoinSession}
                  className="text-sm font-medium text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-slate-300"
                >
                  Submit another application
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            {formError ? (
              <div
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                role="alert"
              >
                {formError}
              </div>
            ) : null}
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-slate-300"
              >
                Trading name
              </label>
              <input
                id="company"
                name="company"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Smith & Co Plumbing"
              />
            </div>
            <div>
              <label
                htmlFor="legalStructure"
                className="block text-sm font-medium text-slate-300"
              >
                Business structure
              </label>
              <select
                id="legalStructure"
                name="legalStructure"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="Sole trader">Sole trader</option>
                <option value="Partnership">Partnership</option>
                <option value="Limited company">Limited company</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="tradingAddress"
                className="block text-sm font-medium text-slate-300"
              >
                Trading address
              </label>
              <textarea
                id="tradingAddress"
                name="tradingAddress"
                required
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Business trading address"
              />
            </div>
            <div>
              <label
                htmlFor="trade"
                className="block text-sm font-medium text-slate-300"
              >
                Business type / specialism
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Enter up to three core trades or specialisms customers would expect to find you under.
              </p>
              <input
                id="trade"
                name="trade"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Plumber, roofer, gas engineer"
              />
            </div>
            <div>
              <label
                htmlFor="businessDescription"
                className="block text-sm font-medium text-slate-300"
              >
                Short business description
              </label>
              <textarea
                id="businessDescription"
                name="businessDescription"
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="What work do you mainly carry out?"
              />
            </div>
            <div>
              <label
                htmlFor="identifiablePerson"
                className="block text-sm font-medium text-slate-300"
              >
                Identifiable person
              </label>
              <input
                id="identifiablePerson"
                name="identifiablePerson"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Full name"
              />
            </div>
            <div>
              <label
                htmlFor="identifiablePersonAddress"
                className="block text-sm font-medium text-slate-300"
              >
                Identifiable person address
              </label>
              <textarea
                id="identifiablePersonAddress"
                name="identifiablePersonAddress"
                required
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Private address for verification"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="you@yourbusiness.co.uk"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-300"
              >
                Telephone number you advertise
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="0117 123 4567"
              />
            </div>
            <div>
              <label
                htmlFor="postcode"
                className="block text-sm font-medium text-slate-300"
              >
                Main trading postcode
              </label>
              <input
                id="postcode"
                name="postcode"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="BS1 5TR"
              />
            </div>
            <div>
              <label
                htmlFor="wasteCarrierRequired"
                className="block text-sm font-medium text-slate-300"
              >
                Does your business require a Waste Carrier Licence?
              </label>
              <select
                id="wasteCarrierRequired"
                name="wasteCarrierRequired"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="wasteCarrierNumber"
                className="block text-sm font-medium text-slate-300"
              >
                Waste Carrier Licence number, if applicable
              </label>
              <input
                id="wasteCarrierNumber"
                name="wasteCarrierNumber"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="gasSafeRequired"
                className="block text-sm font-medium text-slate-300"
              >
                Does your business require Gas Safe registration?
              </label>
              <select
                id="gasSafeRequired"
                name="gasSafeRequired"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="gasSafeNumber"
                className="block text-sm font-medium text-slate-300"
              >
                Gas Safe registration number, if applicable
              </label>
              <input
                id="gasSafeNumber"
                name="gasSafeNumber"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="icoNumber"
                className="block text-sm font-medium text-slate-300"
              >
                ICO registration number, if applicable
              </label>
              <input
                id="icoNumber"
                name="icoNumber"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="files"
                className="block text-sm font-medium text-slate-300"
              >
                Supporting documents
              </label>
              <p className="mt-1 text-xs text-slate-500">
                PDF or images, up to 8 files, 10 MB each. Insurance evidence will be required before approval, so upload it here if you have it ready. Other documents such as qualifications, memberships, waste carrier registration, ICO evidence, or scheme registrations are optional and help support your application. Identity, address, and liveness checks will be handled separately during verification.
              </p>
              <input
                id="files"
                name="files"
                type="file"
                multiple
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif"
                className="mt-2 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
            </div>
            <label className="flex gap-3 text-sm text-slate-300">
              <input name="documentsConfirmed" type="checkbox" required />
              <span>
                I understand licences and registrations must be held in the
                trading name where required.
              </span>
            </label>
            <label className="flex gap-3 text-sm text-slate-300">
              <input name="agreementAccepted" type="checkbox" required />
              <span>
                I have read and understand the Trader Watchdog Verified Trader
                Agreement.
              </span>
            </label>
            <label className="flex gap-3 text-sm text-slate-300">
              <input name="enquiriesAccepted" type="checkbox" required />
              <span>
                I agree to Trader Watchdog making enquiries necessary to
                validate the information supplied.
              </span>
            </label>
            {recaptchaSiteKey ? (
              <div
                className="g-recaptcha"
                data-sitekey={recaptchaSiteKey}
              />
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Apply now"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

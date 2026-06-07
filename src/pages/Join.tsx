import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getRecaptchaToken,
  submitApplication,
} from "../lib/submitApplication";
import { getLaunchWindow } from "../lib/launchWindow";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

const JOIN_STORAGE_KEY = "Trader Watchdog_join_apply";
const CHECKOUT_REQUEST_TIMEOUT_MS = 20_000;

type ApplicantSummary = {
  exists: boolean;
  status?: string;
  billingAvailable: boolean;
  canCheckoutRegistrationFee: boolean;
  canCheckoutMembership: boolean;
  membershipAutoChargePending: boolean;
  hasRegistrationFeePayment: boolean;
  hasMembershipPayment: boolean;
  profileLive: boolean;
  /** Shown until first portal login or expiry; not stored in the browser. */
  oneTimePassword: string | null;
};

const applicationRequirements = [
  "Proof of identity, address, and liveness for the verification checks handled through Sumsub.",
  "Your insurance documents showing cover, insurer, and start or renewal date.",
  "Your Waste Carrier Licence number, if applicable.",
  "Your ICO registration number, if applicable.",
  "Your Gas Safe registration number, if applicable.",
  "Certificates and memberships to enhance your portfolio, optional upload.",
  "Up to 100 words describing your business, optional.",
  "Upload PDFs or images, up to 8 files, 10 MB each.",
];

const traderPoints = [
  "An affordable, trusted public platform showing transparency for genuine local traders.",
  "Show customers you are insured, compliant, and professional.",
  "One fair fee, no area limits, no paid placements, no extras.",
  "Help protect your community from rogue traders.",
  "Automatic reminders for insurance, licences, memberships, and annual renewal.",
  "A QR code for vehicles, stationery, and advertising that connects to your portal.",
];

const customerViews = [
  {
    title: "Verified listing",
    body: "A search of your business name or telephone number connects to your business portal and shows a Green Flag. Your trading name, address, and telephone number display as verified. Your insurances and applicable licences display as verified. Your current qualifications and memberships display as visually confirmed, and your business description is shown.",
    tone: "border-emerald-200 bg-emerald-50 text-slate-800",
  },
  {
    title: "Not listed",
    body: "A search of your business name or telephone number shows a Red Flag. Householders are advised that the trader does not have a verified listing and they should be cautious, not entering an agreement without visual proof of insurance and legally required licences and registrations.",
    tone: "border-rose-200 bg-rose-50 text-slate-800",
  },
];

const howItWorks = [
  {
    title: "Add your business details",
    body: "Use the trading name, postcode, email, and phone number you already advertise.",
  },
  {
    title: "Upload your documents",
    body: "Insurance is required. Other documents such as qualifications, memberships, and scheme registrations are optional but helpful.",
  },
  {
    title: "Complete your checks",
    body: "We guide you through identity, address, and liveness checks. We also review insurance and any required licences or registrations.",
  },
  {
    title: "Pay only when approved",
    body: "No payment for your subscription until your credentials are validated and your application is accepted.",
  },
];

type FaqItem = { q: string; a: string };

const traderFaqItems: FaqItem[] = [
  {
    q: "Can any trade be registered?",
    a: " Yes, any trade that supplies services to households at the domestic property, from dog walkers to builders, from  tilers to  window cleaners, and hundreds more!",
  },
  {
    q: "What does verification involve?",
    a: "We verify your identity, business details, public liability insurance, and any relevant licences or memberships. Once approved, you receive a QR code and public verification page.",
  },
  {
    q: "What fees do I pay?",
    a: "There are two fees: a non-refundable registration fee and the first year's annual subscription.",
  },
  {
    q: "When is payment taken?",
    a: "After our diligence checks are completed. If you are verified, we collect the registration fee and first year's subscription. If you are not verified, we collect the registration fee only and no subscription payment is taken.",
  },
  {
    q: "Why is the registration fee non-refundable?",
    a: "It covers the cost of processing your application and completing verification checks, even if you are not approved.",
  },
  {
    q: "How long does verification take?",
    a: "Most applications are processed within a few working days, depending on document accuracy.",
  },
  {
    q: "How does annual renewal work?",
    a: "Your subscription renews automatically 12 months after approval. You will receive reminders 30 and 14 days before renewal. You will also receive reminders for your insurances, licences, and registrations.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel at any time through your account or by contacting us. Your verification remains active until the end of your paid period. Registration fees and subscription payments are non-refundable.",
  },
  {
    q: "What happens if my Direct Debit fails?",
    a: "We may retry the payment or request updated details. Your verification may be paused until payment is successfully collected.",
  },
  {
    q: "What happens if my insurance expires?",
    a: "Your verification will show as 'Not Verified' until updated documents are provided.",
  },
  {
    q: "Can I use the badge if I'm not verified?",
    a: "No. Misuse of the QR code breaches our Misrepresentation Policy and may result in suspension or removal.",
  },
];

export function Join() {
  const joinStatusRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [registrationFeePricePence, setRegistrationFeePricePence] = useState<number | null>(null);
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
  const [verificationLinkLoading, setVerificationLinkLoading] = useState(false);
  const [verificationLinkError, setVerificationLinkError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{
    valid: true;
    discountType: "full" | "partial30";
    savingsPence: number;
    finalPricePence: number;
  } | null>(null);
  const [discountValidating, setDiscountValidating] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
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
        membershipAutoChargePending: Boolean(data.membershipAutoChargePending),
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
          registrationFeePricePence?: number;
          membershipPricePence?: number;
          baseMembershipPricePence?: number;
          launchDiscountActive?: boolean;
        }) => {
        if (d.recaptchaSiteKey) setRecaptchaSiteKey(d.recaptchaSiteKey);
          if (typeof d.registrationFeePricePence === "number") {
            setRegistrationFeePricePence(d.registrationFeePricePence);
          }
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
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [recaptchaSiteKey]);

  useEffect(() => {
    return undefined;
  }, [paidNotice]);

  useEffect(() => {
    if (!sent) return;
    joinStatusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sent, applicationId, applicantSummary?.status, applicantSummary?.profileLive]);

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
    const icoRequired = String(fd.get("icoRequired") ?? "").trim();
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
        icoRequired,
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
        window.turnstile?.reset?.();
      } catch {
        /* ignore */
      }
    }
    if (result.applicationId && result.via === "api") {
      void startCheckout("registration", {
        applicationId: result.applicationId,
        email: emailNorm,
      });
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

  const startCheckout = async (
    kind: "registration" | "member",
    options?: { applicationId?: string | null; email?: string | null }
  ) => {
    const targetApplicationId = options?.applicationId ?? applicationId;
    const targetEmail = options?.email ?? savedEmail;
    if (!targetApplicationId || !targetEmail) return;
    setCheckoutLoading(kind);
    setFormError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CHECKOUT_REQUEST_TIMEOUT_MS);
    try {
      const path =
        kind === "registration"
          ? "/api/billing/checkout-registration-fee"
          : "/api/billing/checkout-membership";
      const res = await fetch(`${apiBase()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          applicationId: targetApplicationId,
          email: targetEmail,
          ...(kind === "member" && discountApplied ? { discountCode: discountCode.trim() } : {}),
        }),
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setFormError(
          "Checkout is taking too long to respond. Please try again. If it keeps happening, GoCardless may not be responding from the backend."
        );
      } else {
        setFormError("Network error starting checkout.");
      }
    } finally {
      window.clearTimeout(timeout);
      setCheckoutLoading(null);
    }
  };

  const inbox = import.meta.env.VITE_APPLICATION_INBOX_EMAIL?.trim();

  const openVerificationLink = async () => {
    if (!applicationId || !savedEmail) return;
    setVerificationLinkLoading(true);
    setVerificationLinkError(null);
    try {
      const res = await fetch(`${apiBase()}/api/applications/verification-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, email: savedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setVerificationLinkError(
          typeof data?.error === "string" ? data.error : "Could not create verification link"
        );
        return;
      }
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch {
      setVerificationLinkError("Network error. Please try again.");
    } finally {
      setVerificationLinkLoading(false);
    }
  };

  const applyDiscountCode = async () => {
    const code = discountCode.trim();
    if (!code || !applicationId || !savedEmail) return;
    setDiscountValidating(true);
    setDiscountError(null);
    try {
      const res = await fetch(`${apiBase()}/api/billing/validate-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        discountType?: string;
        savingsPence?: number;
        finalPricePence?: number;
      };
      if (!res.ok || !data.valid) {
        setDiscountError("Invalid discount code. Please check and try again.");
        setDiscountApplied(null);
      } else {
        setDiscountApplied(data as { valid: true; discountType: "full" | "partial30"; savingsPence: number; finalPricePence: number });
      }
    } catch {
      setDiscountError("Could not validate code. Please try again.");
    } finally {
      setDiscountValidating(false);
    }
  };

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
    !applicantSummary.profileLive &&
    applicantStatus === "DECLINED";

  const formatSterling = (valuePence: number) => {
    const pounds = valuePence / 100;
    return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
  };

  const formatVatExclusiveLabel = (grossPence: number | null) => {
    if (grossPence == null) return null;
    const exVatPence = Math.round((grossPence * 100) / 120);
    return `${formatSterling(exVatPence)} + VAT`;
  };

  const registrationFeePriceLabel =
    formatVatExclusiveLabel(registrationFeePricePence) ?? "£15 + VAT";
  const membershipPriceLabel =
    formatVatExclusiveLabel(baseMembershipPricePence ?? membershipPricePence) ?? "£60 + VAT";
  const progressSteps = applicantSummary
    ? [
        {
          title: "Registration fee",
          status:
            applicantSummary.hasRegistrationFeePayment
              ? "Paid"
              : applicantSummary.canCheckoutRegistrationFee
                ? "Ready to pay"
                : applicantStatus === "DECLINED"
                  ? "Closed"
                  : "Waiting",
          tone:
            applicantSummary.hasRegistrationFeePayment
              ? "emerald"
              : applicantSummary.canCheckoutRegistrationFee
                ? "brand"
                : applicantStatus === "DECLINED"
                  ? "amber"
                  : "slate",
          detail:
            applicantSummary.hasRegistrationFeePayment
              ? "Your registration fee payment has been recorded."
              : applicantSummary.canCheckoutRegistrationFee
                ? `Pay ${registrationFeePriceLabel} from this page to start formal checks.`
                : applicantStatus === "DECLINED"
                  ? "This application is closed."
                  : "This step becomes available once Trader Watchdog confirms online billing is available for this application.",
        },
        {
          title: "Verification & review",
          status:
            applicantStatus === "APPROVED"
              ? "Approved"
              : applicantStatus === "DECLINED"
                ? "Not approved"
                : applicantSummary.hasRegistrationFeePayment
                  ? "In progress"
                  : "Waiting for payment",
          tone:
            applicantStatus === "APPROVED"
              ? "emerald"
              : applicantStatus === "DECLINED"
                ? "amber"
                : applicantSummary.hasRegistrationFeePayment
                  ? "brand"
                  : "slate",
          detail:
            applicantStatus === "APPROVED"
              ? "Trader Watchdog has completed its checks and approved this application."
              : applicantStatus === "DECLINED"
                ? "This application was not approved."
                : applicantSummary.hasRegistrationFeePayment
                  ? "We are now completing identity, address, insurance, and supporting checks."
                  : "Formal verification starts after the registration fee is paid.",
        },
        {
          title: "Annual membership",
          status: applicantSummary.hasMembershipPayment
            ? "Paid"
            : applicantSummary.membershipAutoChargePending
              ? "Payment in progress"
              : applicantSummary.canCheckoutMembership
                ? "Ready to pay"
                : applicantStatus === "APPROVED"
                  ? "Waiting"
                  : applicantSummary.hasRegistrationFeePayment
                    ? "Locked until approval"
                    : "Waiting for verification",
          tone: applicantSummary.hasMembershipPayment
            ? "emerald"
            : applicantSummary.membershipAutoChargePending
              ? "brand"
              : applicantSummary.canCheckoutMembership
                ? "brand"
                : "slate",
          detail: applicantSummary.hasMembershipPayment
            ? "Your annual membership payment has been recorded."
            : applicantSummary.membershipAutoChargePending
              ? "Your annual membership payment is being processed via Direct Debit. No action needed — this updates once confirmed (usually 3–5 working days)."
              : applicantSummary.canCheckoutMembership
                ? `Pay ${membershipPriceLabel} from this page when ready.`
                : applicantStatus === "APPROVED"
                  ? "Annual membership is the final payment before your profile goes live."
                  : "This step unlocks only after Trader Watchdog approves the application.",
        },
        {
          title: "Profile & login",
          status: applicantSummary.profileLive
            ? "Live"
            : hasBothPayments
              ? "Creating profile"
              : applicantSummary.hasRegistrationFeePayment
                ? "Waiting for approval"
                : "Waiting for payment",
          tone: applicantSummary.profileLive
            ? "emerald"
            : hasBothPayments
              ? "brand"
              : "slate",
          detail: applicantSummary.profileLive
            ? "Your public profile and member portal are ready."
            : hasBothPayments
              ? "Both payments are in. We are creating the profile and login now."
              : applicantSummary.hasRegistrationFeePayment
                ? "Your public profile and login are created after approval and annual membership payment."
                : "Your public profile and login are created after the verification and payment steps complete.",
        },
      ]
    : [];
  const introBody =
    "Complete the form below and upload the supporting evidence needed for review. Identity, address, and liveness checks are handled during verification.";
  const introSupport =
    "We will contact you within 3 working days when our processes are complete or if further information is required.";
  const pricingHeading = "Annual membership";

  return (
    <>
      <section className="border-b border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {!publicSearchEnabled && (
            <div className="mb-10 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-5 text-center">
              <p className="text-xl font-bold text-amber-800">Pre-launch offer – see below!</p>
            </div>
          )}

          <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
            Proudly display you are a professional, legitimate business
          </p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            VERIFIED. LEGIT. TRUSTED
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-700">
            Trader Watchdog is not a platform to attract the public to traders.
            It is a platform to protect the public from traders, providing
            something that marketplaces, job registers, advertising, and social
            media cannot: <strong>TRUST.</strong>
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <ul className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
                {traderPoints.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-brand-200 bg-brand-50 p-8">
              {!publicSearchEnabled && (
                <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-bold leading-relaxed text-amber-900 sm:text-base">
                    Become a Founder Member and save £30 off the annual subscription for life! Subscriptions for applications approved before 1st July will start on the 1st July at the discounted Founder Member price every year. Apply code <span className="font-mono tracking-wide">A5LESS</span> at checkout!
                  </p>
                </div>
              )}
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                What it costs
              </p>
              <div className="mt-5 space-y-4 text-sm text-slate-700 sm:text-base">
                <div className="rounded-2xl border border-white bg-white p-4">
                  <p className="font-semibold text-slate-900">One-off registration fee</p>
                  <p className="mt-1">£15 + VAT</p>
                </div>
                <div className="rounded-2xl border border-white bg-white p-4">
                  <p className="font-semibold text-slate-900">Annual subscription</p>
                  <p className="mt-1">£79 + VAT</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-brand-600"> Decals available for vehicles, advertising and stationery. 
              Your QR code connects the public and customers direct to your verified profile.
            </p> 
            <div className="flex flex-wrap justify-center gap-6">
              <img
                src="/sticker-120-website.jpg"
                alt="Trader Watchdog verified trader sticker 120mm"
                className="h-64 w-64 object-contain"
                loading="lazy"
              />
            </div>
            <div className="mt-6 flex justify-center">
              <img
                src="/sticker-250-website.jpg"
                alt="Trader Watchdog verified trader sticker 250mm"
                className="max-w-full"
                loading="lazy"
              />
            </div>
          </div>
          <div className="mt-12">
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
              What customers see
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {customerViews.map((view) => (
                <div key={view.title} className={`rounded-3xl border p-6 ${view.tone}`}>
                  <h3 className="font-display text-xl font-semibold text-slate-900">{view.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed sm:text-base">{view.body}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-slate-700 sm:text-base">
              Customers are asked to mention Trader Watchdog in all communications.
              Trader Watchdog is designed to show proof first, not sell leads.
            </p>
          </div>
          <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.16)]">
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
              How it works
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Step {index + 1}</p>
                  <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <main className="border-b border-white/5 pb-24">
      <div className="border-b border-white/5 bg-gradient-to-br from-brand-950/50 to-ink-950 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            For tradespeople
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Trader Watchdog Verified Trader Application
          </h1>
          <p className="mt-4 text-slate-400">
            {introBody}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            {introSupport}
          </p>
          {membershipPriceLabel ? (
            <div className="mt-6 grid gap-3 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-left sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-ink-950/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">
                  Registration fee
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {registrationFeePriceLabel}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Charged from this page once your application record is created.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-950/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">
                  {pricingHeading}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {membershipPriceLabel}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Charged when approved by bank collection then annually by direct debit unless cancelled.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="border-b border-white/5 bg-ink-950/30 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              To complete your application, you will require
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
              {applicationRequirements.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
                Before you continue
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Waste Carrier Licence: if you transport any waste you can be
                fined up to £5,000 for non-compliance. A Tier 1 licence is
                free and a lower tier licence is currently £191.02. Please
                allow 3 working days from application for licences before you
                complete the Trader Watchdog application.
              </p>
              <a
                href="https://www.gov.uk/register-renew-waste-carrier-broker-dealer-england"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-brand-300 underline underline-offset-4"
              >
                Waste Carrier information and registration
              </a>
            </div>
            <div className="rounded-2xl border border-brand-400/20 bg-brand-500/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
                ICO registration
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                If you process personal data you may be required to register
                with the ICO.
              </p>
              <a
                href="https://ico.org.uk/for-organisations/advice-for-small-organisations/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-brand-300 underline underline-offset-4"
              >
                ICO advice for small organisations
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-xl px-4 pt-12 sm:px-6">
        {cancelled ? (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span>
              Checkout was cancelled. When you&apos;re ready, complete payment from
              this page.
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
              application record for formal checks. Trader Watchdog will now continue verification and this page will update when annual membership is ready.
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
          <div
            ref={joinStatusRef}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"
          >
            <p className="font-display text-lg font-semibold text-white">
              Application received
            </p>
            {sentVia === "api" ? (
              applicantSummary?.profileLive ? (
                <p className="mt-2 text-sm text-slate-400">
                  Your public listing is live and your member portal is ready.
                  {" "}Your sign-in details have been sent to your email.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-400">
                    Your application is saved. Complete the <span className="text-slate-300">{registrationFeePriceLabel}</span> registration fee from this page so Trader Watchdog can begin formal checks. Once the application is approved, this page unlocks the <span className="text-slate-300">{membershipPriceLabel}</span> annual membership and your public listing and member login are created after that final payment.
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Tip: bookmark this tab or keep your confirmation email so you
                    can open this page again easily.
                  </p>
                  {applicationId ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-ink-950/50 p-4 text-left">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Application reference
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-white">
                        {applicationId}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4 rounded-xl border border-white/10 bg-ink-950/50 p-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      What happens next
                    </p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-300">
                      <li>1. Pay the registration fee from this page.</li>
                      <li>2. Trader Watchdog runs verification and reviews the supporting documents.</li>
                      <li>3. If approved, this page updates with the annual membership payment step.</li>
                      <li>4. Once annual membership is complete, the public listing and member login are created.</li>
                    </ol>
                  </div>
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
                {applicantSummary ? (
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-6">
                    <p className="text-sm font-semibold text-white">
                      Application progress
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {progressSteps.map((step) => (
                        <div
                          key={step.title}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-col items-start gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {step.title}
                            </p>
                            <span
                              className={
                                step.tone === "emerald"
                                  ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200"
                                  : step.tone === "brand"
                                    ? "rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-200"
                                    : step.tone === "amber"
                                      ? "rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
                                      : "rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
                              }
                            >
                              {step.status}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-300">
                            {step.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {/* Identity verification button — shown when reg fee is paid, not yet approved, and not declined */}
                {applicantSummary?.exists &&
                applicantSummary.hasRegistrationFeePayment &&
                applicantStatus !== "APPROVED" &&
                applicantStatus !== "DECLINED" &&
                !applicantSummary.profileLive ? (
                  <div className="rounded-2xl border border-brand-500/25 bg-brand-500/8 p-6">
                    <p className="text-sm font-semibold text-white">Complete your identity verification</p>
                    <p className="mt-1 text-sm text-slate-400">
                      You will need a government-issued photo ID (passport or driving licence) and a short selfie. This is a secure, guided process handled by our verification partner.
                    </p>
                    {verificationLinkError && (
                      <p className="mt-2 text-xs text-amber-300">{verificationLinkError}</p>
                    )}
                    <button
                      type="button"
                      disabled={verificationLinkLoading}
                      onClick={() => void openVerificationLink()}
                      className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {verificationLinkLoading ? "Preparing link…" : "Start identity verification →"}
                    </button>
                  </div>
                ) : null}
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
                      <p className="mt-3 text-sm text-emerald-100/85">
                        Your sign-in details have been sent to{" "}
                        <span className="text-white">{savedEmail}</span>. Check
                        your inbox (and spam folder) for an email with your
                        password. You can safely close this tab — your login
                        details will be in your email whenever you&apos;re ready.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        Sign in with the password from your welcome email. Forgot
                        it?{" "}
                        <Link
                          to="/member/forgot-password"
                          className="text-brand-300 hover:text-brand-200"
                        >
                          Reset your password
                        </Link>{" "}
                        or{" "}
                        <Link
                          to="/contact"
                          className="text-brand-300 hover:text-brand-200"
                        >
                          contact us
                        </Link>.
                      </p>
                    )}
                    <Link
                      to="/member/login"
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
                      after Trader Watchdog completes verification, approves your application, and receives annual membership; this page will update when the next step is ready.
                    </p>
                  </div>
                ) : null}
                {applicantSummary?.membershipAutoChargePending ? (
                  <div className="rounded-2xl border border-brand-800/40 bg-brand-950/40 p-6">
                    <p className="text-sm font-semibold text-brand-300">
                      Annual membership payment in progress
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      We have submitted your annual membership payment via your Direct Debit. No action is needed — your public profile and member login will be created automatically once the payment clears (usually 3–5 working days).
                    </p>
                  </div>
                ) : null}
                {canCheckoutAny ? (
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-6">
                    <p className="text-sm font-semibold text-white">
                      {applicantSummary?.canCheckoutRegistrationFee
                        ? "Complete the upfront registration fee"
                        : "Your checks are complete — activate annual membership"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Secure GoCardless checkout. Use the same email as on your
                      application ({savedEmail}).
                    </p>
                    <p className="mt-3 text-xs text-slate-600">
                      Use this page to pay. This application stays linked to the
                      current email address until it is completed or declined.
                    </p>
                    <div className="mt-4">
                      {applicantSummary?.canCheckoutMembership ? (
                        <div className="mb-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={discountCode}
                              onChange={(e) => {
                                setDiscountCode(e.target.value.toUpperCase());
                                setDiscountApplied(null);
                                setDiscountError(null);
                              }}
                              placeholder="Discount code (optional)"
                              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              disabled={discountValidating || checkoutLoading !== null}
                            />
                            <button
                              type="button"
                              onClick={() => void applyDiscountCode()}
                              disabled={!discountCode.trim() || discountValidating || checkoutLoading !== null}
                              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                            >
                              {discountValidating ? "…" : "Apply"}
                            </button>
                          </div>
                          {discountApplied ? (
                            <p className="mt-1 text-xs text-emerald-400">
                              ✓ {discountApplied.discountType === "full"
                                ? "100% discount applied — annual membership is free"
                                : `£${(discountApplied.savingsPence / 100).toFixed(2)} discount applied`}
                            </p>
                          ) : discountError ? (
                            <p className="mt-1 text-xs text-amber-400">{discountError}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row">
                      {applicantSummary?.canCheckoutRegistrationFee ? (
                        <button
                          type="button"
                          disabled={checkoutLoading !== null}
                          onClick={() => startCheckout("registration")}
                          className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-ink-900 hover:bg-amber-400 disabled:opacity-50"
                        >
                          {checkoutLoading === "registration"
                            ? "Redirecting…"
                            : `Registration fee ${registrationFeePriceLabel}`}
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
                            : discountApplied?.discountType === "full"
                              ? "Annual membership — Free"
                              : discountApplied?.discountType === "partial30"
                                ? `Annual membership ${formatVatExclusiveLabel(discountApplied.finalPricePence) ?? "— Discounted"}`
                                : `Annual membership ${membershipPriceLabel}`}
                        </button>
                      ) : null}
                    </div>
                    </div>
                  </div>
                ) : null}
                {applicantSummary?.exists &&
                applicantSummary.status !== "DECLINED" &&
                !canCheckoutAny &&
                !applicantSummary.hasRegistrationFeePayment &&
                !applicantSummary.profileLive &&
                !applicantSummary.billingAvailable ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
                    Online card payment isn&apos;t available right now. Please use{" "}
                    <Link
                      to="/contact"
                      className="font-medium text-amber-200 underline"
                    >
                      Contact
                    </Link>{" "}
                    to arrange the registration fee.
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
                Sole trader / Partnership / Limited company?
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
                Describe your business
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Maximum 100 words, optional.
              </p>
              <textarea
                id="businessDescription"
                name="businessDescription"
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="Describe the work you carry out and the type of customers you help."
              />
            </div>
            <div>
              <label
                htmlFor="identifiablePerson"
                className="block text-sm font-medium text-slate-300"
              >
                Identifiable person
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Sole trader, lead partner, or PSC of the limited company.
              </p>
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
              <p className="mt-1 text-xs text-slate-500">
                This is not shown on the public profile unless it is also the trading address.
              </p>
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
                Business email
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
              <p className="mt-1 text-xs text-slate-500">
                If no, your profile will state that you do not remove or carry waste.
              </p>
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
                Waste Carrier Licence number, if yes
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
                Does your business require registration with Gas Safe?
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
                Gas Safe registration number, if yes
              </label>
              <input
                id="gasSafeNumber"
                name="gasSafeNumber"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="icoRequired"
                className="block text-sm font-medium text-slate-300"
              >
                Does your business require registering with the ICO?
              </label>
              <p className="mt-1 text-xs text-slate-500">
                If no, your profile will state that your business does not require ICO registration.
              </p>
              <select
                id="icoRequired"
                name="icoRequired"
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
                htmlFor="icoNumber"
                className="block text-sm font-medium text-slate-300"
              >
                Your ICO registration number, if yes
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
                Insurance documents upload
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Upload PDFs or images, up to 8 files, 10 MB each. Your insurance documents should show cover, insurer, and start or renewal date. Certificates and memberships are optional and can be uploaded here as supporting evidence.
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
                I confirm the details supplied are accurate and that licences and registrations are held in the trading name where required.
              </span>
            </label>
            <label className="flex gap-3 text-sm text-slate-300">
              <input name="agreementAccepted" type="checkbox" required />
              <span>
                I have read, understand and accept the Trader Watchdog Verified Trader Agreement.
              </span>
            </label>
            <label className="flex gap-3 text-sm text-slate-300">
              <input name="enquiriesAccepted" type="checkbox" required />
              <span>
                I have read, understand and accept the Trader Watchdog Terms and Conditions.
              </span>
            </label>
            {recaptchaSiteKey ? (
              <div
                className="cf-turnstile"
                data-sitekey={recaptchaSiteKey}
                data-theme="light"
              />
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <p className="text-center text-xs text-slate-500">
              We will contact you within 3 working days when our processes are complete or if further information is required.
            </p>
          </form>
        )}
      </div>
    </main>

    <section className="border-b border-brand-800/60 bg-brand-800 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Common questions for traders
        </h2>
        <dl className="mt-12 space-y-6">
          {traderFaqItems.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-6 py-6 transition-all duration-200 hover:border-slate-500"
            >
              <dt className="font-semibold text-white">{item.q}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-slate-300">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
    </>
  );
}

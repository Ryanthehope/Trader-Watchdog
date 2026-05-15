import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { VerifyForm } from "../components/VerifyForm";
import { getLaunchWindow } from "../lib/launchWindow";
import ghostTradersImage from "../../ghost traders.jpg";

function BadgeShowcase() {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:gap-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center sm:px-6">
        <div className="lg:max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            The Trader Watchdog badge
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            See if they&apos;re legit with one click
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-700">
            Verified traders display a unique Trader Watchdog ID that householders
            can search on this site. If there is no badge, or the result does not
            match a live profile, treat that as a red flag before agreeing work or
            parting with money.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="text-brand-600">✓</span>
              Ask for their Trader Watchdog ID if it is not visible.
            </li>
            <li className="flex gap-3">
              <span className="text-brand-600">✓</span>
              Save their live profile link for your records if the trader is listed.
            </li>
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[460px] rounded-3xl border border-brand-100 bg-white p-8 shadow-[0_24px_60px_-35px_rgba(30,68,153,0.35)]">
            <div className="flex flex-col items-center text-center sm:items-end sm:text-right">
              <img
                src="/badge-preview.svg"
                width={420}
                height={120}
                alt="Trader Watchdog verified badge preview"
                className="h-auto w-full max-w-[420px] sm:ml-auto"
              />
              <p className="mt-5 max-w-[380px] text-sm leading-relaxed text-slate-600">
                See this sign on a trader&apos;s van, paperwork, or website? It means they are verified on Trader Watchdog and you can check their profile before work starts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    {
      value: "£3.5bn",
      label: "estimated lost to rogue traders each year",
      cardClass:
        "border-slate-300/60 bg-white text-slate-900 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.16)]",
      valueClass: "text-brand-700",
      labelClass: "text-slate-700",
    },
    {
      value: "1.26m",
      label: "fly-tipping incidents reported every year",
      cardClass:
        "border-slate-300/60 bg-slate-50 text-slate-900 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.14)]",
      valueClass: "text-brand-700",
      labelClass: "text-slate-700",
    },
    {
      value: "24%",
      label: "of traders may have no Public Liability insurance",
      cardClass:
        "border-slate-300/60 bg-slate-100 text-slate-900 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.14)]",
      valueClass: "text-brand-700",
      labelClass: "text-slate-700",
    },
    {
      value: "Upto 30%",
      label: "of online reviews are fake using AI instead",
      cardClass:
        "border-slate-700/70 bg-slate-900 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]",
      valueClass: "text-white",
      labelClass: "text-white/80",
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-white py-16">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2 xl:grid-cols-4 sm:px-6">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-[1.75rem] border p-8 text-center transition-all duration-200 hover:-translate-y-1 ${item.cardClass}`}
          >
            <p className={`font-display text-4xl font-bold sm:text-5xl ${item.valueClass}`}>
              {item.value}
            </p>
            <p className={`mt-3 text-sm leading-snug ${item.labelClass}`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IconCheck({ className = "text-emerald-400" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function IconCross({ className = "text-slate-500" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

type CompareCell = "yes" | "no" | "partial";

function CompareCell({ value }: { value: CompareCell }) {
  if (value === "yes") {
    return (
      <span className="inline-flex justify-center" title="Yes">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
          <IconCheck />
        </span>
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span
        className="text-xs font-medium text-amber-200/90"
        title="Partial or varies by plan"
      >
        Varies
      </span>
    );
  }
  return (
    <span className="inline-flex justify-center" title="No">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
        <IconCross className="text-slate-500" />
      </span>
    </span>
  );
}

function FeatureHighlights() {
  const cards = [
    {
      title: "Free and confidential",
      body: "Checking a trader is free to householders. You do not need to register, and traders are not told who searched for them.",
    },
    {
      title: "Verification, not lead generation",
      body: "Trader Watchdog does not sell leads to traders. We focus on proof, diligence, and consumer protection rather than pay-to-win listings.",
    },
    {
      title: "Proof in one place",
      body: "Structured vetting summary, badge artwork, and profile details give householders one place to check whether a trader is operating responsibly and legally.",
    },
  ];
  return (
    <section
      id="highlights"
      className="scroll-mt-24 border-b border-slate-800/60 bg-slate-900 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-400">
          Why Choose Trader Watchdog
        </p>
        <h2 className="mt-3 text-center font-display text-3xl font-bold text-white sm:text-4xl">
          Verification, not lead generation
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-8 transition-all duration-200 hover:border-brand-500/50 hover:bg-slate-800/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                <IconCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-white">
                {c.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitorComparison() {
  const rows: {
    feature: string;
    detail?: string;
    tv: CompareCell;
    other: CompareCell;
    other2: CompareCell;
  }[] = [
    {
      feature: "Free public lookup of a business",
      tv: "yes",
      other: "yes",
      other2: "yes",
    },
    {
      feature: "Independent verification checklist on profile",
      detail: "Address, insurance, accreditations, digital footprint — structured on one page.",
      tv: "yes",
      other: "partial",
      other2: "partial",
    },
    {
      feature: "Verification-first listings",
      detail: "Public profile is built around what we checked — not just ads.",
      tv: "yes",
      other: "partial",
      other2: "partial",
    },
    {
      feature: "In-app messaging between homeowner & trade",
      tv: "no",
      other: "partial",
      other2: "yes",
    },
  ];

  return (
    <section
      id="compare"
      className="scroll-mt-24 border-b border-slate-200 bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
          Comparison
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
          How we&apos;re different from lead directories
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-700">
          Trader Watchdog is a verification service with public profiles. Lead
          marketplaces focus on connecting jobs — we focus on what&apos;s true
          before you connect. Competitor columns are a general guide; features
          vary by plan and change over time.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-300/60 bg-slate-50">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300/60 bg-white">
                <th
                  scope="col"
                  className="px-4 py-4 font-medium text-slate-700 sm:px-6"
                >
                  Feature
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-display font-semibold text-brand-600 sm:px-6"
                >
                  Trader Watchdog
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-medium text-slate-700 sm:px-6"
                >
                  Typical directory
                  <span className="mt-1 block text-[10px] font-normal normal-case text-slate-600">
                    e.g. Checkatrade
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-medium text-slate-700 sm:px-6"
                >
                  Typical directory
                  <span className="mt-1 block text-[10px] font-normal normal-case text-slate-600">
                    e.g. MyBuilder
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={
                    i % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }
                >
                  <th
                    scope="row"
                    className="max-w-[220px] px-4 py-4 align-top font-medium text-slate-900 sm:px-6"
                  >
                    {row.feature}
                    {row.detail ? (
                      <span className="mt-1 block text-xs font-normal text-slate-600">
                        {row.detail}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <CompareCell value={row.tv} />
                  </td>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <CompareCell value={row.other} />
                  </td>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <CompareCell value={row.other2} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      title: "Identity",
      body: "We verify a trader is who they say they are and, where relevant, check business details against official company records. If a trader maintains, installs, or repairs gas appliances on domestic properties, they must be registered with Gas Safe, and we check that where relevant.",
    },
    {
      title: "Insurance",
      body: "Public Liability insurance helps protect your property from accidental damage. Employers Insurance is a legal requirement for many businesses. We verify the insurance held and the expiry dates we have been given.",
    },
    {
      title: "Qualifications and memberships",
      body: "Traders can display their qualifications and memberships on their profile for your inspection where they are relevant to the work they carry out.",
    },
    {
      title: "Your waste",
      body: "If a trader removes waste from your property, the correct Environment Agency registration matters. We help you check whether the trader holds the licence or permit required for the work they carry out.",
    },
    {
      title: "Personal data and trade registers",
      body: "If a trader stores your personal data, even just your name, they are legally required to protect it and register with the ICO where required for GDPR compliance. We also check claimed trade registers where relevant.",
    },
  ];
  return (
    <section id="why" className="scroll-mt-24 border-b border-slate-800/60 bg-slate-900 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-400">
          What We Verify For You
        </p>
        <h2 className="mt-3 max-w-3xl text-center font-display text-3xl font-bold leading-tight text-white sm:mx-auto sm:text-4xl">
          With just one click
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base text-slate-300">
          We check if they are who they say they are, they are based where they say they&apos;re based, they are insured to carry out the work, and they comply with legal environmental and data requirements for traders working at domestic properties.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="flex gap-5 rounded-lg border border-slate-700/60 bg-slate-800/50 p-8 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800/70"
            >
              <span
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqItems = [
  {
    q: "What is Trader Watchdog?",
    a: "Trader Watchdog is an independent consumer protection platform. We help householders check whether a trader can be verified before agreeing work or paying money.",
  },
  {
    q: "What happens when I search for a trader?",
    a: "If the trader is listed, you are taken to their live Trader Watchdog profile so you can review the checks we show there. If they are not listed, you will see a no-match page and should ask the trader for evidence directly.",
  },
  {
    q: "Can I download a report?",
    a: "Not yet. Today the service shows the trader's live profile and verification details on site. If downloadable reports are added later, the public wording should be updated at the same time.",
  },
];

function Faq() {
  return (
    <section id="faq" className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Common questions
        </h2>
        <dl className="mt-12 space-y-6">
          {faqItems.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-slate-300/60 bg-white px-6 py-6 transition-all duration-200 hover:border-brand-500/50 hover:shadow-sm"
            >
              <dt className="font-semibold text-slate-900">{item.q}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-slate-700">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// GuidesTeaser removed

function TradesCta() {
  return (
    <section id="join" className="border-t border-slate-200 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-slate-300/60 bg-white p-10 sm:p-14">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Traders & Businesses
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              Join Trader Watchdog and show customers you&apos;re legit
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-700">
              Trader Watchdog does not sell leads, does not cap the number of traders in an area, and gives customers one place to check that your business is insured, compliant, and real.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-900">
              One fee, fair visibility, renewal reminders, and a public profile that builds trust.
            </p>

            <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-slate-300/60 bg-slate-50/50 p-8 text-left">
              <h3 className="mb-6 text-center font-display text-xl font-semibold text-slate-900">
                Registration Requirements
              </h3>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Your business name and the telephone number you advertise</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Identity and liveness checks through our verification provider when requested</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Current insurance documents showing cover, provider, and renewal dates</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Waste carrier details, ICO registration, and any trade-register evidence relevant to your work</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Proof of claimed qualifications, memberships, or scheme registration where applicable</span>
                </li>
              </ul>
            </div>

            <Link
              to="/join"
              className="mt-10 inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-600 px-10 py-4 font-semibold text-white transition-all duration-200 hover:bg-brand-700"
            >
              Register now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function useHashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (pathname !== "/" || !hash) return;
    const id = hash.replace(/^#/, "");
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [pathname, hash]);
}

export function Home() {
  useHashScroll();
  useSiteData();
  const { publicSearchEnabled } = getLaunchWindow();

  const heroBody = publicSearchEnabled
    ? "Verifying a trader is one click away. It's free, confidential, and you do not have to register. Search their business name or telephone number and view the result before even speaking to them."
    : "Trader registration is open now. Public business search will be available soon."
    ;

  const heroSecondaryCta = publicSearchEnabled
    ? "Verify a trader now"
    : "Public search coming soon";

  const joinCta = "Register your business";

  const verifyHeading = publicSearchEnabled
    ? "See if they are legit with one click"
    : "Public trader search is coming soon";

  const verifyIntro = publicSearchEnabled
    ? "Search their business name or telephone number and you will immediately see whether there is a verified Trader Watchdog listing for that business."
    : "Trader registration is open now, and public business search will be available soon."
    ;

  return (
    <>
    <div className="pointer-events-none fixed left-0 top-24 z-20 block h-[calc(100vh-6rem)] w-10 overflow-hidden sm:w-12 lg:w-16">
  <img
        src="/police_chequers.jpg"
    alt=""
    className="h-full w-full object-cover opacity-40"
  />
</div>
      <section className="relative overflow-hidden border-b border-brand-900/40 bg-gradient-to-b from-brand-900 via-brand-800 to-brand-950 px-4 py-20 sm:px-6 lg:px-8">
  <div className="mx-auto max-w-7xl text-center">
    <p className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/85">
      Recommended by Police, Trading Standards, Councils and community groups
    </p>

    <div className="mx-auto flex max-w-6xl flex-row items-center justify-center gap-8">
      <div className="w-[40%] max-w-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.8)]">
        <img
          src={ghostTradersImage}
          alt="Tradespeople illustration used in the Trader Watchdog hero"
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="w-[60%] text-left">
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[4rem] lg:leading-[1.08]">
          <span className="text-orange-400">ROGUE</span> OR{" "}
          <span className="text-orange-400">LEGIT?</span>
        </h1>

        <h2 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[3rem] lg:leading-[1.08]">
          Don&apos;t take their word for it.
        </h2>
      </div>
    </div>

    <p className="mx-auto mt-10 max-w-5xl text-lg leading-relaxed text-slate-300 sm:text-xl sm:leading-relaxed">
      {heroBody}
    </p>

    <div className="mx-auto mt-8 max-w-3xl">
      <VerifyForm id="hero-verify" layout="hero" />
    </div>

    <div className="mt-12 flex flex-wrap justify-center gap-4">
      <Link
        to="/#verify"
        className="inline-flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-brand-500/50 hover:bg-slate-800/60"
      >
        {heroSecondaryCta}
      </Link>

      <Link
        to="/join"
        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-brand-500"
      >
        {joinCta}
      </Link>
    </div>
  </div>
</section>

      <Stats />
      <FeatureHighlights />

      <section
        id="verify"
        className="scroll-mt-24 border-b border-slate-800/60 bg-slate-950 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              {verifyHeading}
            </h2>
            <p className="mt-4 text-base text-white">
              {verifyIntro}
            </p>
          </div>
          <VerifyForm id="section-verify" layout="section" />
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              What you will see
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-center">
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-6 shadow-sm">
              <div className="flex flex-col items-center gap-5 text-left md:flex-row md:items-center">
                <div className="flex h-28 w-full max-w-[220px] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800/80 text-sm text-slate-400">
                  Verified flag image placeholder
                </div>
                <p className="text-sm text-white">
                  <span className="font-semibold text-white">
                    Verified listing
                  </span>
                  {' '}
                  = found on Trader Watchdog. Review the live profile and the checks shown there before agreeing work. This shows a verified trader and their profile, which you can use as part of your own due diligence.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-6 shadow-sm">
              <div className="flex flex-col items-center gap-5 text-left md:flex-row md:items-center">
                <div className="flex h-28 w-full max-w-[220px] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800/80 text-sm text-slate-400">
                  Unverified flag image placeholder
                </div>
                <p className="text-sm text-white">
                  <span className="font-semibold text-white">
                    No verified listing
                  </span>
                  {' '}
                  = not verified. Be cautious. Do not enter an agreement without a visual check of their insurance, licences, and other supporting evidence.
                </p>
              </div>
            </div>
            {publicSearchEnabled ? (
              <p className="text-sm text-white">
                If you contact the trader after checking their profile, please mention Trader Watchdog.
              </p>
            ) : (
              <p className="text-sm text-white">
                Traders can already register, and public search will be added here soon.
              </p>
            )}
          </div>
        </div>
      </section>

      <CompetitorComparison />
      <Pillars />
      <Faq />
      {/* GuidesTeaser removed */}
      <TradesCta />
    </>
  );
}

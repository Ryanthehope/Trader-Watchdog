import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { VerifyForm } from "../components/VerifyForm";
import { getLaunchWindow } from "../lib/launchWindow";
import ghostTradersImage from "../../ghost traders.jpg";


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
      value: "50%",
      label: "of traders are under-insured or have no insurance at all",
      cardClass:
        "border-slate-300/60 bg-slate-100 text-slate-900 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.14)]",
      valueClass: "text-brand-700",
      labelClass: "text-slate-700",
    },
    {
      value: "Fake Reviews",
      label: "Are exploding - AI now generates around 30% of them",
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
        className="text-xs font-medium text-black/70"
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
      title: "Free",
      body: "Verifying a trader has never been easier. Just enter their name or telephone number, and click.",
    },
    {
      title: "Confidential",
      body: "You do not have to register or sign in,. The trader will never know you have searched them.",
    },
    {
      title: "Proof in one place.",
      body: "We focus on proof, diligence and consumer protection. All in one place, not scattered around.",
    },
  ];
  return (
    <section
      id="highlights"
      className="scroll-mt-24 border-b border-brand-800/40 bg-brand-800 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-8 text-center transition-all duration-200 hover:border-slate-500 hover:bg-slate-800/70"
            >
              <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {c.title}
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/85">
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
      feature: "Free public business search",
      tv: "yes",
      other: "yes",
      other2: "yes",
    },
    {
      feature: "Public profile based on verified checks",
      detail: "Shows identity, insurance, licenses, accreditations all on one page.",
      tv: "yes",
      other: "partial",
      other2: "partial",
    },
    {
      feature: "Searches are confidential",
      detail: ".  Registering is not required, searching remains anonymous",
      tv: "yes",
      other: "no",
      other2: "no",
    },
    {
      feature: "Verification-first",
      detail: "Public profile is built around verification – not advertisements.",
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
          Trader Watchdog is a verification service with public profiles, not a lead marketplace. While lead platforms focus on selling job connections, we focus on verifying truth before you connect. 
          Competitor columns are for general comparison only — features may vary by plan and change over time.
        </p>

        <div className="mt-10 space-y-4 md:hidden">
  {rows.map((row) => (
    <div
      key={row.feature}
      className="rounded-2xl border border-slate-300/70 bg-slate-50 p-4"
    >
      <h3 className="font-semibold text-slate-900">{row.feature}</h3>

      {row.detail ? (
        <p className="mt-1 text-xs text-slate-600">{row.detail}</p>
      ) : null}

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-3">
          <span className="font-medium text-brand-700">Trader Watchdog</span>
          <CompareCell value={row.tv} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-3">
          <span className="font-medium text-slate-700">
            Typical directory
            <span className="block text-[10px] font-normal text-slate-500">
              e.g. Checkatrade
            </span>
          </span>
          <CompareCell value={row.other} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-3">
          <span className="font-medium text-slate-700">
            Typical directory
            <span className="block text-[10px] font-normal text-slate-500">
              e.g. MyBuilder
            </span>
          </span>
          <CompareCell value={row.other2} />
        </div>
      </div>
    </div>
  ))}
</div>

{/* Desktop table */}
<div className="mt-10 hidden overflow-x-auto rounded-2xl border border-slate-300/60 bg-slate-50 md:block">
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
          className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
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
      body: "We use biometric checks and data analysis to verify the identity and location of a trader or Limited Company. This confirms they are who they claim to be, helping protect householders from fraud and false identities.",
    },
    {
      title: "Your Waste",
      body: "If a trader removes and transports any waste form your property they must legally hold a legal Waste Carrier Licence. If your waste is fly tipped by an unlicensed trader, you can be fined or prosecuted as the waste producer",
    },
    {
      title: "Keeping Your Personal Data Safe",
      body: "Any trader storing customer details — even just your name and number in their phone — is legally required to be ICO registered. It shows they follow GDPR rules and handle your personal information safely and legally.",
    },
    {
      title: "Gas Engineers",
      body: "A trader must be Gas Safe registered to work on any gas appliance or installation. Using a person that is not registered is illegal and dangerous — faulty gas work can cause leaks, fires or carbon monoxide poisoning.",
    },
    {
      title: "Public Liability Insurance",
      body: "Public Liability Insurance protects you if a trader damages your property or injures someone while working. Without it, you may struggle to recover costs or compensation if something goes wrong.",
    },
    {
      title: "Employers Insurance",
      body: "If a trader employs staff, they must have Employers’ Liability Insurance. It protects you if a worker is injured on your property — without it, claims can become complicated and leave you exposed.",
    },
    {
      title: "Qualifications and Memberships",
      body: "Traders can upload up to three qualifications or tradebody memberships to their public profile. This helps householders quickly see verified skills and recognised standards, showing the trader is properly trained for the work they offer.",
    },
    {
      title: "Reviews",
      body: "Fake reviews fuelled by AI are rising fast and can even be purchased online (search ‘buy reviews’). To stay honest and transparent, we don’t offer reviews or recommendations — we provide facts only, so householders can make informed decisions.",
    }
  ];
  return (
    <section id="why" className="scroll-mt-24 border-b border-brand-800/60 bg-brand-800 py-20 sm:py-28">
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

function TradesCta() {
  return (
    <section
  id="why"
  className="scroll-mt-24 border-b border-brand-800/60 bg-brand-800 py-20 sm:py-28"
>
  <div className="mx-auto max-w-6xl px-4 sm:px-6">
    <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-400">
      Become a Verified Trader Watchdog Business
    </p>

    <h2 className="mt-3 text-center font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
      An affordable, trusted public platform for genuine local traders
    </h2>

    <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-300">
      Show customers you&apos;re insured, compliant, and operating properly.
      Trader Watchdog is designed to show proof first — not sell leads.
    </p>

    <div className="mt-16 grid gap-8 lg:grid-cols-2">
      {/* LEFT COLUMN */}
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-8">
          <h3 className="font-display text-2xl font-semibold text-white">
            Why Register?
          </h3>

          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
            <li>• An affordable, trusted public platform for genuine local traders</li>
            <li>• Show customers you&apos;re insured, compliant, and operating properly</li>
            <li>• One fair fee, no area limits, no paid placements</li>
            <li>• Help protect your community from rogue traders</li>
            <li>• Automatic reminders for insurance, licences, memberships, and annual renewal</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-8">
          <h3 className="font-display text-2xl font-semibold text-white">
            What It Means For Your Business
          </h3>

          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
            <li>• Customers see you&apos;re insured and legitimate before they call</li>
            <li>• Build trust without buying leads</li>
            <li>• Stay visible with a public, searchable profile</li>
            <li>• Adds credibility to your business</li>
            <li>• Verified Trader logo for vehicles and advertising</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-8">
          <h3 className="font-display text-2xl font-semibold text-white">
            What It Costs
          </h3>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-black/20 px-5 py-4">
              <span className="text-sm text-slate-300">
                One-off registration fee
              </span>

              <span className="text-xl font-bold text-white">£15 + VAT</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-black/20 px-5 py-4">
              <span className="text-sm text-slate-300">
                Annual subscription
              </span>

              <span className="text-xl font-bold text-white">£79 + VAT</span>
            </div>

            <p className="text-xs text-slate-400">
              Charges exclude VAT.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-8">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
          <h3 className="font-display text-2xl font-semibold text-white">
            What Customers See
          </h3>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-lg font-semibold text-emerald-200">
                Verified listing
              </p>

              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Your profile appears in public search by name or phone number,
                showing your verified credentials.
              </p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-lg font-semibold text-red-300">
                Not verified
              </p>

              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Householders are advised to be cautious and ask for documentary
                proof directly.
              </p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-sm leading-relaxed text-slate-300">
                Customers are asked to mention Trader Watchdog in all
                communications.
              </p>

              <p className="mt-3 text-sm font-medium text-white">
                Trader Watchdog is designed to show proof first — not sell
                leads.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-8">
          <h3 className="font-display text-2xl font-semibold text-white">
            How It Works
          </h3>

          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                1
              </div>

              <div>
                <h4 className="font-semibold text-white">
                  Add your business details
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Use the trading name, postcode, email, and phone number you
                  already advertise.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                2
              </div>

              <div>
                <h4 className="font-semibold text-white">
                  Upload your documents
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Insurance is required. Other documents (qualifications,
                  memberships, scheme registrations) are optional but helpful.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                3
              </div>

              <div>
                <h4 className="font-semibold text-white">
                  Complete your checks
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  We guide you through identity, address, and liveness checks.
                  We also review insurance and any required licences or
                  registrations.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                4
              </div>

              <div>
                <h4 className="font-semibold text-white">
                  Pay only when approved
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  No payment until your credentials are validated and your
                  application is accepted.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <a
              href="/join"
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              APPLY NOW
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
  );
}

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

  const heroTopLine =
    "TRADER WATCHDOG IS A FREE CONSUMER PROTECTION SERVICE TO THE PUBLIC";
  const heroSubLine =
    "DILIGENCE RECOMMENDED BY POLICE, TRADING STANDARDS, COUNCILS AND COMMUNITY GROUPS";
  const heroSupport =
    "VERIFYING A TRADER IS ONLY A CLICK AWAY.";

  return (
    <>
      <section id="verify" className="relative overflow-hidden scroll-mt-24 border-b border-brand-800/40 bg-brand-800 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-2xl font-bold uppercase tracking-tight text-white sm:text-2xl">
            {heroTopLine}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#A5A6A8]/85 sm:text-sm">
            {heroSubLine}
          </p>

          <div className="mx-auto mt-10 max-w-6xl">
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-center">
            <div className="w-full max-w-[420px]">
              <img
                src={ghostTradersImage}
                alt="Tradespeople illustration used in the Trader Watchdog hero"
                className="w-full object-contain"
              />
            </div>

            <div className="w-full max-w-[36rem] text-center md:text-left">
              <h1 className="font-display text-5xl font-bold leading-none text-orange-400 sm:text-6xl lg:text-[4.8rem]">
                ROGUE or LEGIT?
              </h1>

              <h2 className="mt-5 max-w-[30rem] font-display text-2xl font-bold leading-tight text-white sm:text-5xl">
                Don&apos;t take their word for it
              </h2>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-5xl text-center text-2xl font-bold uppercase leading-snug text-white sm:text-2xl">
            {heroSupport}
          </p>
        </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <VerifyForm id="hero-verify" layout="hero" />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/#verify"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/15"
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

      <section className="border-b border-brand-800/40 bg-brand-800 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">
              What you will see
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
            <div className="flex items-start gap-5 rounded-3xlborder-b border-brand-900/40 bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-200 hover:bg-white/10">
              <img
                src="/Green%20flag2.png"
                alt="Green flag"
                className="h-16 w-16 shrink-0 object-contain"
              />

              <p className="text-base leading-relaxed text-white sm:text-lg">
                <span className="font-bold">
                  A green flag
                </span>{" "}
                shows a professional, legitimate trader. Their identity,
                insurance, legal licenses and registrations have been
                successfully verified.
              </p>
            </div>

            <div className="flex items-start gap-5 rounded-3xl border-b border-brand-900/40 bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-200 hover:bg-white/10">
              <img
                src="/Red%20flag2.png"
                alt="Red flag"
                className="h-16 w-16 shrink-0 object-contain"
              />

              <p className="text-base leading-relaxed text-white sm:text-lg">
                <span className="font-bold">
                  A red flag
                </span>{" "}
                shows no verified listing. Be cautious. Do not enter an
                agreement without visual proof of insurance and legal
                credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CompetitorComparison />
      <Pillars />
      <TradesCta />
      <Faq />
      {/* GuidesTeaser removed */}
    </>
  );
}

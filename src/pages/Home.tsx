import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { VerifyForm } from "../components/VerifyForm";
import { getLaunchWindow } from "../lib/launchWindow";
import ghostTradersImage from "../../ghost traders.webp";


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
        <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-slate-700">
          Lead directories are platforms for selling work from traders to the
          public. Trader Watchdog is a platform that protects the public from
          rogue traders.
        </p>
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
      body:
        "A search of your business name or telephone number connects to your business portal and shows a Green Flag. Your trading name, address, and telephone number display as verified. Your insurances and applicable licences display as verified. Your current qualifications and memberships display as visually confirmed, and your business description is shown.",
      tone:
        "border-emerald-200 bg-emerald-50 text-slate-800",
    },
    {
      title: "Not listed",
      body:
        "A search of your business name or telephone number shows a Red Flag. Householders are advised that the trader does not have a verified listing and should be cautious, not entering an agreement without visual proof of insurance and legally required licences and registrations.",
      tone:
        "border-rose-200 bg-rose-50 text-slate-800",
    },
  ];

  const howItWorks = [
    {
      title: "Add your business details",
      body:
        "Use the trading name, postcode, email, and phone number you already advertise.",
    },
    {
      title: "Upload your documents",
      body:
        "Insurance is required. Other documents such as qualifications, memberships, and scheme registrations are optional but helpful.",
    },
    {
      title: "Complete your checks",
      body:
        "We guide you through identity, address, and liveness checks. We also review insurance and any required licences or registrations.",
    },
    {
      title: "Pay only when approved",
      body:
        "No payment until your credentials are validated and your application is accepted.",
    },
  ];

  return (
    <section
      id="why"
      className="scroll-mt-24 border-b border-slate-200 bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
          Proudly display you are a professional, legitimate business
        </p>

        <h2 className="mt-3 text-center font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Verified. Legit. Trusted
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-700">
          Trader Watchdog is not a platform to attract the public to traders.
          It is a platform to protect the public from traders, providing
          something that marketplaces, job registers, advertising, and social
          media cannot: trust.
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
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              What it costs
            </p>
            <div className="mt-5 space-y-4 text-sm text-slate-700 sm:text-base">
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="font-semibold text-slate-900">
                  One-off registration fee
                </p>
                <p className="mt-1">£15, £18 including VAT</p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="font-semibold text-slate-900">
                  Annual subscription
                </p>
                <p className="mt-1">£79, £94.80 including VAT</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
            What customers see
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {customerViews.map((view) => (
              <div key={view.title} className={`rounded-3xl border p-6 ${view.tone}`}>
                <h3 className="font-display text-xl font-semibold text-slate-900">
                  {view.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed sm:text-base">
                  {view.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-slate-700 sm:text-base">
            Customers are asked to mention Trader Watchdog in all
            communications. Trader Watchdog is designed to show proof first,
            not sell leads.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.16)]">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
            How it works
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {howItWorks.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/join"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-8 py-4 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            APPLY
          </Link>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Common questions
        </h2>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {faqGroups.map((group) => (
            <section key={group.title} aria-labelledby={group.id}>
              <h3
                id={group.id}
                className="text-xl font-display font-semibold text-slate-900"
              >
                {group.title}
              </h3>
              <dl className="mt-5 space-y-6">
                {group.items.map((item) => (
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
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

type FaqItem = {
  q: string;
  a: string;
};

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
    a: "Your subscription renews automatically 12 months after approval. You will receive reminders 30 days before renewal and 14 days before renewal. You will also receive reminders for your insurances, licences, and registrations.",
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

const publicFaqItems: FaqItem[] = [
  {
    q: "What is Trader Watchdog?",
    a: "Trader Watchdog is a UK verification platform that helps the public check whether a trader is genuine, insured and operating legitimately. It gives free, anonymous access to the checks recommended by police forces and local councils.",
  },
  {
    q: "Is it free to use?",
    a: "Yes, checking a trader on the Trader Watchdog platform is completely free.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. All checks are anonymous. You don't need to sign up or share any personal details.",
  },
  {
    q: "What information do you show about traders?",
    a: "We show only essential business information: business name, trading name, business address, verification status, insurance validity (pass/fail only), and licence or membership confirmations. We never display sensitive documents or personal ID.",
  },
  {
    q: "How do I check a trader?",
    a: "Scan their QR code or search their name or telephone number on the Trader Watchdog website.",
  },
  {
    q: "Do you show reviews?",
    a: "No. We verify facts, not opinions. Reviews can be misleading, so our focus is on identity, insurance and legitimacy.",
  },
  {
    q: "What does 'Verified' mean?",
    a: "It means the trader has passed our checks for identity, business legitimacy, insurance and relevant licences.",
  },
  {
    q: "What does 'Not Verified' mean?",
    a: "It means the trader has not passed verification or has not completed the process. It does not automatically mean they are rogue, but you should proceed with caution.",
  },
];

const faqGroups = [
  {
    id: "faq-traders",
    title: "For traders",
    items: traderFaqItems,
  },
  {
    id: "faq-public",
    title: "For the public",
    items: publicFaqItems,
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
                width="420"
                height="420"
                fetchPriority="high"
                decoding="async"
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
                src="/Green%20flag2.webp"
                alt="Green flag"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
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
                src="/Red%20flag2.webp"
                alt="Red flag"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
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

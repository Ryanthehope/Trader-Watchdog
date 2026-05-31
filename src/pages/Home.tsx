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
        "border-slate-700/60 bg-slate-800/50 text-white shadow-[0_20px_45px_-30px_rgba(0,0,0,0.3)]",
      valueClass: "text-brand-300",
      labelClass: "text-slate-300",
    },
    {
      value: "1.26m",
      label: "fly-tipping incidents reported every year",
      cardClass:
        "border-slate-700/60 bg-slate-800/50 text-white shadow-[0_20px_45px_-30px_rgba(0,0,0,0.3)]",
      valueClass: "text-brand-300",
      labelClass: "text-slate-300",
    },
    {
      value: "50%",
      label: "of traders are under-insured or have no insurance at all",
      cardClass:
        "border-slate-700/60 bg-slate-800/50 text-white shadow-[0_20px_45px_-30px_rgba(0,0,0,0.3)]",
      valueClass: "text-brand-300",
      labelClass: "text-slate-300",
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
    <section className="border-b border-brand-800/60 bg-brand-800 py-16">
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
      className="scroll-mt-24 border-b border-slate-200/70 bg-[#F2F4F7] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-lg border border-slate-200 bg-white p-8 text-center transition-all duration-200 hover:border-brand-500/30 hover:bg-slate-50"
            >
              <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                {c.title}
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
                {c.body}
              </p>
            </div>
          ))}
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
    <section id="why" className="scroll-mt-24 border-b border-slate-200/70 bg-[#F2F4F7] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
          What We Verify For You
        </p>
        <h2 className="mt-3 max-w-3xl text-center font-display text-3xl font-bold leading-tight text-slate-900 sm:mx-auto sm:text-4xl">
          With just one click
        </h2>
        <ul className="mx-auto mt-6 max-w-2xl space-y-2 text-center text-base text-slate-600">
          <li>We check if they are who they say they are.</li>
          <li>They are based where they say they&apos;re based.</li>
          <li>They are insured to carry out the work.</li>
          <li>They comply with legal environmental and data requirements for traders working at domestic properties.</li>
        </ul>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="flex gap-5 rounded-lg border border-slate-200 bg-white p-8 transition-all duration-200 hover:border-brand-500/30 hover:bg-slate-50"
            >
              <span
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
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

function Faq() {
  return (
    <section id="faq" className="border-y border-brand-800/60 bg-brand-800 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Common questions
        </h2>
        <dl className="mt-12 space-y-6">
          {publicFaqItems.map((item) => (
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
  );
}

type FaqItem = {
  q: string;
  a: string;
};

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

  const joinCta = publicSearchEnabled
    ? "Register your business"
    : "Register your business before 1st July for a Special Offer";

  const verifyHeading = publicSearchEnabled
    ? "See if they are legit with one click"
    : "Public trader search is coming soon";

  const verifyIntro = publicSearchEnabled
    ? "Search their business name or telephone number and you will immediately see whether there is a verified Trader Watchdog listing for that business."
    : "Trader registration is open now, and public business search will be available soon."
    ;

  const heroTopLine =
    "TRADER WATCHDOG IS A FREE CONSUMER PROTECTION SERVICE TO THE PUBLIC";
  const heroSubLine = (
    <>
      <span className="text-[#2BA24E]">DILIGENCE</span>
      <span className="text-[#2E3A47]"> RECOMMENDED BY POLICE, TRADING STANDARDS, COUNCILS AND COMMUNITY GROUPS</span>
    </>
  );
  const heroSupport =
    "VERIFYING A TRADER IS ONLY A CLICK AWAY.";

  return (
    <>
      <section id="verify" className="relative overflow-hidden scroll-mt-24 border-b border-slate-200/70 bg-[#F2F4F7] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">
            {heroTopLine}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 sm:text-sm">
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
              <h1 className="font-display text-5xl font-bold leading-none sm:text-6xl lg:text-[4.8rem]">
                <span className="text-[#C62828]">ROGUE or</span>
                <span className="text-[#3B4978]">LEGIT?</span>
              </h1>

              <h2 className="mt-5 max-w-[30rem] font-display text-2xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Don&apos;t take their word for it
              </h2>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-5xl text-center text-2xl font-bold uppercase leading-snug text-slate-900 sm:text-2xl">
            {heroSupport}
          </p>
        </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <VerifyForm id="hero-verify" layout="hero" />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/#verify"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100"
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

      <section className="border-b border-brand-800/60 bg-brand-800 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">
              What you will see
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
            <div className="flex items-start gap-5 rounded-3xl border border-slate-700/60 bg-slate-800/50 p-6 text-left shadow-sm transition-all duration-200 hover:bg-slate-800/70">
              <img
                src="/Green%20flag2.webp"
                alt="Green flag"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                className="h-16 w-16 shrink-0 object-contain"
              />

              <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
                <span className="font-bold text-white">
                  A green flag
                </span>{" "}
                shows a professional, legitimate trader. Their identity,
                insurance, legal licenses and registrations have been
                successfully verified.
              </p>
            </div>

            <div className="flex items-start gap-5 rounded-3xl border border-slate-700/60 bg-slate-800/50 p-6 text-left shadow-sm transition-all duration-200 hover:bg-slate-800/70">
              <img
                src="/Red%20flag2.webp"
                alt="Red flag"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                className="h-16 w-16 shrink-0 object-contain"
              />

              <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
                <span className="font-bold text-white">
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

      <Pillars />
      <Faq />
      {/* GuidesTeaser removed */}
    </>
  );
}

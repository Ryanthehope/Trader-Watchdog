import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { VerifyForm } from "../components/VerifyForm";
import { useSiteData } from "../context/SiteDataContext";
import { getLaunchWindow } from "../lib/launchWindow";

function SectionBanner({
  children,
  preserveCase = false,
}: {
  children: ReactNode;
  preserveCase?: boolean;
}) {
  return (
    <div className="border-y border-brand-800/70 bg-brand-700 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:px-6 sm:py-5">
      <div className="mx-auto max-w-6xl">
        <p className={`font-display text-[1.7rem] font-bold leading-tight text-white sm:text-3xl ${preserveCase ? "" : "uppercase"}`}>
          {children}
        </p>
      </div>
    </div>
  );
}

type HomeActionPanelProps = {
  imageSrc: string;
  imageAlt: string;
  imageClassName?: string;
  actionLabel: string;
  actionClassName?: string;
  actionHref?: string;
  actionTo?: string;
};

function HomeActionPanel({
  imageSrc,
  imageAlt,
  imageClassName,
  actionLabel,
  actionClassName,
  actionHref,
  actionTo,
}: HomeActionPanelProps) {
  const actionBaseClassName =
    "inline-flex min-h-[3.65rem] items-center justify-center rounded-[1.1rem] px-8 text-center font-display text-[1.9rem] font-bold uppercase tracking-tight text-white shadow-[0_18px_35px_-18px_rgba(0,0,0,0.95)] transition-transform duration-200 hover:-translate-y-0.5 sm:min-h-[4rem] sm:px-10";

  return (
    <div className="border border-slate-200 bg-white p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.34)] sm:p-5">
      <div className="overflow-hidden bg-slate-100">
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="eager"
          decoding="async"
          className={`aspect-[1/1.02] w-full object-cover ${imageClassName ?? ""}`}
        />
      </div>

      <div className="flex justify-center px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
        {actionTo ? (
          <Link to={actionTo} className={`${actionBaseClassName} ${actionClassName ?? "bg-brand-600 hover:bg-brand-500"}`}>
            {actionLabel}
          </Link>
        ) : (
          <a href={actionHref} className={`${actionBaseClassName} ${actionClassName ?? "bg-brand-600 hover:bg-brand-500"}`}>
            {actionLabel}
          </a>
        )}
      </div>
    </div>
  );
}

function SearchCard() {
  return (
    <section id="home-search" className="small-print-on-light bg-white px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl rounded-[2.4rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_30px_70px_-42px_rgba(15,23,42,0.45)] sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">
          Validate a trader with just one click — before you make contact
        </p>
        <h2 className="mt-4 font-display text-4xl font-bold text-slate-900 sm:text-5xl">
          SEARCH THE VERIFIED TRADER REGISTER
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-xl">
          Enter the business name or business telephone number of the trader you would like to verify
        </p>
        <VerifyForm id="home-lookup" layout="hero" />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Search for a trader",
      body: "Start your search — enter the business name or telephone number.",
    },
    {
      step: "2",
      title: "We verify the facts",
      body: "Not the reviews, the opinions or the recommendations - just the facts.",
    },
    {
      step: "3",
      title: "We display flags",
      body: "Green for a verified trader and red for traders that are not verified. See more below.",
    },
    {
      step: "4",
      title: "Make an informed decision",
      body: "Use the result to compare traders with greater confidence before agreeing any work.",
    },
  ];

  return (
    <section className="small-print-on-light bg-white px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-[#F7F9FC] px-6 py-8 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            Simple verification in four clear steps.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#cfe8cf] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbf5_100%)] p-6 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.22)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_-32px_rgba(15,23,42,0.26)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[#2BA24E]" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-[#1e7f3b] bg-[#2BA24E] font-display text-2xl font-bold text-white shadow-[0_18px_28px_-18px_rgba(43,162,78,0.9)]">
                  {step.step}
                </div>
                <span className="rounded-full bg-[#eaf7ea] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2f7b39]">
                  Step {step.step}
                </span>
              </div>
              <h3 className="mt-5 min-h-[3.5rem] font-display text-[1.75rem] font-bold leading-tight text-slate-900">
                {step.title}
              </h3>
              <p className="mt-3 flex-1 text-base leading-relaxed text-slate-600">
                {step.body}
              </p>
              {index < steps.length - 1 ? (
                <div className="pointer-events-none absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfe8cf] bg-white text-[#2BA24E] xl:flex">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickFaqs() {
  return (
    <section className="small-print-on-light bg-white px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {priorityFaqItems.map((item) => (
            <div
              key={item.q}
              className="rounded-[1.5rem] border border-slate-200 bg-[#F7F9FC] p-6 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.34)]"
            >
              <p className="font-display text-xl font-bold text-slate-900">
                {item.q}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    {
      image: "/Rogue%20trader.png",
      imageAlt: "Rogue trader illustration",
      titleStart: "ROGUE",
      titleEnd: "TRADERS",
      value: "£3.5bn",
      body: "estimated loss to rogue traders every year.",
      support:
        "Honest tradespeople are often judged by the actions of rogue operators. Independent verification helps them stand apart.",
    },
    {
      image: "/Fly%20tipping.png",
      imageAlt: "Fly tipping illustration",
      titleStart: "FLY",
      titleEnd: "TIPPING",
      value: "1.26m",
      body: "fly tipping incidents reported last year.",
      support:
        "Responsible businesses that invest in proper waste disposal and hold Waste Carrier Licences deserve to stand apart.",
    },
    {
      image: "/no%20insurance.png",
      imageAlt: "No insurance illustration",
      titleStart: "NO",
      titleEnd: "INSURANCE",
      value: "50%",
      body: "of traders are underinsured or have no insurance.",
      support:
        "Professional businesses invest in proper insurance to protect both themselves and their customers.",
    },
    {
      image: "/fake%20reviews.png",
      imageAlt: "Fake reviews illustration",
      titleStart: "FAKE",
      titleEnd: "REVIEWS",
      value: "TRUSTED?",
      body: "Fake reviews are rising fast, with AI accelerating the problem.",
      support:
        "Honest businesses are trying to compete fairly in a marketplace where authenticity is becoming harder to judge.",
    },
  ];

  return (
    <section className="small-print-on-light bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-7 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.titleEnd}
            className="flex h-full flex-col border border-slate-200 bg-[#EFF0F2] px-7 py-8 text-center shadow-[0_18px_32px_-30px_rgba(15,23,42,0.3)]"
          >
            <img
              src={item.image}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="mx-auto h-28 w-auto object-contain"
            />
            <h2 className="mt-5 flex min-h-[4.5rem] items-start justify-center px-2 font-display text-[1.72rem] font-bold uppercase leading-[0.95] tracking-tight sm:text-[1.9rem]">
              <span className="text-[#59E61B]">{item.titleStart}</span>{" "}
              <span className="text-[#4A5C94]">{item.titleEnd}</span>
            </h2>
            <p className="mt-4 flex min-h-[3.5rem] items-start justify-center font-display text-[2.55rem] font-bold leading-none text-black sm:text-[2.9rem]">
              {item.value}
            </p>
            <p className="mx-auto mt-4 max-w-[16rem] text-[1.02rem] leading-snug text-slate-900 sm:text-[1.08rem]">
              {item.body}
            </p>
            <p className="mt-5 border-t border-slate-300/80 pt-5 text-sm leading-relaxed text-slate-600">
              {item.support}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatYouSee() {
  const panels = [
    {
      title: "A GREEN FLAG",
      points: [
        "ID Verified",
        "Insurance Verified",
        "Licences Verified (where required)",
        "Qualifications and memberships confirmed",
        "Public Profile",
        "Verified trader QR code issued",
      ],
      accentClass: "text-[#32C72E]",
      bulletVariant: "check" as const,
      tagline: "Verified facts at a glance.",
      taglineClass: "text-[#32C72E]",
    },
    {
      title: "A RED FLAG",
      points: [
        "Identity cannot be verified",
        "No insurance?",
        "No Waste Carrier Licence (where applicable)?",
        "Missing or expired licences?",
        "No ICO registration (where relevant)?",
        "Unable to verify business details",
      ],
      accentClass: "text-[#E12F33]",
      bulletVariant: "cross" as const,
      tagline: "Carry out additional checks before agreeing any work.",
      taglineClass: "text-[#E12F33]",
    },
  ];

  return (
    <section className="small-print-on-light bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-14">
        {panels.map((panel) => (
          <div
            key={panel.title}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.4)] sm:p-8"
          >
            <div className="flex h-full flex-col">
              <h2 className="font-display text-3xl font-bold uppercase leading-tight text-slate-900 sm:text-4xl">
                <span className={panel.accentClass}>{panel.title}</span>
              </h2>
              <p className={`mt-3 text-lg font-bold leading-snug sm:text-xl ${panel.taglineClass}`}>
                {panel.tagline}
              </p>

              <ul className="mt-6 grid gap-x-6 gap-y-3 text-lg leading-snug text-slate-900 sm:grid-cols-2 sm:text-[1.2rem]">
                {panel.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${panel.bulletVariant === "check" ? "bg-[#32C72E]" : "bg-[#E12F33]"}`}>
                      {panel.bulletVariant === "check" ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
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
      title: "Public Liability Insurance",
      body: "Public Liability insurance protects you and your property from any damage caused by a trader. Employers Insurance protects you from being responsible for any employees working at your property",
    },
    {
      title: "Your Waste",
      body: "If a trader removes and transports waste from your property, they must legally hold a Waste Carrier Licence. If your waste is fly tipped by an unlicensed trader, you can be fined or prosecuted as the waste producer.",
    },
    {
      title: "Keeping Your Personal Data Safe",
      body: "The Information Commissioner's Office sets rules for how businesses store and process your personal data to help reduce identity theft. We ask traders to check their status with the ICO and show when their registration has been verified.",
    },
    {
      title: "Gas Engineers",
      body: "A trader must be Gas Safe registered to work on any gas appliance or installation. Using someone who is not registered is illegal and dangerous because faulty gas work can cause leaks, fires or carbon monoxide poisoning.",
    },
    {
      title: "Electricians",
      body: "If you are having any electrical installation work in your home you need to ensure the electrician is a registered NICEIC trades person. We check.",
    },
    {
      title: "Qualifications and Memberships",
      body: "Traders can upload up to three qualifications or trade body memberships to their public profile. This helps householders quickly see verified skills and recognised standards.",
    },
    {
      title: "Reviews",
      body: "Fake reviews fuelled by AI are rising fast and can even be purchased online. We do not offer reviews or recommendations. We provide facts so householders can make informed decisions.",
    },
  ];

  return (
    <section id="why" className="small-print-on-light scroll-mt-24 bg-[#F2F4F7] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            We check the details that matter.
          </h2>
          <p className="mt-4 font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            You check the results — with just one click.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_24px_48px_-38px_rgba(15,23,42,0.38)] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2BA24E] text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-slate-900">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="small-print-on-dark border-y border-brand-800/70 bg-brand-700 py-20 sm:py-24">
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

const priorityFaqItems: FaqItem[] = [
  {
    q: "Is Trader Watchdog free?",
    a: "Yes. The free service is funded by honest, transparent traders that have successfully passed the verification process.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can search anonymously without signing up or sharing personal details.",
  },
  {
    q: "What does 'Verified' actually mean?",
    a: "It means Trader Watchdog has checked identity, business legitimacy, insurance, and relevant licences or registrations for that trader.",
  },
  {
    q: "Can I search anonymously?",
    a: "Yes. Searches are anonymous, and the website is designed so householders can check a trader without creating an account.",
  },
];

const publicFaqItems: FaqItem[] = [
  {
    q: "What is Trader Watchdog?",
    a: "Trader Watchdog is a UK verification platform that helps the public check whether a trader is genuine, insured and operating legitimately while helping honest traders demonstrate professionalism.",
  },
  {
    q: "What information do you show about traders?",
    a: "We show only essential business information: business name, trading name, business address, verification status, insurance validity (pass/fail only), and licence or membership confirmations. We never display sensitive documents or personal ID.",
  },
  {
    q: "How do I check a trader?",
    a: "Scan their QR code or search their business name or telephone number on the Trader Watchdog website.",
  },
  {
    q: "Do you show reviews?",
    a: "No. We verify facts, not opinions. Reviews can be misleading, so our focus is on identity, insurance and legitimacy.",
  },
  {
    q: "What does 'Not Verified' mean?",
    a: "It means we were unable to verify that trader or they have not completed the process. It does not automatically mean they are rogue, but we recommend carrying out additional checks before entering any agreement.",
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

  return (
    <>
      <section id="verify" className="small-print-on-light scroll-mt-24 bg-white pb-12 pt-0 sm:pb-16">
        <SectionBanner preserveCase>
          <>
            <span className="block">VERIFY A TRADER WITH JUST ONE CLICK.</span>
            <span className="block text-white/85">It&apos;s free, no registering, totally anonymous, and hassle free!</span>
          </>
        </SectionBanner>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <HomeActionPanel
              imageSrc="/Lady%20square.png"
              imageAlt="Householder reviewing trader details on a phone"
              actionLabel="SEARCH A VERIFIED TRADER"
              actionClassName="bg-[#2BA24E] hover:bg-[#248C42]"
              actionHref="#home-search"
            />

            <HomeActionPanel
              imageSrc="/Tradesman.png"
              imageAlt="Two tradesmen standing together on site"
              actionLabel="BECOME A VERIFIED TRADER"
              actionClassName="bg-brand-700 hover:bg-brand-600"
              actionTo="/join"
            />
          </div>
        </div>

        <SectionBanner preserveCase>
          <>
            <span className="block">Trader Watchdog unites householders with honest, legitimate traders.</span>
            <span className="mt-2 block text-base font-normal normal-case text-white/80">Trader Watchdog protects households and supports genuine local traders, providing the diligence recommended by the police, trading standards, councils and community groups.</span>
            <span className="mt-1 block text-base font-normal normal-case text-white/75">Fast, free access to verified diligence recommended by Police, Trading Standards and Community Groups before you make contact.</span>
          </>
        </SectionBanner>
      </section>

      <HowItWorks />

      <QuickFaqs />

      {publicSearchEnabled && <SearchCard />}

      <Stats />

      <SectionBanner preserveCase>YOUR SEARCHES SHOW A GREEN FLAG <span className="font-normal normal-case opacity-75">or</span> A RED FLAG</SectionBanner>
      <WhatYouSee />

      <SectionBanner>WHAT WE VERIFY</SectionBanner>
      <Pillars />
      <Faq />
    </>
  );
}

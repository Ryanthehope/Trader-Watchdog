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
    <section id="home-search" className="small-print-on-light bg-white px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-[#F4F6FB] px-6 py-8 text-center shadow-[0_26px_50px_-38px_rgba(15,23,42,0.45)] sm:px-8">
        <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
          Search a trader now
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Enter a business name or telephone number to see whether there is a verified Trader Watchdog listing.
        </p>
        <VerifyForm id="home-lookup" layout="hero" />
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
      body: "estimated lost to rogue traders each year",
    },
    {
      image: "/Fly%20tipping.png",
      imageAlt: "Fly tipping illustration",
      titleStart: "FLY",
      titleEnd: "TIPPING",
      value: "1.26m",
      body: "fly tipping incidents reported last year",
    },
    {
      image: "/no%20insurance.png",
      imageAlt: "No insurance illustration",
      titleStart: "NO",
      titleEnd: "INSURANCE",
      value: "50%",
      body: "of traders are under insured or have no insurance",
    },
    {
      image: "/fake%20reviews.png",
      imageAlt: "Fake reviews illustration",
      titleStart: "FAKE",
      titleEnd: "REVIEWS",
      value: "TRUSTED?",
      body: "fake reviews are exploding - AI generates more than 30%",
    },
  ];

  return (
    <section className="small-print-on-light bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.titleEnd}
            className="flex h-full flex-col border border-slate-200 bg-[#EFF0F2] px-6 py-7 text-center shadow-[0_18px_32px_-30px_rgba(15,23,42,0.3)]"
          >
            <img
              src={item.image}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="mx-auto h-28 w-auto object-contain"
            />
            <h2 className="mt-5 flex min-h-[4.75rem] items-start justify-center font-display text-[2rem] font-bold uppercase leading-none tracking-tight sm:text-[2.15rem]">
              <span className="text-[#59E61B]">{item.titleStart}</span>{" "}
              <span className="text-[#4A5C94]">{item.titleEnd}</span>
            </h2>
            <p className="mt-4 flex min-h-[3.5rem] items-start justify-center font-display text-[2.55rem] font-bold leading-none text-black sm:text-[2.9rem]">
              {item.value}
            </p>
            <p className="mx-auto mt-4 max-w-[14rem] text-[1.05rem] leading-snug text-slate-900 sm:text-[1.15rem]">
              {item.body}
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
      image: "/green%20flag%20phone.png",
      imageAlt: "Phone showing a green verified result",
      points: [
        "ID Verified",
        "Insurance Verified",
        "Licences Verified (where required)",
        "Qualifications Confirmed",
        "Public Profile",
      ],
      accentClass: "text-[#32C72E]",
      bulletVariant: "check" as const,
      tagline: "Safe to go!",
      taglineClass: "text-[#32C72E]",
    },
    {
      title: "A RED FLAG",
      image: "/red%20flag%20phone.png",
      imageAlt: "Phone showing a red caution result",
      points: [
        "Identity?",
        "Insurance?",
        "Licences?",
      ],
      accentClass: "text-[#E12F33]",
      bulletVariant: "cross" as const,
      tagline: "Be cautious!",
      taglineClass: "text-[#E12F33]",
    },
  ];

  return (
    <section className="small-print-on-light bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-14">
        {panels.map((panel) => (
          <div
            key={panel.title}
            className="grid items-center gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.4)] sm:grid-cols-[minmax(0,260px)_1fr] sm:p-8"
          >
            <img
              src={panel.image}
              alt={panel.imageAlt}
              loading="lazy"
              decoding="async"
              className="mx-auto h-80 w-auto object-contain sm:h-96"
            />

            <div className="flex h-full flex-col">
              <h2 className="font-display text-3xl font-bold uppercase leading-tight text-slate-900 sm:text-4xl">
                <span className={panel.accentClass}>{panel.title}</span>
              </h2>

              <ul className="mt-6 space-y-4 text-2xl leading-tight text-slate-900 sm:text-[2rem]">
                {panel.points.map((point) => (
                  <li key={point} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${panel.bulletVariant === "check" ? "bg-[#32C72E]" : "bg-[#E12F33]"}`}>
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
                    {point}
                  </li>
                ))}
              </ul>
              <p className={`mt-5 text-2xl font-bold italic sm:text-3xl ${panel.taglineClass}`}>
                {panel.tagline}
              </p>
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
      body: "Public Liability insurance is required to protect your property, and Employers Insurance (if the trader has staff) is required if an employee is injured on your property.",
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

  return (
    <>
      <section id="verify" className="small-print-on-light scroll-mt-24 bg-white pb-12 pt-0 sm:pb-16">
        <SectionBanner preserveCase>
          <>
            <span className="block uppercase">VERIFY A TRADER WITH JUST ONE CLICK.</span>
            <span className="block italic">It&apos;s free, no registering, totally anonymous, and hassle free!</span>
          </>
        </SectionBanner>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <HomeActionPanel
              imageSrc="/woman%20with%20phone.jpg"
              imageAlt="Householder holding a verified trader phone screen"
              actionLabel="SEARCH a TRADER"
              actionClassName="bg-[#2BA24E] hover:bg-[#248C42]"
              actionHref="#home-search"
            />

            <HomeActionPanel
              imageSrc="/Blue%20man.png"
              imageAlt="Trader in blue workwear holding a verified trader phone screen"
              imageClassName="object-[center_18%]"
              actionLabel="JOIN as a TRADER"
              actionClassName="bg-brand-700 hover:bg-brand-600"
              actionTo="/join"
            />
          </div>
        </div>

        <SectionBanner preserveCase>
          <span className="text-white/80">Trader Watchdog protects households and supports genuine local traders, providing the diligence recommended by the police, trading standards, councils and community groups.</span>
        </SectionBanner>
      </section>

      <Stats />

      <SectionBanner preserveCase>YOUR SEARCHES SHOW A GREEN FLAG <span className="font-normal normal-case opacity-75">or</span> A RED FLAG</SectionBanner>
      <WhatYouSee />

      {publicSearchEnabled && <SearchCard />}

      <SectionBanner>WHAT WE VERIFY</SectionBanner>
      <Pillars />

      <section className="small-print-on-light border-b border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-md px-4 text-center sm:px-6">
          <img
            src="/Badge%20TW3.webp"
            alt="Trader Watchdog verified trader sticker"
            className="mx-auto w-full max-w-[28rem]"
            loading="lazy"
          />
          <p className="mt-4 text-2xl font-semibold text-slate-700">Look for the sign of a Verified Trader</p>
        </div>
      </section>

      <Faq />
    </>
  );
}

import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { publicApiUrl } from "../lib/api";
import { MemberPreviewCard } from "../components/MemberPreviewCard";
import { VerifyForm } from "../components/VerifyForm";

function BadgeShowcase() {
  return (
    <section className="border-b border-white/5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:gap-12 lg:grid-cols-2 lg:items-center sm:px-6">
        <div className="lg:max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            The TradeVerify badge
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
            Spot it on vans, sites, and quotes
          </h2>
          <p className="mt-4 text-slate-400">
            Verified members display a unique TradeVerify ID that homeowners can
            search on this site. If there is no badge, or the number does not
            match a live profile, treat that as a red flag before you pay a
            deposit.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-brand-400">→</span>
              Ask for their TradeVerify ID if it is not visible.
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">→</span>
              Confirm the ID here before large upfront payments.
            </li>
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[min(100%,360px)]">
            <div
              className="absolute -inset-6 rounded-3xl bg-emerald-500/15 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col items-stretch sm:items-end">
              <img
                src={publicApiUrl("/api/badge-preview.svg")}
                width={320}
                height={88}
                alt="TradeVerify verified member badge: green ribbon with check, TradeVerify, member ID TV-2847"
                className="h-auto w-full max-w-[320px] drop-shadow-2xl sm:ml-auto"
              />
              <p className="mt-5 text-center text-xs leading-relaxed text-slate-500 sm:max-w-[320px] sm:text-right">
                Same green SVG badge issued to each verified member (their name,
                trade, and ID).
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
    { value: "£3.5bn", label: "estimated lost to rogue traders yearly" },
    { value: "42%", label: "of online reviews are estimated fake" },
    { value: "1 in 3", label: "tradespeople don't have insurance" },
  ];
  return (
    <section className="border-b border-white/5 bg-ink-900/50 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-ink-950/90 p-6 text-center shadow-card-lg transition-colors duration-300 hover:border-white/15"
          >
            <p className="font-display text-3xl font-bold text-brand-400 sm:text-4xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-snug text-slate-400">
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
      title: "Free for homeowners",
      body: "Look up a TradeVerify ID or search the public directory before you hire. No fee to check whether a business is listed and what we hold on file.",
    },
    {
      title: "Straightforward for trades",
      body: "Membership covers verification and your live public profile — we focus on proof, not selling you leads job-by-job.",
    },
    {
      title: "Proof in one link",
      body: "Structured vetting summary, badge artwork, and profile details — so customers see independent checks in one place, not scattered claims.",
    },
  ];
  return (
    <section
      id="highlights"
      className="scroll-mt-24 border-b border-white/5 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-300">
          Why TradeVerify
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-white sm:text-3xl">
          Trust first — not another lead auction
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-emerald-500/25 bg-ink-900/50 p-6 shadow-card-lg transition-shadow duration-300 hover:border-emerald-500/35"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <IconCheck />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
      feature: "Unique ID & official badge artwork",
      detail: "Homeowners can confirm the ID matches a live listing.",
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
      feature: "Built-in job posting & quote marketplace",
      tv: "no",
      other: "yes",
      other2: "yes",
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
      className="scroll-mt-24 border-b border-white/5 bg-ink-950/40 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-300">
          Comparison
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-white sm:text-3xl">
          How we&apos;re different from lead directories
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500">
          TradeVerify is a verification service with public profiles. Lead
          marketplaces focus on connecting jobs — we focus on what&apos;s true
          before you connect. Competitor columns are a general guide; features
          vary by plan and change over time.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/50">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-ink-950/80">
                <th
                  scope="col"
                  className="px-4 py-4 font-medium text-slate-400 sm:px-6"
                >
                  Feature
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-display font-semibold text-brand-300 sm:px-6"
                >
                  TradeVerify
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-medium text-slate-400 sm:px-6"
                >
                  Typical directory
                  <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                    e.g. Checkatrade
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center font-medium text-slate-400 sm:px-6"
                >
                  Typical directory
                  <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
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
                    i % 2 === 0 ? "bg-ink-950/20" : "bg-ink-900/30"
                  }
                >
                  <th
                    scope="row"
                    className="max-w-[220px] px-4 py-4 align-top font-medium text-slate-200 sm:px-6"
                  >
                    {row.feature}
                    {row.detail ? (
                      <span className="mt-1 block text-xs font-normal text-slate-500">
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

function MembersCarousel() {
  const { members, loading } = useSiteData();

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold text-white sm:text-3xl">
          Verified members
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
          Public profiles in the TradeVerify directory. Each card links to a
          full verification summary you can share with customers.
        </p>
        <div className="mt-10 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:justify-center sm:overflow-visible sm:pb-0">
          {loading
            ? [0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="h-[280px] w-[min(100%,320px)] shrink-0 snap-center animate-pulse rounded-2xl bg-ink-800/60"
                  aria-hidden
                />
              ))
            : members.map((m) => (
                <MemberPreviewCard key={m.slug} member={m} />
              ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Spot the badge",
      body: "See the TradeVerify badge on a van, website, or marketing material.",
    },
    {
      n: "2",
      title: "Search the company",
      body: "Type the business TradeVerify ID into our verification tool.",
    },
    {
      n: "3",
      title: "Checked or not",
      body: "Instantly see whether they have been independently checked.",
    },
  ];
  return (
    <section
      id="how"
      className="scroll-mt-24 border-t border-white/5 bg-ink-900/30 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-300">
          How it works
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-semibold text-white sm:text-3xl">
          Check in seconds
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-white/5 bg-ink-950 p-6 pt-10"
            >
              <span className="absolute left-6 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 font-display text-lg font-bold text-white shadow-lg">
                {s.n}
              </span>
              <h3 className="font-display text-lg font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {s.body}
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
      title: "Address & locality",
      body: "Confirmed as a genuine operating address — not a virtual office, PO box, or registered address in a different area.",
    },
    {
      title: "Insurance & accreditations",
      body: "Public liability cover verified. Gas Safe, NICEIC, FENSA and other certifications checked against official registers where claimed.",
    },
    {
      title: "Digital footprint",
      body: "Website, socials, and reviews checked for consistency and genuine business activity.",
    },
    {
      title: "Contact & public records",
      body: "Phone number confirmed as genuine — not only a virtual “local” number. Public records reviewed.",
    },
  ];
  return (
    <section id="why" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-300">
          Why it matters
        </p>
        <h2 className="mt-2 max-w-3xl text-center font-display text-2xl font-semibold leading-tight text-white sm:mx-auto sm:text-3xl">
          Anyone can put anything online. TradeVerify checks what&apos;s actually
          true.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-center text-slate-400">
          When a tradesperson is TradeVerify checked, we&apos;ve independently
          audited the claims they make about their business. Every member is
          reviewed across the following:
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="flex gap-4 rounded-2xl border border-white/5 bg-ink-900/40 p-6"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300"
                aria-hidden
              >
                ✓
              </span>
              <div>
                <h3 className="font-display font-semibold text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
    q: "What is TradeVerify?",
    a: "TradeVerify is an independent verification service for trades businesses. We check what they claim — address, insurance, registrations, and public footprint — so homeowners have a single place to confirm a business before they hire.",
  },
  {
    q: "What if someone fakes a badge or ID?",
    a: "Always search the TradeVerify ID on this site. A forged number will not return a matching verified profile. If in doubt, contact us with the details they gave you.",
  },
  {
    q: "How often are member checks updated?",
    a: "Members agree to notify us of material changes. We also run scheduled renewals according to your published policy — for example annual proof of insurance — so profiles stay meaningful over time.",
  },
];

function Faq() {
  return (
    <section id="faq" className="border-y border-white/10 bg-ink-900/25 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-white">
          Common questions
        </h2>
        <dl className="mt-10 space-y-4 sm:space-y-5">
          {faqItems.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-white/10 bg-ink-950/70 px-5 py-4 shadow-card-lg"
            >
              <dt className="font-medium text-white">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function GuidesTeaser() {
  const { guides } = useSiteData();
  const top = guides.slice(0, 3);

  if (top.length === 0) return null;

  return (
    <section id="guides" className="border-y border-white/5 bg-gradient-to-br from-brand-950/50 to-ink-950 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Guides and advice
            </h2>
            <p className="mt-3 max-w-xl text-slate-400">
              Protect yourself before you hire — clear guidance on quotes,
              reviews, and how to pay safely.
            </p>
          </div>
          <Link
            to="/guides"
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View all guides
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {top.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/guides/${g.slug}`}
                className="block h-full rounded-2xl border border-white/10 bg-ink-950/50 p-5 transition hover:border-brand-500/30"
              >
                <p className="text-xs text-slate-500">{g.readTime}</p>
                <p className="mt-2 font-display font-semibold text-white">
                  {g.title}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {g.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TradesCta() {
  return (
    <section id="join" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-brand-500/25 bg-gradient-to-br from-brand-900/85 via-ink-900 to-ink-950 p-8 shadow-card-lg ring-1 ring-white/5 sm:p-12 md:flex md:items-center md:justify-between md:gap-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              For tradespeople
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
              Verified. Insured. Accountable.
            </h2>
            <p className="mt-4 max-w-xl text-slate-400">
              You do the work. TradeVerify proves the rest. Give customers
              independent proof that what you claim about your business is
              accurate.
            </p>
          </div>
          <Link
            to="/join"
            className="mt-8 inline-flex shrink-0 items-center justify-center rounded-full bg-white px-8 py-3.5 font-semibold text-ink-900 transition hover:bg-slate-100 md:mt-0"
          >
            Apply now
          </Link>
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
  const { members } = useSiteData();
  const exampleMember = members[0];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid-sm [mask-image:linear-gradient(to_bottom,black,transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(14,165,233,0.28),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:pt-28">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-200 shadow-lg shadow-brand-950/40">
            Independent checks on local tradespeople
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Don&apos;t take their word for it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl sm:leading-relaxed">
            Anyone can claim to be local, insured, and qualified. TradeVerify
            independently checks that tradespeople are who they say they are,
            based where they claim to be, and hold the credentials they
            advertise.
          </p>
          <VerifyForm id="hero-verify" layout="hero" />
          {exampleMember ? (
            <p className="mt-3 max-w-xl text-sm text-slate-500">
              Search by ID{" "}
              <span className="font-mono text-slate-400">
                {exampleMember.tvId}
              </span>{" "}
              or by business name.
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
            <Link
              to="/#verify"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-base font-semibold text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/10"
            >
              Full verify tool
            </Link>
            <Link
              to="/join"
              className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-brand-900/45 transition-colors duration-200 hover:bg-brand-400"
            >
              Get verified as a tradesperson
            </Link>
          </div>
        </div>
      </section>

      <BadgeShowcase />
      <Stats />
      <FeatureHighlights />
      <CompetitorComparison />

      <section
        id="verify"
        className="scroll-mt-24 border-b border-white/5 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Look up a TradeVerify number
            </h2>
            <p className="mt-3 text-slate-400">
              Enter the ID from their badge, quote, or website. You will open
              their public profile or see that they are not listed.
            </p>
          </div>
          <VerifyForm id="section-verify" layout="section" />
          <p className="mx-auto mt-4 max-w-lg text-center text-sm text-slate-500">
            Listings are managed by TradeVerify staff in the secure admin area
            and served from the live database.
          </p>
        </div>
      </section>

      <MembersCarousel />
      <HowItWorks />
      <Pillars />
      <Faq />
      <GuidesTeaser />
      <TradesCta />
    </>
  );
}

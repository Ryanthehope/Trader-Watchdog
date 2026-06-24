import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useSiteData } from "../context/SiteDataContext";
import type {
  InsuranceSummaryPublic,
  VettingFactPublic,
  VettingItemPublic,
  VettingSectionPublic,
} from "../types/content";

const DISCLAIMER =
  "Trader Watchdog independently checks that tradespeople are local, insured, and hold the accreditations they claim. Trader Watchdog does not rate quality of workmanship.";

const GREEN_FLAG_SRC = "/Green%20flag2.webp";
const RED_FLAG_SRC = "/Red%20flag2.webp";

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
  const isVerified = status === "verified";
  if (status === "verified") {
    return (
      <img
        src={GREEN_FLAG_SRC}
        alt=""
        width="32"
        height="32"
        loading="lazy"
        decoding="async"
        className="h-8 w-8 shrink-0 object-contain"
        aria-hidden
      />
    );
  }
  return (
    <img
      src={isVerified ? GREEN_FLAG_SRC : RED_FLAG_SRC}
      alt=""
      width="32"
      height="32"
      loading="lazy"
      decoding="async"
      className="h-8 w-8 shrink-0 object-contain"
      aria-hidden
    />
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

function InsuranceBadge({ status }: { status: InsuranceSummaryPublic["status"] }) {
  if (status === "expiring_soon") {
    return (
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
        Expiring soon
      </span>
    );
  }
  if (status === "in_grace") {
    return (
      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">
        Grace period
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      Current
    </span>
  );
}

function VettingAccordion({
  sections,
}: {
  sections: VettingSectionPublic[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey((k) => (k === key ? null : key));
  };

  return (
    <div className="space-y-8">
      {sections.map((cat) => (
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

export function MemberProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { members, loading, error, reload } = useSiteData();
  const member = members.find((m) => m.slug === slug);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-white px-4">
        <p className="text-slate-500">Loading profile…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg bg-white px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-semibold text-slate-900">
          Directory unavailable
        </h1>
        <p className="mt-3 text-slate-600">{error}</p>
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
      <main className="mx-auto max-w-lg bg-white px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Trader Watchdog
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-slate-900">
          Profile not found
        </h1>
        <p className="mt-3 text-slate-600">
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

  const vettingSections =
    member.vettingSections.length > 0
      ? member.vettingSections
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
    <main className="border-b border-slate-200 bg-white pb-20">
      <div className="border-b border-slate-200 bg-[#f5f7fb] py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            to="/#verify"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Verify another business
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0">
                <p className="inline-flex rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold tracking-wide text-white">
                  Tel: {member.tvId}
                </p>
                <h1 className="mt-4 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                  {member.name}
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  {member.trade} · {member.publicAddress ?? member.location}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Checked since {member.verifiedSince}
                </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-center sm:justify-end">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 ring-1 ring-emerald-400/20 sm:h-28 sm:w-28">
                  <img
                    src={GREEN_FLAG_SRC}
                    alt=""
                    width="96"
                    height="96"
                    decoding="async"
                    className="h-20 w-20 object-contain sm:h-16 sm:w-16"
                    aria-hidden
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
              <p className="text-sm font-semibold text-white">
                Please mention Trader Watchdog when communicating with traders.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-8 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            What we checked
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Each item below was independently audited by Trader Watchdog before this
            business was approved.
          </p>

          <div className="mt-8">
            <VettingAccordion sections={vettingSections} />
          </div>

          <p className="mt-10 border-t border-slate-200 pt-8 text-xs leading-relaxed text-slate-500">
            {DISCLAIMER}
          </p>

          <p className="mt-8 text-sm leading-relaxed text-slate-600">
            {member.blurb}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Member since {member.verifiedSince}. Information reflects checks at
            enrolment; members must keep credentials current and notify
            Trader Watchdog of material changes.
          </p>
        </div>

          </div>

          <aside className="space-y-6 lg:col-span-1">
            <div className="sticky top-6 space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Verification summary
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                This public page is limited to the Trader Watchdog checks carried out on the business and the core information needed to identify it.
              </p>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">Trade</dt>
                  <dd className="text-right font-medium text-slate-900">{member.trade}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">
                    {member.publicAddress ? "Business address" : "Location"}
                  </dt>
                  <dd className="text-right font-medium text-slate-900">
                    {member.publicAddress ?? member.location}
                  </dd>
                </div>
                {member.phone ? (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-slate-500">Contact</dt>
                    <dd>
                      <a
                        href={`tel:${member.phone}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {member.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Use the mobile number <span className="font-semibold text-slate-900">{member.tvId}</span> and the business details shown on this page when comparing paperwork, quotes, or vans.
              </div>
              {member.insurancePolicies && member.insurancePolicies.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Insurance
                  </p>
                  <ul className="space-y-2">
                    {member.insurancePolicies.map((pol, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-700">{pol.type}</span>
                        <InsuranceBadge status={pol.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            Hiring this trade? Confirm their mobile number on this site before
            you pay a deposit.
          </p>
          <Link
            to="/#verify"
            className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Verify another trader →
          </Link>
        </div>
      </div>
    </main>
  );
}

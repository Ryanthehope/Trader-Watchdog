import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useSiteData } from "../context/SiteDataContext";
import { publicApiUrl } from "../lib/api";
import type {
  VettingFactPublic,
  VettingItemPublic,
  VettingSectionPublic,
} from "../types/content";

const DISCLAIMER =
  "Trader Watchdog independently checks that tradespeople are local, insured, and hold the accreditations they claim. Trader Watchdog does not rate quality of workmanship. Always obtain multiple quotes and conduct your own due diligence.";

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
  if (status === "verified") {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-sm shadow-emerald-900/30"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-sm font-bold text-slate-400"
      aria-hidden
    >
      —
    </span>
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

  const badgeSrc = useMemo(
    () =>
      slug
        ? publicApiUrl(
            `/api/members/by-slug/${encodeURIComponent(slug)}/badge.svg`
          )
        : "",
    [slug]
  );

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-slate-400">Loading profile…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-semibold text-white">
          Directory unavailable
        </h1>
        <p className="mt-3 text-slate-400">{error}</p>
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
      <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trader Watchdog
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">
          Profile not found
        </h1>
        <p className="mt-3 text-slate-400">
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
    <main className="border-b border-white/5 pb-20">
      <div className="border-b border-white/5 bg-gradient-to-br from-brand-950/40 to-ink-950 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            to="/#verify"
            className="text-sm font-medium text-brand-300 hover:text-brand-200"
          >
            ← Verify another business
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-4">
                  {member.profileLogo ? (
                    <img
                      src={publicApiUrl(
                        `/api/members/by-slug/${encodeURIComponent(member.slug)}/profile-logo`
                      )}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl border border-white/15 bg-slate-900/50 object-contain ring-1 ring-white/10 sm:h-20 sm:w-20"
                    />
                  ) : null}
                  <div className="min-w-0">
                <p className="inline-flex rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold tracking-wide text-white">
                  {member.tvId}
                </p>
                <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                  {member.name}
                </h1>
                <p className="mt-2 text-lg text-slate-400">
                  {member.trade} · {member.location}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Checked since {member.verifiedSince}
                </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-center sm:justify-end">
                <div className="overflow-hidden rounded-xl shadow-lg shadow-black/30 ring-1 ring-emerald-500/35">
                  <img
                    src={badgeSrc}
                    width={320}
                    height={88}
                    alt=""
                    className="h-auto max-w-[min(100%,320px)]"
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
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-8 lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-white">
            What we checked
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Each item below was independently audited by Trader Watchdog before this
            business was approved.
          </p>

          <div className="mt-8">
            <VettingAccordion sections={vettingSections} />
          </div>

          <p className="mt-10 border-t border-white/10 pt-8 text-xs leading-relaxed text-slate-500">
            {DISCLAIMER}
          </p>

          <p className="mt-8 text-sm leading-relaxed text-slate-400">
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
            <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/50 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-white">
                Verification summary
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                This public page is limited to the Trader Watchdog checks carried out on the business and the core information needed to identify it.
              </p>
              <div className="rounded-xl border border-white/10 bg-ink-950/50 p-4 text-sm text-slate-300">
                Use the Trader Watchdog ID <span className="font-semibold text-white">{member.tvId}</span> and the business details shown on this page when comparing paperwork, quotes, or vans.
              </div>
            </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-ink-900/20 p-6 text-center">
          <p className="text-sm text-slate-400">
            Hiring this trade? Confirm their Trader Watchdog ID on this site before
            you pay a deposit.
          </p>
          <Link
            to="/#verify"
            className="mt-4 inline-flex text-sm font-semibold text-brand-300 hover:text-brand-200"
          >
            Verify another ID →
          </Link>
        </div>
      </div>
    </main>
  );
}

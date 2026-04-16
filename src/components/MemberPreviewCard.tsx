import { Link } from "react-router-dom";
import type { VerifiedMember } from "../types/content";

export function MemberPreviewCard({ member }: { member: VerifiedMember }) {
  return (
    <article className="flex w-[min(100%,320px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/95 to-ink-900 shadow-card-lg transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/25 hover:shadow-2xl hover:shadow-black/40">
      <div className="border-b border-white/5 bg-brand-600/20 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-200">
              Trader Watchdog
            </p>
            <p className="font-display text-lg font-semibold leading-tight text-white">
              {member.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-400">
              {member.trade} · {member.location}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-500/30 px-2.5 py-1 text-[11px] font-bold text-brand-100">
            {member.tvId}
          </span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2.5 px-5 py-4">
        {member.checks.slice(0, 4).map((c) => (
          <li
            key={c}
            className="flex items-center gap-2.5 text-xs text-slate-300"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            {c}
          </li>
        ))}
      </ul>
      <div className="border-t border-white/5 px-5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
          Verified member
        </span>
        <Link
          to={`/m/${member.slug}`}
          className="mt-2 flex items-center justify-between text-sm font-medium text-brand-300 transition hover:text-brand-200"
        >
          View profile
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}

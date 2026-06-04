import { Link, useSearchParams } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

export function LookupMiss() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { members, loading } = useSiteData();
  const hints = members.slice(0, 3);

  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-red-300">
        No verified listing
      </p>
      <h1 className="mt-6 font-display text-2xl font-semibold text-white">
        We could not find a verified Trader Watchdog match
      </h1>
      {q ? (
        <p className="mt-3 text-slate-400">
          There is no verified Trader Watchdog listing for{" "}
          <span className="font-mono text-slate-300">&quot;{q}&quot;</span>.
          Search again using the business name or telephone number, or ask the
          trader to send their Trader Watchdog profile link.
        </p>
      ) : (
        <p className="mt-3 text-slate-400">
          Enter a business name or telephone number to check whether a verified
          Trader Watchdog listing exists.
        </p>
      )}
      <p className="mt-4 text-sm text-slate-500">
        If no verified listing appears, treat the trader as unverified. 
        Be cautious. Do not enter an agreement without a visual check of their insurance, licences, and other supporting evidence.
      </p>
      <p className="mt-3 text-sm font-semibold text-red-300">
        Please mention Trader Watchdog when communicating with traders.
      </p>
      {!loading && hints.length > 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Search examples from the directory:{" "}
          {hints.map((m, i) => (
            <span key={m.slug}>
              {i > 0 ? " · " : null}
              <Link
                to={`/m/${m.slug}`}
                className="text-slate-400 underline-offset-2 hover:text-brand-300 hover:underline"
              >
                {m.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      <Link
        to="/#verify"
        className="mt-8 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
      >
        Try again
      </Link>
    </main>
  );
}

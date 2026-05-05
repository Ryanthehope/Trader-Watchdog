import { Link, useSearchParams } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

export function LookupMiss() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { members, loading } = useSiteData();
  const hints = members.slice(0, 3);

  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold text-white">
        No match for that search
      </h1>
      {q ? (
        <p className="mt-3 text-slate-400">
          There is no verified Trader Watchdog listing for{" "}
          <span className="font-mono text-slate-300">&quot;{q}&quot;</span>.
          Check the business name or Trader Watchdog ID and try again, or ask the
          business to send their profile link.
        </p>
      ) : (
        <p className="mt-3 text-slate-400">
          Enter a business name as it is advertised, or search by Trader Watchdog
          ID if you have it.
        </p>
      )}
      {!loading && hints.length > 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Search examples from the directory:{" "}
          {hints.map((m, i) => (
            <span key={m.slug}>
              {i > 0 ? " · " : null}
              <Link
                to={`/m/${m.slug}`}
                className="font-mono text-slate-400 underline-offset-2 hover:text-brand-300 hover:underline"
              >
                {m.tvId}
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

import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { getLaunchWindow } from "../lib/launchWindow";

type Props = {
  id?: string;
  layout?: "hero" | "section";
};

export function VerifyForm({ id = "tv-verify", layout = "section" }: Props) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { findMember, loading, error } = useSiteData();
  const { publicSearchEnabled } = getLaunchWindow();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!publicSearchEnabled) return;
    if (loading || error) return;

    const q = query.trim();
    if (!q) return;

    const member = findMember(q);
    if (member) navigate(`/m/${member.slug}`);
    else navigate(`/lookup/miss?q=${encodeURIComponent(q)}`);
  };

  const isHero = layout === "hero";
  const disabled = loading || Boolean(error) || !publicSearchEnabled;

  return (
    <div>
    <form
      id={id}
      className={
        isHero
          ? "mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
          : "mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:items-stretch"
      }
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor={`${id}-input`}>
        Business name or telephone number
      </label>
      <input
        id={`${id}-input`}
        type="search"
        placeholder="Enter the business name or business telephone number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        disabled={disabled}
        aria-busy={loading}
        className={
          isHero
            ? "min-h-[52px] flex-1 rounded-xl border border-[#1f7c39] bg-[#2BA24E] px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_30px_-20px_rgba(43,162,78,0.75)] placeholder:text-white/85 transition-shadow focus:border-[#17632d] focus:outline-none focus:ring-2 focus:ring-[#2BA24E]/35 disabled:cursor-not-allowed"
            : "min-h-[52px] flex-1 rounded-xl border border-white/12 bg-ink-900 px-4 text-white shadow-inner shadow-black/10 placeholder:text-slate-500 transition-shadow focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/45 disabled:cursor-not-allowed disabled:opacity-50"
        }
      />
      <button
        type="submit"
        disabled={disabled}
        className={
          isHero
            ? "min-h-[52px] shrink-0 rounded-xl bg-white px-8 font-semibold text-ink-900 shadow-lg shadow-black/30 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            : "min-h-[52px] rounded-xl bg-brand-600 px-8 font-semibold text-white shadow-lg shadow-brand-900/40 transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading ? "Loading…" : "Check"}
      </button>
    </form>
    {query.trim() ? (
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setQuery("")}
          className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700"
        >
          Clear and start again
        </button>
      </div>
    ) : null}
    </div>
  );
}

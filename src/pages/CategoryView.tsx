import { Link, useParams } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { MemberPreviewCard } from "../components/MemberPreviewCard";

export function CategoryView() {
    const { slug } = useParams<{ slug: string }>();
    const { members, loading, error, reload } = useSiteData();

    const categoryName = members.flatMap((member) => member.categories)
    .find((category) => category.slug === slug)?.name ?? null;

   const categoryMembers = members
  .filter((member) =>
    member.categories.some((category) => category.slug === slug)
  )
  .sort((a, b) => a.name.localeCompare(b.name));
  
    if(loading) {
        return (
            <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <p className="text-slate-400">Loading category…</p>
            </main>
        );       
    }

    if(error) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
                <h1 className="font-display text-2xl font-semibold text-white">
                    Category unavailable</h1>
                <p className="mt-3 text-slate-400">{error}</p>
                <button
                    type="button"
                    onClick={() => reload()}
                    className="mt-6 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
                >
                    Retry
                </button>
            </main>
        );
    }
    if (!slug || !categoryName) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trader Watchdog
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">
          Category not found
        </h1>
        <p className="mt-4 text-slate-400">
          That category does not exist or does not currently have any visible members.
        </p>
        <Link
          to="/categories"
          className="mt-8 inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Back to categories
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Link
        to="/categories"
        className="text-sm font-medium text-brand-300 hover:text-brand-200"
      >
        ← Back to categories
      </Link>

      <div className="mt-6 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trader Watchdog
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">
          {categoryName}
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          {categoryMembers.length} {categoryMembers.length === 1 ? "verified member" : "verified members"} currently listed in this category.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-6">
        {categoryMembers.map((member) => (
          <MemberPreviewCard key={member.slug} member={member} />
        ))}
      </div>
    </main>
  );
}
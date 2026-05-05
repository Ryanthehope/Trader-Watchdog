import { Link } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

    type CategoryGroup = {
        slug: string;
        name: string;
        count: number
    };
 
    export function Categories() {
        const { members, loading, error, reload } = useSiteData();

        const categoryGroups: CategoryGroup[] = Object.values(
            members.reduce<Record<string, CategoryGroup>>((acc, member) => {
                for (const category of member.categories) {
                    const existing = acc[category.slug];

                    if (existing) {
                        existing.count += 1;
                    } else {
                        acc[category.slug] = {
                            slug: category.slug,
                            name: category.name,
                            count: 1,
                        };
                    }
                }
                return acc;
            }, {})
        ).sort((a, b) => a.name.localeCompare(b.name));
    
    if (loading) {
        return (
            <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-slate-400">Loading categories…</p>
      </main>
    );
  }
    if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-white">
          Categories unavailable
        </h1>
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trader Watchdog
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">
          Browse verified trades by category
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Explore verified businesses by trade category and see how many active
          members are listed in each one.
        </p>
      </div>

      {categoryGroups.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-ink-900/50 p-8">
          <p className="text-slate-300">No categories are available yet.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryGroups.map((category) => (
            <Link
              key={category.slug}
              to={`/categories/${category.slug}`}
              className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 transition hover:-translate-y-1 hover:border-brand-500/30 hover:bg-ink-900/70"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
                Category
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                {category.name}
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                {category.count} {category.count === 1 ? "member" : "members"}
              </p>
              <p className="mt-6 text-sm font-medium text-brand-300">
                View category →
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
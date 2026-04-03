import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

type Row = {
  id: string;
  slug: string;
  tvId: string;
  name: string;
  trade: string;
  location: string;
  updatedAt: string;
};

const searchInputClass =
  "w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2.5 text-sm text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] outline-none placeholder:text-slate-500 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25 focus:ring-offset-0";

export function StaffMembers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const blob = [m.name, m.tvId, m.trade, m.location, m.slug]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, query]);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGetAuth<{ members: Row[] }>("/api/admin/members")
      .then((d) => setRows(d.members))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this member permanently?")) return;
    setDeleting(id);
    try {
      await apiSend(`/api/admin/members/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Members
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Public directory entries and profile URLs{" "}
            <span className="text-slate-500">(/m/slug)</span>
          </p>
        </div>
        <Link
          to="/staff/members/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Add member
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-red-300">{error}</p>
      ) : loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate-500">No members yet. Add one to get started.</p>
      ) : (
        <>
          <div className="mt-6">
            <label htmlFor="members-search" className="sr-only">
              Search members
            </label>
            <input
              id="members-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, trade, location, slug…"
              className={searchInputClass}
              autoComplete="off"
            />
            {query.trim() ? (
              <p className="mt-2 text-xs text-slate-500">
                {filtered.length === 0
                  ? "No matches"
                  : `${filtered.length} of ${rows.length} shown`}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                {rows.length} member{rows.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-8 text-slate-500">No members match your search.</p>
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="mt-6 space-y-3 md:hidden">
                {filtered.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-white/10 bg-ink-900/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{m.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-brand-200/90">
                          {m.tvId}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          <span>{m.trade}</span>
                          <span className="text-slate-600"> · </span>
                          <span>{m.location}</span>
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-600">
                          /m/{m.slug}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/staff/members/${m.id}`}
                        className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={deleting === m.id}
                        onClick={() => remove(m.id)}
                        className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200/95 hover:bg-red-500/15 disabled:opacity-50"
                      >
                        {deleting === m.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="mt-6 hidden overflow-hidden rounded-xl border border-white/10 md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-white/10 bg-ink-900/90 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-[28%] px-4 py-3 font-medium">Name</th>
                      <th className="w-[18%] px-4 py-3 font-medium">ID</th>
                      <th className="w-[18%] px-4 py-3 font-medium">Trade</th>
                      <th className="w-[22%] px-4 py-3 font-medium">Location</th>
                      <th className="w-[14%] px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filtered.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{m.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-600">
                            /m/{m.slug}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-200">
                          {m.tvId}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <span className="line-clamp-2">{m.trade}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <span className="line-clamp-2">{m.location}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Link
                              to={`/staff/members/${m.id}`}
                              className="rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              disabled={deleting === m.id}
                              onClick={() => remove(m.id)}
                              className="rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200/95 hover:bg-red-500/15 disabled:opacity-50"
                            >
                              {deleting === m.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

type Row = {
  id: string;
  slug: string;
  title: string;
  readTime: string;
  updatedAt: string;
};

export function StaffGuides() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGetAuth<{ guides: Row[] }>("/api/admin/guides")
      .then((d) => setRows(d.guides))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this guide permanently?")) return;
    setDeleting(id);
    try {
      await apiSend(`/api/admin/guides/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Guides
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Articles under Guides and advice
          </p>
        </div>
        <Link
          to="/staff/guides/new"
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Add guide
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-red-300">{error}</p>
      ) : loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate-500">No guides yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/40 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{g.title}</p>
                <p className="text-xs text-slate-500">
                  /guides/{g.slug} · {g.readTime}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  to={`/staff/guides/${g.id}`}
                  className="text-brand-300 hover:text-brand-200"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={deleting === g.id}
                  onClick={() => remove(g.id)}
                  className="text-red-400/90 hover:text-red-300 disabled:opacity-50"
                >
                  {deleting === g.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

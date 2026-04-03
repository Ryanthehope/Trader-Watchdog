import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

type ReviewRow = {
  id: string;
  status: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorEmail: string | null;
  createdAt: string;
  member: { id: string; name: string; slug: string; tvId: string };
};

export function StaffReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetAuth<{ reviews: ReviewRow[] }>("/api/admin/reviews")
      .then((d) => setRows(d.reviews))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const d = await apiSend<{ review: ReviewRow }>(
        `/api/admin/reviews/${id}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      setRows((r) => r.map((x) => (x.id === id ? d.review : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const pending = rows.filter((r) => r.status === "PENDING");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Customer reviews
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Approve reviews before they appear on public profiles. Reject spam or
        abusive content.
      </p>

      {error ? <p className="mt-6 text-red-300">{error}</p> : null}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {pending.length} pending · {rows.length} loaded (most recent 200)
          </p>
          <div className="mt-6 space-y-6">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-white/10 bg-ink-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      {r.status}
                      {" · "}
                      {new Date(r.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {r.rating}/5 — {r.title || "Review"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{r.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      — {r.authorName}
                      {r.authorEmail ? ` · ${r.authorEmail}` : ""}
                    </p>
                    <p className="mt-3 text-sm">
                      <span className="text-slate-500">Member: </span>
                      <Link
                        to={`/staff/members/${r.member.id}`}
                        className="font-medium text-brand-400 hover:text-brand-300"
                      >
                        {r.member.name} ({r.member.tvId})
                      </Link>
                      {" · "}
                      <Link
                        to={`/m/${r.member.slug}`}
                        className="text-slate-400 hover:text-white"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Public profile
                      </Link>
                    </p>
                  </div>
                  {r.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void setStatus(r.id, "APPROVED")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void setStatus(r.id, "REJECTED")}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="mt-8 text-slate-500">No reviews yet.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

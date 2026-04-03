import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiGetMember, apiSendMember } from "../lib/api";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string;
  businessReply: string | null;
  businessRepliedAt: string | null;
};

export function MemberReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGetMember<{ reviews: ReviewRow[] }>("/api/member/portal/reviews")
      .then((d) => setRows(d.reviews))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveReply = async (reviewId: string) => {
    const text = (replyDraft[reviewId] ?? "").trim();
    if (!text) return;
    setSavingId(reviewId);
    setError(null);
    try {
      await apiSendMember(`/api/member/portal/reviews/${reviewId}/reply`, {
        method: "PUT",
        body: JSON.stringify({ reply: text }),
      });
      setReplyDraft({});
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading reviews…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Customer reviews</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">
        Published reviews from your public profile. You can post a professional
        reply — it appears under the customer&apos;s review for everyone to see.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
      <ul className="mt-8 space-y-8">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs text-slate-500">
              {new Date(r.createdAt).toLocaleString("en-GB")} · {r.authorName}{" "}
              · {r.rating}/5
            </p>
            {r.title ? (
              <p className="mt-2 font-semibold text-slate-900">{r.title}</p>
            ) : null}
            <p className="mt-2 text-sm text-slate-700">{r.body}</p>
            {r.businessReply ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-slate-800">
                <p className="text-xs font-semibold uppercase text-emerald-800">
                  Your reply
                  {r.businessRepliedAt
                    ? ` · ${new Date(r.businessRepliedAt).toLocaleDateString("en-GB")}`
                    : null}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{r.businessReply}</p>
              </div>
            ) : null}
            <form
              className="mt-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void saveReply(r.id);
              }}
            >
              <label className="text-xs font-medium text-slate-600">
                {r.businessReply ? "Update reply" : "Reply publicly"}
              </label>
              <textarea
                value={
                  replyDraft[r.id] !== undefined
                    ? replyDraft[r.id]
                    : (r.businessReply ?? "")
                }
                onChange={(e) =>
                  setReplyDraft((d) => ({ ...d, [r.id]: e.target.value }))
                }
                placeholder="Thank the customer and add any context…"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={savingId === r.id}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingId === r.id ? "Saving…" : "Save reply"}
              </button>
            </form>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No published reviews yet. When customers leave feedback on your public
          profile and staff approve it, it will show here.
        </p>
      ) : null}
    </div>
  );
}

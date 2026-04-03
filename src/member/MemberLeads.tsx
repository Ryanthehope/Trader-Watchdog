import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetMember, apiSendMember } from "../lib/api";

type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  jobPostcode?: string | null;
  jobTradeCategory?: string | null;
  createdAt: string;
};

export function MemberLeads() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGetMember<{ inquiries: Inquiry[] }>("/api/member/portal/inquiries")
      .then((d) => setRows(d.inquiries))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, status: string) => {
    try {
      const d = await apiSendMember<{ inquiry: Inquiry }>(
        `/api/member/portal/inquiries/${id}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      setRows((r) => r.map((x) => (x.id === id ? d.inquiry : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    try {
      await apiSendMember(
        `/api/member/portal/inquiries/${encodeURIComponent(id)}/delete`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Leads & enquiries</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">
        Contact enquiries from your public profile and posted jobs that match
        your trade category (homeowners choose the type of work on the post-a-job
        page).
      </p>
      <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm text-emerald-950 shadow-sm">
        <span>
          Show when you&apos;re free on your{" "}
          <Link
            to="/member/availability"
            className="font-semibold text-emerald-900 underline decoration-2 underline-offset-2 hover:text-emerald-950"
          >
            availability calendar
          </Link>{" "}
          — it appears on your public profile alongside these leads.
        </span>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-200/90 text-xs font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th className="px-4 py-3.5">When</th>
              <th className="px-4 py-3.5">Contact</th>
              <th className="px-4 py-3.5">Job / message</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {new Date(l.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{l.name}</p>
                  <p className="text-xs text-slate-500">
                    {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </td>
                <td className="max-w-md px-4 py-3 text-slate-700">
                  {l.source === "job_post" ? (
                    <div className="space-y-1.5">
                      <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                        Posted job
                      </span>
                      {l.jobTitle ? (
                        <p className="font-medium text-slate-900">{l.jobTitle}</p>
                      ) : null}
                      {l.jobPostcode ? (
                        <p className="text-xs text-slate-500">{l.jobPostcode}</p>
                      ) : null}
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm">
                        {l.jobDescription?.trim() ||
                          l.notes?.replace(/^\[[^\]]+\]\s*/, "").trim() ||
                          "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="line-clamp-4 whitespace-pre-wrap">
                      {l.notes?.replace(/^\[[^\]]+\]\s*/, "") ?? "—"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onChange={(e) => void patch(l.id, e.target.value)}
                    className="min-w-[10.5rem] cursor-pointer rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    style={{ colorScheme: "light" }}
                  >
                    {["NEW", "CONTACTED", "WON", "LOST", "ARCHIVED"].map(
                      (s) => (
                        <option
                          key={s}
                          value={s}
                          className="bg-white py-1 text-slate-900"
                        >
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(l.id)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No enquiries yet. Share your profile link so homeowners can reach you.
        </p>
      ) : null}
    </div>
  );
}

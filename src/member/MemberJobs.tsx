import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiGetMember, apiSendMember } from "../lib/api";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  leadId: string | null;
  quoteId: string | null;
  scheduledAt: string | null;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  } | null;
};

type InquiryOpt = { id: string; name: string; notes: string | null };

export function MemberJobs() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leadId, setLeadId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGetMember<{ jobs: JobRow[] }>("/api/member/portal/jobs"),
      apiGetMember<{ inquiries: { id: string; name: string; notes: string | null }[] }>(
        "/api/member/portal/inquiries"
      ),
    ])
      .then(([j, i]) => {
        setRows(j.jobs);
        setInquiries(i.inquiries);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiSendMember("/api/member/portal/jobs", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          leadId: leadId || undefined,
        }),
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setLeadId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiSendMember(`/api/member/portal/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    try {
      await apiSendMember(`/api/member/portal/jobs/${id}`, { method: "DELETE" });
      load();
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track work in progress. Optionally link a job to a lead from your
            profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {open ? "Cancel" : "New job"}
        </button>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
      {open ? (
        <form
          onSubmit={create}
          className="mt-6 max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input
            required
            placeholder="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="block text-xs text-slate-600">
            Link to lead (optional)
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {inquiries.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Create job
          </button>
        </form>
      ) : null}
      <ul className="mt-8 space-y-3">
        {rows.map((j) => (
          <li
            key={j.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{j.title}</p>
                {j.description ? (
                  <p className="mt-1 text-sm text-slate-600">{j.description}</p>
                ) : null}
                {j.lead ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Lead: {j.lead.name}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={j.status}
                  onChange={(e) => void updateStatus(j.id, e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  {["open", "in_progress", "done", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void remove(j.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !open ? (
        <p className="mt-8 text-sm text-slate-500">No jobs yet.</p>
      ) : null}
    </div>
  );
}

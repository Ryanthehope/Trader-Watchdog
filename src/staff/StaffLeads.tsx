import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  jobTitle: string | null;
  jobDescription: string | null;
  jobPostcode: string | null;
  createdAt: string;
  member: {
    id: string;
    name: string;
    tvId: string;
    slug: string;
  } | null;
};

export function StaffLeads() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");

  const load = () => {
    setLoading(true);
    apiGetAuth<{ leads: Lead[] }>("/api/admin/leads")
      .then((d) => setRows(d.leads))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const d = await apiSend<{ lead: Lead }>("/api/admin/leads", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          source,
          notes: notes || null,
        }),
      });
      setRows((r) => [d.lead, ...r]);
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    try {
      const d = await apiSend<{ lead: Lead }>(`/api/admin/leads/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: row.name,
          email: row.email,
          phone: row.phone,
          source: row.source,
          status,
          notes: row.notes,
          jobTitle: row.jobTitle,
          jobDescription: row.jobDescription,
          jobPostcode: row.jobPostcode,
        }),
      });
      setRows((r) => r.map((x) => (x.id === id ? d.lead : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete lead?")) return;
    try {
      await apiSend(`/api/admin/leads/${encodeURIComponent(id)}/delete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Leads</h1>
      <p className="mt-2 text-sm text-slate-400">Inbound and manual prospects.</p>

      <form
        onSubmit={add}
        className="mt-8 grid max-w-2xl gap-3 rounded-2xl border border-white/10 bg-ink-900/40 p-5 sm:grid-cols-2"
      >
        <input
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white sm:col-span-2"
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
        />
        <input
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
        />
        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white sm:col-span-2"
          rows={2}
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
        >
          Add lead
        </button>
      </form>

      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-ink-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name / job</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-white">
                    <span className="font-medium">{l.name}</span>
                    {l.jobTitle ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {l.jobTitle}
                        {l.jobPostcode ? ` · ${l.jobPostcode}` : ""}
                        {l.source === "job_post" ? (
                          <span className="ml-1 rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-200">
                            Job post
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {l.member ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Listing:{" "}
                        <Link
                          to={`/m/${l.member.slug}`}
                          className="text-brand-300 hover:text-brand-200 hover:underline"
                        >
                          {l.member.name} ({l.member.tvId})
                        </Link>
                      </p>
                    ) : null}
                    {l.source === "member_inquiry" && !l.jobTitle ? (
                      <span className="mt-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
                        Profile contact
                      </span>
                    ) : null}
                    {l.jobDescription ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {l.jobDescription}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1 text-xs text-white"
                    >
                      {(
                        ["NEW", "CONTACTED", "WON", "LOST"].includes(l.status)
                          ? ["NEW", "CONTACTED", "WON", "LOST"]
                          : [l.status, "NEW", "CONTACTED", "WON", "LOST"]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

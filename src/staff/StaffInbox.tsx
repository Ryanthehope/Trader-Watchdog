import { FormEvent, useEffect, useState } from "react";
import { apiGetAuth, apiSend } from "../lib/api";

type Msg = {
  id: string;
  subject: string;
  body: string;
  fromEmail: string | null;
  fromName: string | null;
  read: boolean;
  createdAt: string;
};

export function StaffInbox() {
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const load = () => {
    setLoading(true);
    apiGetAuth<{ messages: Msg[] }>("/api/admin/inbox")
      .then((d) => setRows(d.messages))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    try {
      const d = await apiSend<{ message: Msg }>("/api/admin/inbox", {
        method: "POST",
        body: JSON.stringify({
          subject,
          body,
          fromName: fromName || null,
          fromEmail: fromEmail || null,
        }),
      });
      setRows((r) => [d.message, ...r]);
      setSubject("");
      setBody("");
      setFromName("");
      setFromEmail("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggleRead = async (m: Msg) => {
    try {
      const d = await apiSend<{ message: Msg }>(`/api/admin/inbox/${m.id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: !m.read }),
      });
      setRows((r) => r.map((x) => (x.id === m.id ? d.message : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete message?")) return;
    try {
      await apiSend(`/api/admin/inbox/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Inbox</h1>
      <p className="mt-2 text-sm text-slate-400">
        Log homeowner or partner messages. Mark read when handled.
      </p>

      <form
        onSubmit={add}
        className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-ink-900/40 p-5"
      >
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          required
        />
        <textarea
          placeholder="Message body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          required
        />
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="From name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            className="flex-1 min-w-[140px] rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          />
          <input
            placeholder="From email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="flex-1 min-w-[140px] rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Log message
        </button>
      </form>

      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border px-4 py-3 ${
                m.read
                  ? "border-white/5 bg-ink-950/40"
                  : "border-brand-500/30 bg-brand-950/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{m.subject}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                    {m.fromName || m.fromEmail
                      ? ` · ${[m.fromName, m.fromEmail].filter(Boolean).join(" ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRead(m)}
                    className="text-xs text-brand-300 hover:text-brand-200"
                  >
                    {m.read ? "Mark unread" : "Mark read"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="text-xs text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                {m.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

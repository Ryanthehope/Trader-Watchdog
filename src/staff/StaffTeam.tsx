import { FormEvent, useEffect, useState } from "react";
import { apiGetAuth, apiSend } from "../lib/api";
import { useStaffAuth } from "./StaffAuthContext";

type Row = { id: string; email: string; name: string | null; createdAt: string };

export function StaffTeam() {
  const { staff: me } = useStaffAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const load = () => {
    setLoading(true);
    apiGetAuth<{ staff: Row[] }>("/api/admin/staff-accounts")
      .then((d) => setRows(d.staff))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      alert("Email and password (min 8 chars) required");
      return;
    }
    try {
      const d = await apiSend<{ staff: Row }>("/api/admin/staff-accounts", {
        method: "POST",
        body: JSON.stringify({ email, password, name: name || null }),
      });
      setRows((r) => [...r, d.staff].sort((a, b) => a.email.localeCompare(b.email)));
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this staff account? They will not be able to sign in."))
      return;
    try {
      await apiSend(`/api/admin/staff-accounts/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Staff</h1>
      <p className="mt-2 text-sm text-slate-400">
        Team accounts for this console. You are signed in as{" "}
        <span className="text-slate-300">{me?.email}</span>.
      </p>

      <form
        onSubmit={add}
        className="mt-8 max-w-md space-y-3 rounded-2xl border border-white/10 bg-ink-900/40 p-5"
      >
        <p className="text-sm font-medium text-slate-300">Add staff user</p>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          required
        />
        <input
          placeholder="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
          required
        />
        <input
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Create account
        </button>
      </form>

      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {rows.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/30 px-4 py-3"
            >
              <div>
                <p className="text-white">{s.email}</p>
                {s.name ? (
                  <p className="text-xs text-slate-500">{s.name}</p>
                ) : null}
                {s.id === me?.id ? (
                  <p className="text-xs text-brand-400">You</p>
                ) : null}
              </div>
              {s.id !== me?.id ? (
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

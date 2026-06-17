import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "../components/PasswordInput";
import { apiGetAuth, apiSend } from "../lib/api";

type StaffRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

export function StaffAccounts() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit / reset password
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGetAuth<{ staff: StaffRow[] }>("/api/admin/staff")
      .then((d) => setRows(d.staff))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateBusy(true);
    try {
      const d = await apiSend<{ staff: StaffRow }>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ name: createName, email: createEmail, password: createPassword }),
      });
      setRows((r) => [...r, d.staff]);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreateBusy(false);
    }
  };

  const startEdit = (row: StaffRow) => {
    setEditingId(row.id);
    setEditName(row.name ?? "");
    setEditEmail(row.email);
    setEditPassword("");
    setEditError(null);
  };

  const onEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    setEditBusy(true);
    try {
      const bodyObj: Record<string, string> = { name: editName, email: editEmail };
      if (editPassword) bodyObj.password = editPassword;
      const d = await apiSend<{ staff: StaffRow }>(`/api/admin/staff/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(bodyObj),
      });
      setRows((r) => r.map((x) => (x.id === editingId ? d.staff : x)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditBusy(false);
    }
  };

  const remove = async (id: string, name: string | null) => {
    if (!confirm(`Delete staff account for ${name ?? "this user"}? They will no longer be able to log in.`)) return;
    setDeletingId(id);
    try {
      await apiSend(`/api/admin/staff/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Staff accounts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage who can log in to the staff portal.
          </p>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Add staff member
          </button>
        )}
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
        >
          <h2 className="mb-4 text-base font-semibold text-white">New staff member</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Full name</label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">Password (min 8 characters)</label>
              <PasswordInput
                required
                minLength={8}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
          </div>
          {createError && (
            <p className="mt-3 text-sm text-red-400">{createError}</p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={createBusy}
              className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
            >
              {createBusy ? "Creating…" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-white/12 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-400">{error}</p>
      ) : (
        <div className="mt-6 divide-y divide-white/8 rounded-2xl border border-white/10 bg-white/[0.03]">
          {rows.length === 0 && (
            <p className="px-6 py-6 text-sm text-slate-500">No staff accounts found.</p>
          )}
          {rows.map((row) => (
            <div key={row.id} className="px-6 py-5">
              {editingId === row.id ? (
                <form onSubmit={(e) => void onEdit(e)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Full name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        New password <span className="text-slate-500">(leave blank to keep current)</span>
                      </label>
                      <PasswordInput
                        minLength={8}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25"
                      />
                    </div>
                  </div>
                  {editError && <p className="text-sm text-red-400">{editError}</p>}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={editBusy}
                      className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                    >
                      {editBusy ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-white/12 px-4 py-2 text-sm text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{row.name ?? "(no name)"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === row.id}
                      onClick={() => void remove(row.id, row.name)}
                      className="rounded-lg border border-red-500/25 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deletingId === row.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

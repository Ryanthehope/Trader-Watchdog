import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiGetAuthBlob, apiSend } from "../lib/api";

type AppDoc = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type VettingSectionId =
  | "address"
  | "insurance"
  | "tradeCredentials"
  | "digitalFootprint"
  | "publicRecords"
  | "applicationDocuments";

type VettingSectionState = { done: boolean; notes: string };

type VettingStateMap = Record<VettingSectionId, VettingSectionState>;

type CreatedMemberRef = {
  id: string;
  slug: string;
  tvId: string;
  membershipBillingType?: string | null;
  membershipExpiresAt?: string | null;
  stripeSubscriptionStatus?: string | null;
};

type AppRow = {
  id: string;
  company: string;
  trade: string;
  email: string;
  postcode: string;
  status: string;
  notes: string | null;
  vettingChecklist: string | null;
  vettingState?: VettingStateMap | null;
  approvedAt: string | null;
  fastTrackPaidAt: string | null;
  membershipSubscribed: boolean;
  manualMembershipExpiresAt?: string | null;
  createdAt: string;
  documents: AppDoc[];
  createdMember: CreatedMemberRef | null;
  createdMemberId?: string | null;
};

type MemberProvisioned =
  | {
      temporaryPassword?: string;
      member: CreatedMemberRef;
      alreadyProvisioned?: boolean;
    }
  | undefined;

const SECTIONS: {
  id: VettingSectionId;
  label: string;
  hint: string;
}[] = [
  {
    id: "address",
    label: "Address & operating area",
    hint: "Confirmed operating address matches application; not a PO box-only shell.",
  },
  {
    id: "insurance",
    label: "Insurance & accreditations",
    hint: "PL (or relevant) cover and claimed registers (Gas Safe, NICEIC, etc.) checked.",
  },
  {
    id: "tradeCredentials",
    label: "Trade credentials",
    hint: "Qualifications and registrations align with work they advertise.",
  },
  {
    id: "digitalFootprint",
    label: "Digital footprint",
    hint: "Website, listings, and reviews look consistent with a real business.",
  },
  {
    id: "publicRecords",
    label: "Contact & public records",
    hint: "Phone and company identifiers checked; no major red flags in available records.",
  },
  {
    id: "applicationDocuments",
    label: "Documents supplied",
    hint: "Uploads reviewed (certificates, insurance, ID) and match what they claim.",
  },
];

const STATUSES = [
  "PENDING",
  "REVIEWING",
  "CONTACTED",
  "APPROVED",
  "DECLINED",
] as const;

function cleanText(s: string | null | undefined): string {
  if (s == null) return "";
  const t = String(s).trim();
  if (t === "null" || t === "undefined" || t === '"null"' || t === "'null'")
    return "";
  return t;
}

/** Consistent controls: soft border, inset highlight, brand focus ring (no harsh white outlines). */
const staffControl =
  "rounded-xl border border-white/12 bg-ink-950/90 text-sm text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] outline-none placeholder:text-slate-500 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25 focus:ring-offset-0";
const staffTextareaNotes = `${staffControl} min-h-[5.25rem] w-full resize-y px-3.5 py-2.5 leading-relaxed`;
const staffTextareaInternal = `${staffControl} min-h-[6.5rem] w-full resize-y px-3.5 py-3 leading-relaxed`;
const staffSelect = `${staffControl} cursor-pointer px-3.5 py-2.5 pr-10`;

function defaultManualMembershipExpiryDate(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultVettingState(): VettingStateMap {
  const o = {} as VettingStateMap;
  for (const { id } of SECTIONS) {
    o[id] = { done: false, notes: "" };
  }
  return o;
}

function parseVettingState(row: AppRow): VettingStateMap {
  const base = defaultVettingState();
  const raw = row.vettingState;
  if (!raw || typeof raw !== "object") return base;
  for (const { id } of SECTIONS) {
    const v = (raw as Record<string, unknown>)[id];
    if (v && typeof v === "object" && v !== null) {
      const r = v as Record<string, unknown>;
      base[id] = {
        done: Boolean(r.done),
        notes: cleanText(String(r.notes ?? "")),
      };
    }
  }
  return base;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function openApplicationDocument(appId: string, doc: AppDoc) {
  const blob = await apiGetAuthBlob(
    `/api/admin/applications/${appId}/documents/${doc.id}/file`
  );
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function StaffApplications() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => {
      const blob = [
        a.company,
        a.trade,
        a.email,
        a.postcode,
        a.status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, searchQuery]);

  const load = () => {
    setLoading(true);
    apiGetAuth<{ applications: AppRow[] }>("/api/admin/applications")
      .then((d) =>
        setRows(
          d.applications.map((a) => ({
            ...a,
            documents: a.documents ?? [],
            createdMember: a.createdMember ?? null,
          }))
        )
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (
    id: string,
    status: string,
    notes: string,
    vettingState: VettingStateMap
  ): Promise<MemberProvisioned> => {
    const d = await apiSend<{
      application: AppRow;
      memberProvisioned: MemberProvisioned;
    }>(`/api/admin/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        notes: notes.trim() || null,
        vettingState,
      }),
    });
    setRows((r) =>
      r.map((x) =>
        x.id === id
          ? {
              ...d.application,
              documents: d.application.documents ?? [],
              createdMember: d.application.createdMember ?? null,
            }
          : x
      )
    );
    return d.memberProvisioned;
  };

  const removeApp = async (id: string) => {
    if (
      !confirm(
        "Delete this application and all uploaded files? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      await apiSend(`/api/admin/applications/${id}/delete`, {
        method: "POST",
      });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Applications
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
        Each row is collapsed by default — expand one to open the vetting checklist,
        files, and actions. Use the checklist below for each application. Mark{" "}
        <strong className="text-slate-300">Done</strong> per section and add brief notes.
        <strong className="text-emerald-300/90"> Approve application</strong> marks them
        ready to pay; their public listing and portal are created{" "}
        <strong className="text-slate-300">after</strong> they complete checkout (or use{" "}
        <strong className="text-slate-300">Create member profile</strong> if the Stripe
        webhook failed). For bank transfer / invoice / cash, use{" "}
        <strong className="text-slate-300">Record … (manual)</strong> on an approved
        application — manual membership requires an{" "}
        <strong className="text-slate-300">expiry date</strong> (portal access ends after
        that). Copy the one-time portal password from the banner when it appears.
      </p>

      {error ? <p className="mt-6 text-red-300">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate-500">No applications yet.</p>
      ) : (
        <>
          <div className="mt-6 max-w-xl">
            <label htmlFor="applications-search" className="sr-only">
              Search applications
            </label>
            <input
              id="applications-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, email, trade, postcode, status…"
              className={`${staffControl} w-full px-3.5 py-2.5`}
              autoComplete="off"
            />
            {searchQuery.trim() ? (
              <p className="mt-2 text-xs text-slate-500">
                {filteredRows.length === 0
                  ? "No matches"
                  : `${filteredRows.length} of ${rows.length} shown`}
              </p>
            ) : null}
          </div>

          {filteredRows.length === 0 ? (
            <p className="mt-8 text-slate-500">
              No applications match your search.
            </p>
          ) : (
            <div className="mt-8 space-y-8">
              {filteredRows.map((a) => (
                <ApplicationCard
                  key={a.id}
                  row={a}
                  onSave={patch}
                  onDelete={removeApp}
                  reload={load}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ApplicationCard({
  row,
  onSave,
  onDelete,
  reload,
}: {
  row: AppRow;
  onSave: (
    id: string,
    status: string,
    notes: string,
    vettingState: VettingStateMap
  ) => Promise<MemberProvisioned>;
  onDelete: (id: string) => void;
  reload: () => void;
}) {
  const [status, setStatus] = useState(row.status);
  const [notes, setNotes] = useState(cleanText(row.notes));
  const [vetting, setVetting] = useState<VettingStateMap>(() =>
    parseVettingState(row)
  );
  const [saving, setSaving] = useState(false);
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [manualPaymentBusy, setManualPaymentBusy] = useState<
    "fast_track" | "membership" | null
  >(null);
  const [provisionFlash, setProvisionFlash] = useState<{
    password?: string;
    member: CreatedMemberRef;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const vettingStateKey =
    row.vettingState == null ? "" : JSON.stringify(row.vettingState);

  useEffect(() => {
    setStatus(row.status);
    setNotes(cleanText(row.notes));
    setVetting(parseVettingState(row));
  }, [row.id, row.status, row.notes, vettingStateKey, row.createdMember?.id]);

  useEffect(() => {
    if (provisionFlash?.password) setExpanded(true);
  }, [provisionFlash?.password]);

  const docs = row.documents ?? [];
  const linked = row.createdMember ?? null;
  const hasPayment =
    Boolean(row.fastTrackPaidAt) || Boolean(row.membershipSubscribed);
  const awaitingPaymentAfterApproval =
    row.status === "APPROVED" && !linked && !hasPayment;
  const paidAwaitingProfile =
    row.status === "APPROVED" && hasPayment && !linked;
  const allDone = SECTIONS.every((s) => vetting[s.id]?.done);
  const sectionsDoneCount = SECTIONS.filter((s) => vetting[s.id]?.done).length;

  const save = async (nextStatus?: string) => {
    setSaving(true);
    setProvisionFlash(null);
    try {
      const st = nextStatus ?? status;
      const mp = await onSave(row.id, st, notes, vetting);
      if (mp?.temporaryPassword && mp.member) {
        setProvisionFlash({ password: mp.temporaryPassword, member: mp.member });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!allDone) {
      if (
        !confirm(
          "Not every vetting section is marked verified. Approve anyway and create the member profile?"
        )
      ) {
        return;
      }
    }
    setStatus("APPROVED");
    await save("APPROVED");
  };

  const recordManualPayment = async (type: "fast_track" | "membership") => {
    let membershipExpiresAt: string | undefined;
    if (type === "membership") {
      const suggested = defaultManualMembershipExpiryDate();
      const entered = window.prompt(
        `Manual membership — access until (YYYY-MM-DD).\nSuggested one year: ${suggested}`,
        suggested
      );
      if (entered == null) return;
      const trimmed = entered.trim();
      if (!trimmed) {
        alert("Expiry date is required for manual membership.");
        return;
      }
      membershipExpiresAt = trimmed;
    }
    const label =
      type === "fast_track"
        ? "fast-track (£40) was received outside Stripe"
        : `£15/month membership was arranged outside Stripe (until ${membershipExpiresAt})`;
    if (
      !confirm(
        `Record that ${label}? This marks payment on the application and creates the member profile when eligible (same as a successful card payment).`
      )
    ) {
      return;
    }
    setManualPaymentBusy(type);
    setProvisionFlash(null);
    try {
      const d = await apiSend<{
        memberProvisioned: MemberProvisioned;
        application?: AppRow;
      }>(`/api/admin/applications/${row.id}/record-manual-payment`, {
        method: "POST",
        body: JSON.stringify({
          type,
          ...(membershipExpiresAt ? { membershipExpiresAt } : {}),
        }),
      });
      if (d.memberProvisioned?.temporaryPassword && d.memberProvisioned.member) {
        setProvisionFlash({
          password: d.memberProvisioned.temporaryPassword,
          member: d.memberProvisioned.member,
        });
      } else if (d.memberProvisioned?.member) {
        setProvisionFlash({ member: d.memberProvisioned.member });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not record payment");
    } finally {
      setManualPaymentBusy(null);
      reload();
    }
  };

  const extendManualMembershipExpiry = async () => {
    const current =
      row.manualMembershipExpiresAt?.slice(0, 10) ??
      defaultManualMembershipExpiryDate();
    const entered = window.prompt(
      "New manual membership expiry (YYYY-MM-DD)",
      current
    );
    if (entered == null) return;
    const trimmed = entered.trim();
    if (!trimmed) {
      alert("Expiry date is required.");
      return;
    }
    if (
      !confirm(
        `Update manual membership to run until ${trimmed}? This updates the linked member portal access.`
      )
    ) {
      return;
    }
    setManualPaymentBusy("membership");
    setProvisionFlash(null);
    try {
      const d = await apiSend<{
        memberProvisioned: MemberProvisioned;
        application?: AppRow;
      }>(`/api/admin/applications/${row.id}/record-manual-payment`, {
        method: "POST",
        body: JSON.stringify({ type: "membership", membershipExpiresAt: trimmed }),
      });
      if (d.memberProvisioned?.member) {
        setProvisionFlash({ member: d.memberProvisioned.member });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not update expiry");
    } finally {
      setManualPaymentBusy(null);
      reload();
    }
  };

  const provisionMember = async () => {
    setProvisionBusy(true);
    setProvisionFlash(null);
    try {
      const d = await apiSend<{
        memberProvisioned: MemberProvisioned;
        application?: AppRow;
      }>(`/api/admin/applications/${row.id}/provision-member`, {
        method: "POST",
      });
      if (d.memberProvisioned?.temporaryPassword && d.memberProvisioned.member) {
        setProvisionFlash({
          password: d.memberProvisioned.temporaryPassword,
          member: d.memberProvisioned.member,
        });
      } else if (d.memberProvisioned?.member) {
        setProvisionFlash({ member: d.memberProvisioned.member });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create profile");
    } finally {
      setProvisionBusy(false);
      reload();
    }
  };

  const updateSection = (
    id: VettingSectionId,
    patch: Partial<VettingSectionState>
  ) => {
    setVetting((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const summaryId = `app-card-${row.id}`;
  const panelId = `app-panel-${row.id}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-ink-900/85 to-ink-950 shadow-xl shadow-black/25 ring-1 ring-white/[0.03]">
      <button
        type="button"
        id={summaryId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 border-b border-white/10 bg-ink-900/60 px-5 py-4 text-left transition hover:bg-ink-900/80 sm:gap-4 sm:px-6"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-white">
            {row.company}
          </p>
          <p className="mt-1 truncate text-sm text-slate-400">
            {row.trade} · {row.email} · {row.postcode}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Applied {new Date(row.createdAt).toLocaleString()}
          </p>
          {(awaitingPaymentAfterApproval || paidAwaitingProfile) && !expanded ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {awaitingPaymentAfterApproval ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                  Awaiting payment
                </span>
              ) : null}
              {paidAwaitingProfile ? (
                <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-medium text-brand-200">
                  Paid — no profile
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-200">
            {status}
          </span>
          <span
            className="text-xs tabular-nums text-slate-500"
            title="Vetting sections marked done"
          >
            {sectionsDoneCount}/{SECTIONS.length} checklist
          </span>
          <svg
            className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded ? (
        <div id={panelId} role="region" aria-labelledby={summaryId}>
      <div className="border-b border-white/10 bg-ink-900/60 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-white">
              {row.company}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {row.trade} · {row.email} · {row.postcode}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Applied {new Date(row.createdAt).toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {awaitingPaymentAfterApproval ? (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-1 font-medium text-amber-200">
                  Awaiting applicant payment
                </span>
              ) : null}
              {paidAwaitingProfile ? (
                <span className="rounded-full bg-brand-500/20 px-2.5 py-1 font-medium text-brand-200">
                  Paid — profile not created yet
                </span>
              ) : null}
              {row.fastTrackPaidAt ? (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-1 font-medium text-amber-200">
                  Fast-track paid
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-500">
                  No fast-track
                </span>
              )}
              {row.membershipSubscribed ? (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-medium text-emerald-200">
                  £15/mo subscribed
                  {row.manualMembershipExpiresAt
                    ? ` · manual until ${row.manualMembershipExpiresAt.slice(0, 10)}`
                    : linked?.membershipBillingType === "stripe"
                      ? " · Stripe"
                      : ""}
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-500">
                  No subscription
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={Boolean(linked)}
              className={`${staffSelect} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || Boolean(linked)}
              onClick={() => void save()}
              className="rounded-xl border border-white/14 bg-white/[0.06] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save progress"}
            </button>
            {!linked ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void approve()}
                className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "APPROVED"
                  ? "Save approval again"
                  : "Approve application"}
              </button>
            ) : null}
            {paidAwaitingProfile ? (
              <button
                type="button"
                disabled={provisionBusy}
                onClick={() => void provisionMember()}
                className="rounded-xl border border-brand-500/40 bg-brand-500/15 px-3.5 py-2.5 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/25 disabled:opacity-50"
              >
                {provisionBusy ? "Creating…" : "Create member profile"}
              </button>
            ) : null}
            {row.status === "APPROVED" && !linked ? (
              <>
                {!row.fastTrackPaidAt ? (
                  <button
                    type="button"
                    disabled={manualPaymentBusy !== null || provisionBusy}
                    onClick={() => void recordManualPayment("fast_track")}
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-sm font-medium text-amber-100/95 transition hover:bg-amber-500/16 disabled:opacity-50"
                  >
                    {manualPaymentBusy === "fast_track"
                      ? "Saving…"
                      : "Record fast-track (manual)"}
                  </button>
                ) : null}
                {!row.membershipSubscribed ? (
                  <button
                    type="button"
                    disabled={manualPaymentBusy !== null || provisionBusy}
                    onClick={() => void recordManualPayment("membership")}
                    className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-100/95 transition hover:bg-emerald-500/16 disabled:opacity-50"
                  >
                    {manualPaymentBusy === "membership"
                      ? "Saving…"
                      : "Record membership (manual)"}
                  </button>
                ) : null}
              </>
            ) : null}
            {row.status === "APPROVED" &&
            linked &&
            row.membershipSubscribed &&
            row.manualMembershipExpiresAt &&
            linked.membershipBillingType !== "stripe" ? (
              <button
                type="button"
                disabled={manualPaymentBusy !== null || provisionBusy}
                onClick={() => void extendManualMembershipExpiry()}
                className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-100/95 transition hover:bg-emerald-500/16 disabled:opacity-50"
              >
                {manualPaymentBusy === "membership"
                  ? "Saving…"
                  : "Update manual expiry"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onDelete(row.id)}
              className="rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-200/95 transition hover:bg-red-500/18"
            >
              Delete
            </button>
          </div>
        </div>

        {linked ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/95">
            <p className="font-medium text-emerald-200">Member profile is live</p>
            <p className="mt-1 text-emerald-100/80">
              Public ID <span className="font-mono text-white">{linked.tvId}</span> · slug{" "}
              <span className="font-mono text-white">{linked.slug}</span>
            </p>
            <Link
              to={`/staff/members/${linked.id}`}
              className="mt-2 inline-block text-sm font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Open in Members →
            </Link>
          </div>
        ) : null}

        {provisionFlash?.password ? (
          <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Portal password (show once — copy now)
            </p>
            <p className="mt-2 break-all rounded-lg bg-ink-950 px-3 py-2 font-mono text-sm text-brand-100">
              {provisionFlash.password}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Login email is the applicant’s work email:{" "}
              <span className="text-slate-300">{row.email}</span>. Ask them to change
              password after first sign-in.
            </p>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(provisionFlash.password ?? "")
              }
              className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
            >
              Copy password
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold tracking-tight text-white">
              Vetting checklist
            </h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
              Each block is a review step. Notes stay in staff only; nothing here appears on
              the public profile.
            </p>
          </div>
          <div
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/12 bg-ink-950/80 px-3.5 py-1.5 text-xs text-slate-400 sm:self-auto"
            role="status"
            aria-live="polite"
          >
            <span className="font-semibold tabular-nums text-slate-200">
              {sectionsDoneCount}
            </span>
            <span className="text-slate-600">/</span>
            <span className="tabular-nums">{SECTIONS.length}</span>
            <span className="text-slate-500">sections done</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const done = vetting[s.id]?.done ?? false;
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-4 transition-colors ${
                  done
                    ? "border-emerald-500/30 bg-emerald-950/[0.12]"
                    : "border-white/12 bg-ink-950/55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{s.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {s.hint}
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg border border-white/10 bg-ink-950/80 px-2.5 py-1.5 transition hover:border-white/15">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) =>
                        updateSection(s.id, { done: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-white/25 bg-ink-900 text-emerald-500 focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-0"
                    />
                    <span className="text-xs font-medium text-slate-300">Done</span>
                  </label>
                </div>
                <textarea
                  value={vetting[s.id]?.notes ?? ""}
                  onChange={(e) => updateSection(s.id, { notes: e.target.value })}
                  rows={2}
                  placeholder="Register refs, policy numbers, follow-ups…"
                  className={`mt-3 ${staffTextareaNotes}`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h3 className="font-display text-base font-semibold tracking-tight text-white">
            Uploaded files
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Open in a new tab. Same styling as applicant uploads on the join form.
          </p>
          {docs.length > 0 ? (
            <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/12 bg-ink-950/55">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-200">
                    {d.originalName}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-slate-500">
                      {formatBytes(d.sizeBytes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void openApplicationDocument(row.id, d)}
                      className="rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.1]"
                    >
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-ink-950/40 px-4 py-6 text-center text-sm text-slate-600">
              No documents attached to this application.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-white/12 bg-ink-950/40 p-4 sm:p-5">
          <label className="block">
            <span className="font-display text-base font-semibold tracking-tight text-white">
              Internal notes
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Team-only context — risks, phone calls, edge cases. Never shown to the
              applicant.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Spoke with owner 28/03 — insurance cert renewed next month."
              className={`mt-3 ${staffTextareaInternal}`}
            />
          </label>
        </div>
      </div>
        </div>
      ) : null}
    </div>
  );
}

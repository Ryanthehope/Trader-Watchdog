import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetMember, apiSendMember } from "../lib/api";
import { useMemberAuth } from "./MemberAuthContext";

type DayMark = { date: string; status: string };

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MemberAvailability() {
  const { member } = useMemberAuth();
  const [cursor, setCursor] = useState(() => new Date());
  const [days, setDays] = useState<DayMark[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"available" | "busy" | "clear">("available");
  const [error, setError] = useState<string | null>(null);

  const month = monthKey(cursor);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetMember<{ days: DayMark[] }>(
      `/api/member/portal/availability?month=${encodeURIComponent(month)}`
    )
      .then((d) => setDays(d.days))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of days) m.set(x.date, x.status);
    return m;
  }, [days]);

  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const lastDate = new Date(y, m + 1, 0).getDate();
    const startPad = (first.getDay() + 6) % 7;
    const cells: ({ day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= lastDate; d++) cells.push({ day: d });
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [cursor]);

  const setDay = async (dateStr: string) => {
    setError(null);
    const status = mode === "clear" ? "clear" : mode;
    try {
      await apiSendMember<{ ok: boolean }>("/api/member/portal/availability", {
        method: "PUT",
        body: JSON.stringify({ date: dateStr, status }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const label = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Availability</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Mark days you&apos;re typically <strong>available</strong> or{" "}
            <strong>busy</strong>. This appears on your{" "}
            <Link
              to={member?.slug ? `/m/${member.slug}` : "/"}
              className="font-medium text-emerald-700 hover:underline"
            >
              public profile
            </Link>{" "}
            so homeowners can see when you might take work. Use it alongside{" "}
            <Link
              to="/member/leads"
              className="font-medium text-emerald-700 hover:underline"
            >
              Leads
            </Link>{" "}
            when you follow up enquiries.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="text-slate-600">Click mode:</span>
        <select
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as "available" | "busy" | "clear")
          }
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900"
        >
          <option value="available">Mark available (green)</option>
          <option value="busy">Mark busy (red)</option>
          <option value="clear">Clear mark</option>
        </select>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-slate-900">{label}</h2>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
              onClick={() =>
                setCursor(
                  (c) => new Date(c.getFullYear(), c.getMonth() - 1, 1)
                )
              }
            >
              ‹
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
              onClick={() =>
                setCursor(
                  (c) => new Date(c.getFullYear(), c.getMonth() + 1, 1)
                )
              }
            >
              ›
            </button>
          </div>
        </div>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500">
              {weekdays.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grid.map((cell, i) => {
                if (!cell) {
                  return <div key={`e-${i}`} className="aspect-square" />;
                }
                const y = cursor.getFullYear();
                const mo = cursor.getMonth();
                const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                const st = byDate.get(dateStr);
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => void setDay(dateStr)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${
                      st === "available"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : st === "busy"
                          ? "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-slate-100 bg-slate-50/80 text-slate-700 hover:border-slate-200"
                    }`}
                  >
                    <span>{cell.day}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Busy
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

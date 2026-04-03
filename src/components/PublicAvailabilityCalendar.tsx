import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

type DayMark = { date: string; status: string };

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PublicAvailabilityCalendar({ slug }: { slug: string }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [days, setDays] = useState<DayMark[]>([]);
  const [loading, setLoading] = useState(false);

  const month = monthKey(cursor);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<{ days: DayMark[] }>(
      `/api/members/by-slug/${encodeURIComponent(slug)}/availability?month=${encodeURIComponent(month)}`
    )
      .then((d) => setDays(d.days))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [slug, month]);

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

  const label = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-white">
          Availability
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-slate-300 hover:bg-white/5"
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
            aria-label="Next month"
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-slate-300 hover:bg-white/5"
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
      <p className="mt-1 text-center text-sm text-slate-400">{label}</p>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-sm">
            {grid.map((cell, i) => {
              if (!cell) {
                return <div key={`e-${i}`} className="aspect-square" />;
              }
              const y = cursor.getFullYear();
              const mo = cursor.getMonth();
              const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
              const st = byDate.get(dateStr);
              return (
                <div
                  key={dateStr}
                  className="flex aspect-square flex-col items-center justify-center rounded-lg border border-white/5 text-slate-200"
                >
                  <span className="text-xs">{cell.day}</span>
                  {st === "available" ? (
                    <span
                      className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
                      title="Available"
                    />
                  ) : st === "busy" ? (
                    <span
                      className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-400"
                      title="Busy"
                    />
                  ) : (
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-transparent" />
                  )}
                </div>
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
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Indicative only — confirm dates directly with the business.
          </p>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth } from "../lib/api";
import { formatGBPFromCents } from "../lib/formatGBP";

type Dashboard = {
  membersTotal: number;
  membersPortalEnabled: number;
  guidesTotal: number;
  applicationsPending: number;
  reviewsPending: number;
  revenueMtdCents: number;
  outstandingCents: number;
  financialSource?: "stripe" | "fallback";
  financialError?: string | null;
  inboxUnread: number;
  activity: { at: string; label: string; href: string }[];
};

export function StaffDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAuth<Dashboard>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-500">Loading dashboard…</p>;
  }
  if (error || !data) {
    return <p className="text-red-300">{error ?? "No data"}</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Snapshot of pipeline, publishing, and outreach. Live tools: members,
        articles (guides), and verification IDs.
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Financial
        </h2>
        {data.financialError ? (
          <p className="mt-1 text-xs text-amber-400/90">
            Live totals unavailable — figures may be outdated. See Financial.
          </p>
        ) : data.financialSource !== "stripe" ? (
          <p className="mt-1 text-xs text-slate-600">
            Card payments can be connected in Integrations to keep these current.
          </p>
        ) : null}
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Link
            to="/staff/financial"
            className="block rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-brand-500/30"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Revenue (MTD)
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              {formatGBPFromCents(data.revenueMtdCents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Details in Financial</p>
          </Link>
          <Link
            to="/staff/financial"
            className="block rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-brand-500/30"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Outstanding
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              {formatGBPFromCents(data.outstandingCents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Unpaid invoices</p>
          </Link>
          <Link
            to="/staff/applications"
            className="block rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-brand-500/30"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Applications
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              {data.applicationsPending}
            </p>
            <p className="mt-1 text-xs text-slate-500">Pending review</p>
          </Link>
          <Link
            to="/staff/reviews"
            className="block rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-brand-500/30"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Reviews
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              {data.reviewsPending}
            </p>
            <p className="mt-1 text-xs text-slate-500">Awaiting moderation</p>
          </Link>
          <Link
            to="/staff/members"
            className="block rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-brand-500/30"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Active members
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              {data.membersTotal}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.membersPortalEnabled} with portal login
            </p>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Activity
        </h2>
        <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-ink-900/40">
          {data.activity.length === 0 ? (
            <li className="px-4 py-4 text-sm text-slate-400">
              No recent activity yet. Submit a join application, edit a member, or
              publish an article to see entries here.
            </li>
          ) : (
            data.activity.map((a, i) => (
              <li
                key={`${a.at}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <Link
                  to={a.href}
                  className="text-slate-200 hover:text-brand-200"
                >
                  {a.label}
                </Link>
                <time
                  className="text-xs text-slate-600"
                  dateTime={a.at}
                  title={a.at}
                >
                  {new Date(a.at).toLocaleString()}
                </time>
              </li>
            ))
          )}
          <li className="px-4 py-3 text-xs text-slate-600">
            Guides live: {data.guidesTotal}. Inbox unread:{" "}
            <Link
              to="/staff/outreach/inbox"
              className="text-brand-400 hover:text-brand-300"
            >
              {data.inboxUnread}
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Quick actions
        </h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              to="/staff/members"
              className="block rounded-2xl border border-white/10 bg-ink-900/50 p-6 transition hover:border-brand-500/30"
            >
              <h3 className="font-display font-semibold text-white">Members</h3>
              <p className="mt-2 text-sm text-slate-400">
                Verified profiles, portal access, and TradeVerify IDs.
              </p>
            </Link>
          </li>
          <li>
            <Link
              to="/staff/guides"
              className="block rounded-2xl border border-white/10 bg-ink-900/50 p-6 transition hover:border-brand-500/30"
            >
              <h3 className="font-display font-semibold text-white">
                Articles
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Advice pieces shown on the public Guides & advice section.
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

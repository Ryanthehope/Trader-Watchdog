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
      {/* Header section - dark background */}
      <div className="border-b border-slate-700/50 bg-slate-900 px-6 py-8 sm:px-10 sm:py-10">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">
          Snapshot of pipeline, publishing, and outreach. Live tools: members,
          articles (guides), and verification IDs.
        </p>
      </div>

      {/* Financial section - white background */}
      <section className="border-b border-slate-200 bg-white px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Financial
        </h2>
        {data.financialError ? (
          <p className="mt-2 text-xs text-amber-600">
            Live totals unavailable — figures may be outdated. See Financial.
          </p>
        ) : data.financialSource !== "stripe" ? (
          <p className="mt-2 text-xs text-slate-500">
            Card payments can be connected in Integrations to keep these current.
          </p>
        ) : null}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Link
            to="/staff/financial"
            className="block rounded-lg border border-slate-300/60 bg-slate-50 p-6 transition hover:border-brand-500/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Revenue (MTD)
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-900">
              {formatGBPFromCents(data.revenueMtdCents)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Details in Financial</p>
          </Link>
          <Link
            to="/staff/financial"
            className="block rounded-lg border border-slate-300/60 bg-slate-50 p-6 transition hover:border-brand-500/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Outstanding
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-900">
              {formatGBPFromCents(data.outstandingCents)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Unpaid invoices</p>
          </Link>
          <Link
            to="/staff/applications"
            className="block rounded-lg border border-slate-300/60 bg-slate-50 p-6 transition hover:border-brand-500/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Applications
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-900">
              {data.applicationsPending}
            </p>
            <p className="mt-2 text-xs text-slate-500">Pending review</p>
          </Link>
          <div className="block rounded-lg border border-slate-300/60 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Reviews
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-900">
              {data.reviewsPending}
            </p>
            <p className="mt-2 text-xs text-slate-500">Awaiting moderation</p>
          </div>
          <Link
            to="/staff/members"
            className="block rounded-lg border border-slate-300/60 bg-slate-50 p-6 transition hover:border-brand-500/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Active members
            </p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-900">
              {data.membersTotal}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {data.membersPortalEnabled} with portal login
            </p>
          </Link>
        </div>
      </section>

      {/* Activity section - dark background */}
      <section className="border-b border-slate-700/50 bg-slate-900 px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Activity
        </h2>
        <ul className="mt-6 divide-y divide-slate-700/50 rounded-lg border border-slate-700/50 bg-slate-800/40">
          {data.activity.length === 0 ? (
            <li className="px-5 py-5 text-sm text-slate-300">
              No recent activity yet. Submit a join application, edit a member, or
              publish an article to see entries here.
            </li>
          ) : (
            data.activity.map((a, i) => (
              <li
                key={`${a.at}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm"
              >
                <Link
                  to={a.href}
                  className="font-medium text-white hover:text-brand-400"
                >
                  {a.label}
                </Link>
                <time
                  className="text-xs text-slate-500"
                  dateTime={a.at}
                  title={a.at}
                >
                  {new Date(a.at).toLocaleString()}
                </time>
              </li>
            ))
          )}
          <li className="px-5 py-4 text-xs text-slate-500">
            Guides live: {data.guidesTotal}. Inbox unread:{" "}
            <span className="font-semibold text-slate-300">{data.inboxUnread}</span>.
          </li>
        </ul>
      </section>

      {/* Quick actions section - white background */}
      <section className="bg-white px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Quick actions
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          <li>
            <Link
              to="/staff/members"
              className="block rounded-lg border border-slate-300/60 bg-slate-50 p-8 transition hover:border-brand-500/50"
            >
              <h3 className="font-display text-lg font-bold text-slate-900">Members</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Verified profiles, portal access, and Trader Watchdog IDs.
              </p>
            </Link>
          </li>
          <li>
            <Link
              to="/staff/guides"
              className="block rounded-lg border border-slate-300/60 bg-slate-50 p-8 transition hover:border-brand-500/50"
            >
              <h3 className="font-display text-lg font-bold text-slate-900">
                Articles
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Advice pieces shown on the public Guides & advice section.
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

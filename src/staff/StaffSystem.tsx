import { useEffect, useState } from "react";
import { apiGetAuth } from "../lib/api";

type Info = {
  nodeVersion: string;
  uptimeSeconds: number;
  databaseUrlHint: string;
  env: string;
};

export function StaffSystem() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetAuth<Info>("/api/admin/system-info")
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!info) return <p className="text-slate-500">Loading…</p>;

  const upMin = Math.floor(info.uptimeSeconds / 60);
  const upHr = Math.floor(upMin / 60);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">System</h1>
      <p className="mt-2 text-sm text-slate-400">
        Runtime snapshot for this API process.
      </p>

      <dl className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-ink-900/40 p-6 text-sm">
        <div>
          <dt className="text-slate-500">Node</dt>
          <dd className="mt-1 font-mono text-slate-200">{info.nodeVersion}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Environment</dt>
          <dd className="mt-1 text-slate-200">{info.env}</dd>
        </div>
        <div>
          <dt className="text-slate-500">API uptime</dt>
          <dd className="mt-1 text-slate-200">
            {upHr > 0
              ? `${upHr}h ${upMin % 60}m`
              : `${upMin}m (${info.uptimeSeconds}s)`}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Database URL (masked)</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-400">
            {info.databaseUrlHint || "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

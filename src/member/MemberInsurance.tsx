import { useCallback, useEffect, useState } from "react";
import { apiGetMember } from "../lib/api";

// Type definition (same as backend)

type Insurance = {
    id: string;
    type: string;
    provider: string | null;
    policyNumber: string | null;
    expiryDate: string; // ISO string
    graceExpiryDate: string | null; // ISO string or null
    status: "active" | "expiring_soon" | "expired" | "in_grace";
    alertSent: Record<string, string> | null;
    lastAlertSent: string | null; // ISO string or null
    updatedAt: string; // ISO string
};

function daysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Status badge component

function StatusBadge({ status }: { status: Insurance["status"] }) {
    const styles = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      expiring_soon: "bg-amber-100 text-amber-700 border-amber-200",
      in_grace: "bg-orange-100 text-orange-700 border-orange-200",
      expired: "bg-red-100 text-red-700 border-red-200",
    };

    const labels = {
        active: "Active",
        expiring_soon: "Expiring Soon",
        in_grace: "In Grace Period",
        expired: "Expired",
    };

    return (
        <span className={`px-3 py-1 rounded-lg border text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
    );
}

// Days indicator

function DaysIndicator({ insurance }: { insurance: Insurance }) {
    const days = daysUntil(insurance.expiryDate);

    if (insurance.status === "expired") {
        return <span className="font-semibold text-red-600">❌ Expired {Math.abs(days)} days ago</span>;
    }

    if (insurance.status === "in_grace") {
        const graceDays = insurance.graceExpiryDate ? daysUntil(insurance.graceExpiryDate): 0;
        return <span className="font-semibold text-orange-600">⚠️ Grace: {graceDays} days left</span>;
    }

    if (days <= 30) {
        return <span className="font-semibold text-red-600">🚨 {days} days</span>;
    }
    if (days <= 60) {
        return <span className="font-semibold text-orange-600">⚠️ {days} days</span>;
    }
    if (days <= 90) {
        return <span className="font-semibold text-amber-600">⏰ {days} days</span>;
    }
  
    return <span className="font-semibold text-emerald-600">✅ {days} days</span>;
}

// Main component
export function MemberInsurance() {
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load function
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetMember<{ policies: Insurance[] }>("/api/member/portal/insurance")
      .then((d) => setPolicies(d.policies))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-white px-6 py-10 sm:px-10">
        <p className="text-slate-600">Loading your insurance policies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white px-6 py-10 sm:px-10">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="bg-white px-6 py-10 sm:px-10">
        <h2 className="text-2xl font-bold text-slate-900">My Insurance</h2>
        <p className="mt-4 text-slate-600">No insurance policies found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header section - white background */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">My Insurance</h2>
        <p className="mt-2 text-base text-slate-600">Track your policy coverage and expiry dates</p>
      </div>
      
      {/* Table section - light gray background */}
      <div className="bg-slate-50 px-6 py-10 sm:px-10 sm:py-12">
        <div className="overflow-hidden rounded-lg border border-slate-300/60 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Provider</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Policy #</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Expiry Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Days Until Expiry</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {policies.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{p.provider || "—"}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-700">{p.policyNumber || "—"}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {new Date(p.expiryDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <DaysIndicator insurance={p} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
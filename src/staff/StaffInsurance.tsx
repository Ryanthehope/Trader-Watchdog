import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetAuth, apiSend } from "../lib/api";

type Insurance = {
    id: string;
    memberId: string;
    memberName: string;
    type: string;
    provider: string | null;
    policyNumber: string | null;
    expiryDate: string;
    graceExpiryDate: string | null;
    status: "active" | "expiring_soon" | "expired" | "in_grace";
    alertsSent: {
        "90days"?: string;
        "60days"?: string;
        "30days"?: string;
        "grace"?: string;
    } | null;
    lastAlertSentAt: string | null;
    updatedAt: string;
};

type ApiResponse = {
    policies: Insurance[];
    totalCount: number;
};

const searchInputClass =   "w-full rounded-xl border border-white/12 bg-ink-950/90 px-3.5 py-2.5 text-sm text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] outline-none placeholder:text-slate-500 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/25 focus:ring-offset-0";

// Calculate days until date

function daysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    target.setHours(0, 0, 0, 0); // Normalize to midnight
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Status badge component
function StatusBadge({ status }: { status: Insurance["status"] }) {
    const styles = {
        active: "bg-green-500/20 text-green-300 border-green-500/30",
        expiring_soon: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        in_grace: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        expired: "bg-red-500/20 text-red-300 border-red-500/30",
    };

    const labels = {
        active: "Active",
        expiring_soon: "Expiring Soon",
        in_grace: "In Grace Period",
        expired: "Expired",
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}

// Days until expiry indicator
function DaysIndicator({ insurance }: { insurance: Insurance }) {
    const days = daysUntil(insurance.expiryDate);
    let color = "text-slate-400";
    let icon = "⏰";

    if (days < 0) {
        // Expired
        if (insurance.graceExpiryDate) {
            const graceDays = daysUntil(insurance.graceExpiryDate);
            if (graceDays >= 0) {
                color = "text-orange-400";
                icon = "⚠️";
                return (
                    <span className={`text-sm ${color}`}>
                        {icon} Grace: {graceDays} days left
                    </span>
                );
            }
        }
        color = "text-red-400";
        icon = "❌";
        return (
            <span className={`text-sm ${color}`}>
                {icon} Expired {Math.abs(days)} days ago
            </span>
        );
    }

    if (days <= 30) {
        color = "text-red-400";
        icon = "🚨";
    } else if (days <= 60) {
        color = "text-orange-400";
        icon = "⚠️";
    } else if (days <= 90) {
        color = "text-yellow-400";
        icon = "⏰";
    } else {
        color = "text-green-400";
        icon = "✅";
    }

    return (
        <span className={`text-sm ${color}`}>
            {icon} {days} days
        </span>
    );
}

// Alert status indicator
function AlertsIndicator({ insurance }: { insurance: Insurance }) {
  if (!insurance.alertsSent) {
    return <span className="text-xs text-slate-500">No alerts sent</span>;
  }

  const alerts = insurance.alertsSent;
  const sentCount = [alerts["90days"], alerts["60days"], alerts["30days"], alerts.grace]
    .filter(Boolean).length;

  if (sentCount === 0) {
    return <span className="text-xs text-slate-500">No alerts sent</span>;
  }

  return (
    <span className="text-xs text-brand-400">
      {sentCount} alert{sentCount > 1 ? "s" : ""} sent
    </span>
  );
}

export function StaffInsurance() {
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Filter policies by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => {
      const blob = [
        p.memberName,
        p.type,
        p.provider || "",
        p.policyNumber || "",
        p.status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [policies, query]);

  // Sort by urgency: expired first, then grace, then expiring soon, then by days
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Priority order: expired > in_grace > expiring_soon > active
      const statusOrder = { expired: 0, in_grace: 1, expiring_soon: 2, active: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Within same status, sort by days until expiry (ascending)
      return daysUntil(a.expiryDate) - daysUntil(b.expiryDate);
    });
  }, [filtered]);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGetAuth<ApiResponse>("/api/admin/insurance/all")
      .then((d) => setPolicies(d.policies))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sendAlert = async (insuranceId: string, alertType: string) => {
    if (!confirm(`Send ${alertType} alert for this policy?`)) return;
    
    setSendingAlert(insuranceId);
    try {
      await apiSend(`/api/insurance/${insuranceId}/send-alert`, {
        method: "POST",
        body: JSON.stringify({ alertType }),
      });
      alert("Alert sent successfully!");
      load(); // Reload to show updated alert status
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send alert");
    } finally {
      setSendingAlert(null);
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Insurance Policies
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track member insurance and send expiry alerts
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-red-300">{error}</p>
      ) : loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : policies.length === 0 ? (
        <p className="mt-8 text-slate-500">No insurance policies yet.</p>
      ) : (
        <>
          <div className="mt-6">
            <label htmlFor="insurance-search" className="sr-only">
              Search policies
            </label>
            <input
              id="insurance-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by member, type, provider, policy number…"
              className={searchInputClass}
            />
          </div>

          <div className="mt-4 text-sm text-slate-400">
            {sorted.length} {sorted.length === 1 ? "policy" : "policies"}
            {query && ` matching "${query}"`}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 bg-ink-950/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Expiry
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Alerts
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sorted.map((insurance) => (
                    <tr
                      key={insurance.id}
                      className="hover:bg-white/[0.02] transition"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/staff/members/${insurance.memberId}`}
                          className="font-medium text-brand-400 hover:text-brand-300"
                        >
                          {insurance.memberName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {insurance.type}
                        {insurance.policyNumber && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {insurance.policyNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {insurance.provider || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">
                          {new Date(insurance.expiryDate).toLocaleDateString('en-GB')}
                        </div>
                        <DaysIndicator insurance={insurance} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={insurance.status} />
                      </td>
                      <td className="px-4 py-3">
                        <AlertsIndicator insurance={insurance} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendAlert(insurance.id, "90days")}
                            disabled={sendingAlert === insurance.id}
                            className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
                          >
                            {sendingAlert === insurance.id ? "Sending..." : "Send Alert"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

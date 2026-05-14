import { useEffect, useState } from "react";
import { apiGetMember } from "../lib/api";

type VerificationPayload = {
  verification: {
    provider: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
    submittedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    providerApplicantId: string | null;
    providerSessionId: string | null;
    failureReason: string | null;
  };
};

function statusLabel(status: VerificationPayload["verification"]["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return "Not started";
  }
}

function statusClasses(status: VerificationPayload["verification"]["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    case "REJECTED":
      return "bg-red-100 text-red-700 ring-red-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function MemberVerification() {
  const [data, setData] = useState<VerificationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetMember<VerificationPayload>("/api/member/portal/me")
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load verification status");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 sm:p-10 text-slate-500">Loading verification…</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Verification</h1>
        <p className="mt-4 text-sm text-red-600">{error ?? "Could not load verification."}</p>
      </div>
    );
  }

  const { verification } = data;

  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Verification</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        This page shows the current verification status recorded on your Trader Watchdog account. If more identity checks are needed before launch, our team will contact you directly.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Status</span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusClasses(
              verification.status
            )}`}
          >
            {statusLabel(verification.status)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {verification.provider ?? "Trader Watchdog review"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Submitted
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {verification.submittedAt
                ? new Date(verification.submittedAt).toLocaleString()
                : "Not submitted yet"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approved
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {verification.approvedAt
                ? new Date(verification.approvedAt).toLocaleString()
                : "Not approved yet"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rejected
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {verification.rejectedAt
                ? new Date(verification.rejectedAt).toLocaleString()
                : "Not rejected"}
            </dd>
          </div>
        </dl>

        {verification.failureReason ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            <p className="font-semibold">Verification issue</p>
            <p className="mt-1">{verification.failureReason}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">What happens next</p>
          <p className="mt-1">
            If your status is still not started or in progress, keep your insurance and supporting documents up to date in the portal. Trader Watchdog will email you if anything else is needed to keep your listing live.
          </p>
        </div>
      </div>
    </div>
  );
}
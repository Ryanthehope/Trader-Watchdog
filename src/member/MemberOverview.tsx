import { useEffect, useState } from "react";
import type { VerifiedMember } from "../types/content";
import { apiGetMember, apiGetMemberBlob } from "../lib/api";
import { useMemberAuth } from "./MemberAuthContext";

type MembershipSummary = {
  accessActive: boolean;
  legacyUnlimited: boolean;
  adminUnlimited: boolean;
  billingType: string | null;
  expiresAt: string | null;
  subscriptionStatus: string | null;
};

type VerificationSummary = {
  provider: string | null;
  status: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  providerApplicantId: string | null;
  providerSessionId: string | null;
  failureReason: string | null;
};

type MemberOverviewData = {
  profile: VerifiedMember;
  publicProfileUrl: string;
  profileLive: boolean;
  membership: MembershipSummary;
  verification: VerificationSummary;
  qr: {
    eligible: boolean;
    reason: string | null;
    profileUrl: string;
    stickerDownloadUrl: string;
    smallDownloadUrl: string;
    svgDownloadUrl: string;
    stickerPixels: number;
    smallPixels: number;
  };
};

async function blobToJpeg(blob: Blob, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not render QR image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const jpg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
    if (!jpg) throw new Error("Could not create JPG file");
    return jpg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function MemberOverview() {
  const { member } = useMemberAuth();
  const [data, setData] = useState<MemberOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState<"sticker" | "small" | "svg" | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetMember<MemberOverviewData>("/api/member/portal/me")
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data?.qr.eligible) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    apiGetMemberBlob(data.qr.smallDownloadUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setQrPreviewUrl(objectUrl);
      })
      .catch(() => {
        // preview is non-critical, fail silently
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data?.qr.eligible, data?.qr.smallDownloadUrl]);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const p = data.profile;
  const profileBadgeClass = data.profileLive
    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
    : "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  const profileBadgeText = data.profileLive
    ? "Your profile is live"
    : "Your profile is not currently public";
    const membershipLabel = data.membership.accessActive
  ? "Active"
  : "Inactive";

  const membershipTone = data.membership.accessActive
  ? "text-emerald-700"
  : "text-amber-700";

  const verificationLabel =
  data.verification.status?.replace(/_/g, " ") ?? "Not started";
  const verificationStatus = data.verification.status ?? "NOT_STARTED";

  const nextAction = !data.membership.accessActive
  ? "Renew your membership to restore full portal access and public visibility."
  : verificationStatus === "REJECTED"
    ? "Your verification needs attention. Contact Trader Watchdog support."
    : verificationStatus === "IN_PROGRESS" || verificationStatus === "NOT_STARTED"
      ? "Your verification is in progress."
      : "Your account is in good standing.";

  const canDownloadQr = data.qr.eligible;
  const qr = data.qr;

  async function downloadStickerPng() {
    try {
      setQrError(null);
      setQrBusy("sticker");
      const png = await apiGetMemberBlob(qr.stickerDownloadUrl);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(png, `trader-watchdog-${tvId}-qr-75mm.png`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download sticker QR");
    } finally {
      setQrBusy(null);
    }
  }

  async function downloadSmallJpg() {
    try {
      setQrError(null);
      setQrBusy("small");
      const png = await apiGetMemberBlob(qr.smallDownloadUrl);
      const jpg = await blobToJpeg(png, qr.smallPixels, qr.smallPixels);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(jpg, `trader-watchdog-${tvId}-qr-20mm.jpg`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download small QR");
    } finally {
      setQrBusy(null);
    }
  }

  async function downloadSvg() {
    try {
      setQrError(null);
      setQrBusy("svg");
      const blob = await apiGetMemberBlob(qr.svgDownloadUrl);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(blob, `trader-watchdog-${tvId}-qr.svg`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download SVG QR");
    } finally {
      setQrBusy(null);
    }
  }

  function copyProfileUrl() {
    navigator.clipboard
      .writeText(data!.publicProfileUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // clipboard unavailable
      });
  }

  return (
    <div>
      {/* Header section - white background */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Welcome back, {member?.name ?? p.name}
            </h1>
            <p className="mt-2 text-base text-slate-600">Your Trader Watchdog membership overview</p>
          </div>
          <span
            className={`inline-flex items-center rounded-lg px-5 py-2 text-sm font-semibold ${profileBadgeClass}`}
          >
            {profileBadgeText}
          </span>
        </div>
      </div>

      {/* Profile details section - white background */}
      <div className="bg-white px-6 py-10 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              Profile summary
            </h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Trader Watchdog ID</dt>
                <dd className="font-mono font-semibold text-slate-900">{p.tvId}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Trade</dt>
                <dd className="font-semibold text-slate-900">{p.trade}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                <dt className="text-slate-600">Location</dt>
                <dd className="font-semibold text-slate-900">{p.location}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-1">
                <dt className="text-slate-600">Member since</dt>
                <dd className="font-semibold text-slate-900">{p.verifiedSince}</dd>
              </div>
            </dl>
            <a
              href={data.publicProfileUrl}
              className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              View public profile →
            </a>
            <button
              type="button"
              onClick={copyProfileUrl}
              className="mt-2 block text-xs text-slate-500 hover:text-slate-700"
            >
              {copied ? "Copied!" : "Copy profile link"}
            </button>
            <p className="mt-2 text-xs text-slate-500">QR scans point to {data.qr.profileUrl}</p>
          </div>
      <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
    Account status
  </h2>

  <dl className="mt-6 space-y-4 text-sm">
    <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
      <dt className="text-slate-600">Public profile</dt>
      <dd className={`font-semibold ${data.profileLive ? "text-emerald-700" : "text-amber-700"}`}>
        {data.profileLive ? "Live" : "Hidden"}
      </dd>
    </div>

    <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
      <dt className="text-slate-600">Membership</dt>
      <dd className={`font-semibold ${membershipTone}`}>
        {membershipLabel}
      </dd>
    </div>

    <div className="flex justify-between gap-4 pb-1">
      <dt className="text-slate-600">Verification</dt>
      <dd className="font-semibold capitalize text-slate-900">
        {verificationLabel}
      </dd>
    </div>
  </dl>

  <p className="mt-6 text-sm leading-relaxed text-slate-600">
    {nextAction}
  </p>
</div>
          <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Independent checks
              </h2>
              <span className="text-sm font-bold text-emerald-600">
                {p.checks.length}/{p.checks.length} passed
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {p.checks.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 text-sm text-slate-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-lg text-emerald-600">
                    ✓
                  </span>
                  <span className="font-medium">{c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-slate-600">
              Verification lines are maintained by Trader Watchdog staff. Contact us if
              something needs updating after a renewal.
            </p>
          </div>
                    <div className="rounded-lg border border-slate-300/60 bg-slate-50 p-8">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                        QR code downloads
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        Download your official QR assets for vans, paperwork, and digital use. Each code links directly to your public Trader Watchdog verification page.
                      </p>

                      {canDownloadQr ? (
                        <div className="mt-6 space-y-4">
                          {qrPreviewUrl ? (
                            <div className="flex justify-center">
                              <img
                                src={qrPreviewUrl}
                                alt="Your Trader Watchdog QR code"
                                className="h-36 w-36 rounded border border-slate-200"
                              />
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => void downloadStickerPng()}
                              disabled={qrBusy !== null}
                              className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {qrBusy === "sticker"
                                ? "Preparing..."
                                : `Download 75mm PNG (${data.qr.stickerPixels}px)`}
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadSmallJpg()}
                              disabled={qrBusy !== null}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {qrBusy === "small"
                                ? "Preparing..."
                                : `Download 20mm JPG (${data.qr.smallPixels}px)`}
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadSvg()}
                              disabled={qrBusy !== null}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                            >
                              {qrBusy === "svg" ? "Preparing..." : "Download SVG (resolution-independent)"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                          {data.qr.reason ?? "QR downloads are enabled after verification approval."}
                        </div>
                      )}

                      {qrError ? <p className="mt-4 text-sm text-red-600">{qrError}</p> : null}
                    </div>
        </div>
      </div>
    </div>
  );
}

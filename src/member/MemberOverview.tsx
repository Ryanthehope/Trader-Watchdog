import { useEffect, useState } from "react";
import type { VerifiedMember } from "../types/content";
import { apiGetMember, apiGetMemberBlob, apiSendMember } from "../lib/api";
import { useMemberAuth } from "./MemberAuthContext";

type MembershipSummary = {
  accessActive: boolean;
  membershipUnlimited: boolean;
  billingType: string | null;
  expiresAt: string | null;
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
  stickers: {
    originalOrderPaidAt: string | null;
    canOrderAdditional: boolean;
    additionalOrderReason: string | null;
  };
  verification: VerificationSummary;
  qr: {
    eligible: boolean;
    reason: string | null;
    profileUrl: string;
    stickerDownloadUrl: string;
    smallDownloadUrl: string;
    svgDownloadUrl: string;
    van1DownloadUrl: string;
    van2DownloadUrl: string;
    stickerPixels: number;
    smallPixels: number;
  };
};

const GENERIC_STICKER_QR_URL = "/generic-traderwatchdog-qr.svg";

const STICKER_PREVIEWS = {
  "1": {
    templateSrc: "/van-qr-1.jpg",
    label: "250×100mm",
    qrLeft: "1.93%",
    qrTop: "5.03%",
    qrWidth: "28.87%",
  },
  "2": {
    templateSrc: "/van-qr-2.jpg",
    label: "187×93mm",
    qrLeft: "5.11%",
    qrTop: "11.37%",
    qrWidth: "39.69%",
  },
} as const;

type StickerVariant = keyof typeof STICKER_PREVIEWS;

function StickerPreviewCard({ variant }: { variant: StickerVariant }) {
  const preview = STICKER_PREVIEWS[variant];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="relative">
        <img
          src={preview.templateSrc}
          alt={`Van sticker preview ${preview.label}`}
          className="block w-full"
          loading="lazy"
          decoding="async"
        />
        <img
          src={GENERIC_STICKER_QR_URL}
          alt="Generic QR code linking to traderwatchdog.co.uk"
          className="absolute"
          style={{
            left: preview.qrLeft,
            top: preview.qrTop,
            width: preview.qrWidth,
            aspectRatio: "1 / 1",
          }}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Preview size: {preview.label}</p>
        <p className="mt-1 text-xs text-slate-500">Example shown with a generic QR linking to traderwatchdog.co.uk.</p>
      </div>
    </div>
  );
}

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
  const [qrBusy, setQrBusy] = useState<"sticker" | "small" | "svg" | "van1" | "van2" | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stickerOrderBusy, setStickerOrderBusy] = useState(false);
  const [additionalStickerBusy, setAdditionalStickerBusy] = useState(false);

  function stickerLabel(variant: StickerVariant) {
    return variant === "1" ? "250×100mm" : "187×93mm";
  }

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

  async function handleOrderPhysicalStickers(stickerVariant: StickerVariant) {
    setStickerOrderBusy(true);
    setQrError(null);
    try {
      const { url } = await apiSendMember<{ url: string }>(
        "/api/member/portal/sticker-order",
        { method: "POST", body: JSON.stringify({ stickerVariant }) }
      );
      window.location.href = url;
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not start sticker order. Please try again.");
    } finally {
      setStickerOrderBusy(false);
    }
  }

  async function handleOrderAdditionalSticker(stickerVariant: StickerVariant) {
    setAdditionalStickerBusy(true);
    setQrError(null);
    try {
      const { url } = await apiSendMember<{ url: string }>(
        "/api/member/portal/sticker-order-additional",
        { method: "POST", body: JSON.stringify({ stickerVariant }) }
      );
      window.location.href = url;
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not start sticker order. Please try again.");
    } finally {
      setAdditionalStickerBusy(false);
    }
  }

  async function downloadVanSticker(id: "van1" | "van2") {
    try {
      setQrError(null);
      setQrBusy(id);
      const url = id === "van1" ? qr.van1DownloadUrl : qr.van2DownloadUrl;
      const label = id === "van1" ? "250x100mm" : "187x93mm";
      const blob = await apiGetMemberBlob(url);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(blob, `trader-watchdog-${tvId}-van-sticker-${label}.png`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download van sticker");
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
      <dd className={`text-right font-semibold ${membershipTone}`}>
        {membershipLabel}
        {data.membership.expiresAt && data.membership.accessActive && !data.membership.membershipUnlimited && (
          <p className="text-xs font-normal text-slate-500 mt-0.5">
            Renews {new Date(data.membership.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
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

                          <div className="mt-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Van sticker templates (print-ready, send to printer)
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => void downloadVanSticker("van1")}
                                disabled={qrBusy !== null}
                                className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {qrBusy === "van1" ? "Preparing..." : "Download Van sticker 1 — 250×100mm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void downloadVanSticker("van2")}
                                disabled={qrBusy !== null}
                                className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {qrBusy === "van2" ? "Preparing..." : "Download Van sticker 2 — 187×93mm"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                          {data.qr.reason ?? "QR downloads are enabled after verification approval."}
                        </div>
                      )}

                      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Order physical van stickers</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Choose a size below. Your first order sends <strong>2 stickers of the same selected size</strong> for <strong>£17.50 + VAT</strong>, delivered by Royal Mail Tracked.
                          Additional stickers are <strong>£6 + VAT</strong> for the selected size.
                        </p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <StickerPreviewCard variant="1" />
                          <StickerPreviewCard variant="2" />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => void handleOrderPhysicalStickers("1")}
                            disabled={stickerOrderBusy || additionalStickerBusy || qrBusy !== null}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {stickerOrderBusy ? "Starting checkout…" : `Order 2 × ${stickerLabel("1")}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOrderPhysicalStickers("2")}
                            disabled={stickerOrderBusy || additionalStickerBusy || qrBusy !== null}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {stickerOrderBusy ? "Starting checkout…" : `Order 2 × ${stickerLabel("2")}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOrderAdditionalSticker("1")}
                            disabled={
                              stickerOrderBusy ||
                              additionalStickerBusy ||
                              qrBusy !== null ||
                              !data.stickers.canOrderAdditional
                            }
                            className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {additionalStickerBusy ? "Starting checkout…" : `Order 1 additional ${stickerLabel("1")}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOrderAdditionalSticker("2")}
                            disabled={
                              stickerOrderBusy ||
                              additionalStickerBusy ||
                              qrBusy !== null ||
                              !data.stickers.canOrderAdditional
                            }
                            className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {additionalStickerBusy ? "Starting checkout…" : `Order 1 additional ${stickerLabel("2")}`}
                          </button>
                        </div>
                        {!data.stickers.canOrderAdditional ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {data.stickers.additionalOrderReason}
                          </p>
                        ) : null}
                      </div>

                      {qrError ? <p className="mt-4 text-sm text-red-600">{qrError}</p> : null}
                    </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { VerifiedMember } from "../types/content";
import { apiGetMember, apiGetMemberBlob } from "../lib/api";
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
  verification: VerificationSummary;
  qr: {
    eligible: boolean;
    reason: string | null;
    profileUrl: string;
    stickerDownloadUrl: string;
    smallDownloadUrl: string;
    svgDownloadUrl: string;
    badgeWithQrDownloadUrl: string;
    badgeBlankDownloadUrl: string;
    van1DownloadUrl: string;
    van2DownloadUrl: string;
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

const stickerPreviewCards = [
  {
    id: "van1" as const,
    imageSrc: "/bitmap%20stationery%20blank.png",
    imageAlt: "Sticker 1 template preview",
    sourceWidth: 897,
    sourceHeight: 402,
    title: "Vehicle sticker 1",
    body: "Download this sticker artwork with your QR code placed centrally in the clear area.",
    buttonLabel: "Download vehicle sticker 1",
    panelLeft: 514,
    panelTop: 36,
    panelSize: 328,
    qrInset: 10,
  },
  {
    id: "van2" as const,
    imageSrc: "/300dpi.png",
    imageAlt: "Sticker 2 template preview",
    sourceWidth: 1184,
    sourceHeight: 1064,
    title: "Vehicle sticker 2",
    body: "Download this larger sticker artwork with your QR code centred in the open white panel.",
    buttonLabel: "Download vehicle sticker 2",
    panelLeft: 107,
    panelTop: 349,
    panelSize: 370,
    qrInset: 12,
  },
];

export function MemberOverview() {
  const { member } = useMemberAuth();
  const [data, setData] = useState<MemberOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState<"sticker" | "small" | "svg" | "badge" | "badgeBlank" | "van1" | "van2" | null>(null);
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
    apiGetMemberBlob(data.qr.svgDownloadUrl)
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
  }, [data?.qr.eligible, data?.qr.svgDownloadUrl]);

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

  async function downloadBadgeWithQr() {
    try {
      setQrError(null);
      setQrBusy("badge");
      const blob = await apiGetMemberBlob(qr.badgeWithQrDownloadUrl);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(blob, `trader-watchdog-${tvId}-badge-with-qr.png`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download badge with QR code");
    } finally {
      setQrBusy(null);
    }
  }

  async function downloadBlankBadge() {
    try {
      setQrError(null);
      setQrBusy("badgeBlank");
      const blob = await apiGetMemberBlob(qr.badgeBlankDownloadUrl);
      const tvId = p.tvId.trim().replace(/[^A-Za-z0-9_-]/g, "");
      saveBlob(blob, `trader-watchdog-${tvId}-badge-blank.svg`);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Could not download blank badge artwork");
    } finally {
      setQrBusy(null);
    }
  }

  async function downloadVanSticker(id: "van1" | "van2") {
    try {
      setQrError(null);
      setQrBusy(id);
      const url = id === "van1" ? qr.van1DownloadUrl : qr.van2DownloadUrl;
      const label = id === "van1" ? "vehicle-sticker-1" : "vehicle-sticker-2";
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
                    <div className="rounded-lg border border-[#e4d7c4] bg-[#f7f1e8] p-8">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                        Trader portal downloads
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">
                        Show your community and the public you are a Verified Trader. Use the badges to connect direct with your portfolio.
                      </p>

                      {canDownloadQr ? (
                        <div className="mt-6 space-y-6">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-[#ddd2bf] bg-[#fffdf7] p-5 shadow-sm">
                              <div className="flex min-h-[15rem] items-center justify-center rounded-[1.25rem] bg-white p-4">
                                <img
                                  src={qrPreviewUrl ?? "/generic-traderwatchdog-qr.svg"}
                                  alt="Your Trader Watchdog QR code"
                                  className="h-40 w-40 object-contain"
                                />
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                Your QR code
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                This QR code directs to your business portal. You can download it here for your marketing materials. Please check before displaying to ensure the accuracy and contact us if the code does not direct.
                              </p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => void downloadStickerPng()}
                                  disabled={qrBusy !== null}
                                  className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {qrBusy === "sticker"
                                    ? "Preparing..."
                                    : `Download QR PNG 75mm (${data.qr.stickerPixels}px)`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void downloadSmallJpg()}
                                  disabled={qrBusy !== null}
                                  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {qrBusy === "small"
                                    ? "Preparing..."
                                    : `Download QR JPG 20mm (${data.qr.smallPixels}px)`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void downloadSvg()}
                                  disabled={qrBusy !== null}
                                  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                                >
                                  {qrBusy === "svg" ? "Preparing..." : "Download QR SVG (resolution-independent)"}
                                </button>
                              </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-[#ddd2bf] bg-[#fffdf7] p-5 shadow-sm">
                              <div className="flex min-h-[15rem] items-center justify-center rounded-[1.25rem] bg-white p-4">
                                <img
                                  src="/Badge%20TW1.webp"
                                  alt="Trader Watchdog badge showing a QR code"
                                  className="max-h-40 w-full object-contain"
                                />
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                Badge with your QR code
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                Download this badge showing your QR code for stationery, social media and advertising.
                              </p>
                              <button
                                type="button"
                                onClick={() => void downloadBadgeWithQr()}
                                disabled={qrBusy !== null}
                                className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {qrBusy === "badge" ? "Preparing..." : "Download badge with your QR code"}
                              </button>
                            </div>

                            <div className="rounded-[1.5rem] border border-[#ddd2bf] bg-[#fffdf7] p-5 shadow-sm">
                              <div className="flex min-h-[15rem] items-center justify-center rounded-[1.25rem] bg-white p-4">
                                <img
                                  src="/badge-preview.svg"
                                  alt="Trader Watchdog badge without a QR code"
                                  className="max-h-40 w-full object-contain"
                                />
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                Badge ready for your QR code
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                If QR code cannot be placed - Download this badge and add your QR code for stationery, social media and advertising.
                              </p>
                              <button
                                type="button"
                                onClick={() => void downloadBlankBadge()}
                                disabled={qrBusy !== null}
                                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {qrBusy === "badgeBlank" ? "Preparing..." : "Download blank badge artwork"}
                              </button>
                            </div>

                            <div className="rounded-[1.5rem] border border-[#ddd2bf] bg-[#fffdf7] p-5 shadow-sm">
                              <div className="flex min-h-[15rem] items-center justify-center rounded-[1.25rem] bg-white p-4">
                                <img
                                  src="/van33.jpg"
                                  alt="Trader Watchdog vehicle badge preview"
                                  className="h-48 w-full rounded-[1rem] object-cover"
                                />
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                Your portal vehicle badge
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                This badge is suitable for vehicles, directing your community and the public to your verified portal. It can be downloaded for printing.
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[1.5rem] border border-[#0d2167] bg-[#122a80] p-5 text-white shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
                              STICKERS
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-100">
                              Vehicle stickers printed with your QR code are available in a choice of two sizes available in packs of two; 100mm x 90mm at £xx and 150mm x 135mm at £xx. Prices include delivery and VAT.
                            </p>
                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                              {stickerPreviewCards.map((card) => (
                                <div key={card.id} className="rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/15">
                                  <div className="overflow-hidden rounded-[1rem] bg-white">
                                    <div className="flex aspect-[4/3] items-center justify-center p-4">
                                      <div className="relative inline-block">
                                        <img
                                          src={card.imageSrc}
                                          alt={card.imageAlt}
                                          className="block max-h-full max-w-full object-contain"
                                        />
                                        {qrPreviewUrl ? (
                                          <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute bg-white"
                                            style={{
                                              left: `${(card.panelLeft / card.sourceWidth) * 100}%`,
                                              top: `${(card.panelTop / card.sourceHeight) * 100}%`,
                                              width: `${(card.panelSize / card.sourceWidth) * 100}%`,
                                              height: `${(card.panelSize / card.sourceHeight) * 100}%`,
                                            }}
                                          >
                                            <img
                                              src={qrPreviewUrl}
                                              alt=""
                                              className="h-full w-full object-contain"
                                              style={{ padding: `${(card.qrInset / card.panelSize) * 100}%` }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                  <h3 className="mt-4 text-base font-semibold text-white">
                                    {card.title}
                                  </h3>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-100">
                                    {card.body}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => void downloadVanSticker(card.id)}
                                    disabled={qrBusy !== null}
                                    className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#122a80] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {qrBusy === card.id ? "Preparing..." : card.buttonLabel}
                                  </button>
                                </div>
                              ))}
                            </div>
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

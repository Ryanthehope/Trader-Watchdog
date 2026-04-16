import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApiUrl } from "../lib/api";
import { useMemberAuth } from "./MemberAuthContext";

export function MemberBadge() {
  const { member } = useMemberAuth();
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl = `${origin}/m/${member?.slug ?? ""}`;
  const badgeUrl = member?.slug
    ? publicApiUrl(
        `/api/members/by-slug/${encodeURIComponent(member.slug)}/badge.svg`
      )
    : "";

  const embedHtml = useMemo(() => {
    if (!member?.slug) return "";
    return `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeUrl}" width="320" height="88" alt="Trader Watchdog verified — ${member.name.replace(/"/g, "&quot;")}" />
</a>`;
  }, [member?.slug, member?.name, profileUrl, badgeUrl]);

  const downloadSvg = useCallback(async () => {
    if (!member?.slug) return;
    try {
      const res = await fetch(badgeUrl);
      if (!res.ok) throw new Error("Could not load badge");
      const text = await res.text();
      const blob = new Blob([text], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Trader Watchdog-badge-${member.slug}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Check your connection and try again.");
    }
  }, [badgeUrl, member?.slug]);

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy to clipboard.");
    }
  };

  if (!member?.slug) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Badge</h1>
        <p className="mt-4 text-slate-600">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Badge</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Use this badge on your website, quotes, and van livery. The image is
        generated from your live public profile (name, ID, trade). Anyone can
        view the SVG URL — it only confirms you have a Trader Watchdog listing.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-6">
          <img
            src={badgeUrl}
            width={320}
            height={88}
            alt="Trader Watchdog verified badge preview"
            className="rounded-lg shadow-md shadow-slate-200/80"
          />
          <div className="min-w-0 flex-1 space-y-3 text-sm">
            <p>
              <span className="text-slate-500">Trader Watchdog ID:</span>{" "}
              <span className="font-mono font-medium text-slate-900">
                {member.tvId}
              </span>
            </p>
            <p>
              <Link
                to={`/m/${member.slug}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                View public profile
              </Link>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => downloadSvg()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Download SVG
              </button>
              <button
                type="button"
                onClick={() => copyEmbed()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {copied ? "Copied!" : "Copy embed HTML"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-800">Website embed</p>
        <p className="mt-1 text-xs text-slate-600">
          Paste into your site HTML. The badge links to your verified profile.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {embedHtml}
        </pre>
      </div>
    </div>
  );
}

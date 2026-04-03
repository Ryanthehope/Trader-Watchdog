import { FormEvent, useEffect, useState } from "react";
import { apiGetAuth, apiSend } from "../lib/api";

type Settings = {
  id: string;
  workspaceName: string | null;
  siteDisplayName: string | null;
  publicSiteUrl: string | null;
  announcementEmail: string | null;
  adminNotifyEmails: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  mailFrom: string | null;
  hasSmtpPassword: boolean;
};

export function StaffSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [siteDisplayName, setSiteDisplayName] = useState("");
  const [publicSiteUrl, setPublicSiteUrl] = useState("");
  const [announcementEmail, setAnnouncementEmail] = useState("");
  const [adminNotifyEmails, setAdminNotifyEmails] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false);
  const [mailFrom, setMailFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAuth<{ settings: Settings }>("/api/admin/organization-settings")
      .then((d) => {
        const s = d.settings;
        setSettings(s);
        setWorkspaceName(s.workspaceName ?? "");
        setSiteDisplayName(s.siteDisplayName ?? "");
        setPublicSiteUrl(s.publicSiteUrl ?? "");
        setAnnouncementEmail(s.announcementEmail ?? "");
        setAdminNotifyEmails(s.adminNotifyEmails ?? "");
        setSmtpHost(s.smtpHost ?? "");
        setSmtpPort(s.smtpPort != null ? String(s.smtpPort) : "");
        setSmtpSecure(Boolean(s.smtpSecure));
        setSmtpUser(s.smtpUser ?? "");
        setSmtpPass("");
        setClearSmtpPassword(false);
        setMailFrom(s.mailFrom ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, unknown> = {
        workspaceName: workspaceName.trim() || null,
        siteDisplayName: siteDisplayName.trim() || null,
        publicSiteUrl: publicSiteUrl.trim().replace(/\/$/, "") || null,
        announcementEmail: announcementEmail.trim() || null,
        adminNotifyEmails: adminNotifyEmails.trim() || null,
        smtpHost: smtpHost.trim() || null,
        smtpSecure,
        smtpUser: smtpUser.trim() || null,
        mailFrom: mailFrom.trim() || null,
      };
      const portNum = smtpPort.trim() ? parseInt(smtpPort.trim(), 10) : NaN;
      body.smtpPort =
        smtpPort.trim() === ""
          ? null
          : Number.isFinite(portNum)
            ? portNum
            : null;
      if (smtpPass.trim()) {
        body.smtpPass = smtpPass.trim();
      }
      if (clearSmtpPassword) {
        body.clearSmtpPassword = true;
      }

      const d = await apiSend<{ settings: Settings }>(
        "/api/admin/organization-settings/save",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      setSettings(d.settings);
      setSmtpPass("");
      setClearSmtpPassword(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (loading && !settings) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Settings
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Site name, public URL, and outbound email — stored in the database.
        Environment variables still override SMTP when set on the server.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 max-w-xl space-y-8 rounded-2xl border border-white/10 bg-ink-900/40 p-6"
      >
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Brand &amp; URLs
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Site / product name
            </label>
            <input
              value={siteDisplayName}
              onChange={(e) => setSiteDisplayName(e.target.value)}
              placeholder="TradeVerify"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown in the public header, member portal, staff area, and email
              subjects. If empty, falls back to workspace name below, then
              “TradeVerify”.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Workspace label (internal)
            </label>
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Ops UK"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Public site URL
            </label>
            <input
              value={publicSiteUrl}
              onChange={(e) => setPublicSiteUrl(e.target.value)}
              placeholder="https://verify.example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used in email links and public site metadata. Overrides{" "}
              <code className="rounded bg-white/10 px-1">PUBLIC_SITE_URL</code>{" "}
              when set.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Notification emails (comma-separated)
            </label>
            <input
              value={adminNotifyEmails}
              onChange={(e) => setAdminNotifyEmails(e.target.value)}
              placeholder="ops@example.com, alerts@example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Receives system emails (leads, applications, etc.). Overrides the
              single ops email below when set. The{" "}
              <code className="rounded bg-white/10 px-1">ADMIN_NOTIFY_EMAILS</code>{" "}
              env var overrides both.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Announcement / ops email (single)
            </label>
            <input
              type="email"
              value={announcementEmail}
              onChange={(e) => setAnnouncementEmail(e.target.value)}
              placeholder="ops@example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Outbound email (SMTP)
          </h2>
          <p className="text-xs leading-relaxed text-slate-500">
            If set here, the server uses these values unless{" "}
            <code className="rounded bg-white/10 px-1">SMTP_HOST</code> (etc.)
            is defined in the environment — env wins for host, port, user, and
            password when present.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300">
                SMTP host
              </label>
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.example.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Port
              </label>
              <input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-8 sm:pt-6">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-ink-950 text-brand-500"
              />
              <span className="text-sm text-slate-300">
                SSL/TLS (e.g. port 465)
              </span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                New password
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={
                  settings?.hasSmtpPassword
                    ? "•••••••• (leave blank to keep)"
                    : "Optional"
                }
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
              />
            </div>
            {settings?.hasSmtpPassword ? (
              <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={clearSmtpPassword}
                  onChange={(e) => setClearSmtpPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-ink-950 text-brand-500"
                />
                <span className="text-sm text-slate-400">
                  Clear stored SMTP password
                </span>
              </label>
            ) : null}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300">
                From (sender)
              </label>
              <input
                value={mailFrom}
                onChange={(e) => setMailFrom(e.target.value)}
                placeholder="Acme Verify &lt;noreply@example.com&gt;"
                className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

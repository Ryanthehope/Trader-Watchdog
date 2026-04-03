import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

/** From root `.env` at build time only — Vite never reads `server/.env`. */
const builtInContactEmail =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || "";

export function Contact() {
  const { brandName } = useSiteData();
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = `${apiBase()}/api/public-config`;
    fetch(url)
      .then((r) => r.json())
      .then((d: { contactEmail?: string | null; error?: string }) => {
        const fromApi =
          typeof d.contactEmail === "string" ? d.contactEmail.trim() : "";
        setEmail(fromApi || builtInContactEmail);
      })
      .catch(() => {
        setEmail(builtInContactEmail);
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-300">
        {brandName}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
        Contact
      </h1>
      <p className="mt-6 leading-relaxed text-slate-400">
        For general enquiries, media, or issues with the verification service,
        use the details below. Members and staff should sign in and use the
        appropriate channels where available.
      </p>

      {!ready ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-ink-900/50 p-6 text-sm text-slate-500">
          Loading contact options…
        </div>
      ) : email ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-ink-900/50 p-6 shadow-card-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </p>
          <a
            href={`mailto:${email}`}
            className="mt-2 inline-block font-medium text-brand-400 hover:text-brand-300"
          >
            {email}
          </a>
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200/95">No public email configured</p>
          <p className="mt-2 leading-relaxed">
            Add <code className="text-amber-200">CONTACT_EMAIL</code> to{" "}
            <code className="text-amber-200">server/.env</code> and restart the API.
            (Putting <code className="text-amber-200">VITE_*</code> only in{" "}
            <code className="text-amber-200">server/.env</code> does nothing for the
            website — Vite only reads <code className="text-amber-200">.env</code> at
            the project root.)
          </p>
          <p className="mt-3 text-xs text-amber-100/70">
            If the address is set but you still see this, open{" "}
            <code className="text-amber-200/90">/api/public-config</code> on your API
            host and confirm <code className="text-amber-200/90">contactEmail</code> is
            present.
          </p>
        </div>
      )}

      <ul className="mt-10 space-y-3 text-sm text-slate-400">
        <li>
          <Link to="/join" className="text-brand-400 hover:text-brand-300">
            Apply for membership
          </Link>{" "}
          — tradespeople starting verification.
        </li>
        <li>
          <Link to="/login" className="text-brand-400 hover:text-brand-300">
            Log in
          </Link>{" "}
          — verified members and staff.
        </li>
      </ul>

      <Link
        to="/"
        className="mt-12 inline-block text-sm font-medium text-brand-400 hover:text-brand-300"
      >
        ← Back to home
      </Link>
    </main>
  );
}

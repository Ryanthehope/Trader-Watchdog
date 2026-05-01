import { FormEvent, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMemberAuth } from "../member/MemberAuthContext";
import { useStaffAuth } from "../staff/StaffAuthContext";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Login failed. Try again.";
}

function normalizeEmail(value: string): string {
  return value.trim();
}

function normalizePassword(value: string): string {
  return value.replace(/[\r\n]+/g, "").trim();
}

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const role = searchParams.get("as") === "staff" ? "staff" : "member";
  const roleLabel = role === "staff" ? "Staff" : "Trader";

  const {
    loginStaff,
    completeStaffTotp,
    staff,
    ready: staffReady,
  } = useStaffAuth();
  const { login: memberLogin, member, ready: memberReady } = useMemberAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpPending, setTotpPending] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ready = staffReady && memberReady;

  useEffect(() => {
    if (!ready) return;
    if (staff) {
      const target =
        from && from.startsWith("/staff") && from !== "/login"
          ? from
          : "/staff";
      navigate(target, { replace: true });
    } else if (member) {
      const target =
        from && from.startsWith("/member") && from !== "/login"
          ? from
          : "/member";
      navigate(target, { replace: true });
    }
  }, [ready, staff, member, navigate, from]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const em = normalizeEmail(email);
    const pw = normalizePassword(password);

    try {
      if (role === "staff") {
        const r = await loginStaff(em, pw);
        if ("requires2fa" in r && r.requires2fa) {
          setTotpPending(r.pendingToken);
          setPending(false);
          return;
        }
      } else {
        await memberLogin(em, pw);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onTotp = async (e: FormEvent) => {
    e.preventDefault();
    if (!totpPending) return;
    setError(null);
    setPending(true);
    try {
      await completeStaffTotp(
        totpPending,
        totpCode.replace(/\s/g, "")
      );
      setTotpPending(null);
      setTotpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-20">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            <span className="font-display text-2xl font-semibold text-white">
              Trader Watchdog
            </span>
          </Link>
          <div className="mt-8 flex items-center justify-center gap-2 rounded-full border border-slate-700/50 bg-slate-900/50 p-1">
            <Link
              to="/staff/login"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                role === "staff"
                  ? "bg-brand-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Staff log in
            </Link>
            <Link
              to="/member/login"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                role === "member"
                  ? "bg-brand-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Trader log in
            </Link>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">{roleLabel} log in</h1>
          <p className="mt-3 text-sm text-slate-400">
            {role === "staff"
              ? "For administrators managing applications, members, and insurance."
              : "For traders managing their verified profile, documents, and billing."}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-8 backdrop-blur">
          {totpPending ? (
            <form onSubmit={onTotp}>
              {error ? (
                <div
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              <p className="text-sm text-slate-300">Authenticator code</p>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-4 w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <button
                type="submit"
                disabled={pending}
                className="mt-6 w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {pending ? "Verifying…" : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTotpPending(null);
                  setTotpCode("");
                  setError(null);
                }}
                className="mt-3 w-full text-sm text-slate-400 hover:text-slate-200"
              >
                Back to password
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit}>
              {error ? (
                <div
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    className="mt-2 w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(normalizePassword(e.target.value))}
                    className="mt-2 w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending || !ready}
                className="mt-6 w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {pending ? "Logging in…" : "Log in"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Not a trader yet?{" "}
          <Link to="/join" className="text-brand-400 hover:text-brand-300">
            Apply for Trader Watchdog
          </Link>
        </p>
        <Link
          to="/"
          className="mt-4 block text-center text-sm text-slate-600 hover:text-slate-400"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

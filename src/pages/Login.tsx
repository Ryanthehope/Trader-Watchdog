import { FormEvent, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMemberAuth } from "../member/MemberAuthContext";
import { useStaffAuth } from "../staff/StaffAuthContext";

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

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
    const em = email.trim();
    const preferStaff = searchParams.get("as") === "staff";

    try {
      if (preferStaff) {
        try {
          const r = await loginStaff(em, password);
          if ("requires2fa" in r && r.requires2fa) {
            setTotpPending(r.pendingToken);
            setPending(false);
            return;
          }
        } catch {
          try {
            await memberLogin(em, password);
          } catch {
            setError("Invalid email or password");
          }
        }
      } else {
        try {
          await memberLogin(em, password);
        } catch {
          try {
            const r = await loginStaff(em, password);
            if ("requires2fa" in r && r.requires2fa) {
              setTotpPending(r.pendingToken);
              setPending(false);
              return;
            }
          } catch {
            setError("Invalid email or password");
          }
        }
      }
    } catch {
      setError("Invalid email or password");
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
    <div className="min-h-screen bg-gradient-to-b from-ink-950 via-ink-950 to-brand-950/30 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-lg">
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
              TradeVerify
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-white">Log in</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl backdrop-blur">
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
              <p className="text-sm text-slate-400">Authenticator code</p>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-4 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-center font-mono text-lg tracking-widest text-white"
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <button
                type="submit"
                disabled={pending}
                className="mt-4 w-full rounded-xl bg-white py-3 font-semibold text-ink-900 hover:bg-slate-100 disabled:opacity-50"
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
                className="mt-3 w-full text-sm text-slate-500 hover:text-slate-300"
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
                    className="block text-sm font-medium text-slate-300"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending || !ready}
                className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-ink-900 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {pending ? "Logging in…" : "Log in"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Not a member yet?{" "}
          <Link to="/join" className="text-brand-400 hover:text-brand-300">
            Apply for TradeVerify
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

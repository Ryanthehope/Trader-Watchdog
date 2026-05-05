import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemberAuth } from "./MemberAuthContext";

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

export function MemberLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { login, member, ready } = useMemberAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ready || !member) return;
    const target =
      from && from.startsWith("/member") && from !== "/member/login"
        ? from
        : "/member";
    navigate(target, { replace: true });
  }, [ready, member, navigate, from]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await login(normalizeEmail(email), normalizePassword(password));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white shadow-2xl shadow-brand-950/30 backdrop-blur sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-3 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-100">
            Trader portal access
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Sign in to manage your Trader Watchdog profile
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Update your business details, keep documents current, check verification
            status, and review billing from one place.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <p className="text-sm font-semibold text-white">Business profile</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Keep your public-facing details accurate and up to date.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <p className="text-sm font-semibold text-white">Documents</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Upload evidence, insurance records, and supporting files.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <p className="text-sm font-semibold text-white">Verification</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Review what has been checked and what still needs attention.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm text-amber-100">
            <p className="font-semibold text-amber-50">First time signing in?</p>
            <p className="mt-2 leading-relaxed text-amber-100/90">
              Use the email and temporary password sent when your portal access was
              created. You will be asked to set a new password after your first login.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-3 text-white">
              <img
                src="/logo.png"
                alt="Trader Watchdog"
                className="h-11 w-auto rounded-md bg-white px-2 py-1 shadow-sm"
              />
              <span className="font-display text-2xl font-semibold">
                Trader log in
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Access your trader dashboard below. Staff members should use the separate
              staff login.
            </p>
          </div>

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
                  htmlFor="member-login-email"
                  className="block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>
                <input
                  id="member-login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700/50 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="you@yourbusiness.co.uk"
                />
              </div>
              <div>
                <label
                  htmlFor="member-login-password"
                  className="block text-sm font-medium text-slate-200"
                >
                  Password
                </label>
                <input
                  id="member-login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(normalizePassword(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700/50 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending || !ready}
              className="mt-6 w-full rounded-xl bg-brand-500 py-3.5 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Open trader portal"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-sm">
            <p className="text-slate-400">
              Need portal access?{" "}
              <Link to="/join" className="font-semibold text-brand-300 hover:text-brand-200">
                Apply for Trader Watchdog
              </Link>
            </p>
            <p className="text-slate-400">
              Staff member?{" "}
              <Link to="/staff/login" className="font-semibold text-brand-300 hover:text-brand-200">
                Go to staff login
              </Link>
            </p>
            <Link to="/" className="block text-slate-500 hover:text-slate-300">
              Back to main site
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

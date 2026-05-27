import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPostPublic } from "../lib/api";

export function MemberResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token || !email) {
      setError("This reset link is missing required information. Please request a new one.");
      return;
    }

    setPending(true);
    try {
      await apiPostPublic("/api/member-auth/reset-password", { token, email, password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message.trim()) {
        setError(err.message);
      } else {
        setError("This reset link is invalid or has expired. Please request a new one.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-6 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-3 text-white">
              <img
                src="/traderwatchdog_logo.webp"
                alt="Trader Watchdog"
                width="220"
                height="72"
                decoding="async"
                className="h-11 w-auto rounded-md shadow-sm"
              />
            </Link>
            <h1 className="mt-6 font-display text-2xl font-bold text-white">
              Set a new password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Choose a strong password for your member account.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-5 text-sm text-green-200">
              <p className="font-semibold text-green-100">Password updated</p>
              <p className="mt-2 leading-relaxed">
                Your password has been changed. You can now sign in with your new
                password.
              </p>
              <Link
                to="/member/login"
                className="mt-4 block font-semibold text-brand-300 hover:text-brand-200"
              >
                Sign in →
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              {error ? (
                <div
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {error}
                  {error.includes("expired") || error.includes("invalid") ? (
                    <Link
                      to="/member/forgot-password"
                      className="mt-1 block font-semibold text-brand-300 hover:text-brand-200"
                    >
                      Request a new reset link →
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-password"
                    className="block text-sm font-medium text-slate-200"
                  >
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700/50 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reset-confirm"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700/50 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    placeholder="Re-enter your new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="mt-6 w-full rounded-xl bg-brand-500 py-3.5 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Saving..." : "Set new password"}
              </button>

              <Link
                to="/member/forgot-password"
                className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-300"
              >
                Request a new reset link
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

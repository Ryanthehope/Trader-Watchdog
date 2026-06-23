import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { apiPostPublic } from "../lib/api";

export function MemberForgotPassword() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiPostPublic("/api/member-auth/forgot-password", { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      // Still show the success message to avoid revealing account existence
      setSubmitted(true);
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
                className="h-11 w-auto mix-blend-lighten"
              />
            </Link>
            <h1 className="mt-6 font-display text-2xl font-bold text-white">
              Reset your password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Enter your email address and we'll send you a reset link if your account
              is registered.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-5 text-sm text-green-200">
              <p className="font-semibold text-green-100">Check your inbox</p>
              <p className="mt-2 leading-relaxed">
                If that email is registered, you'll receive a reset link shortly. The
                link expires in 1 hour.
              </p>
              <Link
                to="/member/login"
                className="mt-4 block text-xs text-slate-400 hover:text-slate-200"
              >
                ← Back to sign in
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
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700/50 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="you@yourbusiness.co.uk"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="mt-6 w-full rounded-xl bg-brand-500 py-3.5 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Sending..." : "Send reset link"}
              </button>

              <Link
                to="/member/login"
                className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-300"
              >
                ← Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

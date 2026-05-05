import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

function Logo({
  className = "",
  title = "Trader Watchdog",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/trader-watchdog-logo.jpg" 
        alt={title}
        className="h-14 w-auto rounded-sm sm:h-16 lg:h-18"
      />
    </div>
  );
}

const desktopActionClass =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/12 transition-colors duration-200 hover:bg-white/[0.14]";

const mobileLinkClass =
  "rounded-lg px-3 py-2.5 hover:bg-white/5 hover:text-white";

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { error, reload, brandName } = useSiteData();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Under Construction Banner */}
      <div className="w-full bg-yellow-400 text-yellow-900 text-center py-2.5 font-semibold text-sm z-50">
        🚧 This site is currently under construction. Some features may not be available. 🚧
      </div>
      {error ? (
        <div
          className="border-b border-amber-500/20 bg-amber-950/40 px-4 py-2.5 text-center text-sm text-amber-100"
          role="alert"
        >
          <span className="text-amber-200/90">{error}</span>{" "}
          <button
            type="button"
            onClick={() => reload()}
            className="font-semibold text-white underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : null}
      <header className="sticky top-0 z-50 border-b border-brand-800/70 bg-brand-950/95 backdrop-blur-xl supports-[backdrop-filter]:bg-brand-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="outline-none ring-brand-500 focus-visible:ring-2"
            onClick={() => setMenuOpen(false)}
          >
            <Logo title={brandName} />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
            <Link to="/#verify" className={`${desktopActionClass} bg-white/5`}>
              Verify
            </Link>
            <Link to="/#how" className={`${desktopActionClass} bg-white/5`}>
              How it works
            </Link>
            <Link to="/#why" className={`${desktopActionClass} bg-white/5`}>
              What we check
            </Link>
            <Link to="/#compare" className={`${desktopActionClass} bg-white/5`}>
              Compare
            </Link>
            <Link to="/#verify" className={`${desktopActionClass} bg-white/10`}>
              Verify a trade
            </Link>
            <Link to="/join" className={`${desktopActionClass} bg-brand-600 hover:bg-brand-500`}>
              Join Trader Watchdog
            </Link>
            <Link to="/categories" className={`${desktopActionClass} bg-brand-600 hover:bg-brand-500`}>
              Categories
            </Link>
          </nav>

          <div className="hidden items-center gap-5 md:flex md:shrink-0">
            <Link
              to="/staff/login"
              className="text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-white"
            >
              Staff log in
            </Link>
            <Link
              to="/member/login"
              className="text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-white"
            >
              Trader log in
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/5 bg-ink-950 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-300">
              <Link
                to="/#verify"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Verify
              </Link>
              <Link
                to="/#how"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                How it works
              </Link>
              <Link
                to="/#why"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                What we check
              </Link>
              <Link
                to="/#compare"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Compare
              </Link>
              <Link
                to="/categories"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                to="/#verify"
                className="mt-2 rounded-lg bg-white/10 px-3 py-2.5 text-center font-semibold text-white hover:bg-white/[0.14]"
                onClick={() => setMenuOpen(false)}
              >
                Verify a trade
              </Link>
              <Link
                to="/join"
                className="mt-2 rounded-lg bg-brand-600 px-3 py-2.5 text-center font-semibold text-white hover:bg-brand-500"
                onClick={() => setMenuOpen(false)}
              >
                Join Trader Watchdog
              </Link>
              <Link
                to="/staff/login"
                className="mt-3 rounded-lg border border-white/10 px-3 py-2.5 text-center hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Staff log in
              </Link>
              <Link
                to="/member/login"
                className="rounded-lg border border-white/10 px-3 py-2.5 text-center hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Trader log in
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-white/10 bg-gradient-to-b from-transparent to-black/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <Link to="/" className="inline-block outline-none ring-brand-500 focus-visible:ring-2">
                <Logo title={brandName} />
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Independent verification for trades and homeowners — confirm
                credentials before you hire.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400"
              aria-label="Footer"
            >
              {/* Guides link removed from footer */}
              {/* Post a job link removed from footer */}
              <Link
                to="/join"
                className="transition-colors hover:text-white"
              >
                Apply
              </Link>
              <Link
                to="/privacy"
                className="transition-colors hover:text-white"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="transition-colors hover:text-white"
              >
                Terms
              </Link>
              <Link
                to="/contact"
                className="transition-colors hover:text-white"
              >
                Contact
              </Link>
              <Link
                to="/staff/login"
                className="text-slate-600 transition-colors hover:text-slate-400"
              >
                Staff log in
              </Link>
              <Link
                to="/member/login"
                className="text-slate-600 transition-colors hover:text-slate-400"
              >
                Trader log in
              </Link>
              <Link to="/categories" className="text-slate-600 transition-colors hover:text-slate-400">
                Categories
              </Link>
            </nav>
          </div>
          <p className="mt-10 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

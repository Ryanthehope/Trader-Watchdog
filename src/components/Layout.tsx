import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

function Logo({
  className = "",
  title = "Trader Watchdog",
  variant = "header",
}: {
  className?: string;
  title?: string;
  variant?: "header" | "footer";
}) {
  const sizeClass =
    variant === "header"
      ? "h-16 md:h-20 xl:h-24"
      : "h-14 md:h-16";

  return (
    <div className={`flex shrink-0 items-center gap-3 ${className}`}>
      <img
        src="/traderwatchdog_logo.webp"
        alt={title}
        width="320"
        height="104"
        decoding="async"
        className={`block ${sizeClass} w-auto max-w-none rounded-md shadow-sm`}
      />
    </div>
  );
}

const desktopActionClass =
  "inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold text-white ring-1 ring-white/12 transition-colors duration-200 hover:bg-white/[0.14]";

const desktopLoginClass =
  "inline-flex min-h-[40px] items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-white ring-1 ring-white/12 transition-colors duration-200 hover:bg-white/[0.08]";

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
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-2">
            <Link
              to="/"
              className="shrink-0 outline-none ring-brand-500 focus-visible:ring-2"
              onClick={() => setMenuOpen(false)}
            >
              <Logo title={brandName} variant="header" />
            </Link>

            <div className="hidden items-center gap-3 xl:flex xl:shrink-0">
              <Link to="/member/login" className={`${desktopLoginClass} bg-white/10`}>
                Trader log in
              </Link>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white xl:hidden"
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

          <div className="hidden border-t border-white/5 xl:block">
            <nav className="flex items-center justify-center gap-2 py-3">
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
            </nav>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/5 bg-ink-950 px-4 py-4 xl:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-300">
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
                to="/member/login"
                className="mt-3 rounded-lg border border-white/10 px-3 py-2.5 text-center hover:bg-white/5 hover:text-white"
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
                <Logo title={brandName} variant="footer" />
              </Link>
              <p className="mt-4 text-base leading-relaxed text-white/75">
                Independent verification for trades and homeowners — confirm
                credentials before you hire.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-x-6 gap-y-3 text-base text-white/75"
              aria-label="Footer"
            >
              <Link to="/join" className="transition-colors hover:text-white">
                Apply
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="transition-colors hover:text-white">
                Cookie Policy
              </Link>
              <Link to="/terms" className="transition-colors hover:text-white">
                Terms of Use
              </Link>
              <Link to="/refunds" className="transition-colors hover:text-white">
                Refund &amp; Cancellation Policy
              </Link>
              <Link to="/accessibility" className="transition-colors hover:text-white">
                Accessibility
              </Link>
              <Link to="/complaints" className="transition-colors hover:text-white">
                Complaints Policy
              </Link>
              <Link to="/qr-code-policy" className="transition-colors hover:text-white">
                QR Code Use
              </Link>
              <Link to="/verification-methodology" className="transition-colors hover:text-white">
                Verification Methodology
              </Link>
              <Link to="/data-retention" className="transition-colors hover:text-white">
                Data Retention
              </Link>
              <Link to="/agreement" className="transition-colors hover:text-white">
                Trader Agreement
              </Link>
              <Link to="/contact" className="transition-colors hover:text-white">
                Contact
              </Link>
              <Link
                to="/member/login"
                className="text-white/40 transition-colors hover:text-white/75"
              >
                Trader log in
              </Link>
            </nav>
          </div>
          <div className="mt-10 border-t border-white/5 pt-8 space-y-1 text-center text-sm text-white/60">
            <p>
              Trader Watchdog Ltd. Company number 17173750 registered in England and Wales.
            </p>
            <p>Registered office: 4th Floor Office, 205 Regent Street, London, W1B 4HB</p>
            <p>VAT number: 518 4466 75</p>
            <p>
              Email:{" "}
              <a href="mailto:admin@traderwatchdog.co.uk" className="hover:text-white">
                admin@traderwatchdog.co.uk
              </a>
            </p>
            <p className="pt-2">© {new Date().getFullYear()} Trader Watchdog Ltd</p>
            <p>
              Website design{" "}
              <a
                href="https://headstartwebdevelopment.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Headstart Web Development
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

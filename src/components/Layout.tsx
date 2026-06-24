import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
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
  const logoClass =
    variant === "header"
      ? "mix-blend-lighten"
      : "";

  return (
    <div className={`flex shrink-0 items-center gap-3 ${className}`}>
      <img
        src={variant === "footer" ? "/new%20footer%20logo.jpg" : "/traderwatchdog_logo.webp"}
        alt={title}
        width="320"
        height="104"
        decoding="async"
        className={`block ${sizeClass} w-auto max-w-none ${logoClass}`}
      />
    </div>
  );
}

const desktopActionClass =
  "inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-700 ring-1 ring-white/20 transition-colors duration-200 hover:bg-brand-50";

const desktopLoginClass =
  "inline-flex min-h-[40px] items-center justify-center whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-white/20 transition-colors duration-200 hover:bg-brand-50";

const mobileLinkClass =
  "rounded-lg px-3 py-2.5 hover:bg-white/5 hover:text-white";

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { error, reload, brandName } = useSiteData();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
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
      <header className="sticky top-0 z-50 border-b border-brand-800/70 bg-brand-700/95 backdrop-blur-xl supports-[backdrop-filter]:bg-brand-700/90">
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
              <Link to="/member/login" className={desktopLoginClass}>
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
              <Link to="/#verify" className={desktopActionClass}>
                Verify a trader
              </Link>
              <Link to="/#why" className={desktopActionClass}>
                What we check
              </Link>
              <Link to="/join" className={desktopActionClass}>
                Join Trader Watchdog
              </Link>
            </nav>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/5 bg-brand-700 px-4 py-4 xl:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-300">
              <Link
                to="/#verify"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Verify a trade
              </Link>
              <Link
                to="/#why"
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                What we check
              </Link>
              <Link
                to="/join"
                className={mobileLinkClass}
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

      <footer className="small-print-on-light mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <Link to="/" className="inline-block outline-none ring-brand-500 focus-visible:ring-2">
                <Logo title={brandName} variant="footer" />
              </Link>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Independent verification for trades and homeowners — confirm
                credentials before you hire.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-x-6 gap-y-3 text-base text-slate-700"
              aria-label="Footer"
            >
              <Link to="/join" className="transition-colors hover:text-slate-950">
                Apply
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-slate-950">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="transition-colors hover:text-slate-950">
                Cookie Policy
              </Link>
              <Link to="/terms" className="transition-colors hover:text-slate-950">
                Terms of Use
              </Link>
              <Link to="/refunds" className="transition-colors hover:text-slate-950">
                Refund &amp; Cancellation Policy
              </Link>
              <Link to="/accessibility" className="transition-colors hover:text-slate-950">
                Accessibility
              </Link>
              <Link to="/complaints" className="transition-colors hover:text-slate-950">
                Complaints Policy
              </Link>
              <Link to="/qr-code-policy" className="transition-colors hover:text-slate-950">
                QR Code Use
              </Link>
              <Link to="/verification-methodology" className="transition-colors hover:text-slate-950">
                Verification Methodology
              </Link>
              <Link to="/data-retention" className="transition-colors hover:text-slate-950">
                Data Retention
              </Link>
              <Link to="/agreement" className="transition-colors hover:text-slate-950">
                Trader Agreement
              </Link>
              <Link to="/contact" className="transition-colors hover:text-slate-950">
                Contact
              </Link>
              <Link
                to="/member/login"
                className="text-slate-500 transition-colors hover:text-slate-900"
              >
                Trader log in
              </Link>
              <a
                href="https://www.facebook.com/TraderWatchdog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-slate-950"
                aria-label="Trader Watchdog on Facebook"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M13.5 21v-7h2.3l.4-3h-2.7V9.1c0-.9.3-1.6 1.7-1.6H16V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4V11H7.5v3h2.4v7h3.6Z" />
                </svg>
                Facebook
              </a>
            </nav>
          </div>
          <div className="mt-10 space-y-1 border-t border-slate-200 pt-8 text-center text-sm text-slate-600">
            <p>
              Trader Watchdog Ltd. Company number 17173750 registered in England and Wales.
            </p>
            <p>Registered office: 4th Floor Office, 205 Regent Street, London, W1B 4HB</p>
            <p>VAT number: 518 4466 75</p>
            <p>ICO registration: ZC158586</p>
            <p>
              Email:{" "}
              <a href="mailto:admin@traderwatchdog.co.uk" className="hover:text-slate-950">
                admin@traderwatchdog.co.uk
              </a>
            </p>
            <p className="pt-2">© {new Date().getFullYear()} Trader Watchdog Ltd</p>
            <p>
              Website design{" "}
              <a
                href="https://head-startwebdevelopment.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-950"
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

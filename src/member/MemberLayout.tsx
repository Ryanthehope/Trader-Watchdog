import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import { useMemberAuth } from "./MemberAuthContext";

const nav =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition";

const menuIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const closeIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function MemberLayout() {
  const { member, logout } = useMemberAuth();
  const { brandName } = useSiteData();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (
      member?.mustChangePassword &&
      location.pathname !== "/member/password"
    ) {
      navigate("/member/password", { replace: true });
    }
  }, [member?.mustChangePassword, location.pathname, navigate]);

  const membershipLocked =
    Boolean(member) &&
    !member!.membershipLegacyUnlimited &&
    !member!.membershipAccessActive;

  useEffect(() => {
    if (
      !member?.mustChangePassword &&
      membershipLocked &&
      location.pathname !== "/member/membership" &&
      location.pathname !== "/member/billing" &&
      location.pathname !== "/member/password" &&
      location.pathname !== "/member"
    ) {
      navigate("/member/membership", { replace: true });
    }
  }, [
    member?.mustChangePassword,
    membershipLocked,
    location.pathname,
    navigate,
  ]);

  const lockPortal = Boolean(member?.mustChangePassword);

  if (location.pathname.includes("/print")) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-800/30 bg-[#0f172a] px-3 text-slate-100 md:hidden">
        <Link
          to="/member"
          className="flex min-w-0 items-center gap-2"
          onClick={() => setMobileNavOpen(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
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
          <span className="truncate font-display text-base font-semibold text-white">
            {brandName}
          </span>
        </Link>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 hover:text-white"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          {mobileNavOpen ? closeIcon : menuIcon}
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] max-w-[85vw] flex-col border-r border-slate-800/20 bg-[#0f172a] text-slate-300 transition-transform duration-200 ease-out md:relative md:z-auto md:max-w-none md:w-64 md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="border-b border-white/10 px-4 py-5 md:block">
          <Link
            to="/member"
            className="hidden items-center gap-2 md:flex"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
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
            <span className="font-display text-lg font-semibold text-white">
              {brandName}
            </span>
          </Link>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500 md:hidden">
            Menu
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 pb-2">
          {lockPortal ? (
            <p className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95">
              Set a new password below to unlock the rest of your portal.
            </p>
          ) : membershipLocked ? (
            <>
              <p className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95">
                Your membership is not active. Open{" "}
                <span className="font-semibold text-white">Membership</span>{" "}
                below to renew or start card billing.
              </p>
              <NavLink
                to="/member"
                end
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Overview
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/member"
                end
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to="/member/business"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Business details
              </NavLink>
              <NavLink
                to="/member/documents"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Documents
              </NavLink>
              <NavLink
                to="/member/badge"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Badge
              </NavLink>
              <NavLink
                to="/member/refer"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Refer a trade
              </NavLink>
              <NavLink
                to="/member/leads"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Leads
              </NavLink>
              <NavLink
                to="/member/availability"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Availability
              </NavLink>
              <NavLink
                to="/member/reviews"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Reviews
              </NavLink>
              <NavLink
                to="/member/quotes-invoices"
                end={false}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Quotes &amp; invoices
              </NavLink>
              <NavLink
                to="/member/jobs"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Jobs
              </NavLink>
            </>
          )}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">
              {member?.name}
            </p>
            <p className="font-mono text-xs text-emerald-400/90">{member?.tvId}</p>
          </div>
          {!lockPortal ? (
            <>
              <NavLink
                to="/member/membership"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} mt-2 ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Membership
              </NavLink>
              <NavLink
                to="/member/billing"
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `${nav} ${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
                }
              >
                Billing & invoices
              </NavLink>
            </>
          ) : null}
          <NavLink
            to="/member/password"
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `${nav} ${lockPortal ? "mt-2 " : ""}${isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`
            }
          >
            {lockPortal ? "Set new password" : "Change password"}
          </NavLink>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              logout();
            }}
            className={`${nav} mt-1 w-full text-left text-slate-400 hover:bg-white/5 hover:text-white`}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-0 min-w-0 flex-1 bg-slate-100 text-slate-900 antialiased md:overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

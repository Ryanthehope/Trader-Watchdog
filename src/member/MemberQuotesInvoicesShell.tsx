import { NavLink, Outlet } from "react-router-dom";

const tabBase =
  "flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition sm:min-h-0 sm:py-3";

export function MemberQuotesInvoicesShell() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div
        className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:px-4"
        role="tablist"
        aria-label="Quotes and invoices"
      >
        <div className="mx-auto flex max-w-6xl gap-2 sm:gap-3">
          <NavLink
            to="/member/quotes-invoices/quotes"
            role="tab"
            className={({ isActive }) =>
              `${tabBase} ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/90 active:bg-slate-200"
              }`
            }
          >
            Quotes
          </NavLink>
          <NavLink
            to="/member/quotes-invoices/invoices"
            role="tab"
            className={({ isActive }) =>
              `${tabBase} ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/90 active:bg-slate-200"
              }`
            }
          >
            Customer invoices
          </NavLink>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

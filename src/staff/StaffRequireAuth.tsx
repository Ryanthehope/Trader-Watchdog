import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStaffAuth } from "./StaffAuthContext";

export function StaffRequireAuth({ children }: { children: ReactNode }) {
  const { staff, ready } = useStaffAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-slate-400">
        Checking session…
      </div>
    );
  }

  if (!staff) {
    return (
      <Navigate
        to="/login?as=staff"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

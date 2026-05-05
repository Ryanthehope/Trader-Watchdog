import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "./MemberAuthContext";

export function MemberRequireAuth({ children }: { children: ReactNode }) {
  const { member, ready } = useMemberAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Loading…
      </div>
    );
  }

  if (!member) {
    return (
      <Navigate
        to="/member/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

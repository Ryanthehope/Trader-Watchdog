import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  STAFF_TOKEN_KEY,
  apiGetAuth,
  apiPostPublic,
} from "../lib/api";

export type StaffUser = {
  id: string;
  email: string;
  name: string | null;
};

export type StaffLoginResult =
  | { ok: true }
  | { requires2fa: true; pendingToken: string };

type StaffAuthValue = {
  ready: boolean;
  staff: StaffUser | null;
  loginStaff: (email: string, password: string) => Promise<StaffLoginResult>;
  completeStaffTotp: (pendingToken: string, code: string) => Promise<void>;
  logout: () => void;
};

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(STAFF_TOKEN_KEY);
    if (!t) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAuth<{ staff: StaffUser }>("/api/admin/me");
        if (!cancelled) setStaff(data.staff);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(STAFF_TOKEN_KEY);
          setStaff(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginStaff = useCallback(async (email: string, password: string) => {
    const data = await apiPostPublic<{
      requires2fa?: boolean;
      pendingToken?: string;
      token?: string;
      staff?: StaffUser;
    }>("/api/auth/login", { email, password });
    if (data.requires2fa && data.pendingToken) {
      return { requires2fa: true as const, pendingToken: data.pendingToken };
    }
    if (data.token && data.staff) {
      localStorage.setItem(STAFF_TOKEN_KEY, data.token);
      setStaff(data.staff);
      return { ok: true as const };
    }
    throw new Error("Unexpected login response");
  }, []);

  const completeStaffTotp = useCallback(
    async (pendingToken: string, code: string) => {
      const data = await apiPostPublic<{ token: string; staff: StaffUser }>(
        "/api/auth/verify-2fa",
        { pendingToken, code }
      );
      localStorage.setItem(STAFF_TOKEN_KEY, data.token);
      setStaff(data.staff);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setStaff(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      staff,
      loginStaff,
      completeStaffTotp,
      logout,
    }),
    [ready, staff, loginStaff, completeStaffTotp, logout]
  );

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth(): StaffAuthValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error("useStaffAuth requires StaffAuthProvider");
  return ctx;
}

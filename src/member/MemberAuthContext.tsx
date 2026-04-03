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
  MEMBER_TOKEN_KEY,
  apiGetMember,
  apiPostPublic,
} from "../lib/api";

export type MemberSession = {
  id: string;
  name: string;
  tvId: string;
  slug: string;
  mustChangePassword: boolean;
  membershipAccessActive: boolean;
  membershipLegacyUnlimited: boolean;
  membershipAdminUnlimited: boolean;
  membershipBillingType: string | null;
  membershipExpiresAt: string | null;
  stripeSubscriptionStatus: string | null;
};

type Value = {
  ready: boolean;
  member: MemberSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMember: () => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberSession | null>(null);
  const [ready, setReady] = useState(false);

  const refreshMember = useCallback(async () => {
    const t = localStorage.getItem(MEMBER_TOKEN_KEY);
    if (!t) {
      setMember(null);
      return;
    }
    const data = await apiGetMember<{
      memberId: string;
      profile: { name: string; tvId: string; slug: string };
      mustChangePassword: boolean;
      membership?: {
        accessActive: boolean;
        legacyUnlimited: boolean;
        adminUnlimited: boolean;
        billingType: string | null;
        expiresAt: string | null;
        subscriptionStatus: string | null;
      };
    }>("/api/member/portal/me");
    const m = data.membership;
    setMember({
      id: data.memberId,
      name: data.profile.name,
      tvId: data.profile.tvId,
      slug: data.profile.slug,
      mustChangePassword: Boolean(data.mustChangePassword),
      membershipAccessActive: m?.accessActive ?? false,
      membershipLegacyUnlimited: m?.legacyUnlimited ?? false,
      membershipAdminUnlimited: m?.adminUnlimited ?? false,
      membershipBillingType: m?.billingType ?? null,
      membershipExpiresAt: m?.expiresAt ?? null,
      stripeSubscriptionStatus: m?.subscriptionStatus ?? null,
    });
  }, []);

  useEffect(() => {
    const t = localStorage.getItem(MEMBER_TOKEN_KEY);
    if (!t) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshMember();
      } catch {
        if (!cancelled) {
          localStorage.removeItem(MEMBER_TOKEN_KEY);
          setMember(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMember]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiPostPublic<{ token: string }>(
        "/api/member-auth/login",
        { email, password }
      );
      localStorage.setItem(MEMBER_TOKEN_KEY, data.token);
      await refreshMember();
    },
    [refreshMember]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    setMember(null);
  }, []);

  const value = useMemo(
    () => ({ ready, member, login, logout, refreshMember }),
    [ready, member, login, logout, refreshMember]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMemberAuth(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMemberAuth requires MemberAuthProvider");
  return ctx;
}

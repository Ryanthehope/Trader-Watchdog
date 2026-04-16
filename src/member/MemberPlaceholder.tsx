import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiSendMember } from "../lib/api";
import { useMemberAuth } from "./MemberAuthContext";

type Props = { title: string; children: ReactNode };

export function MemberPlaceholder({ title, children }: Props) {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function MemberRefer() {
  return (
    <MemberPlaceholder title="Refer a trade">
      <p>
        Refer another reputable trade to Trader Watchdog. A referral programme and
        tracking will be available here soon.
      </p>
    </MemberPlaceholder>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function MemberMembership() {
  const { member, refreshMember } = useMemberAuth();
  const [params, setParams] = useSearchParams();
  const [banner, setBanner] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    const c = params.get("checkout");
    if (!c) return;
    if (c === "success") {
      setBanner(
        "Payment received — syncing your subscription. Refresh if status does not update within a minute."
      );
      void refreshMember();
    } else if (c === "cancelled") {
      setBanner("Checkout was cancelled — you can try again when ready.");
    }
    const next = new URLSearchParams(params);
    next.delete("checkout");
    setParams(next, { replace: true });
  }, [params, setParams, refreshMember]);

  if (!member) {
    return (
      <MemberPlaceholder title="Membership">
        <p className="text-slate-500">Loading…</p>
      </MemberPlaceholder>
    );
  }

  const {
    membershipAccessActive,
    membershipLegacyUnlimited,
    membershipAdminUnlimited,
    membershipBillingType,
    membershipExpiresAt,
    stripeSubscriptionStatus,
  } = member;

  const startStripeCheckout = async () => {
    setCheckoutBusy(true);
    setBanner(null);
    try {
      const { url } = await apiSendMember<{ url: string }>(
        "/api/member/portal/membership/stripe-checkout",
        { method: "POST", body: "{}" }
      );
      window.location.href = url;
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const statusLine = membershipAdminUnlimited
    ? "Your portal access is set to unlimited by Trader Watchdog staff."
    : membershipLegacyUnlimited && !membershipBillingType
      ? "Your account predates online membership tracking — full portal access is open. Contact Trader Watchdog if you want to move to card billing."
      : membershipBillingType === "stripe"
        ? `Billed with Stripe. Subscription status: ${stripeSubscriptionStatus ?? "unknown"}.`
        : membershipBillingType === "manual"
          ? "Recorded by Trader Watchdog staff (manual arrangement)."
          : membershipBillingType === "fast_track"
            ? "Fast-track (one-off) listing window — portal access follows the end date below unless you add monthly membership."
            : membershipAccessActive
              ? "Membership is active."
              : "Membership is not active.";

  return (
    <MemberPlaceholder title="Membership">
      {banner ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {banner}
        </p>
      ) : null}

      <p className="font-medium text-slate-900">{statusLine}</p>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
          <span className="text-slate-500">Billing type</span>
          <span className="font-medium text-slate-900">
            {membershipAdminUnlimited
              ? "Staff: unlimited"
              : membershipLegacyUnlimited && !membershipBillingType
                ? "Legacy (unlimited)"
                : membershipBillingType === "stripe"
                  ? "Stripe subscription"
                  : membershipBillingType === "manual"
                    ? "Manual"
                    : membershipBillingType === "fast_track"
                      ? "One-off (fast-track)"
                      : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
          <span className="text-slate-500">Access until</span>
          <span className="font-medium text-slate-900">
            {formatWhen(membershipExpiresAt)}
          </span>
        </div>
        {stripeSubscriptionStatus ? (
          <div className="flex justify-between gap-4 py-2">
            <span className="text-slate-500">Stripe status</span>
            <span className="font-mono text-sm font-medium text-slate-900">
              {stripeSubscriptionStatus}
            </span>
          </div>
        ) : null}
      </div>

      {!membershipAccessActive &&
      !membershipLegacyUnlimited &&
      !membershipAdminUnlimited ? (
        <p className="mt-4 text-sm text-amber-800">
          Portal sections other than this page are locked until membership is
          active again. You can subscribe by card below, or contact Trader Watchdog
          if you pay another way.
        </p>
      ) : null}

      {stripeSubscriptionStatus === "canceled" ||
      stripeSubscriptionStatus === "unpaid" ? (
        <p className="mt-4 text-sm text-amber-800">
          Your Stripe subscription is not active. Start a new subscription below
          to restore portal access when the current period has ended.
        </p>
      ) : null}

      {membershipBillingType === "stripe" &&
      membershipAccessActive &&
      !membershipAdminUnlimited &&
      stripeSubscriptionStatus !== "canceled" &&
      stripeSubscriptionStatus !== "unpaid" ? (
        <p className="mt-6 border-t border-slate-100 pt-6 text-sm text-slate-600">
          Your membership is billed through Stripe. For payment method updates
          or cancellation, use the billing link from your Trader Watchdog emails or
          contact the team.
        </p>
      ) : (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-sm font-medium text-slate-900">
            Pay monthly with card (Stripe)
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Secure checkout sets up a Trader Watchdog monthly subscription. Use
            this if you were on manual billing, if a subscription was cancelled,
            or if your membership has expired.
          </p>
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={() => void startStripeCheckout()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {checkoutBusy ? "Starting checkout…" : "Continue to secure checkout"}
          </button>
        </div>
      )}
    </MemberPlaceholder>
  );
}

export type ApplicationPayload = {
  company: string;
  trade: string;
  email: string;
  postcode: string;
  submittedAt: string;
  recaptchaToken?: string;
};

export type SubmitResult =
  | {
      ok: true;
      via: "api" | "webhook" | "mailto";
      applicationId?: string;
      billingAvailable?: boolean;
    }
  | { ok: false; message: string };

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

declare global {
  interface Window {
    grecaptcha?: {
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
      render: (
        container: HTMLElement,
        parameters: { sitekey: string; theme?: "light" | "dark" }
      ) => number;
      ready: (callback: () => void) => void;
    };
  }
}

/** First widget only — prefer {@link getRecaptchaResponse} when multiple widgets exist. */
export function getRecaptchaToken(): string | undefined {
  const t = window.grecaptcha?.getResponse?.();
  return t?.trim() || undefined;
}

/** Response for a widget returned by `grecaptcha.render` (required when multiple widgets on one page). */
export function getRecaptchaResponse(
  widgetId: number | null | undefined
): string | undefined {
  if (widgetId == null || !Number.isFinite(widgetId)) return undefined;
  const t = window.grecaptcha?.getResponse?.(widgetId);
  return t?.trim() || undefined;
}

export async function submitApplication(
  payload: ApplicationPayload,
  files?: File[]
): Promise<SubmitResult> {
  const fileList = files?.filter(Boolean) ?? [];
  try {
    const res =
      fileList.length > 0
        ? await fetch(`${apiBase()}/api/applications`, {
            method: "POST",
            body: (() => {
              const fd = new FormData();
              fd.append("company", payload.company);
              fd.append("trade", payload.trade);
              fd.append("email", payload.email);
              fd.append("postcode", payload.postcode);
              if (payload.recaptchaToken) {
                fd.append("recaptchaToken", payload.recaptchaToken);
              }
              for (const f of fileList) {
                fd.append("files", f);
              }
              return fd;
            })(),
          })
        : await fetch(`${apiBase()}/api/applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        ok: true,
        via: "api",
        applicationId: data.application?.id,
        billingAvailable: Boolean(data.billingAvailable),
      };
    }
    if (res.status === 400 && typeof data?.error === "string") {
      return { ok: false, message: data.error };
    }
  } catch {
    // API unreachable — fall back to webhook or mailto below
  }

  const webhook = import.meta.env.VITE_APPLICATION_WEBHOOK_URL?.trim();
  const inbox = import.meta.env.VITE_APPLICATION_INBOX_EMAIL?.trim();

  if (fileList.length > 0) {
    return {
      ok: false,
      message:
        "File uploads require the Trader Watchdog API. Check that the server is running and try again, or submit without attachments and email documents separately.",
    };
  }

  if (webhook) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const secret = import.meta.env.VITE_APPLICATION_WEBHOOK_SECRET?.trim();
      if (secret) {
        headers.Authorization = `Bearer ${secret}`;
      }
      const res = await fetch(webhook, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source: "Trader Watchdog-join",
          ...payload,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          message: `We could not submit your application (${res.status}). Please try again or contact us directly.`,
        };
      }
      return { ok: true, via: "webhook" };
    } catch {
      return {
        ok: false,
        message:
          "Network error while submitting. Check your connection and try again.",
      };
    }
  }

  if (inbox) {
    const subject = encodeURIComponent("Trader Watchdog membership application");
    const body = encodeURIComponent(
      `Trader Watchdog membership application\n\n` +
        `Business name: ${payload.company}\n` +
        `Trade / specialism: ${payload.trade}\n` +
        `Work email: ${payload.email}\n` +
        `Main operating postcode: ${payload.postcode}\n` +
        `Submitted (ISO): ${payload.submittedAt}\n`
    );
    window.location.href = `mailto:${inbox}?subject=${subject}&body=${body}`;
    return { ok: true, via: "mailto" };
  }

  return {
    ok: false,
    message:
      "Applications are not configured yet. Set VITE_APPLICATION_WEBHOOK_URL (recommended) or VITE_APPLICATION_INBOX_EMAIL in your environment, then rebuild.",
  };
}

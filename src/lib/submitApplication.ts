export type ApplicationPayload = {
  company: string;
  legalStructure: string;
  tradingAddress: string;
  phone: string;
  identifiablePerson: string;
  identifiablePersonAddress: string;
  email: string;
  trade: string;
  employeeCount: number;
  postcode: string;
  wasteCarrierRequired: string;
  wasteCarrierNumber?: string;
  gasSafeRequired: string;
  gasSafeNumber?: string;
  icoRequired: string;
  icoNumber?: string;
  businessDescription?: string;
  documentsConfirmed: boolean;
  agreementAccepted: boolean;
  enquiriesAccepted: boolean;
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

export type ApplicationUploadFields = {
  files?: File[];
  wasteCarrierEvidenceFiles?: File[];
  gasSafeEvidenceFiles?: File[];
  icoEvidenceFiles?: File[];
};

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

declare global {
  interface Window {
    turnstile?: {
      getResponse: (widgetId?: string) => string;
      reset: (widgetId?: string) => void;
      render: (
        container: string | HTMLElement,
        parameters: { sitekey: string; theme?: "light" | "dark"; size?: "normal" | "compact" | "invisible" }
      ) => string;
    };
  }
}

/** Returns the Turnstile token for the given widget, or the first widget if omitted. */
export function getRecaptchaToken(widgetId?: string | null): string | undefined {
  const t = window.turnstile?.getResponse?.(widgetId ?? undefined);
  return t?.trim() || undefined;
}

/** @deprecated Use getRecaptchaToken — Turnstile widgetIds are strings, kept for API compatibility. */
export function getRecaptchaResponse(
  widgetId: number | null | undefined
): string | undefined {
  if (widgetId == null) return undefined;
  const t = window.turnstile?.getResponse?.(String(widgetId));
  return t?.trim() || undefined;
}

export async function submitApplication(
  payload: ApplicationPayload,
  uploads?: ApplicationUploadFields
): Promise<SubmitResult> {
  const fileList = uploads?.files?.filter(Boolean) ?? [];
  const wasteCarrierEvidenceFiles = uploads?.wasteCarrierEvidenceFiles?.filter(Boolean) ?? [];
  const gasSafeEvidenceFiles = uploads?.gasSafeEvidenceFiles?.filter(Boolean) ?? [];
  const icoEvidenceFiles = uploads?.icoEvidenceFiles?.filter(Boolean) ?? [];
  const hasAnyFiles =
    fileList.length > 0 ||
    wasteCarrierEvidenceFiles.length > 0 ||
    gasSafeEvidenceFiles.length > 0 ||
    icoEvidenceFiles.length > 0;
  try {
    const res =
      hasAnyFiles
        ? await fetch(`${apiBase()}/api/applications`, {
            method: "POST",
            body: (() => {
              const fd = new FormData();
              Object.entries(payload).forEach(([key, value]) => {
                if (value === undefined || value === null || value === "") return;
                fd.append(key, typeof value === "string" ? value : String(value));
              });

              for (const f of fileList) {
                fd.append("files", f);
              }

              for (const f of wasteCarrierEvidenceFiles) {
                fd.append("wasteCarrierEvidenceFiles", f);
              }

              for (const f of gasSafeEvidenceFiles) {
                fd.append("gasSafeEvidenceFiles", f);
              }

              for (const f of icoEvidenceFiles) {
                fd.append("icoEvidenceFiles", f);
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
    if (typeof data?.error === "string") {
      return { ok: false, message: data.error };
    }
    return {
      ok: false,
      message: `Application service error (${res.status}). Please try again in a moment.`,
    };
  } catch {
    // API unreachable — fall back to webhook or mailto below
  }

  const webhook = import.meta.env.VITE_APPLICATION_WEBHOOK_URL?.trim();
  const inbox = import.meta.env.VITE_APPLICATION_INBOX_EMAIL?.trim();

  if (hasAnyFiles) {
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
        `Business structure: ${payload.legalStructure}\n` +
        `Trading address: ${payload.tradingAddress}\n` +
        `Identifiable person: ${payload.identifiablePerson}\n` +
        `Identifiable person address: ${payload.identifiablePersonAddress}\n` +
        `Trade / specialism: ${payload.trade}\n` +
        `Number of employees (including self): ${payload.employeeCount}\n` +
        `Work email: ${payload.email}\n` +
        `Telephone number: ${payload.phone}\n` +
        `Main operating postcode: ${payload.postcode}\n` +
        `Waste Carrier Licence required: ${payload.wasteCarrierRequired}\n` +
        `Waste Carrier number: ${payload.wasteCarrierNumber ?? ""}\n` +
        `Gas Safe required: ${payload.gasSafeRequired}\n` +
        `Gas Safe number: ${payload.gasSafeNumber ?? ""}\n` +
        `ICO number: ${payload.icoNumber ?? ""}\n` +
        `Business description: ${payload.businessDescription ?? ""}\n` +
        `Documents confirmed: ${payload.documentsConfirmed ? "Yes" : "No"}\n` +
        `Agreement accepted: ${payload.agreementAccepted ? "Yes" : "No"}\n` +
        `Enquiries accepted: ${payload.enquiriesAccepted ? "Yes" : "No"}\n` +
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

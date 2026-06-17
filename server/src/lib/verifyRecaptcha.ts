export type TurnstileVerifyResult = {
  ok: boolean;
  errorCodes: string[];
  hostname: string | null;
};

export async function verifyRecaptchaV2(
  secret: string,
  token: string | undefined
): Promise<TurnstileVerifyResult> {
  const t = token?.trim();
  if (!t) {
    return { ok: false, errorCodes: ["missing-input-response"], hostname: null };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", t);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as {
      success?: boolean;
      hostname?: string;
      "error-codes"?: string[];
    };

    return {
      ok: Boolean(data.success),
      errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"] : [],
      hostname: typeof data.hostname === "string" ? data.hostname : null,
    };
  } catch {
    return {
      ok: false,
      errorCodes: ["verification-request-failed"],
      hostname: null,
    };
  }
}

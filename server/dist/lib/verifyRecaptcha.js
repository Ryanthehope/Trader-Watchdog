export async function verifyRecaptchaV2(secret, token) {
    const t = token?.trim();
    if (!t)
        return false;
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", t);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        body,
    });
    const data = (await res.json());
    return Boolean(data.success);
}

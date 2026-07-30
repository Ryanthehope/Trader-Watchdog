const FORBIDDEN_JWT_SECRETS = new Set([
    "tradeverify-dev-insecure-secret",
    "change-this-to-a-long-random-string-in-production",
]);


export function getJwtSecret(): string{
    const secret = process.env.JWT_SECRET?.trim();

    if (
        !secret ||
        secret.length < 32 ||
        FORBIDDEN_JWT_SECRETS.has(secret)
    ) {
        throw new Error(
            "JWT_SECRET must be a unique random value containing at least 32 characters."
        );
    }

    return secret;
}
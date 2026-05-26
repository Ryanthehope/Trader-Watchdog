/**
 * Shared helper for extracting a human-readable error and HTTP status from a
 * GoCardless API error (or any other thrown value).
 */
export function goCardlessErrorDetails(error: unknown): {
  statusCode: number;
  message: string;
} {
  const fallback = {
    statusCode: 500,
    message: "Could not start checkout",
  };

  if (!(error instanceof Error)) {
    return fallback;
  }

  const timedOut = /timed out/i.test(error.message);
  if (timedOut) {
    return {
      statusCode: 504,
      message:
        "GoCardless did not respond in time. Please try again, and if it keeps happening check the GoCardless access token, environment, and network access from the backend.",
    };
  }

  const maybeApiError = error as Error & {
    errors?: Array<{ message?: string; reason?: string; field?: string; request_pointer?: string }>;
    statusCode?: number;
    errorType?: string;
    /** GoCardless ApiError uses `code` (string) for the HTTP status, e.g. "401" */
    code?: number | string;
    requestId?: string;
  };

  // Map GoCardless `code` field (HTTP status as string/number) to a numeric status
  const gcHttpStatus =
    typeof maybeApiError.statusCode === "number"
      ? maybeApiError.statusCode
      : typeof maybeApiError.code === "number"
        ? maybeApiError.code
        : typeof maybeApiError.code === "string" && /^\d+$/.test(maybeApiError.code)
          ? Number(maybeApiError.code)
          : null;

  if (Array.isArray(maybeApiError.errors) && maybeApiError.errors.length > 0) {
    const detail = maybeApiError.errors
      .map((entry) =>
        [entry.reason, entry.message, entry.field, entry.request_pointer]
          .filter(Boolean)
          .join(" – ")
      )
      .join("; ");
    const gcMeta = [maybeApiError.errorType, gcHttpStatus ? `HTTP ${gcHttpStatus}` : null]
      .filter(Boolean)
      .join(" ");
    return {
      statusCode: gcHttpStatus ?? 502,
      message: [detail || error.message || fallback.message, gcMeta || null]
        .filter(Boolean)
        .join(" | "),
    };
  }

  if (error.message.trim()) {
    return {
      statusCode: gcHttpStatus ?? 500,
      message: error.message,
    };
  }

  return fallback;
}

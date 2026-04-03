const base = () => (import.meta.env.VITE_API_URL as string | undefined) || "";

/**
 * Absolute URL for public API assets (e.g. badge SVG `<img src>`).
 * Uses `VITE_API_URL` when set; otherwise the current origin so requests are not
 * wrong on nested routes or when the API host must match the page.
 */
export function publicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const b = base().trim();
  if (b) return `${b.replace(/\/$/, "")}${p}`;
  if (typeof window !== "undefined") return `${window.location.origin}${p}`;
  return p;
}

export const STAFF_TOKEN_KEY = "tradeverify_staff_token";
export const MEMBER_TOKEN_KEY = "tradeverify_member_token";

export function authHeaders(): HeadersInit {
  const t = localStorage.getItem(STAFF_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function memberAuthHeaders(): HeadersInit {
  const t = localStorage.getItem(MEMBER_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function apiUnreachableHint(status: number): string {
  if (status === 404) {
    return " API returned 404 — start the backend on port 3001 (from the project folder run npm run dev so both client and server start, or npm run dev --prefix server). If you use vite preview, the API must still be running separately.";
  }
  return "";
}

export async function apiPostPublic<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection or try again in a moment."
    );
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    const hint = apiUnreachableHint(res.status);
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `${res.status} ${res.statusText}.${hint}`
    );
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    ...(authHeaders() as Record<string, string>),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${base()}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const baseErr =
      typeof data?.error === "string" ? data.error : `${res.status} ${res.statusText}`;
    const detail =
      typeof (data as { detail?: unknown })?.detail === "string"
        ? (data as { detail: string }).detail
        : "";
    throw new Error(detail ? `${baseErr} — ${detail}` : baseErr);
  }
  return data as T;
}

export async function apiGetAuth<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<T>;
}

export async function apiGetAuthBlob(path: string): Promise<Blob> {
  const res = await fetch(`${base()}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `${res.status} ${res.statusText}`
    );
  }
  return res.blob();
}

export async function apiGetMember<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    cache: "no-store",
    headers: memberAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<T>;
}

export async function apiSendMember<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    ...(memberAuthHeaders() as Record<string, string>),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${base()}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `${res.status} ${res.statusText}`
    );
  }
  return data as T;
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiPostMemberForm<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: memberAuthHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `${res.status} ${res.statusText}`
    );
  }
  return data as T;
}

export async function apiGetMemberBlob(path: string): Promise<Blob> {
  const res = await fetch(`${base()}${path}`, {
    headers: memberAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.error === "string" ? err.error : `${res.status} ${res.statusText}`
    );
  }
  return res.blob();
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/** Turn FastAPI error bodies into a human-readable message + per-field map. */
export function parseErrorBody(status: number, raw: string): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (!raw) return { message: `Request failed (HTTP ${status})`, fields };
  try {
    const data = JSON.parse(raw);
    const detail = data.detail ?? data.message;
    if (typeof detail === "string") return { message: detail, fields };
    if (Array.isArray(detail)) {
      for (const item of detail) {
        const loc = Array.isArray(item.loc) ? item.loc.join(".").replace(/^body\./, "") : "";
        const msg: string = item.msg ?? "Invalid value";
        if (loc && loc !== "__root__") fields[loc] = msg;
      }
      const first = detail[0];
      const firstMsg: string = first?.msg ?? "Validation failed";
      const firstLoc = Array.isArray(first?.loc) ? first.loc.join(".").replace(/^body\./, "") : "";
      const summary = Object.keys(fields).length
        ? `${firstMsg}${firstLoc ? ` (${firstLoc})` : ""}`
        : firstMsg;
      // Friendly rewrite for common cases
      if (/email/i.test(summary) && /valid/i.test(summary)) {
        return { message: "Enter a valid email address.", fields };
      }
      return { message: summary, fields };
    }
    return { message: typeof data === "string" ? data : `Request failed (HTTP ${status})`, fields };
  } catch {
    // Non-JSON (proxy/network HTML etc.) — trim to first line.
    const line = raw.split("\n")[0].slice(0, 300);
    return { message: line || `Request failed (HTTP ${status})`, fields };
  }
}

export function friendlyMessage(status: number, message: string): string {
  if (status === 409) return message || "Already registered.";
  if (status === 401) return message || "Invalid email or password.";
  if (status === 403) return message || "Not allowed.";
  if (status === 404) return message || "Not found — check selected hospital / specialization.";
  if (status === 422) return message || "Check the highlighted fields.";
  if (status >= 500) return "Server error. Try again in a moment.";
  return message;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((init.headers as Record<string, string>) ?? {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running on http://localhost:8000?");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const parsed = parseErrorBody(res.status, text);
    if (res.status === 401 && typeof window !== "undefined") {
      // Don't wipe session while on the login page itself (failed login attempt).
      if (!window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, friendlyMessage(res.status, parsed.message), parsed.fields);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const get = <T>(p: string) => api<T>(p);
export const post = <T>(p: string, body?: unknown) => api<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const patch = <T>(p: string, body?: unknown) => api<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const del = <T>(p: string) => api<T>(p, { method: "DELETE" });

const base = "";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const { token: _t, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...rest, headers });
  } catch (e) {
    const hint =
      typeof window !== "undefined" && window.location?.port === "5173"
        ? " Start the API (npm run dev -w server on port 4000)."
        : " Check that the API is running on port 4000.";
    throw new ApiError(
      0,
      e instanceof Error ? `${e.message}.${hint}` : `Network error.${hint}`
    );
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new ApiError(res.status, msg || "Request failed", data);
  }
  return data as T;
}

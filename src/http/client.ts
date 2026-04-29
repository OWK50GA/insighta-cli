import { readCredentials } from "../auth/credentials";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from "../errors";

export interface ApiRequestOptions {
  method: "GET" | "POST" | "DELETE";
  /**
   * Full path including prefix, e.g. '/api/profiles' or '/auth/me'.
   * The client does NOT add any prefix — callers are responsible for
   * supplying the correct path per the routing contract:
   *   - Profile routes: /api/<resource>
   *   - Auth routes:    /auth/<resource>
   */
  path: string;
  query?: Record<string, string | number>;
  body?: unknown;
  accessToken: string;
  operation?: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

const BASE_URL = process.env.INSIGHTA_API_URL ?? "http://localhost:3000";

function buildUrl(
  path: string,
  query?: Record<string, string | number>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  options: ApiRequestOptions,
): Promise<ApiResponse<T>> {
  const { method, path, query, body, accessToken, operation = path } = options;

  const url = buildUrl(path, query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "x-client-type": "cli",
    "x-api-version": "1",
  };

  let bodyStr: string | undefined;
  if (body !== undefined) {
    bodyStr = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new NetworkError(operation, message);
  }

  const { status } = response;

  // 401 — delegate to token refresher which will retry the original request once
  if (status === 401) {
    const { refreshAndRetry } = await import("./token-refresher");
    return refreshAndRetry<T>(options);
  }

  if (status === 403) {
    const role = readCredentials()?.role ?? "unknown";
    throw new ForbiddenError(role);
  }

  if (status === 404) {
    const segments = path.replace(/\/$/, "").split("/");
    const id = segments[segments.length - 1] ?? "";
    throw new NotFoundError(id);
  }

  if (status === 422) {
    let message = "Unprocessable entity";
    let details: Record<string, string[]> = {};
    try {
      const errorBody = (await response.json()) as {
        message?: string;
        details?: Record<string, string[]>;
      };
      if (errorBody.message) message = errorBody.message;
      if (errorBody.details) details = errorBody.details;
    } catch {
      // ignore parse errors
    }
    throw new ValidationError(message, details);
  }

  if (status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter =
      retryAfterHeader != null ? parseInt(retryAfterHeader, 10) : undefined;
    throw new RateLimitError(
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }

  if (status === 204) {
    return { status, data: null as unknown as T, headers: response.headers };
  }

  const data = (await response.json()) as T;
  return { status, data, headers: response.headers };
}

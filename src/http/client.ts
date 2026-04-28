import { readCredentials } from '../auth/credentials';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from '../errors';

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'DELETE';
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

const BASE_URL = process.env.INSIGHTA_API_URL ?? 'http://localhost:3000';
const API_PREFIX = '/api/v1';

function buildUrl(path: string, query?: Record<string, string | number>): string {
  const normalizedPath = path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  const url = new URL(normalizedPath, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const { method, path, query, body, accessToken, operation = path } = options;

  const url = buildUrl(path, query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  let bodyStr: string | undefined;
  if (body !== undefined) {
    bodyStr = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
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

  // 401 — return as-is for the token refresher to handle
  if (status === 401) {
    const { refreshAndRetry } = await import('./token-refresher')
    // return { status, data: undefined as unknown as T, headers: response.headers };
    return refreshAndRetry<T>(options);
  }

  if (status === 403) {
    const role = readCredentials()?.role ?? 'unknown';
    throw new ForbiddenError(role);
  }

  if (status === 404) {
    const segments = path.replace(/\/$/, '').split('/');
    const id = segments[segments.length - 1] ?? '';
    throw new NotFoundError(id);
  }

  if (status === 422) {
    let message = 'Unprocessable entity';
    let details: Record<string, string[]> = {};
    try {
      const errorBody = await response.json() as { message?: string; details?: Record<string, string[]> };
      if (errorBody.message) message = errorBody.message;
      if (errorBody.details) details = errorBody.details;
    } catch {
      // ignore parse errors
    }
    throw new ValidationError(message, details);
  }

  if (status === 429) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfter = retryAfterHeader != null ? parseInt(retryAfterHeader, 10) : undefined;
    throw new RateLimitError(Number.isFinite(retryAfter) ? retryAfter : undefined);
  }

  if (status === 204) {
    return { status, data: null as unknown as T, headers: response.headers };
  }

  const data = await response.json() as T;
  return { status, data, headers: response.headers };
}

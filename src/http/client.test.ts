import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../errors";
import { apiRequest } from "./client";

// Mock credentials so ForbiddenError can read the role
vi.mock("../auth/credentials", () => ({
  readCredentials: vi.fn(() => ({
    role: "analyst",
    accessToken: "tok",
    refreshToken: "ref",
    expiresAt: 9999999999999,
    username: "user",
  })),
}));

// Mock token-refresher to avoid circular dependency issues in tests
vi.mock("./token-refresher", () => ({
  refreshAndRetry: vi.fn(async () => ({
    status: 200,
    data: { retried: true },
    headers: new Headers(),
  })),
}));

const BASE_OPTIONS = {
  method: "GET" as const,
  path: "/profiles",
  accessToken: "test-token",
  operation: "test-op",
};

function makeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const h = new Headers(headers);
  return {
    status,
    headers: h,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns data on 200", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, { id: "1" }));
    const result = await apiRequest<{ id: string }>(BASE_OPTIONS);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: "1" });
  });

  it("injects Authorization header", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, {}));
    await apiRequest(BASE_OPTIONS);
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token",
    );
  });

  it("throws ForbiddenError on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(403));
    await expect(apiRequest(BASE_OPTIONS)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("ForbiddenError message includes role", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(403));
    await expect(apiRequest(BASE_OPTIONS)).rejects.toThrow("analyst");
  });

  it("throws NotFoundError on 404", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(404));
    await expect(apiRequest(BASE_OPTIONS)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("NotFoundError id is last path segment", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(404));
    const err = await apiRequest({
      ...BASE_OPTIONS,
      path: "/profiles/abc-123",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).id).toBe("abc-123");
  });

  it("throws ValidationError on 422", async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(422, {
        message: "bad input",
        details: { name: ["too short"] },
      }),
    );
    await expect(apiRequest(BASE_OPTIONS)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("ValidationError includes message and details", async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(422, {
        message: "bad input",
        details: { name: ["too short"] },
      }),
    );
    const err = (await apiRequest(BASE_OPTIONS).catch(
      (e) => e,
    )) as ValidationError;
    expect(err.message).toContain("bad input");
    expect(err.details).toEqual({ name: ["too short"] });
  });

  it("throws RateLimitError on 429 without Retry-After", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(429));
    const err = (await apiRequest(BASE_OPTIONS).catch(
      (e) => e,
    )) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBeUndefined();
  });

  it("RateLimitError includes retryAfter when header present", async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(429, {}, { "Retry-After": "30" }),
    );
    const err = (await apiRequest(BASE_OPTIONS).catch(
      (e) => e,
    )) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(30);
    expect(err.message).toContain("30");
  });

  it("throws NetworkError when fetch rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(apiRequest(BASE_OPTIONS)).rejects.toBeInstanceOf(NetworkError);
  });

  it("NetworkError message includes operation name", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    const err = (await apiRequest({
      ...BASE_OPTIONS,
      operation: "list-profiles",
    }).catch((e) => e)) as NetworkError;
    expect(err.message).toContain("list-profiles");
  });

  it("delegates 401 to refreshAndRetry", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(401));
    const { refreshAndRetry } = await import("./token-refresher");
    const result = await apiRequest(BASE_OPTIONS);
    expect(vi.mocked(refreshAndRetry)).toHaveBeenCalledOnce();
    expect(result.data).toEqual({ retried: true });
  });

  it("uses path as-is for profile routes", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, {}));
    await apiRequest({ ...BASE_OPTIONS, path: "/api/profiles" });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("/api/profiles");
    expect(String(url)).not.toContain("/api/v1");
  });

  it("uses path as-is for auth routes", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, {}));
    await apiRequest({ ...BASE_OPTIONS, path: "/auth/me" });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("/auth/me");
    expect(String(url)).not.toContain("/api/v1");
  });

  it("appends query params to URL", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, {}));
    await apiRequest({ ...BASE_OPTIONS, query: { page: 2, limit: 10 } });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("page=2");
    expect(String(url)).toContain("limit=10");
  });

  it("sends JSON body with Content-Type header on POST", async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(201, { id: "new" }));
    await apiRequest({
      ...BASE_OPTIONS,
      method: "POST",
      body: { name: "Alice" },
    });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init?.body).toBe(JSON.stringify({ name: "Alice" }));
  });
});

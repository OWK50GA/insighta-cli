import { describe, it, expect } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import * as http from "http";
import { startCallbackServer } from "./callback-server";
import { TimeoutError } from "../errors";

// Helper: make a GET request and return the status code
function httpGet(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume(); // drain the response
        resolve(res.statusCode ?? 0);
      })
      .on("error", reject);
  });
}

/**
 * Property 3: Callback server resolves with code and state from GitHub
 * Validates: Requirements 2.4
 */
describe("startCallbackServer", () => {
  test.prop(
    [
      fc.string({ minLength: 1 }), // code
      fc.string({ minLength: 1 }), // state
    ],
    { numRuns: 50 },
  )(
    "Property 3: resolves with code and state exactly as received in the callback",
    async (code, state) => {
      const { port, result } = await startCallbackServer();

      const url =
        `http://127.0.0.1:${port}/callback` +
        `?code=${encodeURIComponent(code)}` +
        `&state=${encodeURIComponent(state)}`;

      await httpGet(url);
      const callbackResult = await result;

      expect(callbackResult.code).toBe(code);
      expect(callbackResult.state).toBe(state);
    },
  );

  it("returns 400 when code is missing from callback", async () => {
    const { port, result } = await startCallbackServer(5_000);
    const status = await httpGet(`http://127.0.0.1:${port}/callback?state=abc`);
    expect(status).toBe(400);
    result.catch(() => {});
  });

  it("returns 400 when state is missing from callback", async () => {
    const { port, result } = await startCallbackServer(5_000);
    const status = await httpGet(`http://127.0.0.1:${port}/callback?code=xyz`);
    expect(status).toBe(400);
    result.catch(() => {});
  });

  it("returns 404 for non-callback paths", async () => {
    const { port, result } = await startCallbackServer(5_000);
    const status = await httpGet(`http://127.0.0.1:${port}/other`);
    expect(status).toBe(404);
    result.catch(() => {});
  });

  it("rejects with TimeoutError when the timeout elapses", async () => {
    const { result } = await startCallbackServer(50);
    await expect(result).rejects.toBeInstanceOf(TimeoutError);
  });
});

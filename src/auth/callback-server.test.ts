import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import * as http from 'http';
import { startCallbackServer } from './callback-server';
import { TimeoutError } from '../errors';

// Helper: make a GET request and return the status code
function httpGet(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.resume(); // drain the response
      resolve(res.statusCode ?? 0);
    }).on('error', reject);
  });
}

/**
 * Property 1: Callback server resolves with all three token fields
 * Validates: Requirements 2.4
 */
describe('startCallbackServer', () => {
  test.prop(
    [
      fc.string({ minLength: 1 }),   // access_token
      fc.string({ minLength: 1 }),   // refresh_token
      fc.integer({ min: 1 }),        // expires_in (positive)
    ],
    { numRuns: 50 }
  )(
    'Property 1: resolves with all three token fields matching the query params',
    async (accessToken, refreshToken, expiresIn) => {
      const { port, token } = startCallbackServer();

      const encodedAccess = encodeURIComponent(accessToken);
      const encodedRefresh = encodeURIComponent(refreshToken);
      const url =
        `http://127.0.0.1:${port}/callback` +
        `?access_token=${encodedAccess}` +
        `&refresh_token=${encodedRefresh}` +
        `&expires_in=${expiresIn}`;

      await httpGet(url);
      const result = await token;

      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.expiresIn).toBe(expiresIn);
    }
  );

  it('rejects with TimeoutError when the timeout elapses', async () => {
    const { token } = startCallbackServer(50);
    await expect(token).rejects.toBeInstanceOf(TimeoutError);
  });
});

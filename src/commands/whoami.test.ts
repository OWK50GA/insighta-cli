import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";

// Mocks must be declared before importing the module under test
vi.mock("../auth/credentials", () => ({
  credentialsExist: vi.fn(),
  readCredentials: vi.fn(),
}));

vi.mock("../http/client", () => ({
  apiRequest: vi.fn(),
}));

import { whoami } from "./whoami";
import * as credentials from "../auth/credentials";
import * as client from "../http/client";

const mockCredentialsExist = vi.mocked(credentials.credentialsExist);
const mockReadCredentials = vi.mocked(credentials.readCredentials);
const mockApiRequest = vi.mocked(client.apiRequest);

describe("whoami", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: number) => {
        throw new Error(`process.exit(${_code})`);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays "Not logged in" and exits with code 1 when not authenticated', async () => {
    mockCredentialsExist.mockReturnValue(false);

    await expect(whoami()).rejects.toThrow("process.exit(1)");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Not logged in. Run `insighta login` to authenticate.",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  /**
   * Property 20: whoami displays both username and role from the API
   * Validates: Requirements 15.1, 15.2
   */
  test.prop([
    fc.string({ minLength: 1 }),
    fc.constantFrom("admin" as const, "analyst" as const),
  ])(
    "Property 20: whoami displays both username and role from the API",
    async (username, role) => {
      mockCredentialsExist.mockReturnValue(true);
      mockReadCredentials.mockReturnValue({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600_000,
        username,
        role,
      });
      mockApiRequest.mockResolvedValue({
        status: 200,
        data: { data: { username, role } },
        headers: new Headers(),
      });

      const logs: string[] = [];
      consoleLogSpy.mockImplementation((msg: string) => {
        logs.push(msg);
      });

      await whoami();

      const output = logs.join("\n");
      expect(output).toContain(username);
      expect(output).toContain(role);
    },
  );
});

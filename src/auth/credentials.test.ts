import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Credentials,
  credentialsExist,
  deleteCredentials,
  readCredentials,
  writeCredentials,
} from "./credentials";

vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof os>();
  return { ...actual };
});

const TEST_DIR = path.join(os.tmpdir(), `insighta-creds-test-${process.pid}`);
const TEST_CREDS_PATH = path.join(TEST_DIR, "credentials.json");

beforeEach(() => {
  vi.spyOn(os, "homedir").mockReturnValue(
    path.join(TEST_DIR, "..", `home-${Date.now()}`),
  );
  // Use a stable test dir per test
  const home = os.homedir();
  fs.mkdirSync(path.join(home, ".insighta"), { recursive: true });
});

afterEach(() => {
  const home = os.homedir();
  fs.rmSync(home, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function getTestCredPath(): string {
  return path.join(os.homedir(), ".insighta", "credentials.json");
}

const sampleCreds: Credentials = {
  accessToken: "gho_abc123",
  refreshToken: "ghr_xyz789",
  expiresAt: 1720000000000,
  username: "octocat",
  role: "analyst",
};

describe("credentials store", () => {
  it("readCredentials returns null when file does not exist", () => {
    expect(readCredentials()).toBeNull();
  });

  it("credentialsExist returns false when file does not exist", () => {
    expect(credentialsExist()).toBe(false);
  });

  it("writeCredentials creates the file and readCredentials returns the same object", () => {
    writeCredentials(sampleCreds);
    const result = readCredentials();
    expect(result).toEqual(sampleCreds);
  });

  it("writeCredentials sets file permissions to 0600", () => {
    writeCredentials(sampleCreds);
    const stat = fs.statSync(getTestCredPath());
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("credentialsExist returns true after writing", () => {
    writeCredentials(sampleCreds);
    expect(credentialsExist()).toBe(true);
  });

  it("deleteCredentials removes the file", () => {
    writeCredentials(sampleCreds);
    deleteCredentials();
    expect(credentialsExist()).toBe(false);
  });

  it("deleteCredentials does not throw when file does not exist", () => {
    expect(() => deleteCredentials()).not.toThrow();
  });

  it("writeCredentials overwrites existing credentials", () => {
    writeCredentials(sampleCreds);
    const updated: Credentials = {
      ...sampleCreds,
      accessToken: "gho_new",
      role: "admin",
    };
    writeCredentials(updated);
    expect(readCredentials()).toEqual(updated);
  });
});

// Feature: insighta-cli, Property 2: Credentials round-trip preserves all fields
// Feature: insighta-cli, Property 3: Credentials file permissions are always 0600
import fc from "fast-check";
import { test } from "@fast-check/vitest";

const credentialsArb = fc.record({
  accessToken: fc.string({ minLength: 1 }),
  refreshToken: fc.string({ minLength: 1 }),
  expiresAt: fc.integer({ min: 0 }),
  username: fc.string({ minLength: 1 }),
  role: fc.constantFrom("admin" as const, "analyst" as const),
});

describe("property tests", () => {
  // Property 2: Credentials round-trip preserves all fields
  // Validates: Requirements 1.2
  test.prop([credentialsArb], { numRuns: 100 })(
    "round-trip write/read preserves all credential fields",
    (creds) => {
      writeCredentials(creds);
      const result = readCredentials();
      expect(result).toEqual(creds);
    },
  );

  // Property 3: Credentials file permissions are always 0600
  // Validates: Requirements 1.2
  test.prop([credentialsArb], { numRuns: 100 })(
    "credentials file permissions are always 0600",
    (creds) => {
      writeCredentials(creds);
      const stat = fs.statSync(getTestCredPath());
      expect(stat.mode & 0o777).toBe(0o600);
    },
  );
});

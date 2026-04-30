import {
  credentialsExist,
  readCredentials,
  deleteCredentials,
} from "../auth/credentials";
import { apiRequest } from "../http/client";
import { NetworkError } from "../errors";

export async function logout(): Promise<void> {
  if (!credentialsExist()) {
    console.log("You are already logged out.");
    return;
  }

  const creds = readCredentials();

  if (creds) {
    try {
      await apiRequest({
        method: "POST",
        path: "/auth/logout",
        body: { refresh_token: creds.refreshToken },
        accessToken: creds.accessToken,
        operation: "POST /auth/logout",
      });
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        console.warn(
          `Warning: could not reach server to revoke session — ${err.message}`,
        );
      }
      // non-network errors are silently ignored; we still delete local credentials
    }
  }

  deleteCredentials();
  console.log("Logged out successfully.");
}

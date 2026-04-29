import open from "open";
import {
  generatePKCEParams,
  buildGitHubAuthUrl,
  getCallbackPort,
} from "../auth/pkce";
import { startCallbackServer } from "../auth/callback-server";
import { writeCredentials } from "../auth/credentials";
import { TimeoutError } from "../errors";

const BASE_URL = process.env.INSIGHTA_API_URL ?? "http://localhost:3000";

interface ExchangeResponse {
  status: string;
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

interface MeResponse {
  status: string;
  user: {
    username: string;
    role: "admin" | "analyst";
  };
}

export async function login(): Promise<void> {
  // Step 1: Generate PKCE params
  const pkceParams = generatePKCEParams();

  // Step 2: Start local callback server on the configured port
  const callbackPort = getCallbackPort();
  const { port, result } = await startCallbackServer(300_000, callbackPort);

  // Step 3: Construct GitHub OAuth URL and open in browser
  const authUrl = buildGitHubAuthUrl(pkceParams, port);
  console.log(
    `Opening browser for GitHub login... (waiting for callback on port ${port})`,
  );
  await open(authUrl);

  let code: string;
  let receivedState: string;

  try {
    // Step 4: Wait for GitHub to redirect to our local server
    const callbackResult = await result;
    code = callbackResult.code;
    receivedState = callbackResult.state;
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.error(
        "Login timed out. The browser flow was not completed within 5 minutes.",
      );
      process.exit(1);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Authentication failed: ${message}`);
    process.exit(1);
  }

  // Step 5: Validate state to prevent CSRF
  if (receivedState !== pkceParams.state) {
    console.error(
      "Authentication failed: state mismatch. The OAuth callback may have been tampered with.",
    );
    process.exit(1);
  }

  // Step 6: Exchange code + code_verifier with the backend
  // Backend CLI branch reads: req.query.code and req.query.state (used as code_verifier)
  // and requires x-client-type: cli header
  const exchangeUrl = new URL("/auth/github/callback", BASE_URL);
  exchangeUrl.searchParams.set("code", code);
  exchangeUrl.searchParams.set("state", pkceParams.codeVerifier); // backend reads state as code_verifier for CLI

  let exchangeData: ExchangeResponse;
  try {
    const exchangeRes = await fetch(exchangeUrl.toString(), {
      method: "GET",
      headers: { "x-client-type": "cli" },
    });

    if (!exchangeRes.ok) {
      let detail = exchangeRes.statusText;
      try {
        const body = (await exchangeRes.json()) as { message?: string };
        if (body.message) detail = body.message;
      } catch {
        /* ignore */
      }
      console.error(`Authentication failed: ${detail}`);
      process.exit(1);
    }

    exchangeData = (await exchangeRes.json()) as ExchangeResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Authentication failed: ${message}`);
    process.exit(1);
  }

  // Step 7: Validate token fields
  if (
    !exchangeData.access_token ||
    !exchangeData.refresh_token ||
    !exchangeData.expires_in
  ) {
    console.error(
      "Authentication failed: server response is missing required token fields.",
    );
    process.exit(1);
  }

  // Step 8: Fetch user info with the new access token
  let meData: MeResponse;
  try {
    const meRes = await fetch(new URL("/auth/me", BASE_URL).toString(), {
      headers: {
        Authorization: `Bearer ${exchangeData.access_token}`,
        "x-client-type": "cli",
      },
    });

    if (!meRes.ok) {
      console.error(
        "Authentication failed: could not retrieve user information.",
      );
      process.exit(1);
    }

    meData = (await meRes.json()) as MeResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Authentication failed: ${message}`);
    process.exit(1);
  }

  // Step 9: Persist credentials and confirm login
  writeCredentials({
    accessToken: exchangeData.access_token,
    refreshToken: exchangeData.refresh_token,
    expiresAt: Date.now() + exchangeData.expires_in * 1000,
    username: meData.user.username,
    role: meData.user.role,
  });

  console.log(`Logged in as @${meData.user.username}`);
}

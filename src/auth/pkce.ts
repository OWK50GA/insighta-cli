import crypto from 'crypto';

export interface PKCEParams {
  /** Cryptographically random hex nonce — used to validate the OAuth callback. */
  state: string;
  /** Cryptographically random base64url string (≥ 43 chars) — the PKCE secret. */
  codeVerifier: string;
  /** base64url(sha256(codeVerifier)) — sent to GitHub so it can verify the exchange. */
  codeChallenge: string;
}

/**
 * Generates a fresh set of PKCE parameters for a single login attempt.
 * All values are cryptographically random and single-use.
 */
export function generatePKCEParams(): PKCEParams {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { state, codeVerifier, codeChallenge };
}

/**
 * Returns the port the CLI callback server should listen on.
 *
 * Reads INSIGHTA_CALLBACK_PORT env var, defaults to 9876.
 * Register http://127.0.0.1:<port>/callback in your GitHub OAuth app settings.
 */
export function getCallbackPort(): number {
  const envPort = process.env.INSIGHTA_CALLBACK_PORT;
  if (envPort) {
    const n = parseInt(envPort, 10);
    if (Number.isFinite(n) && n > 0 && n < 65536) return n;
  }
  return 9876;
}

/**
 * Constructs the GitHub OAuth authorization URL that the CLI opens in the browser.
 *
 * `client_id` is read from GITHUB_CLIENT_ID env var.
 * The redirect_uri points to http://127.0.0.1:<port>/callback — this must be
 * registered in your GitHub OAuth app settings.
 */
export function buildGitHubAuthUrl(params: PKCEParams, port: number): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID environment variable is not set.');
  }

  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    response_type: 'code',
  });

  return `https://github.com/login/oauth/authorize?${query.toString()}`;
}

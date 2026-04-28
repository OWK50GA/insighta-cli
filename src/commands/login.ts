import open from 'open';
import { startCallbackServer } from '../auth/callback-server';
import { writeCredentials } from '../auth/credentials';
import { apiRequest } from '../http/client';
import { TimeoutError } from '../errors';

interface MeResponse {
  data: {
    username: string;
    role: 'admin' | 'analyst';
  };
}

export async function login(): Promise<void> {
  const { port, token } = startCallbackServer();

  const baseUrl = process.env.INSIGHTA_API_URL ?? 'http://localhost:3000';
  const callbackUrl = `http://127.0.0.1:${port}/callback`;
  const oauthUrl = `${baseUrl}/api/v1/auth/github?callback_url=${encodeURIComponent(callbackUrl)}`;

  console.log(`Opening browser for GitHub login... (waiting for callback on port ${port})`);
  await open(oauthUrl);

  try {
    const result = await token;

    const expiresAt = Date.now() + result.expiresIn * 1000;

    const meResponse = await apiRequest<MeResponse>({
      method: 'GET',
      path: '/api/v1/auth/me',
      accessToken: result.accessToken,
      operation: 'GET /api/v1/auth/me',
    });

    const { username, role } = meResponse.data.data;

    writeCredentials({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt,
      username,
      role,
    });

    console.log(`Logged in as ${username} (${role})`);
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      console.error(err.message);
      process.exit(1);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  }
}

import * as http from 'http';
import { URL } from 'url';
import { TimeoutError } from '../errors';

export interface TokenCallbackResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Starts a temporary HTTP server on a random port (bind to 0).
 * Returns the port synchronously so the caller can construct the OAuth URL.
 * The `token` promise resolves when the backend redirects to
 * GET /callback?access_token=...&refresh_token=...&expires_in=...
 * and rejects with TimeoutError after `timeoutMs` milliseconds.
 * The server is always closed on resolve or reject.
 */
export function startCallbackServer(timeoutMs = 300_000): {
  port: number;
  token: Promise<TokenCallbackResult>;
} {
  const server = http.createServer();

  // Start listening on a random OS-assigned port
  server.listen(0);

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind callback server to a port');
  }
  const port = address.port;

  const token = new Promise<TokenCallbackResult>((resolve, reject) => {
    let settled = false;

    const cleanup = (fn: () => void) => {
      if (settled) return;
      settled = true;
      server.close();
      fn();
    };

    const timer = setTimeout(() => {
      cleanup(() => reject(new TimeoutError()));
    }, timeoutMs);

    server.on('request', (req, res) => {
      if (settled) {
        res.writeHead(200);
        res.end('OK');
        return;
      }

      try {
        const reqUrl = new URL(req.url ?? '', `http://127.0.0.1:${port}`);

        if (reqUrl.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const accessToken = reqUrl.searchParams.get('access_token');
        const refreshToken = reqUrl.searchParams.get('refresh_token');
        const expiresInStr = reqUrl.searchParams.get('expires_in');

        if (!accessToken || !refreshToken || expiresInStr === null) {
          res.writeHead(400);
          res.end('Missing required query parameters');
          return;
        }

        const expiresIn = parseInt(expiresInStr, 10);
        if (!Number.isFinite(expiresIn)) {
          res.writeHead(400);
          res.end('Invalid expires_in value');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Login successful. You may close this tab.');

        clearTimeout(timer);
        cleanup(() =>
          resolve({ accessToken, refreshToken, expiresIn })
        );
      } catch (err) {
        res.writeHead(500);
        res.end('Internal error');
        clearTimeout(timer);
        cleanup(() => reject(err));
      }
    });

    server.on('error', (err) => {
      clearTimeout(timer);
      cleanup(() => reject(err));
    });
  });

  return { port, token };
}

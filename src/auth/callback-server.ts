import * as http from 'http';
import { URL } from 'url';
import { TimeoutError } from '../errors';

export interface OAuthCallbackResult {
  code: string;
  state: string;
}

/**
 * Starts a temporary HTTP server on the given port (defaults to random OS-assigned port).
 *
 * Returns a promise that resolves to { port, result } once the server is listening.
 * The `result` promise resolves when GitHub redirects to /callback?code=&state=
 * and rejects with TimeoutError after `timeoutMs` milliseconds (default: 5 min).
 *
 * The server is always closed on resolve or reject.
 */
export function startCallbackServer(timeoutMs = 300_000, fixedPort?: number): Promise<{
  port: number;
  result: Promise<OAuthCallbackResult>;
}> {
  return new Promise((resolveServer, rejectServer) => {
    const server = http.createServer();

    server.on('error', rejectServer);

    server.listen(fixedPort ?? 0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        rejectServer(new Error('Failed to bind callback server to a port'));
        return;
      }
      const port = address.port;

      const result = new Promise<OAuthCallbackResult>((resolve, reject) => {
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

            const code = reqUrl.searchParams.get('code');
            const state = reqUrl.searchParams.get('state');

            if (!code || !state) {
              res.writeHead(400);
              res.end('Missing required query parameters: code and state');
              return;
            }

            // Send response to browser BEFORE resolving — ensures browser gets the message
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html>
  <head><title>Insighta CLI</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:60px">
    <h2>✅ Authentication successful</h2>
    <p>You can close this tab and return to your terminal.</p>
  </body>
</html>`);

            clearTimeout(timer);
            cleanup(() => resolve({ code, state }));
          } catch (err) {
            res.writeHead(500);
            res.end('Internal error');
            clearTimeout(timer);
            cleanup(() => reject(err));
          }
        });
      });

      resolveServer({ port, result });
    });
  });
}

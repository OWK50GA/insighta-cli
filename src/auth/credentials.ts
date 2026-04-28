import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
  username: string;
  role: 'admin' | 'analyst';
}

function getCredentialsPath(): string {
  return path.join(os.homedir(), '.insighta', 'credentials.json');
}

export function readCredentials(): Credentials | null {
  const credPath = getCredentialsPath();
  try {
    const raw = fs.readFileSync(credPath, 'utf-8');
    return JSON.parse(raw) as Credentials;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export function writeCredentials(creds: Credentials): void {
  const credPath = getCredentialsPath();
  const dir = path.dirname(credPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(credPath, JSON.stringify(creds, null, 2), 'utf-8');
  fs.chmodSync(credPath, 0o600);
}

export function deleteCredentials(): void {
  const credPath = getCredentialsPath();
  try {
    fs.unlinkSync(credPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

export function credentialsExist(): boolean {
  return fs.existsSync(getCredentialsPath());
}

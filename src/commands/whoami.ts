import { credentialsExist, readCredentials } from '../auth/credentials';
import { apiRequest } from '../http/client';

interface MeResponse {
  data: {
    username: string;
    role: 'admin' | 'analyst';
  };
}

export async function whoami(): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  const response = await apiRequest<MeResponse>({
    method: 'GET',
    path: '/api/v1/auth/me',
    accessToken: creds.accessToken,
    operation: 'GET /api/v1/auth/me',
  });

  const { username, role } = response.data.data;
  console.log(`Logged in as ${username} (${role})`);
}

import { credentialsExist, readCredentials } from '../auth/credentials';
import { apiRequest } from '../http/client';

interface MeResponse {
  user: {
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
    path: '/auth/me',
    accessToken: creds.accessToken,
    operation: 'GET /auth/me',
  });

  console.log(response);
  const { username, role } = response.data?.user;
  console.log(`Logged in as ${username} (${role})`);
}

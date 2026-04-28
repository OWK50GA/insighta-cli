import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatDeleteConfirmation } from '../../output/formatter';

export async function deleteProfile(id: string): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  await apiRequest<null>({
    method: 'DELETE',
    path: `/api/v1/profiles/${id}`,
    accessToken: creds.accessToken,
    operation: `DELETE /api/v1/profiles/${id}`,
  });

  console.log(formatDeleteConfirmation(id));
}

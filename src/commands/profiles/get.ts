import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatProfile, Profile } from '../../output/formatter';

interface GetProfileResponse {
  status: 'success';
  data: Profile;
}

export async function getProfile(id: string): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  const response = await apiRequest<GetProfileResponse>({
    method: 'GET',
    path: `/api/v1/profiles/${id}`,
    accessToken: creds.accessToken,
    operation: `GET /api/v1/profiles/${id}`,
  });

  console.log(formatProfile(response.data.data));
}

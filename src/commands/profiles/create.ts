import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatCreateSuccess, type Profile } from '../../output/formatter';

interface CreateProfileResponse {
  status: 'success' | 'error';
  message?: string;
  data: Profile;
}

export async function createProfile(name: string): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  const response = await apiRequest<CreateProfileResponse>({
    method: 'POST',
    path: '/api/v1/profiles',
    body: { name },
    accessToken: creds.accessToken,
    operation: 'POST /api/v1/profiles',
  });

  const { status: httpStatus, data } = response;

  if (httpStatus === 200) {
    console.log('Profile already exists.');
    console.log(formatCreateSuccess(data.data));
  } else {
    // 201
    console.log(formatCreateSuccess(data.data));
  }
}

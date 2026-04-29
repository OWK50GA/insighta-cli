import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatCreateSuccess, type Profile } from '../../output/formatter';
import { startSpinner } from '../../output/spinner';

interface CreateProfileResponse {
  status: 'success' | 'error';
  message?: string;
  data: Profile;
}

/**
 * Creates a new profile by name.
 * Requires admin role — the backend enforces this and returns 403 for analysts.
 * The CLI surfaces the 403 as a clear permission error via ForbiddenError.
 *
 * Command: insighta profiles create --name "<name>"
 */
export async function createProfile(options: { name: string }): Promise<void> {
  if (!credentialsExist()) {
    console.error('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;
  const spinner = startSpinner('Creating profile...');

  let response;
  try {
    response = await apiRequest<CreateProfileResponse>({
      method: 'POST',
      path: '/api/profiles',
      body: { name: options.name },
      accessToken: creds.accessToken,
      operation: 'POST /api/profiles',
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();

  const { status: httpStatus, data } = response;

  if (httpStatus === 200) {
    console.log('Profile already exists.');
  }

  console.log(formatCreateSuccess(data.data));
}

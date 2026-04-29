import { credentialsExist, readCredentials } from "../../auth/credentials";
import { apiRequest } from "../../http/client";
import { formatProfile, type Profile } from "../../output/formatter";
import { startSpinner } from "../../output/spinner";

interface GetProfileResponse {
  status: "success";
  data: Profile;
}

export async function getProfile(id: string): Promise<void> {
  if (!credentialsExist()) {
    console.error("Not logged in. Run `insighta login` to authenticate.");
    process.exit(1);
  }

  const creds = readCredentials()!;
  const spinner = startSpinner(`Fetching profile ${id}...`);

  let response;
  try {
    response = await apiRequest<GetProfileResponse>({
      method: "GET",
      path: `/api/profiles/${id}`,
      accessToken: creds.accessToken,
      operation: `GET /api/profiles/${id}`,
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();
  console.log(formatProfile(response.data.data));
}

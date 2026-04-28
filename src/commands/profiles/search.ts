import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatProfileList, Profile } from '../../output/formatter';

interface SearchProfilesResponse {
  status: 'success';
  data: Profile[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function searchProfiles(query: string): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  const response = await apiRequest<SearchProfilesResponse>({
    method: 'GET',
    path: '/api/v1/profiles/search',
    query: { q: query },
    accessToken: creds.accessToken,
    operation: 'GET /api/v1/profiles/search',
  });

  const { data, meta } = response.data;

  console.log(formatProfileList(data, meta.total));
}

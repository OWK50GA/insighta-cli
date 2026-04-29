import { credentialsExist, readCredentials } from '../../auth/credentials';
import { apiRequest } from '../../http/client';
import { formatProfileList, type Profile } from '../../output/formatter';
import { renderPagination } from '../../output/paginator';
import { startSpinner } from '../../output/spinner';

interface SearchProfilesResponse {
  status: 'success';
  data: Profile[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export async function searchProfiles(query: string): Promise<void> {
  if (!credentialsExist()) {
    console.error('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;
  const spinner = startSpinner('Searching profiles...');

  let response;
  try {
    response = await apiRequest<SearchProfilesResponse>({
      method: 'GET',
      path: '/api/profiles/search',
      query: { q: query },
      accessToken: creds.accessToken,
      operation: 'GET /api/profiles/search',
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();

  const { data, page, limit, total, total_pages } = response.data;

  if (data.length === 0) {
    console.log('No profiles matched your query.');
    return;
  }

  console.log(formatProfileList(data));
  console.log();
  console.log(renderPagination({
    page, limit, total, totalPages: total_pages
  }));
  console.log(`Total results: ${total}`);
}

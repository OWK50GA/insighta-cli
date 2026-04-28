import { credentialsExist, readCredentials } from '../auth/credentials';
import { apiRequest } from '../http/client';
import { formatProfileList, Profile } from '../../output/formatter';
import { renderPagination } from '../../output/paginator';

interface PaginatedProfilesResponse {
  status: 'success';
  data: Profile[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListProfilesOptions {
  gender?: string;
  page?: string;
  limit?: string;
}

function parsePositiveInt(value: string, flag: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`Error: --${flag} must be a positive integer.`);
    process.exit(1);
  }
  return n;
}

export async function listProfiles(options: ListProfilesOptions): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const query: Record<string, string | number> = {};

  if (options.gender !== undefined) {
    query.gender = options.gender;
  }

  if (options.page !== undefined) {
    query.page = parsePositiveInt(options.page, 'page');
  }

  if (options.limit !== undefined) {
    query.limit = parsePositiveInt(options.limit, 'limit');
  }

  const creds = readCredentials()!;

  const response = await apiRequest<PaginatedProfilesResponse>({
    method: 'GET',
    path: '/api/v1/profiles',
    query,
    accessToken: creds.accessToken,
    operation: 'GET /api/v1/profiles',
  });

  const { data, meta } = response.data;

  console.log(formatProfileList(data, meta.total));
  console.log();
  console.log(renderPagination(meta));
}

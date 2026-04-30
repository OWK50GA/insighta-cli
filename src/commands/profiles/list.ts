import { credentialsExist, readCredentials } from "../../auth/credentials";
import { apiRequest } from "../../http/client";
import { formatProfileList, type Profile } from "../../output/formatter";
import { renderPagination } from "../../output/paginator";
import { startSpinner } from "../../output/spinner";

interface PaginatedProfilesResponse {
  status: "success";
  data: Profile[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ListProfilesOptions {
  gender?: string;
  country?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  sortBy?: string;
  order?: string;
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

export async function listProfiles(
  options: ListProfilesOptions,
): Promise<void> {
  if (!credentialsExist()) {
    console.error("Not logged in. Run `insighta login` to authenticate.");
    process.exit(1);
  }

  // Validate --page and --limit before making any network request
  const query: Record<string, string | number> = {};

  if (options.page) {
    query.page = parsePositiveInt(options.page, "page");
  }

  if (options.limit) {
    query.limit = parsePositiveInt(options.limit, "limit");
  }

  // Optional filter params
  if (options.gender !== undefined) query.gender = options.gender;
  if (options.country !== undefined) query.country_id = options.country;
  if (options.ageGroup !== undefined) query.age_group = options.ageGroup;
  if (options.minAge !== undefined) query.min_age = options.minAge;
  if (options.maxAge !== undefined) query.max_age = options.maxAge;
  if (options.sortBy !== undefined) query.sort_by = options.sortBy;
  if (options.order !== undefined) query.order = options.order;

  const creds = readCredentials()!;

  const spinner = startSpinner("Fetching profiles...");

  let response;
  try {
    response = await apiRequest<PaginatedProfilesResponse>({
      method: "GET",
      path: "/api/profiles",
      query,
      accessToken: creds.accessToken,
      operation: "GET /api/profiles",
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();

  // console.log(response);

  const { data, page, limit, total, total_pages } = response.data;

  if (data.length === 0) {
    console.log("No profiles found.");
    return;
  }

  console.log(formatProfileList(data));
  console.log();
  console.log(
    renderPagination({
      limit,
      page,
      total,
      totalPages: total_pages,
    }),
  );
}

import { credentialsExist, readCredentials } from '../../auth/credentials';
import { saveExport } from '../../output/exporter';
import { startSpinner } from '../../output/spinner';

const BASE_URL = process.env.INSIGHTA_API_URL ?? 'http://localhost:3000';

const SUPPORTED_FORMATS = ['csv'] as const;
type ExportFormat = typeof SUPPORTED_FORMATS[number];

export interface ExportProfilesOptions {
  format: string;
  gender?: string;
  country?: string;
}

/**
 * Exports profiles to a file.
 *
 * Command: insighta profiles export --format csv [--gender <value>] [--country <code>]
 *
 * The --format flag is required. Only 'csv' is supported.
 * Optional --gender and --country filters are passed as query params.
 */
export async function exportProfiles(options: ExportProfilesOptions): Promise<void> {
  // Validate --format before any network I/O
  if (!options.format) {
    console.error('Error: --format is required. Supported formats: csv');
    process.exit(1);
  }

  if (!SUPPORTED_FORMATS.includes(options.format as ExportFormat)) {
    console.error(`Error: unsupported format "${options.format}". Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    process.exit(1);
  }

  if (!credentialsExist()) {
    console.error('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;

  // Build URL with required format param and optional filter query params
  const url = new URL('/api/profiles/export', BASE_URL);
  url.searchParams.set('format', options.format);           // backend requires this
  if (options.gender)  url.searchParams.set('gender',     options.gender);
  if (options.country) url.searchParams.set('country_id', options.country); // backend uses country_id

  const spinner = startSpinner('Fetching export...');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { 
        Authorization: `Bearer ${creds.accessToken}`,
        'x-client-type': 'cli',
        'x-api-version': '1'
      },
    });
    console.log(response);
    
  } catch (err) {
    spinner.stop();
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Network error: export failed — ${message}`);
    process.exit(1);
  }

  if (!response.ok) {
    spinner.stop();
    console.error(`Export failed: server returned ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  let filePath: string;
  try {
    filePath = await saveExport(response);
  } catch (err) {
    spinner.stop();
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Export failed: ${message}`);
    process.exit(1);
  }

  spinner.stop();
  console.log(`Export saved to: ${filePath}`);
}

import { credentialsExist, readCredentials } from '../../auth/credentials';
import { saveExport } from '../../output/exporter';

const BASE_URL = process.env.INSIGHTA_API_URL ?? 'http://localhost:3000';

export async function exportProfiles(): Promise<void> {
  if (!credentialsExist()) {
    console.log('Not logged in. Run `insighta login` to authenticate.');
    process.exit(1);
  }

  const creds = readCredentials()!;
  const url = `${BASE_URL}/api/v1/profiles/export`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
  });

  const filePath = await saveExport(response);
  console.log(`Export saved to: ${filePath}`);
}

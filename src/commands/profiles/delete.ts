import { credentialsExist, readCredentials } from "../../auth/credentials";
import { apiRequest } from "../../http/client";
import { formatDeleteConfirmation } from "../../output/formatter";
import { startSpinner } from "../../output/spinner";

/**
 * Deletes a profile by ID.
 * Requires admin role — the backend enforces this and returns 403 for analysts.
 * The CLI surfaces the 403 as a clear permission error via ForbiddenError.
 *
 * Command: insighta profiles delete <id>
 */
export async function deleteProfile(id: string): Promise<void> {
  if (!credentialsExist()) {
    console.error("Not logged in. Run `insighta login` to authenticate.");
    process.exit(1);
  }

  const creds = readCredentials()!;
  const spinner = startSpinner(`Deleting profile ${id}...`);

  try {
    await apiRequest<null>({
      method: "DELETE",
      path: `/api/profiles/${id}`,
      accessToken: creds.accessToken,
      operation: `DELETE /api/profiles/${id}`,
    });
  } catch (err) {
    spinner.stop();
    throw err;
  }

  spinner.stop();
  // Server returns 204 No Content — use the user-supplied ID in the confirmation
  console.log(formatDeleteConfirmation(id));
}

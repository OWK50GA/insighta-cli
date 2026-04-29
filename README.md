# insighta-cli

A globally installable CLI for the Insighta Labs+ platform. Provides authenticated access to profile management via the Insighta backend API.

---

## Tech Stack

- Node.js + TypeScript
- Commander.js for command parsing
- `open` for launching the browser during OAuth
- Vitest + fast-check for testing

---

## System Architecture

```
User (Terminal)
      │
      ▼
insighta binary (Commander.js)
      │
      ├── Auth commands (login / logout / whoami)
      │       ├── PKCE generator (state, code_verifier, code_challenge)
      │       ├── Temporary local callback server (port 9876)
      │       └── Credentials store (~/.insighta/credentials.json)
      │
      └── Profile commands (list / get / create / delete / search / export)
              └── HTTP Client (apiRequest)
                      ├── Authorization: Bearer <token> on every request
                      ├── x-client-type: cli header on every request
                      ├── x-api-version: 1 header on every request
                      ├── Token refresher (401 interceptor → auto-refresh + retry)
                      └── Typed error classes (Forbidden, NotFound, RateLimit, Network…)
```

---

## Installation

```bash
npm install -g insighta-cli
```

Requires Node.js 18 or later.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INSIGHTA_API_URL` | `http://localhost:3000` | Backend base URL |
| `GITHUB_CLIENT_ID` | — | **Required.** GitHub OAuth app client ID for the CLI |
| `INSIGHTA_CALLBACK_PORT` | `9876` | Local port for the OAuth callback server |

Set these in your shell profile or a `.env` file before running the CLI.

---

## Authentication Flow

The CLI handles GitHub OAuth with PKCE entirely client-side — no backend redirect is used to initiate the flow.

1. `insighta login` generates a `state` nonce, `code_verifier`, and `code_challenge` (SHA-256 of verifier, base64url-encoded).
2. Starts a temporary HTTP server on `http://localhost:9876` (or `INSIGHTA_CALLBACK_PORT`).
3. Opens the browser to `https://github.com/login/oauth/authorize` with the PKCE params and `redirect_uri=http://localhost:<port>/callback`.
4. GitHub redirects back to the local server with `?code=...&state=...`.
5. CLI validates the `state` to prevent CSRF.
6. Sends `GET /auth/github/callback?code=<code>&state=<code_verifier>` to the backend with `x-client-type: cli`. The backend exchanges the code, upserts the user, and returns tokens as JSON.
7. Calls `GET /auth/me` with the new access token to fetch the username and role.
8. Saves credentials to `~/.insighta/credentials.json` (permissions `0600`).
9. Prints `Logged in as @<username>`.

> **Note:** The `redirect_uri` sent to GitHub must exactly match what is registered in your GitHub OAuth app settings. The CLI uses `http://localhost:<port>/callback` — register this URL in your OAuth app.

If the browser flow is not completed within 5 minutes, the CLI times out and exits.

---

## Token Handling

- Access tokens are short-lived JWTs sent as `Authorization: Bearer <token>` on every request.
- Refresh tokens are opaque and stored in `~/.insighta/credentials.json`.
- On any **401** response, the CLI automatically calls `POST /auth/refresh` with the stored refresh token, updates the credentials file with the new token pair, and retries the original request exactly once.
- If the refresh returns 400 or 401 (session expired or revoked), the credentials file is deleted and the user is prompted to run `insighta login` again.
- If the refresh fails due to a network error, credentials are preserved and an error is shown.

---

## Credentials Storage

```
~/.insighta/credentials.json  (permissions: 0600)
```

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a3f...",
  "expiresAt": 1720000000000,
  "username": "octocat",
  "role": "analyst"
}
```

---

## Role Enforcement

The backend enforces all role restrictions. The CLI surfaces permission errors clearly.

| Role | Permitted commands |
|---|---|
| `analyst` | `list`, `get`, `search`, `export`, `whoami`, `logout` |
| `admin` | All analyst commands + `create`, `delete` |

When a 403 is received, the error message includes the user's current role. The CLI never enforces roles locally.

---

## Commands

### Authentication

```bash
# Log in with GitHub (opens browser)
insighta login

# Log out and revoke session on the backend
insighta logout

# Show the currently authenticated user
insighta whoami
```

### Profiles

```bash
# List profiles (paginated)
insighta profiles list
insighta profiles list --gender male
insighta profiles list --gender female --country NG
insighta profiles list --age-group adult
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 20

# Get a single profile by ID
insighta profiles get <id>

# Natural language search
insighta profiles search "young males from Nigeria"
insighta profiles search "female seniors"

# Create a profile by name (admin only)
insighta profiles create --name "Harriet Tubman"

# Delete a profile by ID (admin only)
insighta profiles delete <id>

# Export profiles to CSV (saved to current directory)
insighta profiles export --format csv
insighta profiles export --format csv --gender male --country NG
```

### Help

```bash
insighta --help
insighta --version
insighta profiles --help
```

---

## `profiles list` Options

| Flag | Type | Description |
|---|---|---|
| `--gender` | `male` \| `female` | Filter by gender |
| `--country` | string | ISO 3166-1 alpha-2 country code (e.g. `NG`, `US`) |
| `--age-group` | `child` \| `teenager` \| `adult` \| `senior` | Filter by age group |
| `--min-age` | number | Minimum age inclusive |
| `--max-age` | number | Maximum age inclusive |
| `--sort-by` | `age` \| `created_at` \| `gender_probability` | Sort field |
| `--order` | `asc` \| `desc` | Sort direction |
| `--page` | number | Page number (default: 1) |
| `--limit` | number | Results per page (default: 10, max: 50) |

---

## `profiles export` Options

| Flag | Type | Description |
|---|---|---|
| `--format` | `csv` | **Required.** Export format |
| `--gender` | `male` \| `female` | Filter by gender |
| `--country` | string | ISO 3166-1 alpha-2 country code |

The CSV file is saved to the current working directory with a timestamped filename.

---

## Error Handling

| Error | Cause | CLI output |
|---|---|---|
| `NotLoggedInError` | No credentials file | `Not logged in. Run insighta login to authenticate.` |
| `ForbiddenError` | 403 from backend | `Permission denied: ... Your current role is analyst.` |
| `NotFoundError` | 404 from backend | `No profile found with ID <id>.` |
| `ValidationError` | 422 from backend | `Validation failed: <message>` |
| `RateLimitError` | 429 from backend | `Rate limited. Please wait N seconds before retrying.` |
| `NetworkError` | Fetch failed | `Network error: <operation> failed — <details>` |
| `TimeoutError` | OAuth not completed in 5 min | `Login timed out.` |

---

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Link locally for testing
npm link
insighta --help
```

Set `NODE_ENV=development` to see full stack traces on errors.

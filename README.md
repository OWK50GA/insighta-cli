# insighta-cli

A globally installable CLI for the [Insighta Labs+](https://github.com/insighta-labs) platform. Provides authenticated access to profile management via the Insighta backend API.

---

## Three-Repo Architecture

The Insighta platform is split across three repositories that all share the same backend API under `/api/v1/`:

| Repo | Role |
|---|---|
| **backend** | Express/Node.js REST API — handles auth, profiles, PKCE, GitHub OAuth |
| **insighta-cli** *(this repo)* | Globally installable CLI client |
| **web-portal** | Browser-based frontend client |

All three clients authenticate via the same GitHub OAuth flow and consume the same versioned API endpoints.

---

## System Architecture

```
User (Terminal)
      │
      ▼
insighta binary (Commander.js)
      │
      ├── Auth Module (login / logout / whoami)
      │       ├── Temporary localhost callback server (receives OAuth tokens)
      │       ├── Credentials store (~/.insighta/credentials.json)
      │       └── HTTP Client → Insighta API (/api/v1/)
      │
      └── Profiles Module (list / get / create / delete / search / export)
              └── HTTP Client
                      ├── Token Refresher (401 interceptor)
                      ├── Rate Limit Handler (429 handler)
                      └── Insighta API (/api/v1/)
```

---

## Installation

```bash
npm install -g insighta-cli
```

Requires Node.js 18 or later.

---

## Authentication Flow (Backend-Delegated PKCE)

The CLI delegates the entire GitHub OAuth + PKCE flow to the backend:

1. `insighta login` starts a temporary HTTP server on a random local port.
2. The CLI opens `GET /api/v1/auth/github?callback_url=http://127.0.0.1:<port>/callback` in the default browser.
3. The backend generates PKCE parameters, redirects to GitHub, handles the code exchange, and issues tokens.
4. The backend redirects to the CLI's local callback server with `access_token`, `refresh_token`, and `expires_in` as query parameters.
5. The CLI saves the tokens to `~/.insighta/credentials.json` (permissions `0600`), then calls `GET /api/v1/auth/me` to fetch the username and role.
6. The callback server shuts down. Login is complete.

If the browser flow is not completed within 5 minutes, the CLI times out and exits with an error.

---

## Token Handling

- **Access tokens** are short-lived JWTs sent as `Authorization: Bearer <token>` on every API request.
- **Refresh tokens** are long-lived and stored alongside the access token in `~/.insighta/credentials.json`.
- When any API request returns **401**, the CLI automatically exchanges the refresh token for a new access token via `POST /api/v1/auth/refresh` and retries the original request exactly once.
- If the refresh itself fails (400/401), the credentials file is deleted and the user is prompted to log in again.
- If the refresh fails due to a network error, the credentials are preserved and the user is shown an error.

---

## Credentials Storage

Tokens are stored at `~/.insighta/credentials.json` with file permissions `0600` (owner read/write only):

```json
{
  "accessToken": "gho_...",
  "refreshToken": "ghr_...",
  "expiresAt": 1720000000000,
  "username": "octocat",
  "role": "analyst"
}
```

---

## Role Enforcement

The backend enforces all role restrictions. The CLI surfaces permission errors clearly:

| Role | Permitted operations |
|---|---|
| `analyst` | `list`, `get`, `search`, `export`, `whoami` |
| `admin` | All analyst operations + `create`, `delete` |

When a 403 is received, the CLI displays the current user's role in the error message. The CLI never enforces roles locally.

---

## CLI Usage Reference

### Authentication

```bash
# Log in with GitHub
insighta login

# Log out and revoke session
insighta logout

# Show current user
insighta whoami
```

### Profiles

```bash
# List profiles (with optional filters)
insighta profiles list
insighta profiles list --gender male
insighta profiles list --page 2 --limit 20
insighta profiles list --gender female --page 1 --limit 10

# Get a profile by ID
insighta profiles get <id>

# Create a profile by name (admin only)
insighta profiles create "Alice"

# Delete a profile by ID (admin only)
insighta profiles delete <id>

# Search profiles using natural language
insighta profiles search "adult males from the US"
insighta profiles search "senior women"

# Export all profiles to CSV
insighta profiles export
# Saves to: ./profiles-export-<ISO8601-date>.csv
```

### Help & Version

```bash
insighta --help
insighta --version
insighta profiles --help
```

---

## Natural Language Search

`insighta profiles search "<query>"` sends the query to `GET /api/v1/profiles/search?q=<query>`. The backend interprets the natural language query and maps it to structured filter parameters (gender, age group, country, etc.) before querying the database. The CLI displays matching profiles and the total result count.

If the query cannot be interpreted, a 422 response is returned and the CLI displays a descriptive error.

---

## API Versioning

All API calls are prefixed with `/api/v1/`. The base URL defaults to `http://localhost:3000` and can be overridden:

```bash
INSIGHTA_API_URL=https://api.insighta.io insighta profiles list
```

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

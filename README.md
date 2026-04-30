# Flagify — Server

A feature flag management system that lets teams control feature rollouts without redeployments. Toggle features on/off per environment, target specific users, and gradually roll out changes using percentage-based rollouts — all in real time.

---

## What it does

- **Feature flag management** — create and manage flags across multiple environments
- **Environment scoping** — each flag has independent state per environment (dev, staging, production, or any custom name)
- **Targeted rollouts** — enable flags for specific users based on attributes like plan, country, or user ID
- **Percentage rollouts** — gradually roll out features to a percentage of users using deterministic hashing
- **SDK API** — client apps evaluate flags using SDK keys scoped to an environment
- **Real-time updates** — flag changes are pushed instantly to connected SDK clients via SSE
- **Audit logs** — every flag state change is recorded with a full before/after diff and who made it
- **SDK key management** — generate, name, and revoke SDK keys with support for key rotation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Fastify |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth + JWT |
| Real-time | In-process EventEmitter + SSE |
| Deployment | Render |

---

## Project Structure

```
src/
├── app.ts                  # Builds and wires the Fastify app
├── server.ts               # Entry point — starts the HTTP server
├── config/
│   └── env.ts              # Environment variable schema + validation rules
├── plugins/                # Fastify plugins (decorators registered on the app)
│   ├── env.ts              # Loads and validates .env using @fastify/env
│   ├── db.ts               # PostgreSQL connection via postgres.js
│   ├── supabase.ts         # Supabase client (used for auth)
│   ├── authenticate.ts     # JWT middleware — verifies Bearer token, sets request.user
│   ├── sdk-authenticate.ts # SDK key middleware — verifies x-sdk-key header, sets request.sdkEnv
│   ├── emitter.ts          # In-process EventEmitter for real-time flag change events
│   ├── cors.ts             # CORS configuration
│   └── swagger.ts          # OpenAPI docs served at /docs
├── routes/                 # HTTP route handlers
│   ├── health.ts           # GET /health
│   ├── auth.ts             # POST /auth/register, login, logout — GET /auth/me
│   ├── projects.ts         # Projects and environments CRUD
│   ├── flags.ts            # Feature flags CRUD + flag state updates + audit log reads
│   └── sdk.ts              # SDK key management + flag evaluation + SSE stream
├── services/               # Business logic — all DB queries live here
│   ├── auth.service.ts     # Supabase Auth operations
│   ├── projects.service.ts # Projects and environments queries + AppError class
│   ├── flags.service.ts    # Flag CRUD + updateFlagState (with audit log transaction)
│   ├── audit.service.ts    # Audit log read queries
│   ├── sdk.service.ts      # SDK key operations + flag state queries for evaluation
│   └── evaluation.service.ts # Pure flag evaluation logic (no DB)
└── types/
    └── fastify.d.ts        # TypeScript augmentations for FastifyInstance and FastifyRequest
```

---

## Architecture

The app follows a layered architecture:

```
HTTP Request
    │
    ▼
Route Handler  (src/routes/)
    │  validates input via JSON Schema
    │  runs preHandler middleware (authenticate / sdkAuthenticate)
    │
    ▼
Service Layer  (src/services/)
    │  runs DB queries via postgres.js
    │  throws AppError for expected failures (404, 409, etc.)
    │
    ▼
PostgreSQL (Supabase)
```

**Plugins** are Fastify decorators — they attach things to the `fastify` instance (like `fastify.db`, `fastify.authenticate`, `fastify.emitter`) so every route and service can use them without importing directly.

**Services** are plain factory functions that take `db` (the postgres.js `Sql` instance) and return an object of async methods. They know nothing about HTTP — they just query the database and return data or throw `AppError`.

**Routes** wire HTTP to services. They parse params/body, call the service, and send the response. They catch `AppError` and map it to the right HTTP status code.

---

## Plugins

### `plugins/env.ts`
Loads `.env` using `@fastify/env` and validates it against the schema in `config/env.ts`. Required variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `DATABASE_URL`. Decorates `fastify.config`.

### `plugins/db.ts`
Creates a `postgres.js` connection pool (`max: 10`, `idle_timeout: 30s`, SSL required). Decorates `fastify.db`. Closes the pool cleanly on server shutdown via `onClose` hook.

### `plugins/supabase.ts`
Creates a Supabase client using the service role key (admin-level access — used for auth operations). Decorates `fastify.supabase`.

### `plugins/authenticate.ts`
Reads the `Authorization: Bearer <token>` header, calls `fastify.supabase.auth.getUser(token)` to verify the JWT, and sets `request.user` to the Supabase user object. Used as a `preHandler` on all private routes.

### `plugins/sdk-authenticate.ts`
Reads the `x-sdk-key` header, looks it up in the `sdk_keys` table (must exist and not be revoked), and sets `request.sdkEnv` to `{ environment_id, project_id }`. Used as a `preHandler` on all SDK endpoints.

### `plugins/emitter.ts`
Wraps Node's built-in `EventEmitter` and decorates it as `fastify.emitter`. Exports the `FlagChangedEvent` interface used by both the emitter (flag route) and the listener (SSE route). The emitter is in-process — real-time works within a single server instance.

---

## Services

### `auth.service.ts`
Thin wrapper around Supabase Auth. Functions: `register`, `login`, `logout`, `getUser`. All delegate directly to `supabase.auth.*`.

### `projects.service.ts`
Manages projects and environments. Also defines the `AppError` class used throughout the codebase.

Key functions:
- `createProject` — inserts a project, throws 409 if name already exists for that owner
- `listProjects` — returns all projects owned by a user
- `getProject` — returns a single project, throws 404 if not found or not owned by user
- `updateProject` — updates project name
- `deleteProject` — deletes project (cascades to environments, flags, flag_states, audit_logs)
- `createEnvironment` — inserts an environment under a project, throws 404/409
- `listEnvironments` — returns environments for a project, ownership-checked
- `deleteEnvironment` — deletes an environment

### `flags.service.ts`
Manages feature flags and their per-environment state.

Key functions:
- `createFlag` — inserts a flag, then auto-creates a `flag_states` row for every existing environment in that project (so flags are always present in every environment from day one)
- `listFlags` — returns all flags for a project with ownership check
- `getFlag` — returns a flag with its state aggregated per environment (uses `json_agg` to build a `states` array in a single query)
- `updateFlag` — updates flag metadata (name, description)
- `deleteFlag` — deletes a flag (cascades to flag_states and audit_logs)
- `updateFlagState` — the most important function. Runs inside a `db.begin()` transaction:
  1. SELECTs the current state as `before`
  2. Upserts the new state (`INSERT ... ON CONFLICT DO UPDATE`)
  3. Determines the `action`: `created` / `enabled` / `disabled` / `updated`
  4. Builds a `diff` object: `{ before: { enabled, rollout_percentage, rules }, after: {...} }`
  5. INSERTs an `audit_logs` row with the diff
  - If any step fails, the entire transaction rolls back — flag state and audit log are always consistent

### `audit.service.ts`
Read-only queries for audit logs.

Key functions:
- `listFlagAudit` — returns audit entries for a specific flag, ownership-checked via project join. Includes `user_email` and `environment_name`. If no entries exist, checks whether the flag itself exists to distinguish "no history yet" from "flag not found".
- `listProjectAudit` — returns all audit entries across all flags in a project. Includes `flag_key` and `flag_name` in addition to the above.
- Both support `limit` (max 100) and `offset` pagination.

### `sdk.service.ts`
Handles SDK key lifecycle and flag state reads used during evaluation.

Key functions:
- `generateKey` — creates a new SDK key (`sdk_` prefix + 48 hex chars), scoped to a project + environment. Ownership-checked.
- `revokeKey` — sets `revoked = true`. Does not delete — preserves the record.
- `listKeys` — returns all keys for a project including environment name
- `resolveKey` — given a raw key string, returns `{ environment_id, project_id }` if valid and not revoked. Used by the SDK auth middleware on every request.
- `getFlagStatesForEnv` — returns all flag states for an environment (used by `GET /sdk/flags`)
- `getFlagStateByKey` — returns a single flag state by flag key (used by `GET /sdk/flags/:flagKey`)

### `evaluation.service.ts`
Pure function — no database, no side effects. Takes a `FlagState` and an `EvaluationContext`, returns `true` or `false`.

**Evaluation order:**
1. If `enabled` is `false` → return `false` immediately
2. If there are targeting `rules` → check each rule against the context. If any rule matches → return `true`
3. If `rollout_percentage > 0` → hash `userId:flagKey` with SHA-256, take the first 8 hex chars as a number mod 100. If that bucket < rollout_percentage → return `true`
4. Otherwise → return `enabled` (the flag's base value)

**Why deterministic hashing?** The same user always gets the same result for the same flag. Rollouts don't flicker between page loads or requests.

**Rule operators:** `equals`, `not_equals`, `contains`, `gt`, `lt`. Applied to any field in the evaluation context (e.g. `plan`, `country`, `age`).

---

## Routes

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Create account via Supabase Auth. A DB trigger (`008_user_sync_trigger.sql`) syncs the new user to `public.users`. |
| POST | `/auth/login` | None | Sign in, returns Supabase session with `access_token`. |
| POST | `/auth/logout` | None | Invalidates the session server-side via `supabase.auth.admin.signOut`. |
| GET | `/auth/me` | JWT | Returns the authenticated user from the token. |

### Projects — `/projects`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/projects` | JWT | Create a project. Name must be unique per owner. |
| GET | `/projects` | JWT | List all projects owned by the authenticated user. |
| GET | `/projects/:id` | JWT | Get a single project. |
| PATCH | `/projects/:id` | JWT | Rename a project. |
| DELETE | `/projects/:id` | JWT | Delete a project and everything under it (cascade). |
| POST | `/projects/:id/environments` | JWT | Create an environment (e.g. `production`). |
| GET | `/projects/:id/environments` | JWT | List environments for a project. |
| DELETE | `/projects/:id/environments/:envId` | JWT | Delete an environment. |

### Flags — `/projects/:id/flags`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/projects/:id/flags` | JWT | Create a flag. Auto-creates a `flag_states` row for every existing environment. Flag key is normalized to lowercase and must match `[a-zA-Z0-9_-]+`. |
| GET | `/projects/:id/flags` | JWT | List all flags for a project. |
| GET | `/projects/:id/flags/:flagId` | JWT | Get a flag with its full state per environment (aggregated in one query). |
| PATCH | `/projects/:id/flags/:flagId` | JWT | Update flag name or description. |
| DELETE | `/projects/:id/flags/:flagId` | JWT | Delete a flag. |
| PUT | `/projects/:id/flags/:flagId/environments/:envId` | JWT | Update flag state for a specific environment. Runs inside a transaction (upsert + audit log). Then emits a `flag_changed` event for SSE clients. |

### Audit — `/projects`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects/:id/flags/:flagId/audit` | JWT | Audit history for a single flag. Includes who changed it, what action, and the full before/after diff. |
| GET | `/projects/:id/audit` | JWT | All audit events across every flag in a project. |

Both support `?limit` (1–100, default 50) and `?offset` (default 0).

### SDK Keys — `/sdk/keys`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sdk/keys` | JWT | Generate a new SDK key for a project + environment. |
| GET | `/sdk/keys/:projectId` | JWT | List all SDK keys for a project. |
| DELETE | `/sdk/keys/:projectId/:keyId` | JWT | Revoke an SDK key (sets `revoked = true`). |

### SDK Evaluation — `/sdk`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/sdk/flags` | SDK key | Evaluate all flags for a context. Pass `?userId=` plus any custom attributes as query params. Returns `{ "flag-key": true/false, ... }`. |
| GET | `/sdk/flags/:flagKey` | SDK key | Evaluate a single flag. Returns `{ "flag-key": true/false }`. |
| GET | `/sdk/stream` | SDK key | Opens an SSE connection. Sends `event: connected` immediately, then `event: flag_updated` whenever a flag changes in this environment. Sends a keep-alive `: ping` every 30 seconds. |

---

## Real-time Flow

When a flag state is updated:

```
PUT /projects/:id/flags/:flagId/environments/:envId
    │
    ├─ updateFlagState() — transaction: upsert + audit log
    │
    ├─ SELECT key FROM flags WHERE id = :flagId
    │
    └─ fastify.emitter.emit('flag_changed', { environmentId, flagKey, enabled, rollout_percentage, rules })
                │
                ▼
        All active GET /sdk/stream connections
        listening for this environmentId receive:

        event: flag_updated
        data: {"flagKey":"dark-mode","enabled":true,"rollout_percentage":100,"rules":[]}
```

The SSE handler registers a listener on `fastify.emitter` and filters by `environment_id`. On client disconnect, the listener and keep-alive interval are both cleaned up.

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Synced from Supabase Auth via DB trigger on register |
| `projects` | Top-level container. Owned by a user. Unique name per owner. |
| `environments` | Belongs to a project. Unique name per project. |
| `flags` | Belongs to a project. Unique key per project (lowercase). |
| `flag_states` | One row per (flag, environment) pair. Holds `enabled`, `rollout_percentage`, `rules` JSONB. |
| `sdk_keys` | Scoped to a project + environment. Supports revocation. |
| `audit_logs` | One row per flag state change. Stores `action`, `diff` JSONB (before/after), `user_id`, `environment_id`. |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default `6006`) | Port the server listens on |
| `NODE_ENV` | No (default `development`) | Environment name |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin auth) |
| `JWT_SECRET` | Yes | Secret used to verify JWTs |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLIENT_URL` | No (default `http://localhost:6009`) | Allowed CORS origin |

---

## Running Locally

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start development server (with hot reload)
npm run dev

# Type check
npx tsc --noEmit

# Run evaluation engine tests
npm test
```

API docs available at `http://localhost:6006/docs` (Swagger UI).

---

## Author

**Tarek Saad**

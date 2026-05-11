# Flagify — Build Progress

**Stack:** Next.js (App Router) + Fastify + PostgreSQL (Supabase) + Supabase Auth + Supabase Realtime  
**Timeline:** 21 days — 2026-04-20 to 2026-05-11  
**Repos:** `/client` (Next.js → Vercel) | `/server` (Fastify → Render)

---

## Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Phase 1 — Project Setup
**Goal:** Runnable Fastify server with proper structure, env config, and Supabase connection.

- [x] Initialize Node.js project with Fastify
- [x] Set up folder structure (routes, plugins, services, schemas, middleware)
- [x] Configure environment variables (.env + validation)
- [x] Connect to Supabase PostgreSQL
- [x] Add health check endpoint `GET /health`
- [x] Set up ESLint + Prettier
- [x] Configure nodemon / dev script

---

## Phase 2 — Auth
**Goal:** Register/login via Supabase Auth, protect all private routes with JWT middleware.

- [x] Integrate Supabase Auth (register, login, logout)
- [x] Build JWT verification middleware (Fastify plugin)
- [x] Protect private routes — attach `request.user` on every authenticated request
- [x] `POST /auth/register`
- [x] `POST /auth/login`
- [x] `POST /auth/logout`
- [x] `GET /auth/me`

---

## Phase 3 — Database Schema
**Goal:** Full schema designed and migrated in Supabase before building any CRUD.

Tables:
- [x] `users` (synced from Supabase Auth)
- [x] `projects` (id, name, owner_id, created_at)
- [x] `environments` (id, project_id, name — e.g. dev/staging/prod)
- [x] `flags` (id, project_id, key, name, description, created_at)
- [x] `flag_states` (flag_id, environment_id, enabled, rollout_percentage, rules JSONB)
- [x] `sdk_keys` (id, project_id, environment_id, key, created_at, revoked)
- [x] `audit_logs` (id, flag_id, user_id, action, diff JSONB, created_at)
- [x] Write all migrations as SQL files in `/server/migrations`

---

## Phase 4 — Projects & Environments
**Goal:** Users can create projects and manage environments within each project.

- [x] `POST /projects` — create project
- [x] `GET /projects` — list user's projects
- [x] `GET /projects/:id` — get single project
- [x] `PATCH /projects/:id` — update project
- [x] `DELETE /projects/:id` — delete project
- [x] `POST /projects/:id/environments` — create environment
- [x] `GET /projects/:id/environments` — list environments
- [x] `DELETE /projects/:id/environments/:envId` — delete environment

---

## Phase 5 — Feature Flags CRUD
**Goal:** Create and manage flags, with state (on/off/rules) per environment.

- [x] `POST /projects/:id/flags` — create flag
- [x] `GET /projects/:id/flags` — list all flags for a project
- [x] `GET /projects/:id/flags/:flagId` — get flag with state per env
- [x] `PATCH /projects/:id/flags/:flagId` — update flag metadata
- [x] `DELETE /projects/:id/flags/:flagId` — delete flag
- [x] `PUT /projects/:id/flags/:flagId/environments/:envId` — update flag state (enable/disable/rollout/rules)

---

## Phase 6 — Flag Evaluation Engine
**Goal:** Pure logic module that takes a flag + context and returns true/false.

Evaluation order:
1. Flag disabled globally → `false`
2. User targeting rules (match by userId, email, custom attributes) → `true/false`
3. Percentage rollout (deterministic hash) → `true/false`
4. Default → flag's enabled value

- [x] Build `evaluateFlag(flagState, context)` service
- [x] Boolean evaluation (simple on/off)
- [x] Percentage rollout (deterministic by userId hash)
- [x] User targeting rules (userId / attribute matching)
- [x] Unit tests for evaluation logic (15/15 passing with Vitest)

---

## Phase 7 — SDK API
**Goal:** Public endpoints that client apps call using an SDK key to evaluate flags.

- [x] `POST /sdk/keys` — generate SDK key for an environment
- [x] `GET /sdk/keys/:projectId` — list SDK keys for a project
- [x] `DELETE /sdk/keys/:projectId/:keyId` — revoke SDK key
- [x] `GET /sdk/flags` — return all flags evaluated for a given context (auth by SDK key header)
- [x] `GET /sdk/flags/:flagKey` — evaluate a single flag for a context
- [x] SDK key middleware (separate from JWT — reads `x-sdk-key` header)

---

## Phase 8 — Audit Log
**Goal:** Every flag state change is recorded with who changed it, what changed, and when.

- [x] Auto-write audit log entry on every flag state update
- [x] Store diff (before/after) as JSONB
- [x] `GET /projects/:id/flags/:flagId/audit` — list audit history for a flag
- [x] `GET /projects/:id/audit` — list all audit events for a project

---

## Phase 9 — Real-time
**Goal:** When a flag changes, all connected SDK clients are notified instantly.

- [x] Server broadcasts change events on flag state update (in-process EventEmitter)
- [x] SDK endpoint supports SSE (`GET /sdk/stream`) for real-time flag updates
- [x] Frontend connects via `fetch` + `ReadableStream` with `x-sdk-key` header (native `EventSource` doesn't support custom headers)

---

## Phase 10 — Frontend (Next.js)
**Goal:** Dashboard UI to manage everything — projects, flags, environments, audit logs.

- [x] Auth pages (login / register) — Supabase Auth, middleware route protection
- [x] Projects list page — card grid, create modal, delete with confirm
- [x] Project dashboard — environments bar (add/delete), flags nav list
- [x] Flag detail page — per-env toggle, rollout slider, targeting rules editor
- [x] Audit log — paginated table with before/after diff per change
- [x] SDK keys management page — generate modal (one-time key reveal + copy), revoke per key
- [x] Real-time updates — `useSSEFlags` hook wired into project dashboard (flag row flash) and flag detail page (live state updates)
- [x] Polish — loading skeletons, toast notifications, 404 page, page titles, accessible modals (aria + ESC), responsive layout

Note: raw SDK key values are saved to `localStorage` on generation (the only time they're visible) and read back by the SSE hook. `GET /sdk/keys` intentionally omits the raw key.

---

## Phase 11 — Deploy
**Goal:** Live, publicly accessible app on free tier.

- [ ] Deploy Fastify server to Render
- [ ] Deploy Next.js client to Vercel
- [ ] Set production env vars on both platforms
- [ ] Smoke test all critical paths in production
- [ ] Write README for both repos

---

## Current Phase
**Phase 11 — Deploy**

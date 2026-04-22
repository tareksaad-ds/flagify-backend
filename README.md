# Flagify

A feature flag management system that lets teams control feature rollouts without redeployments. Toggle features on/off per environment, target specific users, and gradually roll out changes using percentage-based rollouts — all in real time.

---

## What it offers

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
| Real-time | Supabase Realtime + SSE |
| Deployment | Render |

---

## Author

**Tarek Saad**

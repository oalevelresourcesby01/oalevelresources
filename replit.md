# O/A Level Resources — Admin

An admin control panel for managing O/A Level educational resources synced from Google Drive.

## GitHub → Render Auto-Deploy

Changes pushed to GitHub automatically trigger a Render.com deploy.

**To sync all changes:**
```bash
bash sync.sh "your commit message"
# or just: bash sync.sh   (uses timestamp as message)
```

Every `git commit` also auto-pushes via the `.git/hooks/post-commit` hook.

**Setup:** `GITHUB_TOKEN` secret → embedded in the `origin` remote URL → authenticated push → Render deploys.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (via workflow)
- `pnpm --filter @workspace/admin run dev` — run the admin frontend (via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- Admin UI: React 19 + Vite + Tailwind v4 + shadcn/ui (`artifacts/admin`)
- DB: **Neon PostgreSQL** (cloud) — connection via `DATABASE_URL` env var
- Auth: JWT (stateless, version-revocable via DB counter)
- AI: OpenRouter (RAG over indexed PDFs using PostgreSQL FTS tsvector)
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (ESM bundle for API server)

## Where things live

- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — sync engine, logger, Drive client, AI, knowledge index
- `artifacts/api-server/src/db/` — PostgreSQL pool + migration runner
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `system-overview.md` — full architecture documentation

## Required Secrets / Env Vars

| Key | Where set | Purpose |
|-----|-----------|---------|
| `DATABASE_URL` | Replit (auto, postgresql-16 module) | PostgreSQL connection string — provided automatically in dev |
| `ADMIN_DEFAULT_PASSWORD` | Replit Secret | Bootstrap password for first admin login (used once, then ignored after password is set via UI) |

Optional (set in Admin dashboard, stored in DB):
- Google Drive API key + Folder ID — for resource sync
- OpenRouter API key — for AI chat

## Architecture decisions

- **Neon PostgreSQL over SQLite**: serverless cloud DB; no disk mounts; survives Render free-tier restarts.
- **Raw pg pool over Drizzle**: the api-server uses direct SQL via `pg` Pool + a migration runner (`db/migrate.ts`). The `lib/db` package is a Drizzle scaffold available for future use but not currently wired in.
- **PDF proxy**: Drive API key is never sent to the client; `/api/resources/pdf/:id/content` streams from Drive server-side.
- **JWT revocation**: tokens embed a `ver` counter; logout and password-change call `bumpTokenVersion()` to invalidate all prior tokens instantly.
- **Admin password bootstrap**: first login requires `ADMIN_DEFAULT_PASSWORD` env var when no password hash is stored; once set via the UI the env var is no longer read.
- **AI chat endpoint is public**: `/api/ai/chat` has no auth gate — IP-based rate limiting (30 req/hr/IP) is the only abuse control.
- **Knowledge RAG**: PDFs are indexed into `knowledge_chunks` with a `tsvector` GIN index; every AI chat query first searches this index and injects relevant chunks into the prompt.

## Gotchas

- After editing the OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks.
- `ADMIN_DEFAULT_PASSWORD` must be set for the very first login; after the password is changed via the UI it is no longer read.
- `knowledge.ts` uses both `uuid` (v4) and `crypto.randomUUID` — intentional, not a bug (both generate UUIDs; uuidv4 for chunk inserts, randomUUID for search log inserts).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

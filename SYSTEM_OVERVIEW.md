# OALevel Resources — System Overview

> Last updated: July 2026 · Auto-generated from codebase analysis

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Render.com (Port 10000)                  │
│                                                                 │
│   ┌──────────────┐    ┌─────────────────────────────────────┐   │
│   │  Admin SPA   │    │         API Server (Express)        │   │
│   │  /admin/*    │◄───┤  /api/*  ·  /admin/*  ·  /*        │   │
│   └──────────────┘    │                                     │   │
│                        │  ┌──────────┐  ┌────────────────┐  │   │
│   ┌──────────────┐    │  │  Drive   │  │   AI / RAG     │  │   │
│   │  Public SPA  │◄───┤  │  Sync   │  │  (OpenRouter)  │  │   │
│   │  /*          │    │  └──────────┘  └────────────────┘  │   │
│   └──────────────┘    └──────────────────┬──────────────────┘   │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │   Neon PostgreSQL (Cloud DB)    │
                          └─────────────────────────────────┘

┌───────────────────────────────┐
│  Android App (Kotlin/Compose) │──── REST → API Server
│  Offline-first, Room cache    │
└───────────────────────────────┘
```

The monorepo is managed with **pnpm workspaces**. All web services are deployed as a single Render Web Service; the admin and public web apps are pre-built as static files and served directly by the Express API server.

---

## 2. Services & Their Roles

| Service | Path | Port (dev) | Purpose |
|---|---|---|---|
| **API Server** | `artifacts/api-server/` | `3001` | Central API, Google Drive proxy, AI/RAG, serves static frontends in production |
| **Admin Dashboard** | `artifacts/admin/` | `5000` | Resource management, sync control, AI config, logs |
| **Public Website** | `artifacts/web/` | `3000` | Student-facing browsing, search, AI chat |
| **Android App** | `android/` | N/A | Native mobile client; offline-first |
| **Shared API Spec** | `lib/api-spec/` | N/A | OpenAPI YAML — source of truth for the REST contract |
| **Generated Client** | `lib/api-client-react/` | N/A | Orval-generated React hooks; do not edit manually |

---

## 3. Tech Stack

### API Server (`artifacts/api-server/`)
- **Runtime:** Node.js 20+, TypeScript
- **Framework:** Express.js 5
- **Database ORM:** Raw `pg` pool (Neon PostgreSQL) — **not** Drizzle despite the schema files
- **Auth:** JWT (`jsonwebtoken`) with version-based revocation; `bcrypt` for passwords
- **AI:** OpenRouter API (model configurable via admin UI); PDF text extraction via `pdf-parse`; RAG via chunked full-text search on `knowledge_chunks`
- **Scheduling:** `node-cron` for background Drive sync jobs
- **Logging:** `pino`

### Admin Dashboard (`artifacts/admin/`)
- **Framework:** React 19, Vite
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix UI primitives)
- **Data fetching:** TanStack Query v5
- **Routing:** Wouter
- **API client:** Generated hooks from `lib/api-client-react/`

### Public Website (`artifacts/web/`)
- Same stack as admin: React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter

### Android App (`android/`)
- **Language:** Kotlin
- **UI:** Jetpack Compose
- **Architecture:** MVVM + Clean Architecture
- **DI:** Hilt
- **Networking:** Retrofit + OkHttp
- **Local cache:** Room (SQLite)
- **Background work:** WorkManager (`DownloadService.kt`)

---

## 4. Database Schema

All tables live in Neon PostgreSQL. Migrations run automatically at API server startup (`artifacts/api-server/src/db/migrate.ts`).

| Table | Purpose |
|---|---|
| `resources` | Drive file/folder metadata — `drive_id`, `name`, `type` (file/folder), `mime_type`, `depth`, parent relationship |
| `config` | Key-value store for all runtime settings: Google Drive root folder ID, OAuth credentials, OpenRouter API key, AI model name, etc. |
| `sync_records` | Audit trail of Drive sync jobs — start/end time, files added/removed, status |
| `knowledge_chunks` | Shredded PDF text segments used for RAG context retrieval |
| `knowledge_index_meta` | Tracks which resources have been indexed and when |
| `ai_sessions` | Persistent chat sessions per user (session ID, created_at) |
| `ai_messages` | Individual messages within a session (role: user/assistant, content, related resources) |
| `logs` | System-wide audit log for admin actions |

> **Config table pattern:** API keys and AI settings are stored in the `config` table, not in environment variables. This means they can be updated live via the Admin UI without redeploying. The only env vars the server needs at boot are `DATABASE_URL` and `ADMIN_DEFAULT_PASSWORD`.

---

## 5. API Route Structure

Base path: `/api`

| Route Group | Endpoints | Auth Required |
|---|---|---|
| `/api/auth` | `POST /login`, `POST /change-password` | Login: No; Change-password: Yes |
| `/api/resources` | `GET /tree`, `GET /:id`, `GET /:id/download` | No (public) |
| `/api/drive` | `POST /sync`, `GET /status`, `POST /validate` | Yes (admin) |
| `/api/ai` | `POST /chat`, `GET /sessions`, `GET /sessions/:id` | No (public) |
| `/api/knowledge` | `POST /index`, `GET /status`, `DELETE /chunks` | Yes (admin) |
| `/api/config` | `GET /`, `PUT /` | Yes (admin) |
| `/api/logs` | `GET /` | Yes (admin) |

Static serving (production only):
- `/admin/*` → `artifacts/admin/dist/public/`
- `/*` → `artifacts/web/dist/public/`

---

## 6. Key Data Flows

### Student Browsing a Resource
```
Student (Web/Android)
  └─→ GET /api/resources/tree
        └─→ PostgreSQL `resources` table
              └─→ Returns folder/file tree
  └─→ GET /api/resources/:id/download
        └─→ API fetches PDF from Google Drive using stored OAuth token
              └─→ Streams PDF bytes back to client
                    (Google Drive API key never exposed to client)
```

### Admin Drive Sync
```
Admin UI
  └─→ POST /api/drive/sync
        └─→ API reads root folder ID from `config` table
              └─→ Google Drive API — recursively lists all files/folders
                    └─→ Upserts into `resources` table
                          └─→ Writes audit record to `sync_records`
```

### AI Chat (RAG)
```
User types question
  └─→ POST /api/ai/chat  { sessionId, message }
        └─→ Full-text search on `knowledge_chunks` (relevant PDF excerpts)
              └─→ Chunks injected as context into LLM prompt
                    └─→ OpenRouter API (model from `config` table)
                          └─→ Response + `relatedResources` returned to client
```

### PDF Knowledge Indexing
```
Admin triggers index
  └─→ POST /api/knowledge/index
        └─→ API downloads each PDF from Google Drive
              └─→ `pdf-parse` extracts text
                    └─→ Text split into chunks, stored in `knowledge_chunks`
                          └─→ `knowledge_index_meta` updated with timestamp
```

---

## 7. Security Model

| Mechanism | How It Works |
|---|---|
| **JWT Auth** | Bearer tokens issued on login; every token carries a `ver` (version) field. The DB stores `jwtVersion` per user; on logout or password change this increments, instantly invalidating all prior tokens. |
| **Password hashing** | `bcrypt` with standard cost factor |
| **Secret storage** | API keys (Google, OpenRouter) stored in the `config` DB table — never in `.env` or client code |
| **Drive proxy** | API server proxies all Google Drive requests server-side; raw Drive API keys are never sent to the browser or Android app |
| **Route guards** | `requireAuth` middleware (`src/middleware/auth.ts`) applied to all admin routes; public resource/AI routes are unauthenticated |

---

## 8. Deployment (Render.com)

Defined in `render.yaml` at the repo root.

```
GitHub Push → Render detects change → Build pipeline:
  1. pnpm install (workspace root)
  2. pnpm --filter @workspace/admin build   → artifacts/admin/dist/
  3. pnpm --filter @workspace/web build     → artifacts/web/dist/
  4. pnpm --filter @workspace/api-server build → artifacts/api-server/dist/
  5. Start: node artifacts/api-server/dist/index.js  (port 10000)
```

Environment variables set in Render dashboard:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `ADMIN_DEFAULT_PASSWORD` — used only on first login to set the admin password
- `SESSION_SECRET` — (if applicable)
- `NODE_ENV=production`

All other config (Google Drive credentials, OpenRouter key, AI model) is set via the Admin UI after first deploy.

---

## 9. Android App Architecture

```
UI Layer (Jetpack Compose)
  ├── HomeScreen — folder tree, search
  ├── PdfViewerScreen — split view (Question Paper + Mark Scheme)
  └── AiChatScreen — context-aware AI chat

ViewModel Layer (Hilt-injected)
  └── Observes StateFlow from repositories

Repository Layer
  ├── Remote: Retrofit → API Server REST endpoints
  └── Local:  Room DB (AppDatabase.kt)
                ├── CachedResource — offline resource metadata
                ├── Download — downloaded PDF paths
                └── ReadingProgress — last-read page per resource

Background
  └── DownloadService.kt (WorkManager) — background PDF download + caching
```

The Android app is **offline-first**: resource metadata is cached in Room on first load, and downloaded PDFs are stored locally. Subsequent launches work without a network connection until a sync is triggered.

---

## 10. Development Setup

### Prerequisites
- Node.js 20+, pnpm 9+
- A Neon PostgreSQL database

### Environment Variables
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Neon PostgreSQL connection string |
| `ADMIN_DEFAULT_PASSWORD` | ✅ Yes | Sets admin password on first run |
| `SESSION_SECRET` | Optional | Express session secret |

Google Drive and OpenRouter keys are configured in the Admin UI after starting the server — not via `.env`.

### Running Locally
```bash
# Install all workspace dependencies
pnpm install

# Start API server (port 3001)
cd artifacts/api-server && PORT=3001 pnpm run dev

# Start Admin dashboard (port 5000)
cd artifacts/admin && PORT=5000 API_PORT=3001 pnpm run dev

# Start Public website (port 3000)
cd artifacts/web && PORT=3000 API_PORT=3001 pnpm run dev
```

### Regenerating the API Client
After editing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## 11. Auto-Sync to GitHub

Every `git commit` in this repo automatically pushes to `github.com/oalevelresourcesby01/oalevelresources` via a post-commit hook (`.git/hooks/post-commit`). Render.com is connected to this GitHub repo and auto-deploys on every push to `main`.

To manually commit + push everything:
```bash
bash sync.sh "your commit message"
```

> **Note:** The git credential helper reads `GITHUB_TOKEN` from the Replit Secret at push time. If pushes fail after a Replit restart, run `bash setup-git.sh` to re-configure.

# O/A Level Resources — System Overview

> **Document for:** Project Supervisor / Boss  
> **Prepared by:** Development Team  
> **Date:** July 2026

---

## What Was Built

A complete, production-ready digital resource platform for O/A Level students. The system has three parts that work together:

| Part | What it is | Who uses it |
|------|------------|-------------|
| **API Server** | The brain — stores all data, talks to Google Drive, powers search and AI | Everything connects to this |
| **Admin Dashboard** | A private web control panel | The admin (you) |
| **Android App** | A native mobile app | Students |

---

## How It Works — Plain English

```
Google Drive (where PDFs live)
        │
        ▼
  ┌─────────────┐       ┌──────────────────┐
  │  API Server │◄──────│ Admin Dashboard  │
  │  (Node.js)  │       │  (Web browser)   │
  │             │       └──────────────────┘
  │  Neon PG DB │
  │  (cloud)    │       ┌──────────────────┐
  │             │◄──────│  Android App     │
  └─────────────┘       │  (Student phone) │
                        └──────────────────┘
```

1. **Admin** sets up Google Drive folder in the dashboard → server scans it and indexes all PDFs.
2. **Students** open the Android app → browse folders, search, read PDFs, chat with AI, and download resources offline.
3. The **API key for Google Drive** never reaches student phones — the server fetches PDFs and streams them securely.
4. When a student asks the AI a question, the server first searches the **indexed PDF knowledge base** and feeds relevant content to the AI before it answers.
5. Students can **attach images or documents** to their AI chat messages for context-aware help.
6. Students can open **two PDFs side by side** (e.g. Question Paper + Mark Scheme) in the viewer.
7. Students can **download entire folders** for offline use with one tap.

---

## Technology Stack

### API Server (`artifacts/api-server/`)
| Item | Choice | Why |
|------|--------|-----|
| Runtime | Node.js 20 | LTS, stable, widely supported |
| Language | TypeScript | Type-safe, catches bugs at compile time |
| Web framework | Express.js 5 | Industry standard, stable |
| Database | **Neon PostgreSQL** (cloud) | Serverless Postgres; no disk needed; free tier; production-grade |
| Full-text search | PostgreSQL `tsvector` + GIN index | Built-in FTS for AI knowledge search; no extra service needed |
| Auth | JWT (JSON Web Tokens) | Stateless, works with mobile + web clients |
| JWT revocation | `ver` counter in DB config | Logout and password-change instantly invalidate all prior tokens |
| Passwords | bcrypt (cost 12) | Industry-standard secure hashing |
| AI | OpenRouter proxy | Routes to GPT-4 / Claude without exposing key to app |
| AI knowledge | RAG over indexed PDFs | AI searches your own resources before answering |
| PDF delivery | Server-side proxy | Drive API key stays on server — never in any APK |
| Hosting | Render.com | Free tier available; auto-deploy from GitHub |

### Admin Dashboard (`artifacts/admin/`)
| Item | Choice |
|------|--------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| UI library | shadcn/ui |
| Data fetching | TanStack Query (React Query) |
| Routing | Wouter |

### Android App (`android/`)
| Item | Choice |
|------|--------|
| Language | Kotlin |
| UI framework | Jetpack Compose + Material 3 |
| Architecture | MVVM + Clean Architecture |
| DI | Hilt |
| Networking | Retrofit + OkHttp |
| Local cache | Room (SQLite) |
| PDF viewer | barteksc/AndroidPdfViewer |
| Image loading | Coil |
| Background sync | WorkManager |
| Download manager | Custom `DownloadService` (ForegroundService) |

---

## Admin Dashboard — What Each Page Does

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview stats: total resources, sync status, recent activity |
| **Drive Config** | Paste your Google Drive API key and root folder ID here |
| **Resources** | Browse all indexed PDFs; view by level/subject/topic |
| **Folder Generator** | Auto-create the correct Drive folder structure |
| **Announcements** | Post notices that appear in the student app |
| **AI Settings** | Paste OpenRouter API key; configure which model to use |
| **AI Knowledge** | Index PDFs into the knowledge base; monitor what the AI knows; view search logs |
| **Logs** | Full audit trail of all admin actions and sync events |
| **Settings** | Change admin username and password |

---

## Android App — All Screens

### 1. Home Screen
The main landing screen after app open.
- **Top bar:** "O/A Level Resources" title + Search icon + Settings icon
- **Quick actions:** Horizontal chips — Search, Downloads, Favourites, Recent, Continue Reading, AI Chat
- **Announcements:** Admin-posted notices in highlighted cards
- **Resource grid:** O Level, IGCSE, AS Level, A2 Level cards — each taps into the Browse screen
- **Special cards:** WhatsApp Channel shortcut, AI Assistant shortcut
- **Latest resources:** Horizontal list of recently synced PDFs

### 2. Browse Screen (Folder Explorer)
Navigates through the Drive folder hierarchy.
- **Top bar:** Current folder name + Back + Download All icon (if folder has PDFs) + Refresh
- **Breadcrumb row:** Scrollable path (e.g. Home → O Level → Physics → 2023)
- **List:** Folders (green icon) and PDFs (red icon) with child count / file size
- **Download status badges** on every PDF:
  - 🟢 "Downloaded" — file is saved offline
  - 🔵 "↓ 45%" — actively downloading
  - ⚪ "Pending" — queued for download
  - 🔴 "Error" — download failed
- **Download folder button:** Single tap queues all PDFs in the folder (skips already-downloaded ones)

### 3. PDF Viewer Screen
Full-screen PDF reader.
- **Top bar:** File name, page counter (Page X of Y), Split toggle, Night mode toggle, Favourite (♥) icon
- **Overflow menu (⋮):** Rotate 90°, Share, Download, Open in Browser
- **PDF pane:** Swipeable, zoomable PDF content (barteksc renderer)
- **Bottom:** Linear progress bar showing reading position
- **Reading progress** is saved to Room DB automatically

#### Split View (new)
- Tap "Open Side by Side" → search dialog appears → pick a second PDF
- Both PDFs load in a side-by-side layout separated by a vertical divider
- Each pane has its own independent page position
- Ideal for viewing **Question Paper + Mark Scheme** simultaneously
- Toolbar title shows both PDF names; "Close Split View" button appears

#### Rotate
- Tap ⋮ → "Rotate 90°" rotates the current PDF view

### 4. Search Screen
Global search across all indexed resources.
- **Top bar:** Auto-focused text field, Back button, Clear (✕) icon
- **Filter chips:** All / PDF / Folder
- **Results list:** Each result shows name + breadcrumb path (where the file is located)
- **Empty state:** Recent searches or "No results" icon

### 5. AI Chat Screen
Interactive AI assistant powered by your chosen AI model.
- **Top bar:** "O/A Level AI", subtitle, Back, Clear Chat button
- **Welcome state:** AI icon + suggestion chips (e.g. "Explain integration", "Help with vectors")
- **Chat bubbles:** Student (right, primary green) vs AI (left, surface variant)
- **Thinking animation:** Shown while AI is generating a reply
- **Input bar:**
  - 📷 Image button → opens system photo picker → image sent to AI with vision capability
  - 📎 File button → opens file picker → text extracted from PDF/doc and sent as context
  - Attachment preview strip shown above text field (tap ✕ to remove)
  - Text field + Send button
- **AI replies** can cite your own resource PDFs if the knowledge base was indexed

### 6. Downloads Screen
Manages all offline files.
- **List:** All download records from Room DB
- **Active downloads:** Shows progress bar + percentage
- **Completed:** Tap to open PDF directly, long-press for delete option
- **Failed:** Shows error message + retry option

### 7. Favourites Screen
Bookmarked resources.
- **List:** PDFs and folders the student has hearted (♥)
- Tap to open; unfavourite via heart icon in the PDF viewer

### 8. Continue Reading Screen
Resumes unfinished PDFs.
- **List:** Every PDF opened, showing last-read page and a progress bar
- Tap any item to reopen at the saved page

### 9. Settings Screen
App configuration.
- **Backend URL:** Shows the current Render server URL (set at build time)
- **Clear Cache:** Wipes the local Room DB cache
- **About:** App version, developer info

---

## Database Schema (what's stored)

All data lives in **Neon PostgreSQL** — a cloud-hosted database. No local files, no disk mounts.

```
config               — key/value settings (API keys, sync schedule, AI model, etc.)
announcements        — messages shown to students in the app
resources            — every PDF/folder: name, Drive ID, subject, level, topic, size
sync_records         — history of Google Drive scan runs
ai_sessions          — AI chat conversations (one per student device session)
ai_messages          — individual messages in each conversation
logs                 — audit trail of admin actions (capped at 5,000 rows)
knowledge_chunks     — PDF text split into searchable chunks (with FTS tsvector index)
knowledge_index_meta — which PDFs have been indexed and when
ai_search_logs       — every time the AI searched the knowledge base (for monitoring)
```

**Android Room DB (local, on-device):**
```
resources_cache      — mirrors the server resource tree for offline browsing
downloads            — download records: status, progress, local file path
favourites           — hearted resource IDs
recent               — recently opened PDFs with last-read page
```

---

## AI Knowledge System

When a student asks the AI a question, this happens **before** the AI generates a reply:

```
Student question (+ optional image or document attachment)
      │
      ▼
PostgreSQL FTS search over indexed PDF chunks
      │
      ├─ Relevant chunks found → injected into AI prompt as "RELEVANT RESOURCES"
      │
      └─ No chunks found → AI uses general knowledge
            │
            ▼
      AI reply (with citations if resources were found)
```

**Admin controls this from the "AI Knowledge" page:**
- **Rebuild Index** — re-reads and indexes every PDF in the library
- **Index New Only** — fast update for newly synced PDFs only
- **Remove Deleted** — cleans up chunks for PDFs no longer in Drive
- **Search Logs** — see what questions students are asking the AI

---

## Security Measures

| Threat | Protection |
|--------|------------|
| Unauthorised admin access | JWT Bearer tokens, bcrypt passwords (cost 12) |
| Stolen/leaked JWT tokens | `ver` counter in DB — logout & password-change instantly revoke all tokens |
| API key leaking to students | Drive key never in responses; PDF content streamed server-side |
| AI abuse / cost blowup | Rate limiter: 30 requests per IP per hour; uses rightmost XFF IP to prevent spoofing |
| Cleartext traffic (Android) | `network_security_config.xml` blocks all cleartext |
| Sensitive data in APK | No API keys, no passwords in the APK — only `BuildConfig.BASE_URL` |
| Weak default password | No hardcoded fallback — requires `ADMIN_DEFAULT_PASSWORD` env var on first boot |
| Forged client IP in AI limiter | Reads rightmost `X-Forwarded-For` entry (proxy-appended), not the leftmost (client-controlled) |

---

## Admin Login Credentials

| Field | Value |
|-------|-------|
| **Username** | `oalevel` |
| **Password** | Set via `ADMIN_DEFAULT_PASSWORD` on first login |
| **Admin URL (local)** | Preview pane → "O/A Level Resources — Admin" |
| **Admin URL (production)** | `https://your-render-app.onrender.com/admin/` |

> ⚠️ Change the password after first production login via **Settings → Change Password**.

---

## Google Drive Setup (one-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **API Key**, restrict it to **Google Drive API**
3. Create a folder in Drive called `OA Level Resources` (or any name)
4. Make the folder **public** (Anyone with link → Viewer)
5. Copy the folder's ID from the URL: `drive.google.com/drive/folders/`**`THIS_PART`**
6. In the Admin Dashboard → **Drive Config** → paste the API key and folder ID → Save → Sync

The recommended folder structure the system expects:

```
OA Level Resources/
├── O Level/
│   ├── Mathematics/
│   │   ├── Algebra/         ← PDFs go here
│   │   └── Geometry/
│   ├── Physics/
│   └── ...
└── A Level/
    ├── Mathematics/
    └── ...
```

Use **Folder Generator** in the dashboard to create this structure automatically.

---

## Deployment (Render.com)

### First-time setup
1. Push code to GitHub — push **everything except** `android/`:
   - `artifacts/` (api-server + admin)
   - `lib/` (openapi spec + generated clients)
   - `render.yaml`, `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`
   - `scripts/`
2. Login to [render.com](https://render.com) → New → Web Service → connect GitHub repo
3. Render auto-reads `render.yaml` — no manual config needed
4. Set these environment variables in Render dashboard:
   - `ADMIN_DEFAULT_PASSWORD` = your chosen admin password
   - `DATABASE_URL` = your Neon PostgreSQL connection string  
     _(format: `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)_
5. Deploy — takes ~3 minutes
6. Visit `https://your-app.onrender.com/admin/` — login with the credentials above
7. After first login → **Drive Config** → paste API key + folder ID → **Sync**
8. After sync completes → **AI Knowledge** → **Rebuild Index** (to enable AI knowledge search)

### What NOT to push to GitHub
- **`android/`** — this folder goes to Android Studio only, not Render

### render.yaml summary (already in codebase)
- Node.js 20
- Build: `pnpm install && pnpm --filter @workspace/api-server run build`  
- Start: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Health check: `GET /api/healthz`
- **No disk mount** — all data in Neon PostgreSQL cloud database

### Free tier limitations
- Server sleeps after 15 min of inactivity → first request after sleep takes ~30s to wake
- 512 MB RAM, shared CPU — sufficient for this workload
- Upgrade to $7/month Starter plan to keep it always-on

---

## Android App — Build & Release

The Android app **cannot** be compiled in a browser — it requires Android Studio on your computer.

### Steps
1. Install [Android Studio](https://developer.android.com/studio)
2. Open the **`android/`** folder as the project root in Android Studio
3. In `android/app/build.gradle.kts` set your Render URL:
   ```kotlin
   buildConfigField("String", "BASE_URL", "\"https://your-app.onrender.com/api/\"")
   ```
4. Build → Generate Signed APK (release build with ProGuard enabled)
5. Distribute the APK directly or via Google Play

### What goes on the phone
- The APK only contains: the UI code, `BASE_URL` pointing to your Render server
- **No API keys, no passwords, no Drive credentials** are stored in the APK

### Files for Android Studio vs GitHub
| Destination | Files |
|-------------|-------|
| **Android Studio** | `android/` folder only — open this as the project root |
| **GitHub → Render** | Everything else: `artifacts/`, `lib/`, `render.yaml`, `package.json`, `pnpm-workspace.yaml` |

---

## Testing in Replit (Development Environment)

### What you CAN test right now in Replit:

| What | How | URL |
|------|-----|-----|
| **Admin Dashboard** | Click the preview pane, select "O/A Level Resources — Admin" | `/admin/` |
| **API endpoints** | Use the table below with any HTTP client (browser, Postman, curl) | `/api/...` |
| **AI chat** | Requires OpenRouter API key set in Admin → AI Settings first | — |

### Key API endpoints to test manually:

```
GET  /api/healthz                         → server health + sync status
POST /api/auth/login                      → get JWT token
GET  /api/config                          → public settings
GET  /api/resources/stats                 → total PDF count
GET  /api/resources/levels                → list O/A Level options
GET  /api/announcements                   → student-facing notices
GET  /api/search?q=algebra                → full-text search
GET  /api/drive/sync/status               → last sync info
POST /api/ai/chat                         → AI chat (rate limited, public)
GET  /api/ai/knowledge/stats (JWT)        → knowledge index status
GET  /api/logs          (JWT required)    → admin audit trail
```

### Login to admin panel:
1. Open preview → select **O/A Level Resources — Admin**
2. Enter username `oalevel` and your password
3. You're in

### What you CANNOT test in Replit:
- **Android app** — requires a physical Android device or emulator in Android Studio
- **Google Drive sync** — requires a real Drive API key and folder
- **AI chat** — requires a real OpenRouter API key

---

## File Structure

```
workspace/
├── artifacts/
│   ├── api-server/          ← Node.js backend
│   │   ├── src/
│   │   │   ├── routes/      ← all API endpoints (auth, resources, search, ai, drive, etc.)
│   │   │   ├── lib/         ← Drive, AI, JWT, config, knowledge helpers
│   │   │   ├── db/          ← PostgreSQL pool + migrations
│   │   │   └── middlewares/ ← auth middleware
│   │   └── dist/            ← compiled output (auto-generated)
│   └── admin/               ← React admin dashboard
│       └── src/
│           ├── pages/       ← one file per admin page
│           └── contexts/    ← auth state management
├── android/                 ← Kotlin Android app (open in Android Studio)
│   └── app/src/main/java/
│       └── com/oalevel/resources/
│           ├── data/        ← API service, Room DB, repositories, DownloadService
│           └── ui/          ← Compose screens, ViewModels, theme
├── lib/
│   ├── api-spec/            ← OpenAPI spec (openapi.yaml)
│   ├── api-client-react/    ← auto-generated React hooks
│   └── api-zod/             ← auto-generated Zod validators
├── render.yaml              ← Render.com deployment config
├── system-overview.md       ← this document
└── android-preview.html     ← visual mockup of all Android screens
```

---

## What's Not Built Yet (Future Work)

| Feature | Notes |
|---------|-------|
| Push notifications | Requires Firebase Cloud Messaging setup |
| Student accounts / progress sync | Currently progress is device-local only |
| Analytics dashboard | Can add Plausible or Umami (self-hosted, free) |
| iOS app | Would need a separate Swift/SwiftUI project |
| Multi-admin support | Currently single admin account |
| Persistent AI rate limiter | Currently resets on server restart — needs DB-backed tracking |
| Google Drive OAuth | Currently uses API key (public folders only); OAuth would enable private Drive folders |

---

## Changelog

| Date | Update |
|------|--------|
| July 2026 | **Android: Splash screen logo** — real logo image shown on app launch instead of placeholder |
| July 2026 | **Android: AI image + document attach** — students can attach photos or files to AI chat messages for context-aware help |
| July 2026 | **Android: PDF split view** — two PDFs open side by side (ideal for QP + MS); rotate added to viewer menu |
| July 2026 | **Android: Folder download-all** — one-tap downloads all PDFs in a folder for offline use |
| July 2026 | **Android: Download status badges** — real-time download progress shown as badges on every PDF in the browser |
| July 2026 | **Security: AI rate limiter hardening** — reads rightmost XFF IP to prevent client IP spoofing |
| July 2026 | **AI Knowledge System** — RAG pipeline: PDFs indexed into PostgreSQL FTS; AI searches knowledge base before every answer |
| July 2026 | **Database migration** — SQLite → Neon PostgreSQL; all data now cloud-hosted |
| July 2026 | **JWT revocation** — logout and password-change immediately invalidate all tokens via version counter |
| July 2026 | **Security hardening** — Drive API key never sent to clients; fetch interceptor scoped to same-origin only |
| July 2026 | Initial build — API server, Admin Dashboard, Android app |

---

*Generated by the development team. Last updated: July 2026.*

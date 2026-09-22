# done.

Tell it how much time you have; it tells you what to do. A task manager built
around one idea: **the hard part isn't tracking tasks, it's picking one.**

**▶ Try it live:** embedded at [adriangaona.dev](https://adriangaona.dev)
(Selected work → Task Shuffler → Launch app) — that instance persists to your
browser's localStorage, so play freely.

## What it does

- **Weighted shuffle** — hit SHUFFLE! and get one task picked from your active
  list, scoped to everything, a single category, several, or only
  uncategorized tasks.
- **Time filters** — "I have ≤ 30 minutes": filter the shuffle pool by max /
  min / range / exact duration, with or without unestimated tasks.
- **Categories** — color-coded (School / Personal / Business / Hobby / Field
  by default), fully editable, hideable.
- **Archive & done states** — complete or archive tasks without losing them.

## Storage: two backends, one flag

The data layer is a façade (`src/api/db.ts`) with two interchangeable
implementations behind the same async API:

| Build | Storage | Use case |
|---|---|---|
| default | `json-server` over HTTP (`httpDb.ts`) | local dev / Docker. In the Docker image the live file is `$DB_FILE` (`/app/data/db.json`, seeded from `db.json` on first run) so a volume on `/app/data` keeps tasks across container re-creation |
| `VITE_STORAGE=local` | browser localStorage (`localDb.ts`) | serverless static build — this is what the portfolio embeds |

The localStorage build seeds a generic demo dataset on first run and needs no
backend at all: `npm run build` with the flag produces a static bundle you can
host anywhere.

## Run it

```bash
npm install
npm run dev                # UI on :3003 + json-server API on :3001

# serverless build (no backend, localStorage persistence)
VITE_STORAGE=local npm run build
npx vite preview
```

## Stack

React 19 · TypeScript · Zustand · Tailwind CSS 4 · shadcn/ui · framer-motion ·
Vite · json-server (default storage mode)

---

Built by [Adrián Gaona](https://adriangaona.dev).

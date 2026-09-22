# done.

A task shuffler. Tell it how much time you have; it tells you what to do. A task
manager built around one idea: **the hard part isn't tracking tasks, it's picking
one.**

**▶ Try it live:** embedded at [adriangaona.dev](https://adriangaona.dev) under
Selected work. That instance keeps its data in your browser's localStorage, so
feel free to play.

## What it does

- **Shuffle**: hit Shuffle and it picks one of your active tasks at random. You
  can draw from all categories, one, several, or only unassigned tasks. A short
  reel animation lands on the pick, and you can shuffle again or skip it with
  "Not feeling it" (skipped tasks stay out until you close the card).
- **Time filters**: "I have 30 minutes or less". Narrow the pool to at most, at
  least, between or exactly N minutes, with or without tasks that have no time
  set.
- **Quick add**: type a name and press Enter. Minutes (5 / 15 / 30 / 60 or any
  number) and a category are optional and appear while you're adding.
- **Categories**: colour-coded (School / Personal / Business / Hobby / Field /
  Unassigned by default). Add your own, reorder, hide, or delete custom ones;
  deleting moves their tasks to Unassigned.
- **Today at a glance**: active count, tasks done today, and a bar that fills
  as today's work gets done.
- **Archive**: completed tasks can be restored or deleted for good.
- **Backup**: export and import everything as JSON from Settings.
- Light, dark or system theme; works on phones.

## Storage: two backends, one flag

The data layer is a façade (`src/api/db.ts`) with two interchangeable
implementations behind the same async API:

| Build | Storage | Use case |
|---|---|---|
| default | `json-server` over HTTP (`httpDb.ts`) at `/api`, proxied by Vite | local dev / Docker |
| `VITE_STORAGE=local` | browser localStorage (`localDb.ts`) | serverless static build (what the portfolio embeds) |

The browser only ever talks to the UI's own origin: Vite proxies `/api` to
json-server (`API_PROXY_TARGET`, default `http://localhost:3001`). So the app
works from any device that can reach the UI, not only the machine running it.
Set `VITE_API_URL` at build time to point the UI at a different API.

In the Docker image the live data file is `$DB_FILE` (`/app/data/db.json`,
seeded from `db.json` on first run), so a volume on `/app/data` keeps tasks
across container re-creation.

The localStorage build seeds a generic demo dataset on first run and needs no
backend at all.

## Run it

```bash
npm install
npm run dev                # UI on :3003 (+ json-server on :3001 behind /api)

# serverless build (no backend, localStorage persistence)
VITE_STORAGE=local npm run build
npx vite preview
```

## Stack

React 19 · TypeScript · Zustand · Tailwind CSS 4 · shadcn/ui · framer-motion ·
Vite · json-server (default storage mode)

---

Built by [Adrián Gaona](https://adriangaona.dev).

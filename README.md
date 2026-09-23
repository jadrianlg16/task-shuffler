# done.

A task shuffler. Tell it how much time you have; it tells you what to do. A task
manager built around one idea: **the hard part isn't tracking tasks, it's picking
one.**

**▶ Try it live:** embedded at [adriangaona.dev](https://adriangaona.dev) under
Selected work. That instance keeps its data in your browser's localStorage, so
feel free to play.

## What it does

- **Pick for me**: say how much time you have (any, 15, 30, 60 or 90 minutes,
  or at least / between / exactly under "more…") and which categories to
  draw from (none picked = all). The button shows how many tasks fit, and if
  none do it offers the smallest change that works ("Try 30 min"). Your last
  choice is remembered.
- **Shuffle**: a short reel lands on one task. Older tasks come up a little
  more often (up to 3× for a task that has waited 30+ days), so nothing sits
  forever. Shuffle again, or skip it with "Not feeling it" (skipped tasks stay
  out until you close the card).
- **Start → Now**: starting a task pins it above the picker with how long
  you've been at it against its estimate. Done archives it (with Undo), Drop
  puts it back in the pool.
- **Quick add**: type a name and press Enter. Minutes (5 / 15 / 30 / 60 or any
  number) and a category are optional and appear while you're adding, or
  type them inline: `Call mom 15m #personal` (also `1h`, `1h30`, `45 min`;
  `#tags` match category names, and unknown tags stay in the name).
- **Categories**: colour-coded (School / Personal / Business / Hobby / Field /
  Unassigned by default). Add your own, rename, recolour, reorder, hide, or
  delete custom ones; deleting moves their tasks to Unassigned.
- **Today at a glance**: active count, tasks done today, and a bar that fills
  as today's work gets done.
- **Archive**: completed tasks, newest first, grouped Today / This week /
  Earlier. Restore them or delete them for good.
- **Backup**: export everything as JSON from Settings. Importing validates the
  file first and asks before replacing anything (with a one-click backup of
  what you have now).
- **Keyboard**: <kbd>N</kbd> new task, <kbd>S</kbd> shuffle, <kbd>/</kbd>
  search, <kbd>Enter</kbd> start the picked task, <kbd>Esc</kbd> close.
- **Safe saves**: if a change can't be saved (server down), it is undone on
  screen and you're told, instead of vanishing on the next reload.
- **Installable**: production builds ship a web manifest and an offline-capable
  service worker (network-first; task data under `/api` is never cached).
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
npm test                   # unit tests (Vitest)

# or, with hot reload in Docker (data in a named volume, not the repo)
docker compose up

# serverless build (no backend, localStorage persistence)
VITE_STORAGE=local npm run build
npx vite preview
```

## Stack

React 19 · TypeScript · Zustand · Tailwind CSS 4 · shadcn/ui · framer-motion ·
Vite · json-server (default storage mode)

---

Built by [Adrián Gaona](https://adriangaona.dev).

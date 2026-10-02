#!/bin/sh
# Docker smoke test (run by CI): build the image, run it on a throwaway volume,
# load the app's modules so the dev server's module graph is live, save
# through the API, and fail if a save made the dev server reload the page
# (it must never react to the data file it serves).
# IMAGE overrides the image tag (default task-shuffler-smoke).
set -eu

image="${IMAGE:-task-shuffler-smoke}"
name="$image-run"
volume="$image-data"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -q -t "$image" . >/dev/null
docker run -d --name "$name" -p 127.0.0.1::3003 -v "$volume:/app/data" "$image" >/dev/null
port="$(docker port "$name" 3003 | head -n 1 | sed 's/.*://')"
base="http://127.0.0.1:$port"

tries=0
until curl -fsS "$base/api/activities" >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -gt 120 ]; then
    docker logs "$name"
    echo "FAIL: the app did not start"
    exit 1
  fi
  sleep 1
done

# The /api proxy must keep connections open: closing each one makes every
# call a new TCP connection, which large imports can exhaust.
connection="$(curl -fsSI "$base/api/activities" | tr -d '\r' | awk -F': ' 'tolower($1) == "connection" { print tolower($2) }')"
if [ "$connection" = "close" ]; then
  echo "FAIL: the /api proxy answers with Connection: close"
  exit 1
fi

# What a browser loads first; this puts the stylesheet (and the files
# Tailwind scans for it) into the dev server's module graph.
for path in / /src/main.tsx /src/App.tsx /src/index.css; do
  curl -fsS "$base$path" >/dev/null
done

saves=5
for n in $(seq 1 "$saves"); do
  curl -fsS -X POST -H "Content-Type: application/json" \
    -d "{\"id\":\"smoke-$n\",\"name\":\"Smoke $n\",\"durationMinutes\":5,\"categoryId\":\"unassigned\",\"status\":\"active\",\"createdAt\":\"2026-01-01T00:00:00.000Z\",\"completedAt\":null}" \
    "$base/api/activities" >/dev/null
done
sleep 3 # file watching polls in the container

reloads="$(docker logs "$name" 2>&1 | grep -c "page reload" || true)"
if [ "$reloads" -ne 0 ]; then
  docker logs "$name" 2>&1 | grep "page reload"
  echo "FAIL: $saves saves caused $reloads page reload(s)"
  exit 1
fi
echo "OK: $saves saves, 0 page reloads"

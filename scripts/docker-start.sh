#!/bin/sh
# Container start (see Dockerfile): seed the data file on first run, then run
# json-server (3001) and the Vite dev server (3003) as the unprivileged "node"
# user, both bound to 0.0.0.0. The browser only needs :3003; Vite proxies /api.
set -eu

data_dir="$(dirname "$DB_FILE")"

if [ "$(id -u)" = "0" ]; then
  # Earlier images ran as root, so an existing volume can hold root-owned
  # files. Hand anything not owned by "node" over to it, then drop privileges.
  # Symlinks are skipped (and -h never follows one): a link planted in the
  # volume must not get its target chowned.
  mkdir -p "$data_dir"
  find "$data_dir" ! -type l ! -user node -exec chown -h node:node {} +
  exec su-exec node sh "$0" "$@"
fi

if [ ! -f "$DB_FILE" ]; then
  cp /app/db.json "$DB_FILE"
fi

# 0.0.0.0 inside the container so the published port works. No CORS (spelled
# --noCors: json-server 0.17 ignores --no-cors), and scripts/api-guard.cjs
# refuses requests from other origins.
node_modules/.bin/json-server --watch "$DB_FILE" --host 0.0.0.0 --port 3001 \
  --noCors --middlewares scripts/api-guard.cjs &
# exec: Vite becomes PID 1, so `docker stop` reaches it and it shuts down cleanly.
exec node_modules/.bin/vite --host 0.0.0.0 --port 3003

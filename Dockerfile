# done. (task shuffler): dev-mode container.
# Runs the Vite UI (3003) and the json-server API (3001) together, both bound to
# 0.0.0.0. The browser only needs :3003; Vite proxies /api to json-server.
FROM node:20-alpine

# su-exec lets the start script fix data-volume ownership as root and then run
# the app as the unprivileged "node" user (see scripts/docker-start.sh).
RUN apk add --no-cache su-exec

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
# A new named volume mounted here starts out owned by "node".
RUN mkdir -p /app/data

# Polling makes file-watching reliable inside a container.
ENV CHOKIDAR_USEPOLLING=true
# Live data lives under /app/data so it can be mounted as a volume and survive
# the container being removed and re-created. /app/db.json stays in the image
# as the first-run seed only.
ENV DB_FILE=/app/data/db.json
# json-server binds IPv4 0.0.0.0; point the /api proxy at it explicitly.
ENV API_PROXY_TARGET=http://127.0.0.1:3001
EXPOSE 3003 3001

# Starts as root only to adopt volumes written by earlier root-run images; the
# script drops to "node" before anything else runs.
USER root
CMD ["sh", "scripts/docker-start.sh"]

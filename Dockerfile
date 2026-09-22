# done. (task shuffler) — dev-mode container.
# Runs the Vite UI (3003) and the json-server API (3001) together, both bound to
# 0.0.0.0. The browser only needs :3003 — Vite proxies /api to json-server.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Polling makes file-watching reliable inside a container.
ENV CHOKIDAR_USEPOLLING=true
# Live data lives under /app/data so it can be mounted as a volume and survive
# container re-creation (the dashboard removes + recreates the container on
# every Open/Stop). /app/db.json stays in the image as the first-run seed only.
ENV DB_FILE=/app/data/db.json
# json-server binds IPv4 0.0.0.0 below; point the /api proxy at it explicitly.
ENV API_PROXY_TARGET=http://127.0.0.1:3001
EXPOSE 3003 3001

# Seed the data file once, then json-server on 0.0.0.0:3001 + vite on 0.0.0.0:3003.
CMD ["sh", "-c", "mkdir -p \"$(dirname \"$DB_FILE\")\"; if [ ! -f \"$DB_FILE\" ]; then cp /app/db.json \"$DB_FILE\"; fi; npx json-server --watch \"$DB_FILE\" --host 0.0.0.0 --port 3001 & npx vite --host 0.0.0.0 --port 3003"]

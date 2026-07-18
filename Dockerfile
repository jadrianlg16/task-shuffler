# Task Shuffler — dev-mode container.
# Runs the Vite UI (3003) and the json-server API (3001) together, both bound to
# 0.0.0.0 so they're reachable from the host. The UI calls the API on :3001.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Polling makes file-watching reliable inside a container.
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 3003 3001

# json-server on 0.0.0.0:3001 + vite on 0.0.0.0:3003.
CMD ["sh", "-c", "npx json-server --watch db.json --host 0.0.0.0 --port 3001 & npx vite --host 0.0.0.0 --port 3003"]

# Query Bot

Run and schedule MySQL queries with a simple Vue + Express dashboard. Includes JWT-based login, job scheduling via cron, result/error logging, and a Bootstrap-styled UI.

## Overview
- Frontend: Vue 3 (Vite), Bootstrap 5.
- Backend: Node.js (Express), Knex + mysql2, node-cron.
- Auth: JWT with credentials from `.env` (`ADMIN_USER`, `ADMIN_PASS`).
- DB: Auto-creates `jobs` and `job_logs` tables when permissions allow.
- API base: dynamic — dev uses `http://localhost:3000/api`; production uses same-origin `/api` unless `VITE_API_BASE` is set.

## Features / Specs
- Create scheduled jobs with a cron expression and SQL text.
- Run ad-hoc queries and preview results.
- View scheduled jobs and execution logs.
- Login required for write actions (run, create, delete), read endpoints remain public by default.
- Reusable modal for previews; error banner surfaces backend/API errors.

### REST API
- `POST /api/auth/login` → `{ token, user }` (JWT)
- `POST /api/run` (auth) → execute an ad-hoc query and return a preview
- `POST /api/jobs` (auth) → create a scheduled job
- `DELETE /api/jobs/:id` (auth) → delete a job
- `GET /api/jobs` → list jobs
- `GET /api/logs` → list latest logs

### Database Schema
- `jobs`: `id (string pk)`, `name`, `cron_time`, `query_text (text)`, `status`, `created_at`
- `job_logs`: `id (auto)`, `job_id`, `executed_at`, `result_json (json)`

## Setup

### Prerequisites
- Node.js 18+
- MySQL 5.7+/8.x with a reachable host and a user with privileges on your target schema.

### Environment Variables (`query-bot/.env`)
```
# Server
PORT=3000
JWT_SECRET=replace-with-a-strong-random-string
ADMIN_USER=admin
ADMIN_PASS=FarFarAway...

# Database
DB_HOST=127.0.0.1
DB_USER=agung
DB_PASS=p4ssw0rd
DB_NAME=querybot

# Frontend (optional override)
# In production, the app defaults to same-origin "/api"
# VITE_API_BASE=https://api.example.com/api
```

Notes:
- Backend reads non-`VITE_` vars. Frontend only reads `VITE_`-prefixed vars at build time.
- Ensure your DB user has `CREATE`, `SELECT`, `INSERT`, and `DELETE` on the schema (`DB_NAME`).
- An `.env.example` is provided; copy it to `.env` and adjust values.
- `ADMIN_USER` and `ADMIN_PASS` are required. If they are not set, login is disabled and the backend logs a notice.

#### Required Variables
- `ADMIN_USER`, `ADMIN_PASS` — enable JWT login; no defaults.
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` — database connectivity.

#### Recommended/Production
- `JWT_SECRET` — use a strong, random string. The dev fallback is not safe for production.

#### Optional
- `PORT` — defaults to `3000`.
- `VITE_API_BASE` — set only when UI and API are on different hosts (e.g., `https://api.example.com/api`).

#### Setup
- Copy the template and edit values: `cp .env.example .env`
- The backend loads `.env` via `dotenv` at startup.

### Install
```
cd query-bot
npm install
```

### Development
Run frontend and backend in separate terminals:
```
# Terminal A (frontend UI)
npm run frontend  # http://localhost:5173/

# Terminal B (backend API)
npm run dev       # http://localhost:3000/
```

## API Docs
- Swagger UI: `http://localhost:3000/api-docs` in dev, `/api-docs` in production.
- Machine-readable specs: `/swagger.json` (OpenAPI JSON), `/swagger.xml` (XML).
- Frontend shortcut: click the `API Docs` button in the navbar.
- Config: respects `VITE_API_BASE`. For split hosts, set `VITE_API_BASE` (e.g., `https://api.example.com/api`).

## Production

### Build Frontend
```
npm run build:frontend
```
This generates `src/frontend/dist/`. The backend auto-serves this folder when present.

### Start Backend
```
npm run start
```
Or use a process manager:
```
npm install -g pm2
pm2 start src/app.js --name query-bot
pm2 save
```

### Reverse Proxy (same-origin)
Point your web server to the Node backend, e.g., Nginx:
```
location / {
  proxy_pass http://127.0.0.1:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
No `VITE_API_BASE` needed for same-origin; the frontend uses `/api`.

### Split Domains (optional)
If UI and API are on different hosts, set `VITE_API_BASE` to the full API URL before building:
```
VITE_API_BASE=https://api.example.com/api
npm run build:frontend
```
Ensure CORS on backend is restricted appropriately.

## Docker
- Prerequisites: set required variables in `.env` (`ADMIN_USER`, `ADMIN_PASS`, `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, and a strong `JWT_SECRET`).
- Optional: set `VITE_API_BASE` if UI and API are on different hosts. For same-origin, omit it.

### Build & Run
```
docker compose up --build -d
```
- Access UI: `http://localhost:${PORT-3000}/`
- API: `http://localhost:${PORT-3000}/api`
- Swagger: `http://localhost:${PORT-3000}/api-docs`

Compose honors your `.env`:
- Host port mapping uses `${PORT:-3000}` → container listens on `3000`.
- Frontend build can read `VITE_API_BASE` at image build time.

### Stop
```
docker compose down
```

### Notes
- The app connects to your configured MySQL host (`DB_HOST`). Ensure the container can reach it and network/firewall rules permit access.
- For split-host deployments, set `VITE_API_BASE` to your API URL before `docker compose up --build` so the frontend is built with the correct base.

## Security Checklist
- Change `ADMIN_USER`/`ADMIN_PASS` and set a strong `JWT_SECRET`.
- Restrict CORS origin in production (instead of permissive `cors()`).
- Use HTTPS end-to-end.
- Apply least privilege on MySQL user (limit to `DB_NAME`).
- Monitor logs; avoid running destructive SQL unless you fully trust the environment.

## Troubleshooting
- `Access denied / CREATE command denied`: grant privileges to your DB user on the schema.
- `Unknown database 'querybot'`: ensure `DB_NAME` exists or grant rights for auto-creation.
- `ENOENT: src/frontend/dist/index.html`: run `npm run frontend` in dev or `npm run build:frontend` for production.
- Frontend can’t reach API in prod: set `VITE_API_BASE` to your API host or serve same-origin via reverse proxy.

## Quick API Test
```
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"FarFarAway..."}'

# Create a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Daily","cron_time":"0 8 * * *","query_text":"SELECT 1"}'

# List jobs
curl http://localhost:3000/api/jobs

# Run ad-hoc query
curl -X POST http://localhost:3000/api/run \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"query_text":"SELECT NOW()"}'
```
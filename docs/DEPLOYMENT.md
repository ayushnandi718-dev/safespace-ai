# Deployment

This runbook covers how SafeSpace AI is deployed to production: the FastAPI backend on **Render** (Docker web service) with a persistent **PostgreSQL** database, and the Next.js frontend on **Vercel**.

**Production URLs**

| Component | URL |
|-----------|-----|
| Frontend | <https://frontend-gray-one-b7w5ul743a.vercel.app> |
| Backend | <https://safespace-ai-api.onrender.com> |
| Swagger UI | <https://safespace-ai-api.onrender.com/docs> |

---

## Table of Contents

- [1. Repo layout & build inputs](#1-repo-layout--build-inputs)
- [2. Backend — Render web service](#2-backend--render-web-service)
- [3. Persistent PostgreSQL database](#3-persistent-postgresql-database)
- [4. Frontend — Vercel](#4-frontend--vercel)
- [5. Environment variables](#5-environment-variables)
- [6. Deployment & redeploying](#6-deployment--redeploying)
- [7. Known caveats](#7-known-caveats)
- [8. Local vs. production differences](#8-local-vs-production-differences)

---

## 1. Repo layout & build inputs

```text
C:\Users\ayush\SafeSpaceAI\
|-- backend/
|   |-- Dockerfile          # Render builds this image
|   |-- app/                # FastAPI application
|   |-- pyproject.toml      # Python deps (asyncpg included)
|   `-- .env.example
|
|-- frontend/               # Vercel project root (rootDirectory = "frontend")
|-- render.yaml             # Render Blueprint (config reference)
`-- .git                    # GitHub: ayushnandi718-dev/safespace-ai, branch main
```

- Backend build: `backend/Dockerfile` installs deps via `pip install` (including `asyncpg>=0.30.0`) and runs `uvicorn app.main:app`.
- Frontend build: Next.js 14 production build (`npm run build`).

---

## 2. Backend — Render web service

**Service:** `safespace-ai-api` — `srv-dabhc7ek1f9s73ar8acg`

| Setting | Value |
|---------|-------|
| Type | Web Service |
| Runtime | Docker |
| Root directory | `backend` |
| Dockerfile | `backend/Dockerfile` |
| Plan | Free |
| Region | `oregon` |
| Health check path | `/api/v1/health` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` (from Dockerfile) |

This is a **Git-connected** service (`https://github.com/ayushnandi718-dev/safespace-ai`, branch `main`, root `backend`). See [Caveats](#7-known-caveats) regarding auto-deploy.

---

## 3. Persistent PostgreSQL database

**Database:** Render Postgres, instance `safespace-pg`.

| Setting | Value |
|---------|-------|
| Plan | Free |
| Region | `oregon` **(must match the web service region)** |
| Version | PostgreSQL 16 |
| Status | active |

### Why Postgres (and why region matters)

- Render free-tier uses **ephemeral container storage**. Prior to this, the backend ran on SQLite stored in the container, so **every redeploy wiped all users** (the recurring "my password/email keeps changing" bug).
- The fix: a **persistent Postgres database** on Render and setting `DATABASE_URL` on the service.
- **Region pairing is critical.** The internal Postgres connection string only works from a service in the **same region**. An earlier attempt put the DB in `singapore` while the service was in `oregon`, causing the backend to crash at deploy time (exit code 3) — it recovered once the DB was recreated in `oregon`.

### Connecting the service

The app reads `DATABASE_URL` (see [§5](#5-environment-variables)). Use the **internal** connection string (no `:5432`/region host suffix) prefixed for asyncpg:

```
postgresql+asyncpg://<user>:<password>@<db-host-name>/<db-name>
```

Because it is internal, no SSL flag is needed when the service and DB share a region.

> **Free-tier expiry:** Render free Postgres instances auto-expire 30 days after creation (shown as `expiresAt`). Keeping this database past that date requires upgrading to a paid plan (or adding a billing method).

---

## 4. Frontend — Vercel

**Project:** `frontend` (org `ayush-nandis-projects-ab41a59d`)

| Setting | Value |
|---------|-------|
| Framework preset | Next.js |
| Project root (rootDirectory) | `frontend` |
| Build command | `next build` (default) |
| Install command | `npm install` (default) |
| Production alias | `frontend-gray-one-b7w5ul743a.vercel.app` |

The frontend calls the backend through `NEXT_PUBLIC_API_URL`. In production this is set (in the Vercel project environment) to `https://safespace-ai-api.onrender.com`. Without it the client falls back to `http://localhost:8000`.

---

## 5. Environment variables

### Backend (set on the Render service)

The live backend env is stored on the Render service itself. Reference [`backend/.env.example`](../backend/.env.example) for every key. The non-secret, important ones:

| Key | Production value / note |
|-----|-------------------------|
| `DATABASE_URL` | The Postgres asyncpg internal URL from §3 |
| `JWT_SECRET_KEY` | **Long random value** (never the default) |
| `NVIDIA_API_KEY` | NVIDIA Nemotron key (primary LLM) |
| `NVIDIA_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| `GROQ_API_KEY` | Fallback LLM key |
| `CORS_ORIGINS` | JSON list including the Vercel production alias + localhost |
| `CONFIRM_REAL_CALL` | `False` (never enable real calls unless explicitly wanted) |
| `NVIDIA_ENABLE_THINKING` | `False` |
| `RATE_LIMIT_ENABLED` | `true` |

`render.yaml` documents the same set (used as the Blueprint reference).

### Frontend (set in the Vercel project)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://safespace-ai-api.onrender.com` |

### Never commit secrets

`.env` is git-ignored. Secrets belong in Render/Vercel environment (or in git as `sync: false` references in `render.yaml`, never as literal values).

---

## 6. Deployment & redeploying

### Backend (Render)

Render deploys from the connected GitHub repo. Because the auto-deploy webhook is currently broken (see [§7](#7-known-caveats)), deploys are triggered explicitly:

```powershell
# 1. Push the latest code (if there are local changes)
git add -A
git commit -m "description"
git push origin main

# 2. Trigger a deploy for the latest commit via the Render API
$h  = @{ Authorization = "Bearer <RENDER_API_KEY>" }
$svc = "srv-dabhc7ek1f9s73ar8acg"
$commit = (git rev-parse HEAD)
$body = @{ clearCache = "do_not_clear"; commitId = $commit } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys" `
  -Method Post -Headers $h -ContentType "application/json" -Body $body
```

You can also click **Manual Deploy → Deploy latest commit** in the Render dashboard.

**Changing an env var on the Render service** (e.g. updating `DATABASE_URL`):

```powershell
$key  = "DATABASE_URL"
$val  = "postgresql+asyncpg://USER:PASS@HOST/DB"
$body = @{ value = $val } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/env-vars/$key" `
  -Method Put -Headers $h -ContentType "application/json" -Body $body

# then redeploy (or Render redeploys automatically on env change if auto-deploy works)
```

### Frontend (Vercel CLI)

```powershell
# From the repo root (the project rootDirectory is "frontend", do not append it again)
npx vercel --prod --yes --cwd "C:\Users\ayush\SafeSpaceAI"
```

Successful pipeline prints the production URL and re-aliases the canonical `frontend-gray-one-b7w5ul743a.vercel.app`.

---

## 7. Known caveats

### 7.1 Git → Render auto-deploy webhook is missing

The GitHub repo currently has **no Render webhook**, so new pushes do **not** auto-deploy. Prior deploys did auto-deploy (`trigger: new_commit`), so the webhook is simply no longer registered. Until it is restored, deploy manually (see §6).

To restore auto-deploy:
1. In the Render dashboard, open the `safespace-ai-api` service → **Settings → Linked Repo**.
2. Remove/re-link the repo (this regenerates Render's webhook on GitHub), or verify the webhook exists under **GitHub → Repository → Settings → Webhooks**.
3. Verify a subsequent `git push` triggers a deploy automatically.

### 7.2 Free-tier Postgres expires

The free Postgres instance is scheduled to expire ~30 days after creation (`expiresAt`). After that, the database (and all accounts) will be unavailable until you upgrade the DB to a paid plan or create a new instance and re-point `DATABASE_URL`.

### 7.3 Manual deploy does not re-sync `render.yaml` env vars

A manual `POST /deploys` builds the code but does **not** re-run the Render Blueprint env sync. Environment variables must be applied directly on the service (via the env-vars endpoint or the dashboard) — they are **not** taken from `render.yaml` for this manually-created Docker service.

---

## 8. Local vs. production differences

| Concern | Local | Production |
|---------|-------|------------|
| Database | SQLite (`sqlite+aiosqlite:///./safespace.db`) | PostgreSQL (`asyncpg`, internal URL) |
| LLM | NVIDIA key from `.env` | NVIDIA key from Render env |
| Frontend origin | `http://localhost:3000` | Vercel production alias |
| CORS | `["http://localhost:3000"]` | Vercel alias + localhost |
| Emergency calls | Simulation (`CONFIRM_REAL_CALL=False`) | Simulation (same default) |

The code path is identical; only the environment variables differ.

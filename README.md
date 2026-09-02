# SafeSpace AI

**Your AI Health, Wellness & Care Companion**

SafeSpace AI is a full-stack, production-style application that combines a premium Next.js chat interface with a FastAPI backend and a LangGraph multi-agent orchestration system. Users chat with an empathetic AI assistant, discover local healthcare providers, track their mood over time, and receive safe, crisis-aware responses — all backed by secure authentication (JWT + bcrypt) and persistent conversation memory stored in PostgreSQL.

The assistant is powered by **NVIDIA Nemotron 3.5 Lightning 30B A3B**, with support for several LLM backends via a single configuration flip.

> ⚠️ **Important:** SafeSpace AI is an experimental, informational support system. It is **not** a substitute for professional medical or mental-health care, diagnosis, or treatment, and it is **not** an emergency service. Emergency escalation is **simulated by default** and never places real external calls unless explicitly configured and confirmed by an operator.

---

## Table of Contents

- [Live URLs](#live-urls)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup (Local Development)](#setup-local-development)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Multi-Agent System](#multi-agent-system)
- [Deployment](#deployment)
- [Safety Design](#safety-design)
- [Roadmap](#roadmap)
- [License](#license)

---

## Live URLs

| Component | URL |
|-----------|-----|
| Frontend (Vercel, production alias) | <https://frontend-gray-one-b7w5ul743a.vercel.app> |
| Backend (Render) | <https://safespace-ai-api.onrender.com> |
| Interactive API docs (Swagger UI) | <https://safespace-ai-api.onrender.com/docs> |
| Health check | <https://safespace-ai-api.onrender.com/api/v1/health> |

---

## Features

- **AI Emotional Support** — warm, non-diagnostic conversations about stress, anxiety, academic pressure, work pressure, and loneliness.
- **Healthcare Finder** — search for doctors, therapists, clinics, hospitals, pharmacies, dentists, orthopedic specialists, and more near any location, using OpenStreetMap (Overpass + Photon) with an optional Google Places fallback.
- **Mood Tracking** — daily 1–5 check-ins with spark-lines, averages, streaks, and trend detection.
- **Crisis-Aware Intelligence** — rule-based risk gating that routes HIGH/IMMEDIATE-risk language straight to a "safety first" workflow before any normal conversational coaching.
- **Multi-Agent AI** — LangGraph selects the correct specialist tool based on intent and safety requirements.
- **Conversation Memory** — persistent database-backed history with a bounded context window (last 20 messages).
- **Streaming Responses** — progressive token delivery over Server-Sent Events (SSE).
- **Secure Authentication** — JWT + bcrypt password hashing, per-user conversation authorization.
- **Premium Dark UI** — responsive, animated, glassmorphic Next.js interface with a calm healthcare aesthetic.

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Framer Motion, Lucide React

**Backend**
- Python 3.11, FastAPI, Pydantic v2
- LangGraph / LangChain for agent orchestration (ReAct)
- LLM: **NVIDIA Nemotron 3.5 Lightning 30B A3B** (primary), Groq fallback (configurable via `LLM_MODEL`)
- SQLAlchemy 2.0 (async) + `aiosqlite` (local default) / `asyncpg` (PostgreSQL)

**Database**
- **SQLite** by default (zero-config local demo)
- **PostgreSQL** (via `asyncpg`) in production on Render — persistent accounts

**Infrastructure**
- Backend: Render (Docker web service, free tier)
- Frontend: Vercel (Next.js, project root `frontend`)

---

## Architecture

```text
                         USER
                           |
                           v
                    NEXT.JS FRONTEND
                           |
                         REST / SSE
                           v
                     FASTAPI BACKEND
                           |
              +------------+------------+
              |                         |
              v                         v
         POSTGRESQL                 LANGGRAPH
       (users/convos/             (orchestrator)
        messages/mood)
                                       |
              +------------+----------+----------+------------+
              |            |                     |            |
              v            v                     v            v
        Risk       Mental Health        Healthcare /     Crisis Safety
     Assessment     Specialist          Therapist        (emergency
     (rules)        (locate/ask)        Finder tool       tool)
                                       |
                                       v
                               FINAL RESPONSE
                                       |
                                       v
                                     USER
```

### User Flow

```text
User visits website -> Creates account -> Dashboard
        -> Starts conversation -> Frontend -> FastAPI
        -> Risk Assessment -> LangGraph Router -> Specialist Agent / Direct tool
        -> AI Response (streamed) -> Saved to database -> Displayed in Chat UI
```

---

## Project Structure

```text
safespace-ai/
|
|-- frontend/                    # Next.js 14 (App Router, TypeScript)
|   |-- app/
|   |   |-- page.tsx             # Landing page (/) — hero, features, finder, pipeline
|   |   |-- login/               # /login
|   |   |-- register/            # /register
|   |   `-- (dashboard)/         # Protected route group (sidebar layout)
|   |       |-- layout.tsx       # Auth guard + 280px sidebar + mobile drawer
|   |       |-- chat/            # /chat — streaming chat UI (SSE)
|   |       |-- dashboard/       # /dashboard — mood check-in, stats, quick actions
|   |       |-- find-support/    # /find-support — healthcare provider search
|   |       |-- resources/       # /resources — wellness info + hotlines
|   |       `-- settings/        # /settings — profile, password, export, danger zone
|   |-- components/              # ApiKeyBanner, Toast (context)
|   |-- lib/                     # api.ts (API client), auth.tsx (auth context)
|   |-- types/                   # TypeScript interfaces
|   |-- tailwind.config.ts
|   `-- package.json
|
|-- backend/
|   |-- app/
|   |   |-- api/                 # FastAPI routers (auth, chat, conversations, support,
|   |   |                        #   mood, settings, crisis)
|   |   |-- agents/              # LangGraph orchestration + specialist tools + risk rules
|   |   |-- core/                # config, database, security, llm, rate_limit,
|   |   |                        #   integrations, support_search
|   |   |-- models/              # SQLAlchemy models (User, Conversation, Message,
|   |   |                        #   MoodEntry, CrisisEscalation)
|   |   |-- schemas/             # Pydantic v2 schemas
|   |   `-- main.py              # FastAPI app entrypoint
|   |-- live_session.ipynb       # Jupyter walkthrough of the agent stack
|   |-- Dockerfile
|   |-- pyproject.toml
|   `-- .env                     # local secrets (never commit)
|
|-- docs/
|   |-- ARCHITECTURE.md          # Deep dive: multi-agent, data model, request flow
|   |-- API.md                   # Full HTTP API reference
|   `-- DEPLOYMENT.md            # Render + Vercel + Postgres deployment guide
|
|-- render.yaml                  # Render Blueprint configuration
|-- .gitignore
`-- README.md
```

---

## Setup (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

# Install (editable, installs package metadata)
pip install -e .

# (Optional) Twilio integration
pip install -e ".[twilio]"

# Configure environment
cp .env.example .env   # then fill in your keys (at minimum NVIDIA_API_KEY or GROQ_API_KEY)

# Run
uvicorn app.main:app --reload
```

- Backend: <http://localhost:8000>
- API docs (Swagger): <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/v1/health>

> Out of the box the backend uses **SQLite** (`sqlite+aiosqlite:///./safespace.db`) — no external database needed. For PostgreSQL, create a database and set `DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db` in `.env`. Tables are created automatically on startup (`create_all`).

### Frontend

```bash
cd frontend

npm install
npm run dev
```

- Frontend: <http://localhost:3000>

The frontend reads the API origin from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Create `frontend/.env.local` if you need a different backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Jupyter Notebook

```bash
cd backend
jupyter notebook live_session.ipynb
```

Run cells top-to-bottom to see risk assessment, the four tools, LangGraph compilation, staging questions, and a simulated crisis escalation.

---

## Environment Variables

Backend `.env`:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./safespace.db` | Async DB connection string. Postgres via `postgresql+asyncpg://...` |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — **set a long random value in production** |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access-token lifetime |
| `NVIDIA_API_KEY` | `""` | NVIDIA API key (**primary LLM** provider) |
| `NVIDIA_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` | NVIDIA model identifier |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` | NVIDIA `ChatOpenAI`-compatible base URL |
| `NVIDIA_ENABLE_THINKING` | `False` | Enable extended "thinking" for the NVIDIA model |
| `NVIDIA_REASONING_BUDGET` | `2048` | Reasoning token budget |
| `GROQ_API_KEY` | `""` | Groq API key (**fallback** provider when no NVIDIA key) |
| `LLM_MODEL` | `openai/gpt-oss-120b` | Fallback Groq model identifier |
| `IPGEOLOCATION_API_KEY` | `""` | ipgeolocation.io key for location-based therapist search |
| `GOOGLE_MAPS_API_KEY` | `""` | Optional Google Places key for live provider search |
| `THERAPIST_API_KEY` | `""` | (Reserved / unused) |
| `TWILIO_ACCOUNT_SID` | `""` | Twilio account SID (external crisis notification) |
| `TWILIO_AUTH_TOKEN` | `""` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | `""` | Twilio sender number |
| `EMERGENCY_CONTACT` | `""` | Phone number to notify in a configured emergency workflow |
| `EMERGENCY_CALL_MESSAGE` | (long default) | SMS/voice body for crisis alerts |
| `TWIML_URL` | backend TwiML route | TwiML callback URL for Twilio voice |
| `CONFIRM_REAL_CALL` | `False` | **Must remain `False`** unless an operator explicitly enables real calls |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins (JSON string) |
| `RATE_LIMIT_ENABLED` | `True` | Enable SlowAPI rate limiting |
| `RENDER_API_KEY` | `""` | (Reserved / unused) |

> **Never commit `.env`.** It is already git-ignored. All secrets are supplied to Render via its dashboard/`render.yaml` environment — they must not be exposed to the frontend.

---

## API Documentation

A complete reference (all routes, request/response bodies, authentication, error handling) lives in **[`docs/API.md`](docs/API.md)**.

Quick index — all paths are under the `/api/v1` prefix and require a `Authorization: Bearer <token>` header (except `register`/`login`/`health`):

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/register` | Create account, returns JWT |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user profile |
| POST | `/chat` | Send message, get full AI response |
| POST | `/chat/stream` | Send message, SSE-streamed response |
| GET | `/conversations` | List current user's conversations |
| GET | `/conversations/{id}` | Full conversation with messages |
| DELETE | `/conversations/{id}` | Delete one conversation |
| POST | `/support/search` | Search local healthcare resources by location |
| POST | `/mood` | Create a mood check-in |
| GET | `/mood` | List mood entries |
| GET | `/mood/stats` | Mood statistics / trend |
| GET | `/settings` | Get profile & preferences |
| PUT | `/settings` | Update profile & preferences |
| POST | `/settings/change-password` | Change password |
| DELETE | `/settings/conversations` | Delete all conversation history |
| DELETE | `/settings/account` | Delete account |
| POST | `/crisis/escalate` | Escalate a crisis (simulation by default) |
| GET | `/crisis/twiml` | Twilio TwiML voice callback (hidden from OpenAPI) |
| GET | `/health` | Health check |
| GET | `/health/integrations` | Status of external integrations |

---

## Multi-Agent System

The orchestrator (`app/agents/orchestrator.py`) classifies intent, assesses risk, and routes to the right tool:

```text
START
  |
  v
INTENT + RISK ANALYSIS
  |
  v
RISK ASSESSMENT (LOW / MODERATE / HIGH / IMMEDIATE)
  |
  v
ROUTER
  |
  +--- HIGH / IMMEDIATE  ->  CRISIS SAFETY AGENT (emergency_call_tool)
  |
  +--- LOCATION_SEARCH   ->  SEARCH TOOL (search_nearby_places_tool)
  |
  +--- therapist request ->  THERAPIST TOOL (locate_therapist_tool)
  |
  +--- otherwise         ->  MENTAL HEALTH SPECIALIST (ask_mental_health_specialist)
  |
  v
RESPONSE BUILDER -> FINAL RESPONSE (streamed or full)
```

Key design points:

- **Heuristic + LLM intent classification.** A fast keyword heuristic (`_looks_like_location_search`) short-circuits obvious healthcare searches; ambiguous cases fall back to structured LLM classification (`IntentResult`).
- **Risk gating happens before coaching.** `assess_risk()` (pure rules, no LLM) flags HIGH/IMMEDIATE language; those messages go straight to the crisis workflow and never reach a normal coaching response.
- **Tools are actual LangChain `@tool`s** bound to a `create_react_agent`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

---

## Deployment

The full production runbook — provisioning the Render service, the persistent PostgreSQL database, the Vercel frontend, plus known caveats (the auto-deploy webhook) — is in **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

Highlights:

- **Backend:** Render Docker web service `safespace-ai-api`, `rootDir: backend`, Dockerfile `backend/Dockerfile`. Auto-deploy on `main` (currently via manual/API deploys — see webhook caveat).
- **Database:** Persistent Render **PostgreSQL** (Oregon, matching the service region). Set via `DATABASE_URL` on the service. This is what fixed the historical "accounts get wiped on redeploy" issue (previously ephemeral SQLite).
- **Frontend:** Vercel project `frontend`, project root `frontend`, canonical alias `frontend-gray-one-b7w5ul743a.vercel.app`.

---

## Safety Design

- **Risk classification** (`app/agents/risk_assessment.py`) uses rule-based detection (intent, immediacy, self-harm language, plans) combined with a conservative safety policy.
- For **HIGH** or **IMMEDIATE** risk, the system: prioritizes safety, encourages contacting local emergency services, encourages reaching a trusted person, encourages moving away from danger, keeps the response calm and direct, and triggers the crisis workflow.
- **Never automatically calls emergency services.** The default workflow is **simulation only**:

```text
if CONFIRM_REAL_CALL is False:
    return "[SIMULATION MODE] No real emergency call was placed. ..."
```

- External notification is only possible when: explicitly configured by an authorized operator, valid Twilio credentials exist, `CONFIRM_REAL_CALL=True`, and a separate explicit confirmation workflow has been implemented.
- The system **never claims** emergency services are on the way unless a verified real action occurred.
- The platform **never fabricates** therapist names, fake clinics, or unverified professional listings. When local providers aren't mapped, it returns an honest message and offers publicly verifiable directories and crisis resources.
- Chain-of-thought is never exposed — the UI only shows safe structured metadata (tool selected, risk level, resource type).

---

## Roadmap

- [x] Mood tracking (check-ins, spark-lines, streaks, trend)
- [x] Healthcare finder (OSM Overpass + Photon fallback, Google Places optional)
- [x] Persistent PostgreSQL accounts (fixes containerized-SQLite data loss)
- [x] Production deployment (Render backend + Vercel frontend)
- [ ] Google OAuth sign-in
- [ ] Verified provider-directory API integration for live national search
- [ ] Voice input / output
- [ ] Docker Compose for one-command local setup
- [ ] CI/CD with automated tests
- [ ] Restore Git→Render auto-deploy webhook (see [DEPLOYMENT.md](docs/DEPLOYMENT.md))

---

## License

Educational / demonstration project. Not to be used as a real clinical tool.

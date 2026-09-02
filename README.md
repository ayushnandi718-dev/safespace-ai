# SafeSpace AI

**Your AI Health, Wellness & Care Companion**

SafeSpace AI is a full-stack, production-style application that combines a premium Next.js chat interface with a FastAPI backend and a LangGraph multi-agent orchestration system. Users chat with an empathetic AI assistant, discover local healthcare providers, track their mood over time, and receive safe, crisis-aware responses — all backed by secure authentication (JWT + bcrypt) and persistent conversation memory stored in PostgreSQL.

> **Positioning:** SafeSpace AI is not just an LLM wrapper. It is a full-stack AI application that explores how deterministic safety systems, multi-agent orchestration, persistent memory, real-world search tools, and streaming infrastructure can work together in a production-style product.

The assistant is powered by **NVIDIA Nemotron 3.5 Lightning 30B A3B**, with support for several LLM backends via a single configuration flip.

> ⚠️ **Important:** SafeSpace AI is an experimental, informational support system. It is **not** a substitute for professional medical or mental-health care, diagnosis, or treatment, and it is **not** an emergency service. Emergency escalation is **simulated by default** and never places real external calls unless explicitly configured and confirmed by an operator.

---

## Table of Contents

- [Live URLs](#live-urls)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Deep Dive: Request Lifecycle](#deep-dive-request-lifecycle)
  - [Multi-Agent Orchestration](#multi-agent-orchestration)
  - [LLM Provider Layer](#llm-provider-layer-appcorellmpy)
  - [Data Model](#data-model)
  - [Healthcare Search Pipeline](#healthcare-search-pipeline)
  - [Security & Middleware](#security--middleware)
  - [Frontend Internals](#frontend-internals)
- [Known Limitations (honest production notes)](#known-limitations-honest-production-notes)
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

```mermaid
flowchart TD
    U[User]

    F[Next.js Frontend]

    API[FastAPI Backend]

    AUTH[JWT Auth]
    DB[(PostgreSQL)]

    RISK[Rule-Based Risk Assessment]

    GRAPH[LangGraph Orchestrator]

    CRISIS[Crisis Safety Workflow]
    SUPPORT[Emotional Support Agent]
    SEARCH[Healthcare Search Tool]
    THERAPIST[Therapist Finder]

    NVIDIA[NVIDIA Nemotron]
    GROQ[Groq Fallback]

    OSM[OpenStreetMap / Overpass / Photon]
    GOOGLE[Google Places Optional]

    U --> F

    F -->|REST / SSE| API

    API --> AUTH
    API --> DB

    API --> RISK

    RISK -->|HIGH / IMMEDIATE| CRISIS
    RISK -->|LOW / MODERATE| GRAPH

    GRAPH --> SUPPORT
    GRAPH --> SEARCH
    GRAPH --> THERAPIST

    SUPPORT --> NVIDIA
    SUPPORT -.Fallback.-> GROQ

    SEARCH --> OSM
    SEARCH -.Optional.-> GOOGLE

    THERAPIST --> OSM

    SUPPORT --> DB
    CRISIS --> DB
```

> The request pipeline is **safety-first**: a deterministic risk-assessment gate runs before any conversational generation, so `HIGH`/`IMMEDIATE` messages are routed into a dedicated crisis workflow instead of a normal coaching prompt.

### User Flow

```text
User visits website -> Creates account -> Dashboard
        -> Starts conversation -> Frontend -> FastAPI
        -> Risk Assessment -> LangGraph Router -> Specialist Agent / Direct tool
        -> AI Response (streamed) -> Saved to database -> Displayed in Chat UI
```

### Deep Dive: Request Lifecycle

```text
Next.js (browser)
      │  POST /api/v1/chat (or /chat/stream)  with  {"message": "...", "conversation_id"?}
      │  + Authorization: Bearer <JWT>
      ▼
FastAPI Router (app/api/chat.py)
      │  authenticate via get_current_user (JWT → User)
      │  resolve or create Conversation
      │  load last 20 messages for context
      ▼
Agents (app/agents/orchestrator.py)
      │  1. assess_risk(message)            → RiskAssessment (LOW/MODERATE/HIGH/IMMEDIATE)
      │  2. _route_intent(message)          → IntentResult (LOCATION_SEARCH/SYMPTOM_CHECK/...)
      │  3. if HIGH/IMMEDIATE               → crisis response (return early)
      │  4. if LOCATION_SEARCH (explicit)   → direct search tool
      │  5. else                            → LangGraph ReAct agent (tools bound)
      ▼
Persistence (SQLAlchemy async, Postgres/SQLite)
      │  save user + assistant Message rows
      ▼
SSE or JSON response back to the frontend
```

### Multi-Agent Orchestration

**Risk assessment** (`app/agents/risk_assessment.py`) — a **pure rule-based** classifier (no LLM), so it is fast, deterministic, and always available:

- `RiskLevel` enum: `LOW`, `MODERATE`, `HIGH`, `IMMEDIATE`.
- `assess_risk(message) -> RiskAssessment` scans regex patterns in priority order: `IMMEDIATE_PATTERNS` → `HIGH_PATTERNS` → `MODERATE_PATTERNS`.
- `HIGH` and `IMMEDIATE` set `requires_crisis_protocol = True`, forcing the request into the crisis workflow **before** any coaching.

**Tools** (`app/agents/tools.py`) — four LangChain `@tool` functions bound to the agent:

| Tool | Signature | Purpose |
|------|-----------|---------|
| `ask_mental_health_specialist` | `(query: str)` | Empathetic, non-diagnostic support response via the LLM. |
| `search_nearby_places_tool` | `(query: str, location: str)` | Real healthcare-provider search near a location. |
| `locate_therapist_tool` | `(location: str)` | Finds therapists; falls back to guidance, optionally via IP geolocation. |
| `emergency_call_tool` | `()` | Crisis escalation via Twilio. Simulation unless `CONFIRM_REAL_CALL=True`. |

**Orchestrator** (`app/agents/orchestrator.py`):

- **Intent classification** is two-step: `_looks_like_location_search(message)` returns `True`/`False`/`None` using keyword lists; if ambiguous, `_classify_intent_llm(message)` asks the LLM for a structured `IntentResult` (`intent`, `search_query`, `location`, `confidence`). `_extract_location(message)` pulls a location from phrases like `"in Delhi"` via regex.
- **Entry points:** `run_orchestration(message, context)` (non-streaming) and `stream_orchestration(message, context)` (yields `token`/`metadata`/`done` chunks).
- **Agent build:** `_build_agent()` creates a LangGraph `create_react_agent` bound with the four tools and a `SYSTEM_PROMPT`.

### LLM Provider Layer (`app/core/llm.py`)

`get_chat_model(temperature, max_tokens)` selects the provider at call time:

1. **If `NVIDIA_API_KEY` is set** → `ChatOpenAI` pointed at `NVIDIA_BASE_URL`, model `NVIDIA_MODEL`. When `NVIDIA_ENABLE_THINKING=True`, adds `enable_thinking` / `reasoning_budget` kwargs.
2. **Otherwise** → `ChatGroq` using `GROQ_API_KEY` and `LLM_MODEL` (default `openai/gpt-oss-120b`).

Intent classification uses `temperature=0.0`; general responses use `temperature=0.7`.

### Data Model

SQLAlchemy async models with UUID primary keys:

```
User (users)
 ├─ id (uuid PK), name, email (unique), hashed_password
 ├─ theme (default "dark"), email_notifications (default true)
 ├─ created_at
 ├─ 1:N conversations
 └─ 1:N mood_entries

Conversation (conversations)
 ├─ id (uuid PK), user_id → users.id
 ├─ title (default "New Conversation")
 ├─ created_at, updated_at (auto-update)
 └─ 1:N messages   (cascade delete)

Message (messages)
 ├─ id (uuid PK), conversation_id → conversations.id
 ├─ role ("user" | "assistant"), content (text)
 ├─ agent_used (nullable), risk_level (default "LOW")
 └─ created_at

MoodEntry (mood_entries)
 ├─ id (uuid PK), user_id → users.id (cascade, indexed)
 ├─ mood (1–5), note (nullable, ≤500)
 └─ created_at

CrisisEscalation (crisis_escalations)   -- standalone audit log
 ├─ id (uuid PK), user_id (no FK), conversation_id (nullable, no FK)
 ├─ risk_level, action_requested, action_completed, status, details
 └─ created_at
```

**Schema lifecycle:** on startup, `app.main` runs `run_migrations()` (SQLite-only `ALTER TABLE` backfill for legacy columns), then `Base.metadata.create_all` to create any missing tables.

### Healthcare Search Pipeline (`app/core/support_search.py`)

```text
search_nearby_places(query, location)
  1. Cache hit?  → return cached results
  2. GOOGLE_MAPS_API_KEY set?  → Google Places (Text Search + Details)
  3. No → _geocode(location)   → Nominatim (OpenStreetMap) → (lat, lon)
        └─ race _overpass_search() vs _photon_search()
              │  Overpass: OSM healthcare nodes within 15 km
              │            (3 mirror endpoints, concurrent, 10s deadline)
              │  Photon:   Komoot geocoder fallback for places
  4. Normalize free-text query → canonical specialty (SPECIALTY_QUERIES, 63+ entries)
```

- `search_support_resources(location, support_type)` detects the country and returns **verified local directories + crisis resources**, clearly flagging when live results are unavailable.
- **Honest empty results:** when a specialty isn't mapped (e.g. "dentist" in a small town), the response explains the coverage gap and suggests a broader term or nearby larger city rather than fabricating providers.
- `emergency_numbers(location)` and `crisis_resources(location)` return country-specific numbers (India, US, UK, Canada, AU, UAE, DE, FR, SG, BD, PK).

### Security & Middleware

Applied in order in the FastAPI app:

1. **CORS** — origins from `settings.cors_origins_list`.
2. **Security headers** (custom `SecurityHeadersMiddleware`) — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `X-XSS-Protection`.
3. **SlowAPI rate limiting** — enabled via `RATE_LIMIT_ENABLED`; 429 handler with `Retry-After`.

**Authentication** (`core/security.py`): bcrypt hashing; `create_access_token`/`decode_token` via `python-jose` (HS256); `get_current_user` dependency reads `sub` from the Bearer token and fetches the `User`, raising `401` on failure.

### Frontend Internals

- **App Router, all pages are client components.**
- **Auth:** JWT stored in `localStorage` (key `safespace_token`), sent as `Authorization: Bearer` by `apiFetch` in `lib/api.ts`. `AuthProvider` calls `/auth/me` on mount to restore the session.
- **Chat:** `streamChat` consumes an SSE stream and dispatches `token`/`metadata`/`done` events.
- **Route protection:** the `(dashboard)` layout performs a client-side redirect to `/login` (no middleware).
- **Design tokens** (`tailwind.config.ts`): `surface-0: #080A12`, accents blue `#60a5fa` / violet `#a78bfa` / teal `#2dd4bf`, plus custom utilities (`gradient-text`, `glass`, `hover-lift`) and animations (`typing-dot`, `orbit`, `fade-in`).

---

## Known Limitations (honest production notes)

This is a student/portfolio project that aims for **production-style** engineering without yet being a hardened clinical product. The most important gaps, stated openly:

- **Auth tokens live in `localStorage`** (key `safespace_token`) and are sent as `Authorization: Bearer`. Evolution: HttpOnly + Secure + SameSite cookies with short-lived access tokens and refresh-token rotation to reduce XSS token-exfiltration risk.
- **Risk detection is regex/rule-based only.** Deterministic rules are fast and always available, but they can miss indirect or contextual language (e.g. *"I don't think I'll be here tomorrow"*). Evolution: layered detection — rules (fast first layer) → contextual safety classifier → conversation-history analysis → final risk decision.
- **Conversation context is bounded to the last 20 messages.** Full-history summarization (rolling summary + recent messages + key preferences) is the next step.
- **Search depends on third-party APIs** (OpenStreetMap Overpass/Photon, optional Google Places) with public rate limits and availability variance. Results are cached; a Redis cache layer would harden this.
- **Free-tier hosting** (Render + PostgreSQL) has cold starts and a Postgres expiry (~30 days). A paid plan is needed for persistent, always-on production use.
- **Observability is minimal.** Structured logging (request_id / user / latency) and error monitoring (e.g. Sentry) are the biggest production-readiness gaps.

None of these stop the project from being a strong demonstration of safety-first, full-stack AI engineering — this list shows the direction of travel toward production hardening.

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

Base URL (production): `https://safespace-ai-api.onrender.com`

All endpoints are prefixed with `/api/v1`. Interactive documentation is available at the [Swagger UI](https://safespace-ai-api.onrender.com/docs).

**Authentication:** Every endpoint below requires an `Authorization: Bearer <token>` header **except** `POST /auth/register`, `POST /auth/login`, and the health endpoints. Obtain a token from register or login.

**Content type:** `application/json`.

**Errors:** Non-2xx responses return a JSON body; the FastAPI standard error body is:

```json
{ "detail": "error message" }
```

Quick index:

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

### Authentication

#### POST `/auth/register`

Create an account and receive a JWT. Rate-limited: `5/minute`.

**Request**

```json
{
  "name": "Test User",
  "email": "test@safespace.ai",
  "password": "Test@1234Test@1234"
}
```

**Constraints:** `name` 1–80 chars; `email` valid format; `password` 8–128 chars and must contain at least one digit.

**Response `201`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { "id": "1c547b40-...", "name": "Test User", "email": "test@safespace.ai" }
}
```

#### POST `/auth/login`

Log in and receive a JWT. Rate-limited: `5/minute`.

**Request**

```json
{ "email": "test@safespace.ai", "password": "Test@1234Test@1234" }
```

**Response `200`** — same shape as register. **Errors:** `401` on invalid credentials.

#### GET `/auth/me`

Return the profile of the authenticated user.

**Response `200`**

```json
{ "id": "1c547b40-...", "name": "Test User", "email": "test@safespace.ai" }
```

**Errors:** `401` if the token is missing/invalid.

### Chat

#### POST `/chat` — non-streaming

Send a message and receive the full AI response. Rate-limited: `20/minute`.

**Request**

```json
{ "message": "I'm feeling really stressed about exams", "conversation_id": null }
```

- `message`: string, 1–4000 chars (required).
- `conversation_id`: optional UUID. Omit to start a new conversation.

**Response `200`**

```json
{
  "conversation_id": "uuid",
  "message": "It sounds like exam pressure is really weighing on you...",
  "agent_used": "support",
  "risk_level": "LOW",
  "resources": [],
  "message_id": "uuid",
  "created_at": "2026-09-02T08:00:00Z"
}
```

Key fields:
- `agent_used`: one of `support`, `crisis_agent`, `location_search`, `therapist`.
- `risk_level`: `LOW` / `MODERATE` / `HIGH` / `IMMEDIATE`.
- `resources`: array of `SupportResource`.

#### POST `/chat/stream` — Server-Sent Events

Send a message and receive a token-by-token SSE stream. Rate-limited: `20/minute`.

**Request**

```json
{ "message": "Tell me something calming", "conversation_id": "uuid-or-null" }
```

**Response `200`** — `text/event-stream`. Event frames:

```
data: {"type":"token","content":"It "}
data: {"type":"token","content":"sounds "}
data: {"type":"metadata","agent_used":"support","risk_level":"LOW","resources":[]}
data: {"type":"done","conversation_id":"uuid"}
data: [DONE]
```

- `token` chunks are appended by the client to render progressive text.
- Exactly one `metadata` frame carries the structured agent/risk/resource info.
- `done` carries the persisted conversation id.

### Conversations

#### GET `/conversations`

List the current user's conversations (newest first, with message counts).

**Response `200`**

```json
[
  {
    "id": "uuid",
    "title": "New Conversation",
    "created_at": "2026-09-02T08:00:00Z",
    "updated_at": "2026-09-02T08:05:00Z",
    "message_count": 4
  }
]
```

#### GET `/conversations/{conversation_id}`

Return one conversation with all of its messages.

**Response `200`**

```json
{
  "id": "uuid",
  "title": "New Conversation",
  "created_at": "2026-09-02T08:00:00Z",
  "updated_at": "2026-09-02T08:05:00Z",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "I'm feeling stressed",
      "agent_used": null,
      "risk_level": "LOW",
      "created_at": "2026-09-02T08:00:00Z"
    }
  ]
}
```

**Errors:** `403` if the conversation belongs to another user; `404` if not found.

#### DELETE `/conversations/{conversation_id}`

Delete one conversation (cascades to its messages). **Response `204`** (no body).

### Support Search

#### POST `/support/search`

Search for local healthcare / mental-health resources by location.

**Request** (all fields optional except behavior below)

```json
{ "location": "Alipurduar", "support_type": "therapist", "query": "dentist" }
```

- If `query` is provided, a live nearby-places search runs (`search_nearby_places`).
- Otherwise, `support_type`-based resource directories + crisis resources are returned (with country detection).

**Response `200`**

```json
{
  "resources": [
    {
      "name": "...", "description": "...", "url": "https://...", "phone": "+91 ...",
      "type": "therapist", "address": "...", "rating": 4.5,
      "maps_url": "https://...", "source": "overpass"
    }
  ],
  "message": "I couldn't find dentists mapped in Alipurduar yet. ...",
  "location": "Alipurduar", "support_type": "therapist", "query": "dentist",
  "source": "unavailable", "country": "India"
}
```

`source` values: `overpass`, `photon`, `google`, `directories`, or `unavailable`. The endpoint **never fabricates** providers; when none are found it returns an honest coverage message.

### Mood

#### POST `/mood`

Create a mood check-in.

**Request**

```json
{ "mood": 4, "note": "Feeling better after a walk" }
```

- `mood`: integer 1–5 (required). `note`: string ≤500 chars (optional).

**Response `201`**

```json
{ "id": "uuid", "mood": 4, "note": "Feeling better after a walk", "created_at": "2026-09-02T08:00:00Z" }
```

#### GET `/mood`

List the current user's mood entries. Query param `limit` (default `30`, max `200`). **Response `200`** — array of mood entries (same shape as the POST response).

#### GET `/mood/stats`

Mood statistics over a period. Query param `days` (default `14`).

**Response `200`**

```json
{
  "total_checkins": 12,
  "average_mood": 3.5,
  "current_streak": 3,
  "recent": [ { "date": "2026-09-02", "mood": 4 } ],
  "trend": "improving"
}
```

`trend` is one of `improving`, `declining`, `stable`, or `null`.

### Settings

#### GET `/settings`

Return the current user's profile and preferences.

**Response `200`**

```json
{ "name": "Test User", "email": "test@safespace.ai", "theme": "dark", "email_notifications": true }
```

#### PUT `/settings`

Update profile and preferences.

**Request**

```json
{ "name": "Test User", "email": "test@safespace.ai", "theme": "dark", "email_notifications": false }
```

**Response `200`** — updated settings object.

#### POST `/settings/change-password`

Change the password (requires the current one).

**Request**

```json
{ "current_password": "OldPass1", "new_password": "NewPass123" }
```

- `new_password` must be ≥8 chars (and contain a digit). **Response `200`**. **Errors:** `400` if the current password is incorrect.

#### DELETE `/settings/conversations`

Delete **all** conversations and messages for the current user. **Response `200`**.

#### DELETE `/settings/account`

Delete the account (cascades messages, conversations, mood entries, and the user row). **Response `200`**.

### Crisis

#### POST `/crisis/escalate`

Trigger a crisis escalation. Rate-limited: `5/minute`.

**Request**

```json
{
  "action": "notify_contact",
  "risk_level": "HIGH",
  "conversation_id": "uuid",
  "confirmed": true
}
```

- `action`: `notify_contact` or `call_emergency` (required).
- `confirmed`: **must be `true`**; otherwise the request is rejected.

**Response `200`**

```json
{
  "status": "simulated",
  "message": "[SIMULATION MODE] No real emergency call was placed. ...",
  "action": "notify_contact",
  "risk_level": "HIGH",
  "simulation": true,
  "escalation_id": "uuid"
}
```

> With the default `CONFIRM_REAL_CALL=False`, every action is **simulated** and no real SMS/phone call is placed.

#### GET `/crisis/twiml`

Returns TwiML XML for Twilio voice callbacks. Hidden from the OpenAPI schema. Public (no auth) by design for Twilio callbacks.

### Health / Integrations

#### GET `/health`

Liveness/readiness check.

**Response `200`**

```json
{ "status": "healthy", "service": "SafeSpace AI" }
```

#### GET `/health/integrations`

Reports the configured status of external integrations (NVIDIA, Groq, ipgeolocation, Twilio).

**Response `200`**

```json
{
  "status": "degraded",
  "integrations": [
    { "key": "nvidia", "name": "NVIDIA", "used_for": "...", "configured": true, "valid": true, "status": "active" }
  ],
  "problems": []
}
```

- `status`: `ok` or `degraded`.
- Each integration has `configured` / `valid` booleans and a status of `active`, `missing`, `expired`, or `partial`.
- `problems` lists any non-active integrations.

### Rate Limiting

Rate limiting is enforced by SlowAPI when `RATE_LIMIT_ENABLED=true` (default). Limits:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/register`, `POST /auth/login` | 5 / minute |
| `POST /chat`, `POST /chat/stream` | 20 / minute |
| `POST /crisis/escalate` | 5 / minute |

When exceeded, the API returns `429` with a `Retry-After` header:

```json
{ "detail": "Rate limit exceeded: retry in X seconds" }
```

### Common Errors

| Status | Meaning |
|--------|---------|
| `400` | Validation error, malformed body, wrong current password, missing crisis confirmation |
| `401` | Missing/invalid token, or bad login credentials |
| `403` | Accessing another user's resource (e.g. a conversation belonging to someone else) |
| `404` | Endpoint or resource not found |
| `429` | Rate limit exceeded |
| `500` | Server error |

### Helper Types

**`SupportResource`** (appears in chat `resources` and support search results):

```json
{
  "name": "string", "description": "string", "url": "string?", "phone": "string?",
  "type": "string", "address": "string?", "rating": 4.5,
  "maps_url": "string?", "source": "string?"
}
```

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
- **Tools are actual LangChain `@tool`s** bound to a `create_react_agent`. See the [Multi-Agent Orchestration](#multi-agent-orchestration) section above.

---

## Deployment

**Production URLs**

| Component | URL |
|-----------|-----|
| Frontend | <https://frontend-gray-one-b7w5ul743a.vercel.app> |
| Backend | <https://safespace-ai-api.onrender.com> |
| Swagger UI | <https://safespace-ai-api.onrender.com/docs> |

### Backend — Render web service

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

Git-connected to `https://github.com/ayushnandi718-dev/safespace-ai`, branch `main`.

### Persistent PostgreSQL database

**Database:** Render Postgres, instance `safespace-pg`.

| Setting | Value |
|---------|-------|
| Plan | Free |
| Region | `oregon` **(must match the web service region)** |
| Version | PostgreSQL 16 |

**Why Postgres (and why region matters):**

- Render free-tier uses **ephemeral container storage**. Prior to this, the backend ran on SQLite stored in the container, so **every redeploy wiped all users** (the recurring "my password/email keeps changing" bug).
- The fix: a **persistent Postgres database** on Render + setting `DATABASE_URL` on the service.
- **Region pairing is critical.** The internal Postgres connection string only works from a service in the **same region**. An earlier attempt put the DB in `singapore` while the service was in `oregon`, causing the backend to crash at deploy (exit code 3) — it recovered once the DB was recreated in `oregon`.

**Connecting the service:**

Use the **internal** connection string (no `:5432`/region-host suffix) prefixed for asyncpg:

```
postgresql+asyncpg://<user>:<password>@<db-host-name>/<db-name>
```

Because it is internal, no SSL flag is needed when the service and DB share a region.

> **Free-tier expiry:** Render free Postgres instances auto-expire 30 days after creation (`expiresAt`). Keeping the database past that date requires upgrading to a paid plan (or adding a billing method).

### Frontend — Vercel

**Project:** `frontend` (org `ayush-nandis-projects-ab41a59d`)

| Setting | Value |
|---------|-------|
| Framework preset | Next.js |
| Project root (rootDirectory) | `frontend` |
| Build command | `next build` (default) |
| Production alias | `frontend-gray-one-b7w5ul743a.vercel.app` |

The frontend calls the backend through `NEXT_PUBLIC_API_URL` (set to `https://safespace-ai-api.onrender.com` in production). Without it the client falls back to `http://localhost:8000`.

### Environment variables (production)

**Backend (on the Render service):** reference [`backend/.env.example`](backend/.env.example). The non-secret, important ones:

| Key | Production value / note |
|-----|-------------------------|
| `DATABASE_URL` | The Postgres asyncpg internal URL |
| `JWT_SECRET_KEY` | **Long random value** (never the default) |
| `NVIDIA_API_KEY` | NVIDIA Nemotron key (primary LLM) |
| `GROQ_API_KEY` | Fallback LLM key |
| `CORS_ORIGINS` | JSON list incl. Vercel alias + localhost |
| `CONFIRM_REAL_CALL` | `False` |

**Frontend (in the Vercel project):**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://safespace-ai-api.onrender.com` |

**Never commit secrets.** `.env` is git-ignored. Secrets belong in Render/Vercel environment (or in git as `sync: false` references in `render.yaml`, never as literal values).

### Redeploying

**Backend (Render):**

```powershell
git add -A
git commit -m "description"
git push origin main

# Trigger a deploy for the latest commit via the Render API
$h  = @{ Authorization = "Bearer <RENDER_API_KEY>" }
$svc = "srv-dabhc7ek1f9s73ar8acg"
$commit = (git rev-parse HEAD)
$body = @{ clearCache = "do_not_clear"; commitId = $commit } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys" `
  -Method Post -Headers $h -ContentType "application/json" -Body $body
```

You can also click **Manual Deploy → Deploy latest commit** in the Render dashboard.

**Updating an env var on the Render service** (e.g. `DATABASE_URL`):

```powershell
$key  = "DATABASE_URL"
$val  = "postgresql+asyncpg://USER:PASS@HOST/DB"
$body = @{ value = $val } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/env-vars/$key" `
  -Method Put -Headers $h -ContentType "application/json" -Body $body

# then redeploy (or Render redeploys automatically on env change if auto-deploy works)
```

**Frontend (Vercel CLI):** from the repo root (project rootDirectory is `frontend`, do not append it again):

```powershell
npx vercel --prod --yes --cwd "C:\Users\ayush\SafeSpaceAI"
```

### Known caveats

1. **Git → Render auto-deploy webhook is missing** — the GitHub repo currently has no Render webhook, so pushes don't auto-deploy. Prior deploys did (`trigger: new_commit`), so the webhook is no longer registered. Deploy manually (above). To restore: Render dashboard → service → **Settings → Linked Repo** → re-link (regenerates the webhook), then verify a push auto-deploys.
2. **Free-tier Postgres expires** (~30 days after creation). After that the DB and all accounts are unavailable until you upgrade or recreate + re-point `DATABASE_URL`.
3. **Manual deploy does not re-sync `render.yaml` env vars** — `POST /deploys` builds the code but does not run the Render Blueprint env sync. Env vars must be applied directly on the service (env-vars endpoint or dashboard); they are not read from `render.yaml` for this manually-created Docker service.

### Local vs. production differences

| Concern | Local | Production |
|---------|-------|------------|
| Database | SQLite (`sqlite+aiosqlite:///./safespace.db`) | PostgreSQL (`asyncpg`, internal URL) |
| LLM | NVIDIA key from `.env` | NVIDIA key from Render env |
| Frontend origin | `http://localhost:3000` | Vercel production alias |
| CORS | `["http://localhost:3000"]` | Vercel alias + localhost |
| Emergency calls | Simulation (`CONFIRM_REAL_CALL=False`) | Simulation (same default) |

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

**Done**

- [x] Mood tracking (check-ins, spark-lines, streaks, trend)
- [x] Healthcare finder (OSM Overpass + Photon fallback, Google Places optional)
- [x] Persistent PostgreSQL accounts (fixes containerized-SQLite data loss)
- [x] Production deployment (Render backend + Vercel frontend)
- [x] Consolidated architecture/API/deployment docs in this README

**Priority 1 — security & safety hardening**

- [ ] Move auth from `localStorage` to HttpOnly + Secure + SameSite cookies with refresh-token rotation
- [ ] Add layered contextual safety classification (rules → classifier → conversation history)
- [ ] Add structured logging (request_id, latency, status) and error monitoring (Sentry)
- [ ] Rate-limit login attempts + breach-password checks; strengthen password policy

**Priority 2 — scale & memory**

- [ ] Redis caching for healthcare search / geocoding
- [ ] Conversation summarization (rolling summary + recent messages)
- [ ] Database indexes (`messages(conversation_id, created_at)`, `mood_entries(user_id, created_at)`, …)
- [ ] Background jobs / workers

**Priority 3 — product & platform**

- [ ] Google OAuth sign-in
- [ ] Verified provider-directory API integration for live national search
- [ ] Voice input / output
- [ ] Docker Compose for one-command local setup
- [ ] CI/CD with automated tests
- [ ] Restore Git→Render auto-deploy webhook (see [Deployment](#deployment))

---

## License

Educational / demonstration project. Not to be used as a real clinical tool.

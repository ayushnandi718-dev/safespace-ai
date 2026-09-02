# Architecture

This document describes how SafeSpace AI is wired together: the request lifecycle, the multi-agent orchestration, the LLM provider layer, the data model, and the healthcare search pipeline.

---

## 1. Request Lifecycle

A chat request flows through the system as follows:

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

All routes are mounted under the `/api/v1` prefix (see [`api/main.py`'s router includes](../backend/app/main.py)).

---

## 2. Multi-Agent Orchestration (`app/agents/`)

### 2.1 Risk assessment — `risk_assessment.py`

A **pure rule-based** classifier (no LLM calls), so it is fast, deterministic, and always available:

- `RiskLevel` enum: `LOW`, `MODERATE`, `HIGH`, `IMMEDIATE`.
- `assess_risk(message) -> RiskAssessment` scans regex patterns in priority order:
  1. `IMMEDIATE_PATTERNS` (e.g. "going to kill", "have a gun to kill")
  2. `HIGH_PATTERNS` (e.g. "suicide", "self-harm", "want to die")
  3. `MODERATE_PATTERNS` (e.g. "hopeless", "worthless", "can't go on")
- `HIGH` and `IMMEDIATE` set `requires_crisis_protocol = True`, which forces the request into the crisis workflow **before** any coaching.

### 2.2 Tools — `tools.py`

Four LangChain `@tool` functions bound to the agent:

| Tool | Signature | Purpose |
|------|-----------|---------|
| `ask_mental_health_specialist` | `(query: str)` | Empathetic, non-diagnostic support response via the LLM with a specialist system prompt. |
| `search_nearby_places_tool` | `(query: str, location: str)` | Real healthcare-provider search near a location (wraps `support_search.search_nearby_places`). |
| `locate_therapist_tool` | `(location: str)` | Finds therapists/mental-health providers; falls back to guidance, optionally via IP geolocation. |
| `emergency_call_tool` | `()` | Crisis escalation via Twilio (SMS then voice). Simulation mode unless `CONFIRM_REAL_CALL=True`. |

### 2.3 Orchestrator — `orchestrator.py`

- **Intent classification** is a two-step process:
  - `_looks_like_location_search(message)` returns `True`/`False`/`None` using keyword lists `_SEARCH_ACTIONS` and `_HEALTHCARE_TERMS`.
  - If ambiguous (`None`), `_classify_intent_llm(message)` asks the LLM for a structured `IntentResult` (`intent`, `search_query`, `location`, `confidence`).
  - `_extract_location(message)` pulls a location from phrases like `"in Delhi"` or `"near me"` via regex.
- **Entry points:**
  - `run_orchestration(message, context)` — non-streaming; returns a dict with `response`, `agent_used`, `risk_level`, `resources`.
  - `stream_orchestration(message, context)` — streaming; yields dict chunks of type `token` / `metadata` / `done`.
- **Agent build** — `_build_agent()` creates a LangGraph `create_react_agent` bound with the four tools and a `SYSTEM_PROMPT`, using the configured chat model.

---

## 3. LLM Provider Layer (`app/core/llm.py`)

`get_chat_model(temperature, max_tokens)` selects the provider at call time:

1. **If `NVIDIA_API_KEY` is set** → `ChatOpenAI(langchain_openai)` pointed at `NVIDIA_BASE_URL`, model `NVIDIA_MODEL` (`nvidia/nemotron-3.5-lightning-30b-a3b`). When `NVIDIA_ENABLE_THINKING=True`, adds `enable_thinking` / `reasoning_budget` model kwargs.
2. **Otherwise** → `ChatGroq` using `GROQ_API_KEY` and `LLM_MODEL` (default `openai/gpt-oss-120b`).

`has_chat_model()` returns true when at least one provider key is configured. During the chat, intent classification uses `temperature=0.0`; general responses use `temperature=0.7`.

---

## 4. Data Model (`app/models/`)

SQLAlchemy async models. Primary key types are UUIDs.

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

### Schema lifecycle

- On startup, `app.main` runs `run_migrations()` (SQLite-only `ALTER TABLE` backfill for legacy `users.theme`, `users.email_notifications`, `conversations.updated_at`), then `Base.metadata.create_all` to create any missing tables.
- `create_all` does **not** alter existing tables; the SQLite migration path handles legacy column additions.

---

## 5. Healthcare Search Pipeline (`app/core/support_search.py`)

The largest core module (~800 lines). The pipeline is layered so a failure at any stage degrades gracefully:

```text
search_nearby_places(query, location)
  1. Cache hit?  → return cached results
  2. GOOGLE_MAPS_API_KEY set?  → Google Places (Text Search + Details)
  3. No → _geocode(location)   → Nominatim (OpenStreetMap) → (lat, lon)
        └─ race _overpass_search() vs _photon_search()
              │  Overpass: OSM healthcare nodes within 15 km
              │            (3 mirror endpoints, tried concurrently, 10s deadline)
              │  Photon:   Komoot geocoder fallback for places
  4. Normalize free-text query → canonical specialty (SPECIALTY_QUERIES, 63+ entries)
```

- `normalize_search_query("ortho")` → `"orthopedic doctor"`, etc.
- `search_support_resources(location, support_type)` (the `/support/search` endpoint path) detects the country and returns **verified local directories + crisis resources**, clearly flagging when live provider results are unavailable.
- **Honest empty results:** when a specialty genuinely isn't mapped in an area (e.g. "dentist" in a small town), the response explains the coverage gap and suggests a broader term or nearby larger city rather than fabricating providers.
- `emergency_numbers(location)` and `crisis_resources(location)` return country-specific (India, US, UK, Canada, AU, UAE, DE, FR, SG, BD, PK) emergency numbers and crisis text.

---

## 6. Security & Middleware (`app/core/`, `app/main.py`)

Applied in order in the FastAPI app:

1. **CORS** — origins from `settings.cors_origins_list`.
2. **Security headers** (custom `SecurityHeadersMiddleware`) — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `X-XSS-Protection`.
3. **SlowAPI rate limiting** — enabled via `RATE_LIMIT_ENABLED`; 429 handler with `Retry-After`.

**Authentication** (`core/security.py`):
- `get_password_hash` / `verify_password` via bcrypt (72-byte truncation).
- `create_access_token` / `decode_token` via `python-jose` (HS256).
- `get_current_user` FastAPI dependency: reads `sub` (user UUID) from the Bearer token and fetches the `User`; raises `401` on failure.

---

## 7. Frontend (`frontend/`)

- **App Router, all pages are client components.**
- **Auth:** JWT stored in `localStorage` (key `safespace_token`), sent as `Authorization: Bearer` by the `apiFetch` helper in `lib/api.ts`. `AuthProvider` (in `lib/auth.tsx`) calls `/auth/me` on mount to restore the session.
- **Chat:** `streamChat` in `lib/api.ts` consumes an SSE stream and dispatches `token` / `metadata` / `done` events to the UI.
- **Route protection:** the `(dashboard)` layout performs a client-side redirect to `/login` when there is no user (no middleware).
- **Design tokens** (`tailwind.config.ts`): `surface-0: #080A12`, accent blue `#60a5fa` / violet `#a78bfa` / teal `#2dd4bf`, plus custom utilities (`gradient-text`, `glass`, `hover-lift`) and animations (`typing-dot`, `orbit`, `fade-in`, etc.).

---

## 8. Directory Map

| Concern | Location |
|---------|----------|
| HTTP routes | `backend/app/api/*.py` |
| Agent orchestration | `backend/app/agents/` |
| LLM provider selection | `backend/app/core/llm.py` |
| Config / env | `backend/app/core/config.py` |
| DB engine/session/migrations | `backend/app/core/database.py` |
| Healthcare search | `backend/app/core/support_search.py` |
| JWT / bcrypt | `backend/app/core/security.py` |
| Rate limiting | `backend/app/core/rate_limit.py` |
| Integration health probes | `backend/app/core/integrations.py` |
| SQLAlchemy models | `backend/app/models/` |
| Pydantic schemas | `backend/app/schemas/` |
| FastAPI entrypoint | `backend/app/main.py` |
| Frontend pages | `frontend/app/**/page.tsx` |
| API client + auth | `frontend/lib/` |

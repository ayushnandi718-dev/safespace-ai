# SafeSpace AI

**AI-Powered Multi-Agent Mental Wellness Support Platform**

SafeSpace AI is a full-stack, production-style application that combines a premium Next.js chat interface with a FastAPI backend and a LangGraph multi-agent orchestration system. Users chat with an empathetic AI assistant, discover professional mental-health resources, and receive safe, crisis-aware responses — all backed by secure authentication and persistent conversation memory.

> ⚠️ **Important:** SafeSpace AI is an experimental, informational support system. It is **not** a substitute for professional mental-health care, diagnosis, or treatment, and it is **not** an emergency service. Emergency escalation is **simulated by default** and never places real external calls unless explicitly configured and confirmed by an operator.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Multi-Agent System](#multi-agent-system)
- [Safety Design](#safety-design)
- [Notebook](#notebook)
- [Roadmap](#roadmap)

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
       (conversations)            (orchestrator)
                                      |
              +------------+----------+----------+------------+
              |            |                     |            |
              v            v                     v
        Risk       Support Agent          Therapist     Crisis Safety
     Assessment  (ask_mental_health_   (locate_therapist_   Agent
                   specialist)              tool)      (emergency_call_tool)
              |            |                     |            |
              +------------+---------------------+------------+
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
        -> Risk Assessment -> LangGraph Router -> Specialized Agent
        -> AI Response (streamed) -> Saved to database -> Displayed in Chat UI
```

---

## Features

- **AI Emotional Support** — warm, non-diagnostic conversations about stress, anxiety, academic pressure, work pressure, and loneliness.
- **Smart Resource Discovery** — guidance for finding therapists, counselors, and professional mental-health support.
- **Crisis-Aware Intelligence** — risk-gated routing that prioritizes immediate safety for high-risk language.
- **Multi-Agent AI** — LangGraph selects the correct specialist tool based on intent and safety requirements.
- **Conversation Memory** — persistent database-backed history with a bounded context window.
- **Streaming Responses** — progressive token delivery over Server-Sent Events.
- **Secure Authentication** — JWT + bcrypt password hashing, per-user conversation authorization.
- **Premium Dark UI** — responsive, animated, glassmorphic Next.js interface with a calm healthcare aesthetic.

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router), TypeScript
- Tailwind CSS, Framer Motion, Lucide React

**Backend**
- Python, FastAPI, Pydantic
- LangGraph / LangChain for agent orchestration
- Groq LLM integration (configurable via `LLM_MODEL`; default `openai/gpt-oss-120b`)
- SQLAlchemy 2.0 (async) + aiosqlite (SQLite default) / asyncpg (PostgreSQL)

**Database**
- SQLite by default (zero-config local demo); PostgreSQL supported via `DATABASE_URL`

---

## Project Structure

```text
safespace-ai/
|
|-- frontend/
|   |-- app/               # Next.js pages (landing, auth, dashboard, chat, support, resources, settings)
|   |-- components/        # UI components (Toast, etc.)
|   |-- lib/               # API client + auth context
|   |-- types/             # TypeScript types
|   |-- tailwind.config.ts
|   `-- package.json
|
|-- backend/
|   |-- app/
|   |   |-- api/           # FastAPI routers (auth, chat, conversations, support, settings)
|   |   |-- agents/        # LangGraph orchestration + specialist tools
|   |   |-- core/          # config, database, security
|   |   |-- models/        # SQLAlchemy models (User, Conversation, Message)
|   |   |-- schemas/       # Pydantic schemas
|   |   `-- main.py        # FastAPI app entrypoint
|   |-- live_session.ipynb # Jupyter demo of the multi-agent system
|   |-- pyproject.toml
|   `-- .env
|
|-- .gitignore
`-- README.md
```

---

## Setup

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

# Install
pip install -e .

# (Optional) Twilio integration
pip install -e ".[twilio]"

# Configure environment
cp .env.example .env   # then fill in your keys

# Run
uvicorn app.main:app --reload
```

- Backend: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/health

> The backend uses SQLite (`sqlite+aiosqlite:///./safespace.db`) out of the box — no external database needed. For PostgreSQL, create a database and set `DATABASE_URL=postgresql+asyncpg://...` in `.env`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

- Frontend: http://localhost:3000

### Notebook

```bash
cd backend
jupyter notebook live_session.ipynb
```

Run cells top-to-bottom to see risk assessment, the three tools, LangGraph compilation, staging questions, and a simulated crisis escalation.

---

## Environment Variables

Backend `.env`:

| Variable               | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`         | Async DB connection string (default `sqlite+aiosqlite:///./safespace.db`; Postgres via asyncpg) |
| `JWT_SECRET_KEY`       | Secret used for JWT signing — set a long random value in production      |
| `GROQ_API_KEY`         | Groq API key (https://console.groq.com)                                  |
| `LLM_MODEL`            | Groq model identifier (default `openai/gpt-oss-120b`)              |
| `THERAPIST_API_KEY`    | Optional key for a provider/directory API                                |
| `GOOGLE_MAPS_API_KEY`  | Optional Google Maps/Places key for live therapist location search       |
| `TWILIO_ACCOUNT_SID`   | Optional Twilio account SID for external notification                    |
| `TWILIO_AUTH_TOKEN`    | Optional Twilio auth token                                               |
| `TWILIO_FROM_NUMBER`   | Optional Twilio sender number                                            |
| `EMERGENCY_CONTACT`    | Optional phone number to notify in a configured emergency workflow       |
| `CONFIRM_REAL_CALL`    | **Must remain `False`** unless an operator explicitly enables real calls |
| `CORS_ORIGINS`         | Allowed frontend origins (default `["http://localhost:3000"]`)           |

Frontend `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Never commit `.env` or expose backend variables to the frontend.

---

## API Documentation

Base path: `/api/v1`

### Authentication

| Method | Endpoint       | Body / Query                    | Description                  |
| ------ | -------------- | ------------------------------- | ---------------------------- |
| POST   | `/auth/register` | `{name, email, password}`       | Create account, returns JWT  |
| POST   | `/auth/login`    | `{email, password}`             | Login, returns JWT           |
| GET    | `/auth/me`       | Bearer token                    | Current user profile         |

### Chat

| Method | Endpoint        | Body                                        | Description                          |
| ------ | --------------- | ------------------------------------------- | ------------------------------------ |
| POST   | `/chat`         | `{message, conversation_id?}`               | Send message, return AI response     |
| POST   | `/chat/stream`  | `{message, conversation_id?}`               | Server-Sent Events streaming response |

Chat response:

```json
{
  "conversation_id": "uuid",
  "message": "It sounds like college has been creating a lot of pressure...",
  "agent_used": "support",
  "risk_level": "LOW",
  "resources": [],
  "message_id": "uuid",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Conversations

| Method | Endpoint                | Description                           |
| ------ | ----------------------- | ------------------------------------- |
| GET    | `/conversations`        | List current user's conversations     |
| GET    | `/conversations/{id}`   | Full conversation with messages       |
| DELETE | `/conversations/{id}`   | Delete a conversation                 |

### Support

| Method | Endpoint          | Body                          | Description                         |
| ------ | ----------------- | ----------------------------- | ----------------------------------- |
| POST   | `/support/search` | `{location, support_type?}`   | Return verified resource directories |

The endpoint never fabricates individual professional listings — it returns reputable directories and crisis resources, and clearly indicates when live provider results are unavailable.

### Settings

| Method | Endpoint                       | Description                          |
| ------ | ------------------------------ | ------------------------------------ |
| GET    | `/settings`                    | Current profile                      |
| PUT    | `/settings`                    | Update name / email                  |
| POST   | `/settings/change-password`    | Change password (requires current)   |
| DELETE | `/settings/conversations`      | Delete all conversation history      |
| DELETE | `/settings/account`            | Delete account                       |

---

## Multi-Agent System

The orchestrator (`app/agents/orchestrator.py`) follows this graph:

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
  +--- therapist request ->  THERAPIST RESOURCE AGENT (locate_therapist_tool)
  |
  +--- otherwise         ->  MENTAL HEALTH SUPPORT AGENT (ask_mental_health_specialist)
  |
  v
RESPONSE BUILDER -> FINAL RESPONSE
```

Each agent is implemented as a LangChain tool and bound to a `create_react_agent`. A pre-tool safety gate guarantees that HIGH/IMMEDIATE-risk messages are routed directly to the crisis workflow before any normal conversational coaching.

---

## Safety Design

- **Risk classification** (`app/agents/risk_assessment.py`) uses rule-based detection (intent, immediacy, self-harm language, plans) combined with a conservative safety policy.
- For **HIGH** or **IMMEDIATE** risk, the system: prioritizes safety, encourages contacting local emergency services, encourages reaching a trusted person, encourages moving away from danger, keeps the response calm and direct, and triggers the crisis workflow.
- **Never automatically calls emergency services.** The default workflow is **simulation only**:

```text
if CONFIRM_REAL_CALL is False:
    return "[SIMULATION MODE] No real emergency call was placed.
            If you are in immediate danger, please contact your local
            emergency services now..."
```

- External notification is only possible when: explicitly configured by an authorized operator, valid Twilio credentials exist, `CONFIRM_REAL_CALL=True`, and a separate explicit confirmation workflow has been implemented.
- The system **never claims** emergency services are on the way unless a verified real action occurred.
- The platform **never fabricates** therapist names, fake clinics, or unverified professional listings.
- Chain-of-thought is never exposed — the UI only shows safe structured metadata (tool selected, risk level, resource type).

---

## Notebook

`backend/live_session.ipynb` demonstrates the complete agent stack:

1. Environment loading
2. Risk classification (LOW → IMMEDIATE)
3. All three specialist tools
4. LangGraph agent compilation
5. Staging questions with tool selection, risk level and final response
6. A simulated crisis escalation

---

## Screenshots

> Placeholder — add captures of the landing page, chat interface, dashboard, find-support, and resources pages here.

---

## Roadmap

- [ ] Google OAuth sign-in
- [ ] Verified provider directory API integration for live therapist search
- [ ] Voice input / output
- [ ] Mood-reflection insights (non-clinical)
- [ ] Rate limiting and production hardening
- [ ] Docker Compose for one-command local setup
- [ ] Optional WhatsApp webhook (Twilio) integration
- [ ] CI/CD with automated tests

---

## License

Educational / demonstration project. Not to be used as a real clinical tool.
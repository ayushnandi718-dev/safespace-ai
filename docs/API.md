# API Reference

Base URL (production): `https://safespace-ai-api.onrender.com`

All endpoints are prefixed with `/api/v1`. Interactive documentation is available at the [Swagger UI](https://safespace-ai-api.onrender.com/docs).

**Authentication:** Every endpoint below requires an `Authorization: Bearer <token>` header **except** `POST /auth/register`, `POST /auth/login`, and the health endpoints. Obtain a token from register or login.

**Content type:** `application/json`.

**Errors:** Non-2xx responses return a JSON body; the FastAPI standard error body is:

```json
{ "detail": "error message" }
```

---

## Table of Contents

- [Authentication](#authentication)
- [Chat](#chat)
- [Conversations](#conversations)
- [Support Search](#support-search)
- [Mood](#mood)
- [Settings](#settings)
- [Crisis](#crisis)
- [Health / Integrations](#health--integrations)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### POST `/auth/register`

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

---

### POST `/auth/login`

Log in and receive a JWT. Rate-limited: `5/minute`.

**Request**

```json
{ "email": "test@safespace.ai", "password": "Test@1234Test@1234" }
```

**Response `200`** — same shape as register.

**Errors:** `401` on invalid credentials.

---

### GET `/auth/me`

Return the profile of the authenticated user.

**Response `200`**

```json
{
  "id": "1c547b40-...",
  "name": "Test User",
  "email": "test@safespace.ai"
}
```

**Errors:** `401` if the token is missing/invalid.

---

## Chat

### POST `/chat` — non-streaming

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
- `resources`: array of `SupportResource` (see below).

---

### POST `/chat/stream` — Server-Sent Events

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

---

## Conversations

### GET `/conversations`

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

---

### GET `/conversations/{conversation_id}`

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

---

### DELETE `/conversations/{conversation_id}`

Delete one conversation (cascades to its messages).

**Response `204`** (no body).

---

## Support Search

### POST `/support/search`

Search for local healthcare / mental-health resources by location.

**Request** (all fields optional except behavior below)

```json
{
  "location": "Alipurduar",
  "support_type": "therapist",
  "query": "dentist"
}
```

- If `query` is provided, a live nearby-places search runs (`search_nearby_places`).
- Otherwise, `support_type`-based resource directories + crisis resources are returned (with country detection).

**Response `200`**

```json
{
  "resources": [
    {
      "name": "...",
      "description": "...",
      "url": "https://...",
      "phone": "+91 ...",
      "type": "therapist",
      "address": "...",
      "rating": 4.5,
      "maps_url": "https://...",
      "source": "overpass"
    }
  ],
  "message": "I couldn't find dentists mapped in Alipurduar yet. ...",
  "location": "Alipurduar",
  "support_type": "therapist",
  "query": "dentist",
  "source": "unavailable",
  "country": "India"
}
```

`source` values: `overpass`, `photon`, `google`, `directories`, or `unavailable`. The endpoint **never fabricates** providers; when none are found it returns an honest coverage message.

---

## Mood

### POST `/mood`

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

---

### GET `/mood`

List the current user's mood entries. Query param `limit` (default `30`, max `200`).

**Response `200`** — array of mood entries (same shape as the POST response).

---

### GET `/mood/stats`

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

---

## Settings

### GET `/settings`

Return the current user's profile and preferences.

**Response `200`**

```json
{ "name": "Test User", "email": "test@safespace.ai", "theme": "dark", "email_notifications": true }
```

---

### PUT `/settings`

Update profile and preferences.

**Request**

```json
{ "name": "Test User", "email": "test@safespace.ai", "theme": "dark", "email_notifications": false }
```

**Response `200`** — updated settings object.

---

### POST `/settings/change-password`

Change the password (requires the current one).

**Request**

```json
{ "current_password": "OldPass1", "new_password": "NewPass123" }
```

- `new_password` must be ≥8 chars (and contain a digit, mirroring registration rules).

**Response `200`** with a success message. **Errors:** `400` if the current password is incorrect.

---

### DELETE `/settings/conversations`

Delete **all** conversations and messages for the current user.

**Response `200`** with a success message (or `204`).

---

### DELETE `/settings/account`

Delete the account (cascades messages, conversations, mood entries, and the user row).

**Response `200`** with a success message.

---

## Crisis

### POST `/crisis/escalate`

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

- `action`: `notify_contact` or `call_emergency` (required, must be confirmed).
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

> With the default `CONFIRM_REAL_CALL=False`, every action is **simulated** and no real SMS/phone call is placed. Real calls only occur with valid Twilio credentials and `CONFIRM_REAL_CALL=True`.

---

### GET `/crisis/twiml`

Returns TwiML XML for Twilio voice callbacks. Hidden from the OpenAPI schema. Public (no auth) by design for Twilio callbacks.

---

## Health / Integrations

### GET `/health`

Liveness/readiness check.

**Response `200`**

```json
{ "status": "healthy", "service": "SafeSpace AI" }
```

---

### GET `/health/integrations`

Reports the configured status of external integrations (NVIDIA, Groq, ipgeolocation, Twilio).

**Response `200`**

```json
{
  "status": "degraded",
  "integrations": [
    {
      "key": "nvidia",
      "name": "NVIDIA",
      "used_for": "...",
      "configured": true,
      "valid": true,
      "status": "active"
    }
  ],
  "problems": []
}
```

- `status`: `ok` or `degraded`.
- Each integration has `configured` / `valid` booleans and a status of `active`, `missing`, `expired`, or `partial`.
- `problems` lists any non-active integrations.

---

## Rate Limiting

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

---

## Common Errors

| Status | Meaning |
|--------|---------|
| `400` | Validation error, malformed body, wrong current password, missing crisis confirmation |
| `401` | Missing/invalid token, or bad login credentials |
| `403` | Accessing another user's resource (e.g. a conversation belonging to someone else) |
| `404` | Endpoint or resource not found |
| `429` | Rate limit exceeded |
| `500` | Server error |

## Helper Types

**`SupportResource`** (appears in chat `resources` and support search results):

```json
{
  "name": "string",
  "description": "string",
  "url": "string?",
  "phone": "string?",
  "type": "string",
  "address": "string?",
  "rating": 4.5,
  "maps_url": "string?",
  "source": "string?"
}
```

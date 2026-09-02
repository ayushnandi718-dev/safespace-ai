import type { AuthResponse, ChatResponse, Conversation, ConversationSummary, Settings, SupportSearchResponse, SupportResource, MoodEntry, MoodStats, IntegrationsStatusResponse } from "@/types/chat";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "safespace_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch<{ id: number; name: string; email: string }>(
    "/api/v1/auth/me"
  );
}

export async function sendChat(
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });
}

export interface StreamMetadata {
  agent_used: string;
  risk_level: string;
  resources?: SupportResource[];
}

export async function streamChat(
  message: string,
  conversationId: string | undefined,
  onToken: (token: string) => void,
  onMetadata: (data: StreamMetadata) => void,
  onDone: (conversationId: string) => void
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });

  if (!res.ok) {
    let errorMessage = "Stream failed";
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new ApiError("No response body", 500);

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);

        if (data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          switch (parsed.type) {
            case "token":
              onToken(parsed.content);
              break;
            case "metadata":
              onMetadata({
                agent_used: parsed.agent_used,
                risk_level: parsed.risk_level,
                resources: parsed.resources as SupportResource[] | undefined,
              });
              break;
            case "done":
              onDone(parsed.conversation_id);
              break;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getConversations(): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/api/v1/conversations");
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/v1/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/conversations/${id}`, {
    method: "DELETE",
  });
}

export async function searchSupport(
  location: string,
  supportType?: string,
  query?: string
): Promise<SupportSearchResponse> {
  return apiFetch<SupportSearchResponse>("/api/v1/support/search", {
    method: "POST",
    body: JSON.stringify({
      location,
      support_type: supportType || undefined,
      query: query?.trim() || undefined,
    }),
  });
}

export async function getSettings(): Promise<Settings> {
  return apiFetch<Settings>("/api/v1/settings");
}

export async function updateSettings(
  name: string,
  email: string,
  theme?: string,
  emailNotifications?: boolean
): Promise<Settings> {
  return apiFetch<Settings>("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify({
      name,
      email,
      theme: theme,
      email_notifications: emailNotifications,
    }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  return apiFetch<void>("/api/v1/settings/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function deleteAllConversations(): Promise<void> {
  return apiFetch<void>("/api/v1/settings/conversations", {
    method: "DELETE",
  });
}

export async function deleteAccount(): Promise<void> {
  return apiFetch<void>("/api/v1/settings/account", {
    method: "DELETE",
  });
}

export async function addMood(mood: number, note?: string): Promise<MoodEntry> {
  return apiFetch<MoodEntry>("/api/v1/mood", {
    method: "POST",
    body: JSON.stringify({ mood, note }),
  });
}

export async function getMoodHistory(limit = 30): Promise<MoodEntry[]> {
  return apiFetch<MoodEntry[]>(`/api/v1/mood?limit=${limit}`);
}

export async function getMoodStats(days = 14): Promise<MoodStats> {
  return apiFetch<MoodStats>(`/api/v1/mood/stats?days=${days}`);
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
  return apiFetch<IntegrationsStatusResponse>("/api/v1/health/integrations");
}

export interface CrisisEscalationResponse {
  status: string;
  message: string;
  action: string;
  risk_level: string;
  simulation: boolean;
  escalation_id?: string;
}

export async function escalateCrisis(
  action: "notify_contact" | "call_emergency",
  riskLevel: string,
  conversationId?: string,
  confirmed = true
): Promise<CrisisEscalationResponse> {
  return apiFetch<CrisisEscalationResponse>("/api/v1/crisis/escalate", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      risk_level: riskLevel,
      action,
      confirmed,
    }),
  });
}

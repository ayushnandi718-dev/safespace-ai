export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "IMMEDIATE";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent_used?: string;
  risk_level?: RiskLevel;
  resources?: SupportResource[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  agent_used: string;
  risk_level: RiskLevel;
  resources: SupportResource[];
  message_id: string;
  created_at: string;
}

export interface SupportResource {
  name: string;
  description: string;
  url?: string;
  phone?: string;
  type: string;
  address?: string;
  rating?: number;
  maps_url?: string;
  source?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Settings {
  name: string;
  email: string;
  theme?: string;
  email_notifications?: boolean;
}

export interface MoodEntry {
  id: string;
  mood: number;
  note?: string;
  created_at: string;
}

export interface MoodDayPoint {
  date: string;
  mood: number;
}

export interface MoodStats {
  total_checkins: number;
  average_mood: number;
  current_streak: number;
  recent: MoodDayPoint[];
  trend?: string | null;
}

export interface SupportSearchParams {
  location: string;
  support_type?: string;
}

export interface IntegrationStatus {
  key: string;
  name: string;
  used_for: string;
  configured: boolean;
  valid: boolean;
  status: "active" | "missing" | "expired" | "partial";
}

export interface IntegrationsStatusResponse {
  status: "ok" | "degraded";
  integrations: IntegrationStatus[];
  problems: IntegrationStatus[];
}

export interface SupportSearchResponse {
  resources: SupportResource[];
  message: string;
  location?: string;
  support_type?: string;
  source?: string;
  country?: string;
}

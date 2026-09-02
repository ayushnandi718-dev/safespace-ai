"use client";

import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Trash2,
  Shield,
  Bot,
  User,
  ChevronDown,
  AlertTriangle,
  Info,
  Sparkles,
  Loader2,
  MessageCircle,
  PhoneCall,
  MapPin,
  Phone,
  ExternalLink,
  Navigation,
  Star,
  Heart,
  Search,
  Pin,
  Bell,
  Moon,
  Menu,
  Smile,
  Lock,
} from "lucide-react";
import {
  streamChat,
  getConversations,
  getConversation,
  deleteConversation,
  escalateCrisis,
} from "@/lib/api";
import type {
  ConversationSummary,
  Message as ChatMessage,
  RiskLevel,
  SupportResource,
} from "@/types/chat";

function agentLabel(agent?: string): string {
  if (!agent) return "Support Agent";
  switch (agent) {
    case "therapist":
      return "Therapist Resource Tool";
    case "crisis_agent":
      return "Crisis Safety Agent";
    case "location_search":
      return "Location Search";
    default:
      return "Support Agent";
  }
}

function riskColor(level?: RiskLevel): string {
  switch (level) {
    case "LOW":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "MODERATE":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "HIGH":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "IMMEDIATE":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

function ResourceCards({ resources }: { resources: SupportResource[] }) {
  return (
    <div className="mt-3 grid sm:grid-cols-2 gap-3">
      {resources.slice(0, 6).map((r, i) => (
        <motion.div
          key={r.name + i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="p-3.5 rounded-xl bg-surface-1 border border-white/5"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-xs font-semibold text-white">{r.name}</h4>
            <span className="px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue text-[9px] font-medium border border-accent-blue/20 shrink-0">
              {r.type}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mb-1.5 line-clamp-2">
            {r.description}
          </p>
          {r.address && (
            <p className="flex items-start gap-1 text-[11px] text-gray-500 mb-1.5">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{r.address}</span>
            </p>
          )}
          {typeof r.rating === "number" && (
            <p className="flex items-center gap-1 text-[11px] text-amber-400 mb-1.5">
              <Star className="w-3 h-3 fill-current" />
              {r.rating.toFixed(1)}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {r.phone && (
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-3 text-[10px] text-gray-300 hover:bg-surface-4 transition-colors"
              >
                <Phone className="w-2.5 h-2.5" />
                {r.phone}
              </a>
            )}
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-3 text-[10px] text-gray-300 hover:bg-surface-4 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Website
              </a>
            )}
            {r.maps_url && (
              <a
                href={r.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-3 text-[10px] text-gray-300 hover:bg-surface-4 transition-colors"
              >
                <Navigation className="w-2.5 h-2.5" />
                Maps
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shrink-0">
        <Shield className="w-4 h-4 text-white" />
      </div>
      <div className="bg-surface-2 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-accent-blue animate-spin" />
          <span className="text-xs text-gray-400">SafeSpace is thinking</span>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-accent-blue animate-typing-dot" />
            <span className="w-1 h-1 rounded-full bg-accent-blue animate-typing-dot" />
            <span className="w-1 h-1 rounded-full bg-accent-blue animate-typing-dot" />
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  conversationId,
}: {
  message: ChatMessage;
  conversationId?: string;
}) {
  const isUser = message.role === "user";
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-surface-3"
            : "bg-gradient-to-br from-accent-blue to-accent-violet"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-300" />
        ) : (
          <Shield className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`max-w-[80%] md:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <p className="text-xs text-gray-500 mb-1 px-1 font-medium">SafeSpace AI</p>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-brand-600/20 text-gray-100 rounded-tr-sm"
              : "bg-surface-2 border border-white/5 text-gray-200 rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>

        {!isUser && (message.agent_used || message.risk_level) && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-1"
            >
              <Info className="w-3 h-3" />
              <span>How SafeSpace helped</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 mt-2 px-1">
                    {message.agent_used && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-3 text-xs text-gray-300 border border-white/5">
                        <Sparkles className="w-3 h-3 text-accent-violet" />
                        {agentLabel(message.agent_used)}
                      </span>
                    )}
                    {message.risk_level && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${riskColor(
                          message.risk_level
                        )}`}
                      >
                        {message.risk_level === "IMMEDIATE" && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {message.risk_level}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {Array.isArray(message.resources) && message.resources.length > 0 && (
          <ResourceCards resources={message.resources} />
        )}

        {!isUser && message.agent_used === "crisis_agent" && (
          <CrisisActions
            conversationId={conversationId}
            riskLevel={message.risk_level}
          />
        )}
      </div>
    </motion.div>
  );
}

function CrisisActions({
  conversationId,
  riskLevel,
}: {
  conversationId?: string;
  riskLevel?: RiskLevel;
}) {
  const [step, setStep] = useState<"none" | "confirm" | "working">("none");
  const [result, setResult] = useState<string>("");

  const runAction = async (action: "notify_contact" | "call_emergency") => {
    setStep("working");
    setResult("");
    try {
      const res = await escalateCrisis(action, riskLevel || "HIGH", conversationId);
      setResult(res.message);
      setStep("none");
    } catch {
      setResult("Something went wrong. Please try again.");
      setStep("none");
    }
  };

  return (
    <div className="mt-3">
      {step === "confirm" && (
        <div className="rounded-xl bg-surface-3/60 border border-white/10 px-3 py-3">
          <p className="text-xs text-gray-300 font-medium mb-2">
            Are you sure? This will notify your configured emergency contact.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setStep("confirm");
                runAction("notify_contact");
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              Yes, notify my contact
            </button>
            <button
              onClick={() => setStep("none")}
              className="px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "none" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStep("confirm")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-xs border border-red-500/25 hover:bg-red-500/25 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Notify my emergency contact
          </button>
          <button
            onClick={() => runAction("call_emergency")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-300 hover:bg-surface-4 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Call emergency services
          </button>
          <button
            onClick={() => runAction("notify_contact")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            I&apos;m safe for now
          </button>
        </div>
      )}

      {step === "working" && (
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-400"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing...
        </button>
      )}

      {result && (
        <p className="mt-2 text-xs text-gray-400 rounded-lg bg-surface-3/50 px-3 py-2 border border-white/5">
          {result}
        </p>
      )}
    </div>
  );
}

function GlowingOrb() {
  return (
    <div className="relative w-40 h-40 mx-auto mb-8">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-blue/30 via-accent-violet/30 to-accent-teal/30 blur-2xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {[
        { top: "10%", left: "18%", delay: 0 },
        { top: "70%", left: "12%", delay: 1 },
        { top: "20%", left: "72%", delay: 2 },
        { top: "75%", left: "70%", delay: 0.5 },
        { top: "45%", left: "8%", delay: 1.5 },
      ].map((p, i) => (
        <motion.span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-accent-violet/60"
          style={{ top: p.top, left: p.left }}
          animate={{ y: [0, -8, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-br from-accent-blue/20 via-accent-violet/20 to-accent-teal/20 blur-lg"
        animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute inset-6 rounded-full bg-gradient-to-br from-[#1b2140] to-[#0e1022] border border-white/10 shadow-inner flex flex-col items-center justify-center gap-2"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-4">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-violet shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
        </div>
        <div className="w-8 h-1.5 rounded-full bg-accent-teal/40" />
      </motion.div>
    </div>
  );
}

function QuickActions({ onSend }: { onSend: (msg: string) => void }) {
  const groups = [
    {
      label: "Talk about your feelings",
      icon: Heart,
      iconClass: "text-rose-400",
      barClass: "from-rose-500/30 to-accent-violet/30",
      items: [
        "I've been feeling anxious about exams",
        "How can I manage work stress?",
      ],
    },
    {
      label: "Find professional support",
      icon: MapPin,
      iconClass: "text-accent-teal",
      barClass: "from-accent-teal/30 to-accent-blue/30",
      items: ["Find a doctor near Alipurduar", "I need a dentist around Kolkata"],
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="flex items-center gap-2 mb-3">
            <g.icon className={`w-4 h-4 ${g.iconClass}`} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {g.label}
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {g.items.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                className="group relative text-left px-4 py-3.5 rounded-2xl bg-surface-1 border border-white/5 overflow-hidden hover:border-white/15 transition-all duration-200"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${g.barClass} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  {s}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrivacyCard() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 flex items-center gap-4 px-5 py-4 rounded-2xl bg-surface-1 border border-white/5">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal/20 to-accent-blue/20 flex items-center justify-center shrink-0">
        <Shield className="w-5 h-5 text-accent-teal" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-white">This is a safe and private space</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Your conversations are confidential and protected. We&apos;re here to
          support you, not judge you.
        </p>
      </div>
      <Lock className="w-4 h-4 text-gray-600 shrink-0" />
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-accent-violet to-accent-teal">
            Hi there, I&apos;m SafeSpace AI
          </span>
        </h2>
        <p className="text-gray-400 mb-8">
          I&apos;m here to listen and support you.
          <br />
          How can I help you today?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.15 }}
      >
        <GlowingOrb />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="w-full"
      >
        <QuickActions onSend={onSend} />
        <PrivacyCard />
      </motion.div>
    </div>
  );
}

function dateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialConvoId = searchParams.get("conversation");
  const initialPrompt = searchParams.get("prompt");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(initialConvoId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentInitial = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeConvoId) {
      setLoadingConvo(true);
      getConversation(activeConvoId)
        .then((c) => setMessages(c.messages))
        .catch(() => setMessages([]))
        .finally(() => setLoadingConvo(false));
    } else {
      setMessages([]);
    }
  }, [activeConvoId]);

  useEffect(() => {
    if (initialPrompt && !hasSentInitial.current) {
      hasSentInitial.current = true;
      setInput("");
      handleSend(initialPrompt);
      router.replace("/chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || isStreaming) return;

      setInput("");
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      let aiContent = "";
      let metadataAgent = "";
      let metadataRisk = "";
      let metadataResources: SupportResource[] | undefined;
      let finalConvoId = activeConvoId;

      try {
        await streamChat(
          msg,
          activeConvoId ?? undefined,
          (token) => {
            aiContent += token;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant" && last.id.startsWith("stream-")) {
                updated[updated.length - 1] = { ...last, content: aiContent };
              } else {
                updated.push({
                  id: "stream-" + crypto.randomUUID(),
                  role: "assistant",
                  content: aiContent,
                  created_at: new Date().toISOString(),
                });
              }
              return updated;
            });
          },
          (meta) => {
            metadataAgent = meta.agent_used;
            metadataRisk = meta.risk_level;
            if (meta.resources && meta.resources.length) {
              metadataResources = meta.resources;
            }
          },
          (convoId) => {
            finalConvoId = convoId;
            setActiveConvoId(convoId);
          }
        );

        if (finalConvoId) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.id.startsWith("stream-")) {
              updated[updated.length - 1] = {
                ...last,
                id: crypto.randomUUID(),
                agent_used: metadataAgent,
                risk_level: metadataRisk as RiskLevel,
                resources: metadataResources,
              };
            }
            return updated;
          });

          getConversations().then(setConversations).catch(() => {});
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I'm sorry, something went wrong. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, activeConvoId]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setInput("");
    setShowSidebar(false);
    router.replace("/chat");
  };

  const handleDeleteConvo = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvoId === id) {
        handleNewChat();
      }
    } catch {
      // ignore
    }
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const aPinned = pinned.has(a.id) ? 0 : 1;
    const bPinned = pinned.has(b.id) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const grouped = sorted.reduce<Record<string, ConversationSummary[]>>((acc, c) => {
    const g = dateGroup(c.updated_at);
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  const ConvoPanel = () => (
    <div className="flex flex-col h-full bg-surface-1/60 border-r border-white/5 w-full">
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-300 transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg bg-surface-2 text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-white/5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-8">
            {searchTerm ? "No matches found" : "No conversations yet"}
          </p>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 px-2 mb-2">
                {group}
              </p>
              <div className="space-y-1">
                {items.map((c) => {
                  const isActive = activeConvoId === c.id;
                  const isPinned = pinned.has(c.id);
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setActiveConvoId(c.id);
                        setShowSidebar(false);
                      }}
                      className={`group cursor-pointer rounded-xl px-3 py-2.5 border transition-all duration-200 ${
                        isActive
                          ? "bg-brand-600/10 border-accent-violet/40"
                          : "border-transparent hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MessageCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-sm truncate ${
                                isActive ? "text-white font-medium" : "text-gray-300"
                              }`}
                            >
                              {c.title}
                            </p>
                            <span className="text-[10px] text-gray-600 shrink-0">
                              {timeLabel(c.updated_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {c.message_count} messages
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(c.id);
                            }}
                            className={`transition-colors ${
                              isPinned ? "text-accent-violet" : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-300"
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConvo(c.id);
                            }}
                            className="text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8">
      {/* Conversation sidebar (desktop) */}
      <div className="hidden lg:flex lg:w-[360px] lg:shrink-0">
        <ConvoPanel />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(96,165,250,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* Top bar */}
        <div className="relative flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-300">SafeSpace AI is online</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <Moon className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages or Empty state */}
        <div className="flex-1 overflow-y-auto relative">
          {loadingConvo ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState onSend={(msg) => handleSend(msg)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  conversationId={activeConvoId ?? undefined}
                />
              ))}
              {isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "user" && (
                  <TypingIndicator />
                )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer + safety */}
        <div className="relative px-4 md:px-6 pb-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-[18px] bg-surface-2/80 backdrop-blur-xl border border-accent-violet/20 shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_20px_rgba(139,92,246,0.08)] px-3 py-2.5 focus-within:border-accent-violet/40 transition-colors">
              <button className="shrink-0 w-9 h-9 rounded-full bg-surface-3 text-gray-400 hover:text-white hover:bg-surface-4 transition-colors flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none max-h-32 leading-relaxed"
                style={{ minHeight: "38px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
              <button className="shrink-0 w-9 h-9 rounded-full text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center">
                <Smile className="w-4 h-4" />
              </button>
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                whileTap={input.trim() && !isStreaming ? { scale: 0.92 } : {}}
                className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-r from-accent-blue to-accent-violet text-white flex items-center justify-center shadow-lg shadow-accent-violet/30 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </motion.button>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2.5 px-1">
              <p className="text-[10px] text-gray-600">
                SafeSpace AI is not a substitute for professional care. If you
                are in immediate danger, please contact emergency services.
              </p>
              <a
                href="/resources"
                className="text-[10px] text-gray-500 hover:text-accent-blue transition-colors shrink-0"
              >
                Safety &amp; Crisis Resources
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile conversation drawer */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-40 w-[320px] lg:hidden"
            >
              <ConvoPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
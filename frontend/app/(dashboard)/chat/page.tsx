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
} from "@/types/chat";

function agentLabel(agent?: string): string {
  if (!agent) return "Support Agent";
  switch (agent) {
    case "therapist":
      return "Therapist Resource Tool";
    case "crisis_agent":
      return "Crisis Safety Agent";
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

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-surface-2 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-accent-blue animate-spin" />
          <span className="text-xs text-gray-400">
            SafeSpace is thinking
          </span>
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
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div
        className={`max-w-[80%] md:max-w-[70%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {!isUser && (
          <p className="text-xs text-gray-500 mb-1 px-1 font-medium">
            SafeSpace AI
          </p>
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
                className={`w-3 h-3 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
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
      const res = await escalateCrisis(
        action,
        riskLevel || "HIGH",
        conversationId
      );
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

function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  const suggestions = [
    "I've been feeling anxious about exams",
    "How can I manage work stress?",
    "I need help coping with burnout",
    "Can you help me with sleep issues?",
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 flex items-center justify-center mx-auto mb-5">
          <MessageCircle className="w-8 h-8 text-accent-blue" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Start a conversation
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Share what&apos;s on your mind. SafeSpace AI is here to listen and
          support you.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="text-left px-4 py-3 rounded-xl bg-surface-1 border border-white/5 text-sm text-gray-300 hover:bg-surface-2 hover:border-white/10 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
                updated[updated.length - 1] = {
                  ...last,
                  content: aiContent,
                };
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
            content:
              "I'm sorry, something went wrong. Please try again.",
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8">
      {/* Sidebar - conversations list (desktop) */}
      <div className="hidden md:flex md:w-72 lg:w-80 flex-col border-r border-white/5 bg-surface-1">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-600 text-center mt-8">
              No conversations yet
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConvoId === c.id
                    ? "bg-brand-600/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
                onClick={() => {
                  setActiveConvoId(c.id);
                  setShowSidebar(false);
                }}
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConvo(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile: toggle sidebar */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-white/5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-gray-400 hover:text-white"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={handleNewChat}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-30 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                className="fixed top-14 left-0 right-0 z-30 bg-surface-1 border-b border-white/5 max-h-[60vh] overflow-y-auto md:hidden"
              >
                <div className="p-2 space-y-0.5">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer ${
                        activeConvoId === c.id
                          ? "bg-brand-600/10 text-white"
                          : "text-gray-400 hover:bg-white/5"
                      }`}
                      onClick={() => {
                        setActiveConvoId(c.id);
                        setShowSidebar(false);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-sm truncate">{c.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConvo(c.id);
                        }}
                        className="text-gray-600 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvo ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              onSend={(msg) => {
                setInput("");
                handleSend(msg);
              }}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} conversationId={activeConvoId ?? undefined} />
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

        {/* Input area */}
        <div className="border-t border-white/5 bg-surface-1">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-3 bg-surface-2 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-brand-500/40 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-32"
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-2">
              SafeSpace AI is not a substitute for professional care. If you are
              in immediate danger, please contact emergency services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

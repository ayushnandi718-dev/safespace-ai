"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Brain,
  Stethoscope,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp,
  Flame,
  Smile,
  Frown,
  Meh,
  Angry,
  Laugh,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getConversations, addMood, getMoodStats } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { ConversationSummary, MoodStats } from "@/types/chat";

const moodOptions = [
  { value: 1, label: "Awful", icon: Angry, color: "text-rose-400" },
  { value: 2, label: "Low", icon: Frown, color: "text-orange-400" },
  { value: 3, label: "Okay", icon: Meh, color: "text-yellow-400" },
  { value: 4, label: "Good", icon: Smile, color: "text-accent-teal" },
  { value: 5, label: "Great", icon: Laugh, color: "text-emerald-400" },
];

function MoodSparkline({ points }: { points: { date: string; mood: number }[] }) {
  const width = 280;
  const height = 70;
  if (points.length < 2) return null;
  const max = 5;
  const min = 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - ((p.mood - min) / (max - min)) * (height - 8) - 4,
  }));
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[1, 2, 3, 4, 5].map((v) => (
        <line
          key={v}
          x1={0}
          x2={width}
          y1={height - ((v - min) / (max - min)) * (height - 8) - 4}
          y2={height - ((v - min) / (max - min)) * (height - 8) - 4}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}
      <path d={area} fill="url(#moodGrad)" opacity={0.3} />
      <defs>
        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="#a78bfa" />
      ))}
    </svg>
  );
}

const quickActions = [
  {
    title: "Talk about Stress",
    description: "Discuss what's weighing on you",
    href: "/chat?prompt=I've been feeling stressed lately and need to talk about it",
    icon: Brain,
    color: "from-accent-blue/20 to-accent-violet/20",
    iconColor: "text-accent-blue",
  },
  {
    title: "Find Healthcare Near You",
    description: "Doctors, clinics, hospitals & more",
    href: "/find-support",
    icon: Stethoscope,
    color: "from-accent-teal/20 to-accent-blue/20",
    iconColor: "text-accent-teal",
  },
  {
    title: "I'm Feeling Overwhelmed",
    description: "Get immediate coping strategies",
    href: "/chat?prompt=I'm feeling overwhelmed right now and need some help",
    icon: AlertCircle,
    color: "from-accent-violet/20 to-purple-500/20",
    iconColor: "text-accent-violet",
  },
  {
    title: "Get Support Now",
    description: "Connect with crisis resources",
    href: "/find-support?support_type=crisis",
    icon: MessageCircle,
    color: "from-rose-500/20 to-accent-violet/20",
    iconColor: "text-rose-400",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const moodLoaded = useRef(false);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    if (moodLoaded.current) return;
    moodLoaded.current = true;
    getMoodStats()
      .then(setMoodStats)
      .catch(() => {});
  }, []);

  const handleMoodSelect = async (value: number) => {
    if (savingMood) return;
    setSavingMood(true);
    try {
      await addMood(value);
      const stats = await getMoodStats();
      setMoodStats(stats);
      toast("Mood check-in saved", "success");
    } catch {
      toast("Failed to save mood", "error");
    } finally {
      setSavingMood(false);
    }
  };

  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          How are you feeling today?
        </h1>
        <p className="text-gray-400">
          Welcome back, {user?.name}. Your safe space is ready.
        </p>
      </motion.div>

      {/* Mood Check-in */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
        className="p-6 rounded-2xl bg-surface-1 border border-white/5"
      >
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">
              How are you feeling right now?
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Quick check-in to track how your mood changes over time.
            </p>
            <div className="flex gap-2">
              {moodOptions.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleMoodSelect(m.value)}
                  disabled={savingMood}
                  title={m.label}
                  className="group flex flex-col items-center gap-1 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <m.icon className={`w-7 h-7 ${m.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {moodStats && (
            <div className="flex items-center gap-6">
              {moodStats.recent.length >= 2 && (
                <div className="w-[280px]">
                  <p className="text-[11px] text-gray-500 mb-1">Mood trend (14 days)</p>
                  <MoodSparkline points={moodStats.recent} />
                </div>
              )}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-teal" />
                  <span className="text-xs text-gray-400">
                    Avg{" "}
                    <span className="text-white font-semibold">
                      {moodStats.average_mood || "-"}
                    </span>
                    /5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-400">
                    {moodStats.current_streak} day streak
                  </span>
                </div>
                {moodStats.trend && (
                  <span className="text-xs text-accent-violet capitalize">
                    {moodStats.trend}{" "}
                    {moodStats.trend === "declining" &&
                      "— consider reaching out 💬"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-surface-1 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-accent-blue" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {conversations.length}
          </p>
          <p className="text-sm text-gray-500">Conversations</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-surface-1 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-violet" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {conversations.reduce((acc, c) => acc + c.message_count, 0)}
          </p>
          <p className="text-sm text-gray-500">Messages</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link
                href={action.href}
                className="block p-5 rounded-2xl bg-surface-1 border border-white/5 hover-lift group"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}
                >
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-accent-blue transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-500">{action.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Conversations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Conversations
          </h2>
          {conversations.length > 0 && (
            <Link
              href="/chat"
              className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {loadingConvos ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl skeleton" />
            ))}
          </div>
        ) : recentConversations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-1 border border-white/5 text-center">
            <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-3">
              No conversations yet. Start your first one!
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentConversations.map((convo, i) => (
              <motion.div
                key={convo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
              >
                <Link
                  href={`/chat?conversation=${convo.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface-1 border border-white/5 hover-lift group"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-accent-blue transition-colors">
                      {convo.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {convo.message_count} messages &middot;{" "}
                      {new Date(convo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-accent-blue transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

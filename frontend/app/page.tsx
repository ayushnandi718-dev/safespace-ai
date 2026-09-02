"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  MessageCircle,
  Shield,
  Search,
  Heart,
  HeartPulse,
  ArrowRight,
  ChevronDown,
  Lock,
  Sparkles,
  Stethoscope,
  AlertTriangle,
  Menu,
  X,
  MapPin,
  Activity,
  Navigation,
  Users,
  Zap,
} from "lucide-react";

const pillars = [
  {
    icon: Brain,
    title: "Understand",
    emoji: "🧠",
    headline: "Understand",
    description:
      "Mental wellness and supportive conversations. A judgment-free space to make sense of how you're feeling — anytime, day or night.",
    color: "from-accent-blue/20 to-accent-violet/20",
    iconColor: "text-accent-blue",
  },
  {
    icon: HeartPulse,
    title: "Guide",
    emoji: "🩺",
    headline: "Guide",
    description:
      "General physical-health and symptom guidance. Ask questions, get thoughtful context, and know when it's worth seeing a professional.",
    color: "from-accent-teal/20 to-accent-blue/20",
    iconColor: "text-accent-teal",
  },
  {
    icon: MapPin,
    title: "Connect",
    emoji: "📍",
    headline: "Connect",
    description:
      "Find nearby doctors, clinics, hospitals, and specialists — verified placements with maps, phone, and directions.",
    color: "from-accent-violet/20 to-purple-500/20",
    iconColor: "text-accent-violet",
  },
];

const flowSteps = [
  {
    emoji: "💬",
    title: "Describe your concern",
    description: "Tell SafeSpace what's happening in plain language — a symptom, a worry, a new pain.",
  },
  {
    emoji: "❓",
    title: "AI asks the right questions",
    description: "Timing, severity, and warning signs are gathered naturally through conversation.",
  },
  {
    emoji: "🩺",
    title: "Guidance + warning signs",
    description: "You get general information and clear signals for when to seek professional care.",
  },
  {
    emoji: "📍",
    title: "Suggested specialist & local care",
    description: "SafeSpace recommends a relevant specialty and can find those providers near you.",
  },
];

const pipeline = [
  { name: "Nemotron 3.5", role: "Reasoning engine", icon: Zap },
  { name: "Intent", role: "Understands your need", icon: Brain },
  { name: "Agent", role: "Picks the right specialist", icon: Users },
  { name: "Tool", role: "Searches local care", icon: Search },
  { name: "Response", role: "Guidance + resources", icon: MessageCircle },
];

const careLinks = [
  { label: "Doctors", query: "doctor", icon: Stethoscope },
  { label: "Hospitals", query: "hospital", icon: Activity },
  { label: "Dentists", query: "dentist", icon: Sparkles },
  { label: "Pharmacies", query: "pharmacy", icon: Heart },
  { label: "Orthopedic", query: "orthopedic", icon: HeartPulse },
  { label: "Mental Health", query: "therapist", icon: Brain },
];

const demoMessages = [
  { role: "user", text: "My knee hurts badly." },
  {
    role: "ai",
    text: "I can help you understand what to consider. Did this start after an injury? Is there swelling, or trouble putting weight on it?",
  },
  { role: "user", text: "Yes — I fell yesterday, and it hurts to stand." },
  {
    role: "ai",
    text: "That context matters. Until you can see a professional: rest, ice, and gentle elevation can help. If you can't bear weight, the knee is very swollen, or the pain is worsening, an orthopedic evaluation is a reasonable next step.",
  },
] as const;

function ChatDemo() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const total = demoMessages.length;

  useEffect(() => {
    if (step >= total) {
      const t = setTimeout(() => {
        setStep(0);
        setCharCount(0);
      }, 6000);
      return () => clearTimeout(t);
    }
    const text = demoMessages[step].text;
    if (charCount < text.length) {
      const t = setTimeout(() => setCharCount((c) => c + 1), 12);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      setCharCount(0);
    }, 800);
    return () => clearTimeout(t);
  }, [step, charCount, total]);

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent-blue/10 via-accent-violet/10 to-accent-teal/10 blur-2xl" />
      <div className="relative rounded-2xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-2/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">SafeSpace AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-gray-500">Online</span>
          </div>
        </div>

        <div className="p-4 space-y-3 min-h-[320px]">
          {demoMessages.slice(0, step).map((m, i) => (
            <Bubble key={i} role={m.role} text={m.text} full />
          ))}

          {step < total && (
            <Bubble
              role={demoMessages[step].role}
              text={demoMessages[step].text.slice(0, charCount)}
              typing
            />
          )}

          {step >= total && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 pt-2"
            >
              <button
                onClick={() =>
                  router.push("/find-support?support_type=orthopedic")
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <MapPin className="w-3.5 h-3.5" />
                Find Orthopedic Doctors Near Me
              </button>
              <span className="text-[10px] text-gray-500">
                Real local results, mapped & verified
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  typing,
  full,
}: {
  role: "user" | "ai";
  text: string;
  typing?: boolean;
  full?: boolean;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "bg-surface-3" : "bg-gradient-to-br from-accent-blue to-accent-violet"
        }`}
      >
        {isUser ? (
          <span className="text-[10px] font-bold text-gray-300">You</span>
        ) : (
          <Shield className="w-3.5 h-3.5 text-white" />
        )}
      </div>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand-600/20 text-gray-100 rounded-tr-sm"
            : "bg-surface-2 border border-white/5 text-gray-200 rounded-tl-sm"
        }`}
      >
        {isUser ? text : (
          <>
            {text}
            {typing && (
              <span className="inline-block w-1.5 h-3.5 bg-accent-blue/80 ml-0.5 align-middle animate-pulse" />
            )}
          </>
        )}
        {full && !isUser && (
          <span className="inline-block w-1.5 h-3.5 bg-accent-blue/40 ml-0.5 align-middle" />
        )}
      </div>
    </motion.div>
  );
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "AI Health Chat", href: "/chat" },
    { label: "Symptom Checker", href: "/chat?prompt=My%20knee%20hurts%20-%20can%20you%20help%20me%20understand%20what%20to%20consider%3F" },
    { label: "Find Care", href: "/find-support" },
    { label: "Mental Wellness", href: "/chat?prompt=I%27d%20like%20someone%20to%20talk%20to%20about%20how%20I%27m%20feeling" },
    { label: "Safety", href: "#privacy" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-xl" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold gradient-text">
              SafeSpace AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white hover:opacity-90 transition-opacity"
            >
              Dashboard
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass border-t border-white/5"
        >
          <div className="px-4 py-4 space-y-3">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="block text-sm text-gray-400 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white text-center"
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(167,139,250,0.06)_0%,transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 mb-8">
                  <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
                  <span className="text-xs font-medium text-accent-blue">
                    Your AI Health, Wellness &amp; Care Companion
                  </span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              >
                <span className="text-white">Health guidance.</span>
                <br />
                <span className="gradient-text">Support</span>
                <span className="text-white"> when you need it.</span>
                <br />
                <span className="gradient-text">Care</span>
                <span className="text-white"> near you.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-xl text-lg text-gray-400 mb-8"
              >
                SafeSpace AI understands how you feel, guides you through
                physical-health questions, and connects you with care — from
                supportive conversation to a nearby orthopedic specialist.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-start gap-4 mb-8"
              >
                <button
                  onClick={() => router.push("/chat")}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Talk to SafeSpace
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/find-support"
                  className="px-7 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Healthcare
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center gap-3 text-xs text-gray-500"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-accent-teal" />
                  Private conversations
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-accent-violet" />
                  Verified local care
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-accent-blue" />
                  24/7 availability
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <ChatDemo />
              <p className="mt-4 text-center text-xs text-gray-600">
                Live preview of the symptom-to-care conversation
              </p>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </motion.div>
      </section>

      {/* Three pillars */}
      <section id="pillars" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              One companion for your whole health
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Three ways SafeSpace AI shows up for you — whether you need a
              listening ear, clarity on a health question, or someone to go to.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-surface-1 border border-white/5 hover-lift text-center"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <p.icon className={`w-6 h-6 ${p.iconColor}`} />
                </div>
                <p className="text-2xl mb-1">{p.emoji}</p>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {p.headline}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {p.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Symptom -> Care flow */}
      <section id="flow" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              From &ldquo;my knee hurts&rdquo; to a nearby specialist
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              SafeSpace AI doesn&apos;t just answer — it walks with you from
              concern to concrete next steps.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-blue/40 via-accent-violet/40 to-accent-teal/40 hidden md:block" />
            <div className="space-y-8">
              {flowSteps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex gap-6 items-start"
                >
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">{s.emoji}</span>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-base font-semibold text-white mb-1">
                      {s.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{s.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => router.push("/chat")}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Try the symptom flow
            </button>
            <p className="mt-3 text-xs text-gray-600">
              General health information only — never a diagnosis. Always
              consult a qualified provider.
            </p>
          </div>
        </div>
      </section>

      {/* Healthcare finder */}
      <section id="find-care" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-surface-1 border border-white/5 p-8 md:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-teal/20 bg-accent-teal/10 mb-6">
                  <MapPin className="w-3.5 h-3.5 text-accent-teal" />
                  <span className="text-xs font-medium text-accent-teal">
                    Healthcare Finder
                  </span>
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Find the right care, close to you
                </h2>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Search by category or your own words. Results are pulled from
                  real mapping data — every place shows an address, phone, and
                  a map link so you can actually get there.
                </p>
                <Link
                  href="/find-support"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-teal to-accent-blue text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Open Healthcare Finder
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {careLinks.map((c) => (
                  <Link
                    key={c.label}
                    href={`/find-support?support_type=${c.query}`}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-2 border border-white/5 hover:border-white/15 hover:bg-surface-3 transition-all"
                  >
                    <c.icon className="w-4 h-4 text-accent-blue" />
                    <span className="text-xs text-gray-300 font-medium">
                      {c.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How SafeSpace AI works
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              A focused intelligence pipeline turns every message into the
              right guidance and the right resources.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2">
            {pipeline.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-1"
              >
                <div className="relative h-full p-5 rounded-2xl bg-surface-1 border border-white/5 hover-lift flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 flex items-center justify-center mb-3">
                    <p.icon className="w-5 h-5 text-accent-blue" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-gray-500">{p.role}</p>
                  {i < pipeline.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-gray-600">
            Powered by NVIDIA Nemotron 3.5 with real-time local care search.
          </p>
        </div>
      </section>

      {/* Privacy & safety */}
      <section id="privacy" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-surface-1 border border-white/5"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-teal/20 to-accent-blue/20 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-accent-teal" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Your space stays yours
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Conversations are private and never shared with third parties.
                SafeSpace uses AI-guided reflection to help you think clearly —
                it never claims to diagnose, and it never judges.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="p-6 rounded-2xl bg-surface-1 border border-white/5"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-accent-violet/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Built-in safety
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                When SafeSpace detects signs of crisis, it immediately surfaces
                crisis resources and your configured emergency options.
                General health guidance and wellness tracking are framed as
                encouragement — never clinical facts.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 max-w-3xl mx-auto"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/70 text-left">
                <strong className="text-amber-300">Important: SafeSpace AI is not a medical device.</strong>{" "}
                It provides general health information and AI-guided reflection, not
                diagnosis or treatment. If you are in crisis or need immediate help,
                contact your local emergency services or a crisis hotline. This
                platform does not provide emergency services.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-surface-1 border border-white/5 p-8 md:p-16 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-7 h-7 text-accent-violet" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Your health, your space, your call
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Understand how you feel. Get guidance that makes sense. Find care
              when you need it. SafeSpace AI is ready whenever you are.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/chat")}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Talk to SafeSpace AI
              </button>
              <Link
                href="/find-support"
                className="px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Find Healthcare
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium gradient-text">
                SafeSpace AI
              </span>
            </div>
            <p className="text-xs text-gray-600 text-center md:text-right max-w-md">
              SafeSpace AI is an AI-powered health and wellness companion and is
              not a substitute for professional medical advice, diagnosis, or
              treatment. Always seek the advice of a qualified health provider
              with any questions regarding a medical condition. Not an emergency
              service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
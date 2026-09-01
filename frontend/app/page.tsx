"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  MessageCircle,
  Shield,
  Search,
  Heart,
  ArrowRight,
  ChevronDown,
  Lock,
  Sparkles,
  Stethoscope,
  Users,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: Brain,
    title: "AI Emotional Support",
    description:
      "Advanced AI agents trained to provide empathetic, evidence-based emotional support tailored to your needs.",
  },
  {
    icon: Stethoscope,
    title: "Professional Help Discovery",
    description:
      "Find therapists, counselors, and mental health professionals in your area with our smart search.",
  },
  {
    icon: Lock,
    title: "Private Conversations",
    description:
      "Your conversations are encrypted and private. We never share your personal information with third parties.",
  },
  {
    icon: Shield,
    title: "Safety First",
    description:
      "Built-in safety detection identifies crisis situations and connects you with appropriate emergency resources.",
  },
];

const steps = [
  {
    num: "01",
    title: "You share what's happening",
    description: "Express yourself freely in a judgment-free environment.",
  },
  {
    num: "02",
    title: "SafeSpace understands your needs",
    description:
      "Our AI analyzes context, sentiment, and urgency to understand your situation.",
  },
  {
    num: "03",
    title: "Specialized AI tools are selected",
    description:
      "The right support agent is automatically chosen for your specific needs.",
  },
  {
    num: "04",
    title: "You receive an appropriate response",
    description:
      "Get personalized, compassionate support or professional resources.",
  },
];

function PulsingOrb() {
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-blue/30 via-accent-violet/30 to-accent-teal/30 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-br from-accent-blue/20 via-accent-violet/20 to-accent-teal/20 blur-lg"
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-accent-blue/10 via-accent-violet/10 to-accent-teal/10 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                background:
                  i % 3 === 0
                    ? "#60a5fa"
                    : i % 3 === 1
                    ? "#a78bfa"
                    : "#2dd4bf",
                top: "50%",
                left: "50%",
              }}
              animate={{
                rotate: [i * 72, i * 72 + 360],
                x: [
                  Math.cos((i * 72 * Math.PI) / 180) * 70,
                  Math.cos(((i * 72 + 360) * Math.PI) / 180) * 70,
                ],
                y: [
                  Math.sin((i * 72 * Math.PI) / 180) * 70,
                  Math.sin(((i * 72 + 360) * Math.PI) / 180) * 70,
                ],
              }}
              transition={{
                duration: 12 + i * 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#resources"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Resources
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white hover:opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white hover:opacity-90 transition-opacity"
                >
                  Get Support
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
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
            <a
              href="#features"
              className="block text-sm text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block text-sm text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white text-center"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-sm text-gray-400 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Support
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(167,139,250,0.06)_0%,transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-xs font-medium text-accent-blue">
                AI-Powered Mental Wellness
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="gradient-text">Your Safe Space</span>
            <br />
            <span className="text-white">to Talk.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-gray-400 mb-10"
          >
            Experience compassionate AI-driven support whenever you need it.
            Share what&apos;s on your mind in a private, judgment-free space and
            receive thoughtful guidance — or get connected with professional
            help.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button
              onClick={() =>
                router.push(user ? "/chat" : "/register")
              }
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Start a Conversation
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#resources"
              className="px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
            >
              Explore Resources
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <PulsingOrb />
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for Your Wellbeing
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              SafeSpace AI combines advanced artificial intelligence with
              evidence-based mental health practices.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-surface-1 border border-white/5 hover-lift"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent-blue" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Four simple steps to the support you deserve.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-blue/40 via-accent-violet/40 to-accent-teal/40 hidden md:block" />

            <div className="space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-6 items-start"
                >
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold gradient-text">
                      {step.num}
                    </span>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resources / CTA */}
      <section id="resources" className="py-24 relative">
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
              You&apos;re Not Alone
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Whether you need someone to talk to right now, or you&apos;re
              looking for professional help, SafeSpace AI is here for you 24/7.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={() =>
                  router.push(user ? "/chat" : "/register")
                }
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
                Find Professional Help
              </Link>
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 max-w-lg mx-auto">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/70 text-left">
                  <strong className="text-amber-300">Important Disclaimer:</strong>{" "}
                  SafeSpace AI is not a replacement for professional mental
                  health care. If you are in crisis or need immediate help,
                  please contact your local emergency services or a crisis
                  hotline. This platform does not provide emergency services.
                </p>
              </div>
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
              SafeSpace AI is an AI-powered support tool and is not a
              substitute for professional medical advice, diagnosis, or
              treatment. Always seek the advice of a qualified health provider
              with any questions regarding a medical condition. Not an
              emergency service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

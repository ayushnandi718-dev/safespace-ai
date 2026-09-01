"use client";

import { motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  Flame,
  Stethoscope,
  Users,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const resources = [
  {
    icon: Brain,
    title: "Managing Stress",
    description:
      "Learn evidence-based techniques to manage daily stress including deep breathing, progressive muscle relaxation, and time management strategies.",
    color: "from-accent-blue/20 to-accent-violet/20",
    iconColor: "text-accent-blue",
  },
  {
    icon: BookOpen,
    title: "Academic Pressure",
    description:
      "Strategies for dealing with exam anxiety, perfectionism, academic burnout, and maintaining a healthy study-life balance.",
    color: "from-accent-violet/20 to-purple-500/20",
    iconColor: "text-accent-violet",
  },
  {
    icon: Flame,
    title: "Work Burnout",
    description:
      "Recognize the signs of workplace burnout and discover actionable steps to restore your energy, set boundaries, and find fulfillment.",
    color: "from-orange-500/20 to-accent-teal/20",
    iconColor: "text-orange-400",
  },
  {
    icon: Stethoscope,
    title: "Finding Professional Help",
    description:
      "A guide to understanding when and how to seek professional mental health support, what to expect from therapy, and how to find the right therapist.",
    color: "from-accent-teal/20 to-accent-blue/20",
    iconColor: "text-accent-teal",
  },
  {
    icon: Users,
    title: "Supporting Someone Else",
    description:
      "How to be there for a friend or loved one struggling with mental health challenges — practical communication tips and self-care for supporters.",
    color: "from-accent-blue/20 to-accent-teal/20",
    iconColor: "text-accent-blue",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Help",
    description:
      "Important resources for crisis situations. If you or someone you know is in immediate danger, contact emergency services or a crisis hotline.",
    color: "from-red-500/20 to-rose-500/20",
    iconColor: "text-red-400",
  },
];

const hotlines = [
  { name: "988 Suicide & Crisis Lifeline", number: "988", country: "US" },
  { name: "Crisis Text Line", number: "Text HOME to 741741", country: "US" },
  { name: "Samaritans", number: "116 123", country: "UK" },
  { name: "Befrienders Worldwide", number: "befrienders.org", country: "Global" },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          Mental Health Resources
        </h1>
        <p className="text-gray-400">
          Educational materials and support information to help you on your
          wellness journey.
        </p>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300 mb-1">
              Disclaimer
            </p>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              The information provided here is for educational purposes only and
              does not constitute medical advice. SafeSpace AI is not a
              substitute for professional mental health care. If you are
              experiencing a mental health emergency, please contact your local
              emergency services or crisis hotline immediately.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Resource cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource, i) => (
          <motion.div
            key={resource.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="p-5 rounded-2xl bg-surface-1 border border-white/5 hover-lift"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center mb-4`}
            >
              <resource.icon className={`w-5 h-5 ${resource.iconColor}`} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">
              {resource.title}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {resource.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Crisis Hotlines */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          Emergency Hotlines
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {hotlines.map((h) => (
            <div
              key={h.name}
              className="flex items-center justify-between p-4 rounded-xl bg-surface-1 border border-white/5"
            >
              <div>
                <p className="text-sm font-medium text-white">{h.name}</p>
                <p className="text-xs text-gray-500">{h.country}</p>
              </div>
              <span className="text-sm font-mono text-accent-blue">
                {h.number}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

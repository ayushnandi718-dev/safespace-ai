"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getIntegrationsStatus } from "@/lib/api";
import type { IntegrationStatus } from "@/types/chat";

interface Problem {
  status: "missing" | "expired";
  name: string;
  used_for: string;
}

function messageFor(p: Problem): string {
  if (p.status === "expired") {
    return `The key powering "${p.name}" has expired or been revoked. ${p.used_for}`;
  }
  return `The key for "${p.name}" is not configured. ${p.used_for}`;
}

export default function ApiKeyBanner() {
  const [problems, setProblems] = useState<IntegrationStatus[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getIntegrationsStatus()
      .then((data) => {
        if (cancelled) return;
        setProblems(data.problems);
      })
      .catch(() => {
        if (!cancelled) setProblems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || problems.length === 0) return null;

  const mapped: Problem[] = problems.map((p) => ({
    status: p.status === "expired" ? "expired" : "missing",
    name: p.name,
    used_for: p.used_for,
  }));

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-300">
            Some features are temporarily unavailable
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-200/80">
            {mapped.map((p, idx) => (
              <li key={idx}>{messageFor(p)}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/70 hover:text-amber-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
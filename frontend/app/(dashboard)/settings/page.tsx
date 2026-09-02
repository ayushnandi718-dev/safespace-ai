"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Save,
  Palette,
  Bell,
} from "lucide-react";
import {
  getSettings,
  updateSettings,
  deleteAllConversations,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api";
import { getConversations, getConversation } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [clearingConvos, setClearingConvos] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setName(s.name);
        setEmail(s.email);
        setTheme(s.theme === "light" ? "light" : "dark");
        setEmailNotifications(s.email_notifications ?? true);
      })
      .catch(() => {});
  }, []);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await updateSettings(name, email, theme, emailNotifications);
      toast("Preferences saved", "success");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to save preferences";
      toast(msg, "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const convos = await getConversations();
      const fullConvos = await Promise.all(
        convos.map((c) => getConversation(c.id))
      );
      const blob = new Blob([JSON.stringify(fullConvos, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safespace-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Data exported successfully", "success");
    } catch {
      toast("Failed to export data", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleClearConversations = async () => {
    setClearingConvos(true);
    try {
      await deleteAllConversations();
      setShowClearConfirm(false);
      toast("All conversations deleted", "success");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to delete conversations";
      toast(msg, "error");
    } finally {
      setClearingConvos(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          Settings
        </h1>
        <p className="text-gray-400">Manage your preferences and data.</p>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-6 rounded-2xl bg-surface-1 border border-white/5"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Preferences</h2>
            <p className="text-xs text-gray-500">
              Customize your SafeSpace experience
            </p>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  theme === "dark"
                    ? "bg-accent-violet/20 border-accent-violet text-white"
                    : "border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  theme === "light"
                    ? "bg-accent-blue/20 border-accent-blue text-white"
                    : "border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                Light
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Email notifications</p>
                <p className="text-xs text-gray-500">
                  Receive check-in reminders and updates
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotifications}
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                emailNotifications ? "bg-accent-teal" : "bg-surface-2 border border-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${
                  emailNotifications ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-teal to-accent-blue text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {savingPrefs ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Preferences
          </button>
        </div>
      </motion.div>

      {/* Export Data */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-surface-1 border border-white/5"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Export Data</h2>
            <p className="text-xs text-gray-500">
              Download all conversations as JSON
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Conversations
        </button>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10"
      >
        <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Delete all conversations</p>
              <p className="text-xs text-gray-500">
                This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
            >
              Delete All
            </button>
          </div>
          {showClearConfirm && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-red-300">
                  Are you sure? This will permanently delete all conversations.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearConversations}
                  disabled={clearingConvos}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1"
                >
                  {clearingConvos ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Yes, delete all
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-400 text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
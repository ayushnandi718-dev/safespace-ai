"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  MessageCircle,
  LayoutDashboard,
  Search,
  BookOpen,
  Settings,
  Menu,
  X,
  ChevronRight,
  LifeBuoy,
  Plus,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import ApiKeyBanner from "@/components/ApiKeyBanner";

const navItems = [
  { href: "/chat", label: "Conversations", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-support", label: "Find Healthcare", icon: Search },
  { href: "/resources", label: "Wellness Resources", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/resources", label: "Help & Support", icon: LifeBuoy },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-surface-1 border-r border-white/5 w-[280px]">
      <div className="p-5 pb-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-accent-blue/40 blur-md" />
            <Shield className="relative w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-semibold gradient-text">
            SafeSpace AI
          </span>
        </Link>
        <p className="mt-2 text-[11px] text-gray-500">Your Safe Space to Talk</p>
      </div>

      <div className="p-3">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-sm font-medium shadow-lg shadow-accent-blue/20 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/chat" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? "bg-brand-600/15 text-accent-blue"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-accent-blue to-accent-violet" />
              )}
              <item.icon className="w-4.5 h-4.5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-600/10 to-accent-violet/10 border border-white/5">
          <p className="text-sm font-medium text-white">You matter.</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            We&apos;re here for you, whenever you need.
          </p>
        </div>
      </div>

      <div className="px-3 pb-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">
              {(user.name || "U").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-[280px] lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 glass border-b border-white/5">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold gradient-text">
                SafeSpace AI
              </span>
            </Link>
            <div className="w-5" />
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          <ApiKeyBanner />
          {children}
        </div>
      </div>
    </div>
  );
}

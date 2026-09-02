"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  MessageCircle,
  LayoutDashboard,
  Search,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import ApiKeyBanner from "@/components/ApiKeyBanner";

const navItems = [
  { href: "/chat", label: "New Conversation", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-support", label: "Find Support", icon: Search },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="w-20 h-1.5 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-surface-1 border-r border-white/5 w-64">
      <div className="p-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-semibold gradient-text">
            SafeSpace AI
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/chat" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? "bg-brand-600/15 text-accent-blue"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:shrink-0">
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

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, Database, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/knowledge", label: "Knowledge", icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-[#111827] text-gray-200 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/50">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
          AI
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">AI Workspace</h1>
          <p className="text-[10px] text-gray-400">Enterprise Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User Actions */}
      <div className="px-3 py-4 border-t border-gray-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 w-full transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

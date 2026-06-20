"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile by default, shown when toggled */}
      <div className={`fixed left-0 top-0 z-40 h-screen lg:block ${mobileOpen ? "block" : "hidden"}`}>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Hamburger button (mobile only) */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 lg:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Main content — offset on desktop, full-width on mobile */}
      <main className="lg:ml-60 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

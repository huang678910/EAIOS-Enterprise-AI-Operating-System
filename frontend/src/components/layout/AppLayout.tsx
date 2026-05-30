"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar />
      <main className="ml-60 h-full overflow-y-auto">{children}</main>
    </div>
  );
}

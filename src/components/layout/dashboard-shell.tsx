"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AccessGate } from "@/components/layout/access-gate";
import { NotificationToast } from "@/components/shared/notification-toast";
import { useCurrentUser } from "@/lib/user-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useCurrentUser();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background">
          <AccessGate>{children}</AccessGate>
        </main>
      </div>

      {/* Real-time notification toasts (bottom-right, all pages) */}
      <NotificationToast userId={user.id} />
    </div>
  );
}

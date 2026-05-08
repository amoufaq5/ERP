"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BottomNav } from "@/components/shared/mobile/bottom-nav";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";
import { DataStoreProvider } from "@/lib/data-store";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { EnhancedNotificationProvider } from "@/lib/notification-context";
import { AuditLoggerProvider } from "@/lib/audit-logger";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { FavoritesProvider } from "@/lib/favorites";
import { ApprovalProvider } from "@/lib/approval-workflow";
import { KeyboardShortcutsInit } from "@/lib/keyboard-init";
import { QueryProvider } from "@/lib/api/query-provider";
import { AuthSessionProvider } from "@/lib/auth/session-provider";
import { SearchProvider } from "@/lib/search/search-provider";
import { ActivityProvider } from "@/lib/activity/activity-context";

class LayoutErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[DashboardLayout Error]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ color: "red", fontSize: 20 }}>Dashboard Layout Error</h1>
          <pre style={{ background: "#f5f5f5", padding: 16, overflow: "auto", fontSize: 13, marginTop: 12 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ background: "#f0f0f0", padding: 16, overflow: "auto", fontSize: 11, marginTop: 8, maxHeight: 300 }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutErrorBoundary>
      <AuthSessionProvider>
      <ThemeProvider>
        <I18nProvider>
          <QueryProvider>
            <UserProvider>
              <ConfigProvider>
                <DataStoreProvider>
                  <EnhancedNotificationProvider>
                    <AuditLoggerProvider>
                      <ApprovalProvider>
                        <FavoritesProvider>
                          <SearchProvider>
                            <ActivityProvider>
                              <DashboardShell>
                                <KeyboardShortcutsInit />
                                {children}
                              </DashboardShell>
                              <BottomNav />
                            </ActivityProvider>
                          </SearchProvider>
                        </FavoritesProvider>
                      </ApprovalProvider>
                    </AuditLoggerProvider>
                </EnhancedNotificationProvider>
                </DataStoreProvider>
              </ConfigProvider>
            </UserProvider>
          </QueryProvider>
        </I18nProvider>
      </ThemeProvider>
      </AuthSessionProvider>
    </LayoutErrorBoundary>
  );
}

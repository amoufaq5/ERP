import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";
import { DataStoreProvider } from "@/lib/data-store";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { NotificationProvider } from "@/lib/notifications";
import { EnhancedNotificationProvider } from "@/lib/notification-context";
import { AuditProvider } from "@/lib/audit-trail";
import { AuditLoggerProvider } from "@/lib/audit-logger";
import { AuditServiceProvider } from "@/lib/audit/audit-context";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { FavoritesProvider } from "@/lib/favorites";
import { ApprovalProvider } from "@/lib/approval-workflow";
import { KeyboardShortcutsInit } from "@/lib/keyboard-init";
import { QueryProvider } from "@/lib/api/query-provider";
import { AuthSessionProvider } from "@/lib/auth/session-provider";
import { SearchProvider } from "@/lib/search/search-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          <UserProvider>
            <ConfigProvider>
              <DataStoreProvider>
                <NotificationProvider>
                  <EnhancedNotificationProvider>
                  <AuditProvider>
                    <AuditLoggerProvider>
                    <AuditServiceProvider>
                    <ApprovalProvider>
                      <FavoritesProvider>
                        <SearchProvider>
                          <DashboardShell>
                            <KeyboardShortcutsInit />
                            {children}
                          </DashboardShell>
                        </SearchProvider>
                      </FavoritesProvider>
                    </ApprovalProvider>
                    </AuditServiceProvider>
                    </AuditLoggerProvider>
                  </AuditProvider>
                  </EnhancedNotificationProvider>
                </NotificationProvider>
              </DataStoreProvider>
            </ConfigProvider>
          </UserProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
    </AuthSessionProvider>
  );
}

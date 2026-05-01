import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";
import { DataStoreProvider } from "@/lib/data-store";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { NotificationProvider } from "@/lib/notifications";
import { EnhancedNotificationProvider } from "@/lib/notification-context";
import { AuditProvider } from "@/lib/audit-trail";
import { ThemeProvider } from "@/lib/theme-context";
import { FavoritesProvider } from "@/lib/favorites";
import { ApprovalProvider } from "@/lib/approval-workflow";
import { KeyboardShortcutsInit } from "@/lib/keyboard-init";
import { QueryProvider } from "@/lib/api/query-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          <UserProvider>
            <ConfigProvider>
              <DataStoreProvider>
                <NotificationProvider>
                  <EnhancedNotificationProvider>
                  <AuditProvider>
                    <ApprovalProvider>
                      <FavoritesProvider>
                        <DashboardShell>
                          <KeyboardShortcutsInit />
                          {children}
                        </DashboardShell>
                      </FavoritesProvider>
                    </ApprovalProvider>
                  </AuditProvider>
                  </EnhancedNotificationProvider>
                </NotificationProvider>
              </DataStoreProvider>
            </ConfigProvider>
          </UserProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

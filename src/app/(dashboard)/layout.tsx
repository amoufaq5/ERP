import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";
import { DataStoreProvider } from "@/lib/data-store";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { NotificationProvider } from "@/lib/notifications";
import { AuditProvider } from "@/lib/audit-trail";
import { ThemeProvider } from "@/lib/theme-context";
import { FavoritesProvider } from "@/lib/favorites";
import { ApprovalProvider } from "@/lib/approval-workflow";
import { KeyboardShortcutsInit } from "@/lib/keyboard-init";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <UserProvider>
          <ConfigProvider>
            <DataStoreProvider>
              <NotificationProvider>
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
              </NotificationProvider>
            </DataStoreProvider>
          </ConfigProvider>
        </UserProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

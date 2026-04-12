import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";
import { DataStoreProvider } from "@/lib/data-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ConfigProvider>
        <DataStoreProvider>
          <DashboardShell>{children}</DashboardShell>
        </DataStoreProvider>
      </ConfigProvider>
    </UserProvider>
  );
}

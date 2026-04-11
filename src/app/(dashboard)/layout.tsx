import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/lib/user-context";
import { ConfigProvider } from "@/lib/config-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ConfigProvider>
        <DashboardShell>{children}</DashboardShell>
      </ConfigProvider>
    </UserProvider>
  );
}

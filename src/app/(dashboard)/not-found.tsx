import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full shadow-lg text-center">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-muted-foreground">
            404
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Page not found</h2>
            <p className="text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist within the
              dashboard. Try one of the sections below.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <Button asChild size="sm">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Dashboard sections
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm">CRM</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/erp">ERP</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ats">ATS</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">Analytics</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reports">Reports</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from "lucide-react";

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRM Error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-destructive/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">CRM Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            The CRM module encountered an error. Your data is safe — try
            reloading or navigate to a different section.
          </p>
          {isDev && error.message && (
            <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto max-h-32 text-destructive text-left">
              {error.message}
            </pre>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={reset} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              CRM sections
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm/contacts">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Contacts
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm/leads">Leads</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm/accounts">Accounts</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm/opportunities">Opportunities</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

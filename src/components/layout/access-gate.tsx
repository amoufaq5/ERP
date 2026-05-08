"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Pages every authenticated user can always see.
const ALWAYS_ALLOWED = [
  "/dashboard",
  "/settings/profile",
];

export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user, canAccess } = useCurrentUser();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return null;
  }

  // Normalize: strip query strings and trailing slashes
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  const alwaysAllowed = ALWAYS_ALLOWED.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  // Root of dashboard (e.g. "/") is always allowed
  const isRoot = path === "/" || path === "";

  const allowed = isRoot || alwaysAllowed || canAccess(path);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Access Restricted</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">HTTP 403 — Forbidden</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-gray-700">
            Your current role does not have permission to view this page.
          </p>
          <div className="rounded-lg border bg-slate-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Signed in as</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Role</span>
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Requested path</span>
              <code className="rounded bg-white px-1.5 py-0.5 text-xs border">{path}</code>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            If you believe you should have access, contact your system administrator
            to update your permissions in <strong>Settings → Permissions</strong>.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Button asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

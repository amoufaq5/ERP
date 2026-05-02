"use client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-gray-500">
          The dashboard encountered an error while loading.
        </p>
        <pre className="text-xs bg-gray-100 rounded p-3 text-left overflow-auto max-h-32 text-red-700">
          {error.message}
        </pre>
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("pharma.currentUser");
              localStorage.removeItem("pharma.dataStore.v1");
              window.location.href = "/login";
            }}
            variant="destructive"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Clear Data & Login
          </Button>
        </div>
      </div>
    </div>
  );
}

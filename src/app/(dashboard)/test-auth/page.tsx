"use client";

import { useSession } from "next-auth/react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Auth Test Page</h1>
      <p><strong>Status:</strong> {status}</p>
      <p><strong>Session:</strong> {session ? JSON.stringify(session.user, null, 2) : "none"}</p>
      <p style={{ marginTop: 20 }}>
        If you can see this page, the auth and routing work. The white dashboard
        is a client-side rendering issue in the dashboard page itself.
      </p>
    </div>
  );
}

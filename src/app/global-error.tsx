"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, background: "#f8fafc" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Application Error</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>{error.message}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 14 }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("token");
                  localStorage.removeItem("pharma.currentUser");
                  localStorage.removeItem("pharma.dataStore.v1");
                } catch (error) { console.error("Failed to clear localStorage during error recovery:", error); }
                window.location.href = "/login";
              }}
              style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 14 }}
            >
              Clear Data & Login
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

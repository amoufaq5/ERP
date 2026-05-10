"use client";

import { useState, useEffect, useCallback } from "react";

const CSRF_COOKIE_NAME = "csrf-token";

/**
 * Read the CSRF token from document.cookie.
 * The cookie is set with HttpOnly=false so JavaScript can access it.
 */
function readTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

/**
 * React hook that provides the CSRF token for use in fetch headers.
 *
 * Usage:
 * ```tsx
 * const { csrfToken } = useCsrf();
 *
 * const res = await fetch("/api/v1/something", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "x-csrf-token": csrfToken,
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string>("");

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/csrf", { credentials: "same-origin" });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.csrfToken) {
          setCsrfToken(json.data.csrfToken);
          return;
        }
      }
    } catch {
      // Fetch failed - fall through and try reading cookie directly
    }

    // Try reading from cookie after the fetch (it may have set the cookie)
    const cookieValue = readTokenFromCookie();
    if (cookieValue) {
      setCsrfToken(cookieValue);
    }
  }, []);

  useEffect(() => {
    // Try to read token from cookie first
    const existing = readTokenFromCookie();
    if (existing) {
      setCsrfToken(existing);
      return;
    }

    // Auto-fetch if not present
    fetchToken();
  }, [fetchToken]);

  return { csrfToken, refetchToken: fetchToken };
}

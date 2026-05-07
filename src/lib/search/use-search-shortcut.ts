"use client";

import { useEffect } from "react";

/**
 * Listens for Cmd+K (Mac) / Ctrl+K (Windows/Linux) and calls the provided
 * callback. Prevents the default browser behaviour (e.g. Chrome address bar
 * focus on Ctrl+K).
 */
export function useSearchShortcut(onToggle: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onToggle]);
}

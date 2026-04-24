"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: ShortcutDef[] = [
    { key: "d", alt: true, description: "Go to Dashboard", action: () => router.push("/dashboard") },
    { key: "f", alt: true, description: "Go to Finance Hub", action: () => router.push("/hubs/finance") },
    { key: "h", alt: true, description: "Go to HR Hub", action: () => router.push("/hubs/hr") },
    { key: "c", alt: true, description: "Go to CRM Hub", action: () => router.push("/hubs/crm") },
    { key: "s", alt: true, description: "Go to Supply Chain Hub", action: () => router.push("/hubs/supply-chain") },
    { key: "q", alt: true, description: "Go to Quality Hub", action: () => router.push("/hubs/quality") },
    { key: "t", alt: true, description: "Go to Tools Hub", action: () => router.push("/hubs/tools") },
    { key: "m", alt: true, description: "Go to Messages", action: () => router.push("/messages") },
    { key: "r", alt: true, description: "Go to Reports", action: () => router.push("/reports") },
    { key: "/", ctrl: true, description: "Focus Search", action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      if (searchInput) searchInput.focus();
    }},
    { key: "k", ctrl: true, description: "Command Palette (Search)", action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      if (searchInput) searchInput.focus();
    }},
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const altMatch = s.alt ? e.altKey : true;
        const shiftMatch = s.shift ? e.shiftKey : true;

        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && altMatch && shiftMatch) {
          if (s.ctrl || s.alt) {
            e.preventDefault();
            s.action();
            return;
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

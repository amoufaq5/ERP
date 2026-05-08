"use client";

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from "react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

type PullState = "idle" | "pulling" | "loading" | "complete";

const THRESHOLD = 60;
const MAX_PULL = 120;

// ── Component ────────────────────────────────────────────────────────────────

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<PullState>("idle");
  const isDragging = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || pullState === "loading") return;

      // Only activate pull-to-refresh when scrolled to top
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      const touch = e.touches[0];
      startY.current = touch.clientY;
      isDragging.current = true;
    },
    [disabled, pullState]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current || disabled || pullState === "loading") return;

      const touch = e.touches[0];
      const diff = touch.clientY - startY.current;

      // Only pull down, not up
      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      // Apply resistance — diminishing returns the further you pull
      const resistance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(resistance);
      setPullState("pulling");
    },
    [disabled, pullState]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullState !== "pulling") {
      setPullDistance(0);
      return;
    }

    if (pullDistance >= THRESHOLD) {
      // Trigger refresh
      setPullState("loading");
      setPullDistance(THRESHOLD);

      try {
        await onRefresh();
      } catch {
        // silently handle error
      }

      setPullState("complete");

      // Brief pause to show completion, then snap back
      setTimeout(() => {
        setPullDistance(0);
        setPullState("idle");
      }, 300);
    } else {
      // Below threshold, snap back
      setPullDistance(0);
      setPullState("idle");
    }
  }, [pullDistance, pullState, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden",
          pullState === "idle" && pullDistance === 0
            ? "h-0"
            : "transition-[height] duration-200 ease-out"
        )}
        style={{
          height: pullDistance,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            pullState === "loading"
              ? "bg-teal-100 dark:bg-teal-900"
              : "bg-muted"
          )}
        >
          {pullState === "loading" ? (
            <Spinner />
          ) : (
            <svg
              className="w-4 h-4 text-muted-foreground transition-transform duration-150"
              style={{
                transform: `rotate(${progress * 180}deg)`,
                opacity: progress,
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

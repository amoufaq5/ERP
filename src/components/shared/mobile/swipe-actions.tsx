"use client";

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SwipeAction {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeActionsProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  /** Minimum distance in px to reveal actions (default 80) */
  threshold?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const maxLeftSwipe = leftActions.length * 72;
  const maxRightSwipe = rightActions.length * 72;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = 0;
    isDragging.current = true;
    isHorizontal.current = null;
    setIsAnimating(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - startX.current;
      const diffY = touch.clientY - startY.current;

      // Determine swipe direction on first substantial move
      if (isHorizontal.current === null) {
        if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
          isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
        }
        return;
      }

      // If vertical scroll, bail out
      if (!isHorizontal.current) return;

      e.preventDefault();

      // Clamp translation
      let clampedX = diffX;
      // Swiping right (reveals left actions)
      if (diffX > 0) {
        clampedX = leftActions.length > 0 ? Math.min(diffX, maxLeftSwipe) : 0;
      }
      // Swiping left (reveals right actions)
      if (diffX < 0) {
        clampedX = rightActions.length > 0 ? Math.max(diffX, -maxRightSwipe) : 0;
      }

      currentX.current = clampedX;
      setTranslateX(clampedX);
    },
    [leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    setIsAnimating(true);

    // If past threshold, snap to open; otherwise spring back
    if (currentX.current > threshold && leftActions.length > 0) {
      setTranslateX(maxLeftSwipe);
    } else if (currentX.current < -threshold && rightActions.length > 0) {
      setTranslateX(-maxRightSwipe);
    } else {
      setTranslateX(0);
    }
  }, [threshold, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe]);

  const resetPosition = useCallback(() => {
    setIsAnimating(true);
    setTranslateX(0);
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden touch-pan-y">
      {/* Left actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  resetPosition();
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-[72px] h-full text-white text-xs font-medium gap-1",
                  action.color
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  resetPosition();
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-[72px] h-full text-white text-xs font-medium gap-1",
                  action.color
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative z-10 bg-background",
          isAnimating && "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

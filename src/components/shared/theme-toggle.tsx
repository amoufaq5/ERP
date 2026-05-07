"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme/theme-provider";

const THEME_CYCLE = ["light", "dark", "system"] as const;

const THEME_META: Record<
  (typeof THEME_CYCLE)[number],
  { icon: typeof Sun; label: string }
> = {
  light: { icon: Sun, label: "Light mode" },
  dark: { icon: Moon, label: "Dark mode" },
  system: { icon: Monitor, label: "System theme" },
};

interface ThemeToggleProps {
  /** "compact" renders as an icon button (header). "expanded" shows text label (settings). */
  variant?: "compact" | "expanded";
}

export function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const meta = THEME_META[theme];
  const Icon = meta.icon;

  if (variant === "expanded") {
    return (
      <Button variant="outline" size="sm" onClick={cycle} className="gap-2">
        <Icon className="h-4 w-4" />
        <span>{meta.label}</span>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycle}
            aria-label={`Current: ${meta.label}. Click to switch.`}
            className="h-9 w-9"
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{meta.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

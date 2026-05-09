"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Building2,
  Send,
  Receipt,
  Users,
  Building,
  Map as MapIcon,
  Search,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/lib/search/search-provider";
import { useSearchShortcut } from "@/lib/search/use-search-shortcut";
import type { SearchResult } from "@/lib/search/search-index";

// ─── Entity config ───────────────────────────────────────────────────────────

interface EntityMeta {
  icon: LucideIcon;
  label: string;
  route: (id: string) => string;
  color: string;
}

const ENTITY_META: Record<string, EntityMeta> = {
  doctor: {
    icon: Stethoscope,
    label: "Doctors",
    route: () => "/crm/doctors",
    color: "text-blue-600",
  },
  account: {
    icon: Building2,
    label: "Accounts",
    route: () => "/crm/accounts",
    color: "text-purple-600",
  },
  market_request: {
    icon: Send,
    label: "Market Requests",
    route: () => "/crm/market-requests",
    color: "text-orange-600",
  },
  visit: {
    icon: Receipt,
    label: "Visits",
    route: () => "/crm/medical-rep",
    color: "text-green-600",
  },
  user: {
    icon: Users,
    label: "Users",
    route: () => "/admin/users",
    color: "text-indigo-600",
  },
  business_unit: {
    icon: Building,
    label: "Business Units",
    route: () => "/crm/business-units",
    color: "text-teal-600",
  },
  territory: {
    icon: MapIcon,
    label: "Territories",
    route: () => "/crm/territories",
    color: "text-amber-600",
  },
};

const MAX_PER_ENTITY = 5;
const MAX_TOTAL = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();
  const { search } = useSearch();

  // Toggle open/close
  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // Opening — reset
        setQuery("");
        setDebouncedQuery("");
        setActiveIndex(0);
      }
      return !prev;
    });
  }, []);

  useSearchShortcut(toggle);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Search results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const raw = search(debouncedQuery, { limit: 100, fuzzy: true });

    // Group by entity and limit per group
    const grouped = new Map<string, SearchResult[]>();
    for (const r of raw) {
      const group = grouped.get(r.entity) || [];
      if (group.length < MAX_PER_ENTITY) {
        group.push(r);
        grouped.set(r.entity, group);
      }
    }

    // Flatten, capped at MAX_TOTAL
    const flat: SearchResult[] = [];
    for (const group of grouped.values()) {
      for (const r of group) {
        if (flat.length >= MAX_TOTAL) break;
        flat.push(r);
      }
      if (flat.length >= MAX_TOTAL) break;
    }
    return flat;
  }, [debouncedQuery, search]);

  // Group results by entity for display
  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.entity) || [];
      list.push(r);
      map.set(r.entity, list);
    }
    return map;
  }, [results]);

  // Navigate to result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      const meta = ENTITY_META[result.entity];
      if (meta) {
        router.push(meta.route(result.id));
      }
      setOpen(false);
    },
    [router],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[activeIndex]) {
          navigateToResult(results[activeIndex]);
        }
      }
    },
    [results, activeIndex, navigateToResult],
  );

  // Scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Build a flat index for each result to map to its flat position
  let flatIndex = 0;

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Global search (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search doctors, accounts, requests, users..."
              className="flex-1 h-14 px-3 text-base bg-transparent border-0 outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  inputRef.current?.focus();
                }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto"
          >
            {debouncedQuery.trim() && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No results for &quot;{debouncedQuery}&quot;
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try a different search term, or check for typos. You can search
                  for doctors, accounts, business units, territories, and more.
                </p>
              </div>
            )}

            {!debouncedQuery.trim() && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Start typing to search across all entities
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Doctors, accounts, market requests, users, territories, and more
                </p>
              </div>
            )}

            {[...groupedResults.entries()].map(([entity, entityResults]) => {
              const meta = ENTITY_META[entity];
              if (!meta) return null;
              const Icon = meta.icon;

              return (
                <div key={entity}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {meta.label}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      {entityResults.length}
                    </Badge>
                  </div>

                  {/* Results */}
                  {entityResults.map((result: SearchResult) => {
                    const currentIndex = flatIndex++;
                    const isActive = currentIndex === activeIndex;
                    const primaryField = getPrimaryField(result);
                    const subtitle = getSubtitle(result);

                    return (
                      <button
                        key={result.id}
                        data-index={currentIndex}
                        onClick={() => navigateToResult(result)}
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${meta.color} opacity-60`} />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            dangerouslySetInnerHTML={{
                              __html: primaryField,
                            }}
                          />
                          {subtitle && (
                            <p
                              className="text-xs text-muted-foreground truncate"
                              dangerouslySetInnerHTML={{
                                __html: subtitle,
                              }}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                          {result.score.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer with keyboard hints */}
          {results.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border bg-muted font-mono">Esc</kbd>
                Close
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the primary display text from highlights */
function getPrimaryField(result: SearchResult): string {
  // Prefer name/title highlights
  const nameFields = ["name", "doctorName"];
  for (const f of nameFields) {
    if (result.highlights[f]) return result.highlights[f];
  }
  // Fallback: first highlighted field
  const firstKey = result.matchedFields[0];
  if (firstKey && result.highlights[firstKey]) {
    return result.highlights[firstKey];
  }
  return result.id;
}

/** Get a subtitle from secondary matched fields */
function getSubtitle(result: SearchResult): string | null {
  const secondary: string[] = [];
  const skipFields = new Set(["name", "doctorName"]);

  for (const field of result.matchedFields) {
    if (skipFields.has(field)) continue;
    if (result.highlights[field]) {
      secondary.push(`${field}: ${result.highlights[field]}`);
    }
    if (secondary.length >= 2) break;
  }

  return secondary.length > 0 ? secondary.join(" · ") : null;
}

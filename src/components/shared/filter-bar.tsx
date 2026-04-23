"use client";

import { useMemo, useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: "select" | "date";
  options?: FilterOption[];      // for select
  placeholder?: string;
}

export type FilterState = Record<string, string>;

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  fields?: FilterField[];
  values?: FilterState;
  onChange?: (key: string, value: string) => void;
  rightSlot?: React.ReactNode;
  collapsible?: boolean;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  fields = [],
  values = {},
  onChange,
  rightSlot,
  collapsible = false,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  const activeCount = useMemo(
    () => Object.values(values).filter((v) => v && v !== "ALL").length,
    [values]
  );

  function setValue(key: string, v: string) {
    onChange?.(key, v);
  }

  function clearAll() {
    onSearchChange("");
    if (onChange) {
      fields.forEach((f) => {
        onChange(f.key, "");
      });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {collapsible && fields.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge className="ml-1 bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        )}
        {(searchValue || activeCount > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-slate-600">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
        {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
      </div>

      {expanded && fields.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {fields.map((f) => {
            const v = values[f.key] ?? "";
            if (f.type === "select") {
              return (
                <div key={f.key} className="min-w-[160px]">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {f.label}
                  </label>
                  <Select value={v || "ALL"} onValueChange={(val) => setValue(f.key, val === "ALL" ? "" : val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={f.placeholder ?? "All"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {f.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            return (
              <div key={f.key} className="min-w-[160px]">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {f.label}
                </label>
                <Input
                  type="date"
                  value={v}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ExpiryItem } from "@/lib/expiry/expiry-types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ExpiryCalendarProps {
  items: ExpiryItem[];
  months?: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExpiryCalendar({ items, months = 3 }: ExpiryCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Map: dateKey -> ExpiryItem[]
  const expiryMap = useMemo(() => {
    const map: Record<string, ExpiryItem[]> = {};
    for (const item of items) {
      const key = item.expiryDate;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  // Build month data
  const monthsData = useMemo(() => {
    const result: { year: number; month: number; days: (Date | null)[] }[] = [];
    const now = new Date();
    for (let m = 0; m < months; m++) {
      const target = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const year = target.getFullYear();
      const month = target.getMonth();
      const firstDow = target.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days: (Date | null)[] = [];
      // pad start
      for (let i = 0; i < firstDow; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
      result.push({ year, month, days });
    }
    return result;
  }, [months]);

  function getCellColor(count: number): string {
    if (count === 0) return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
    if (count <= 2) return "bg-yellow-200 dark:bg-yellow-800/40 text-yellow-900 dark:text-yellow-100";
    if (count <= 5) return "bg-orange-200 dark:bg-orange-800/40 text-orange-900 dark:text-orange-100";
    return "bg-red-300 dark:bg-red-800/50 text-red-900 dark:text-red-100";
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {monthsData.map(({ year, month, days }) => (
          <div key={`${year}-${month}`} className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 text-center">
              {MONTH_NAMES[month]} {year}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">
                  {d}
                </div>
              ))}
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }
                const key = dateKey(day);
                const expItems = expiryMap[key] ?? [];
                const count = expItems.length;
                const isToday = dateKey(new Date()) === key;

                return (
                  <Popover key={key} open={selectedDay === key} onOpenChange={(open) => setSelectedDay(open ? key : null)}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "h-8 w-full rounded text-xs font-medium transition-colors flex items-center justify-center",
                          getCellColor(count),
                          isToday && "ring-2 ring-primary ring-offset-1",
                          "hover:opacity-80"
                        )}
                        title={`${key}: ${count} item(s) expiring`}
                      >
                        {day.getDate()}
                      </button>
                    </PopoverTrigger>
                    {count > 0 && (
                      <PopoverContent className="w-72 p-3" side="top">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            {count} item{count !== 1 ? "s" : ""} expiring on {key}
                          </p>
                          <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {expItems.map((item) => (
                              <li key={item.id} className="text-xs text-muted-foreground flex justify-between">
                                <span className="truncate mr-2">{item.productName}</span>
                                <span className="text-foreground font-medium whitespace-nowrap">
                                  {item.batchNumber}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
          <span>0 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-yellow-200 dark:bg-yellow-800/40 border border-yellow-400" />
          <span>1-2 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-200 dark:bg-orange-800/40 border border-orange-400" />
          <span>3-5 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-300 dark:bg-red-800/50 border border-red-400" />
          <span>6+ items</span>
        </div>
      </div>
    </div>
  );
}

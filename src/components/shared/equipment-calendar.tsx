"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/operations/equipment-types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EquipmentCalendarProps {
  events: CalendarEvent[];
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

const EVENT_COLORS: Record<string, { dot: string; text: string }> = {
  "calibration-due":      { dot: "bg-blue-500",   text: "text-blue-700 dark:text-blue-300" },
  "calibration-overdue":  { dot: "bg-red-500",    text: "text-red-700 dark:text-red-300" },
  "pm-scheduled":         { dot: "bg-green-500",  text: "text-green-700 dark:text-green-300" },
  "corrective-maintenance": { dot: "bg-orange-500", text: "text-orange-700 dark:text-orange-300" },
};

export default function EquipmentCalendar({ events, months = 3 }: EquipmentCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Map: dateKey -> CalendarEvent[]
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Build month grids
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
      for (let i = 0; i < firstDow; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
      result.push({ year, month, days });
    }
    return result;
  }, [months]);

  function getCellStyle(dayEvents: CalendarEvent[]): string {
    if (dayEvents.length === 0)
      return "bg-muted/40 text-muted-foreground";
    // Priority: overdue > corrective > calibration > PM
    if (dayEvents.some((e) => e.eventType === "calibration-overdue"))
      return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 font-semibold";
    if (dayEvents.some((e) => e.eventType === "corrective-maintenance"))
      return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200";
    if (dayEvents.some((e) => e.eventType === "calibration-due"))
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200";
    return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200";
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
                const dayEvents = eventMap[key] ?? [];
                const count = dayEvents.length;
                const isToday = dateKey(new Date()) === key;

                return (
                  <Popover
                    key={key}
                    open={selectedDay === key}
                    onOpenChange={(open) => setSelectedDay(open ? key : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "h-8 w-full rounded text-xs font-medium transition-colors flex items-center justify-center relative",
                          getCellStyle(dayEvents),
                          isToday && "ring-2 ring-primary ring-offset-1",
                          "hover:opacity-80"
                        )}
                        title={`${key}: ${count} event(s)`}
                      >
                        {day.getDate()}
                        {count > 0 && (
                          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </button>
                    </PopoverTrigger>
                    {count > 0 && (
                      <PopoverContent className="w-80 p-3" side="top">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            {count} event{count !== 1 ? "s" : ""} on {key}
                          </p>
                          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                            {dayEvents.map((ev) => {
                              const colors = EVENT_COLORS[ev.eventType] ?? { dot: "bg-gray-400", text: "text-gray-600" };
                              return (
                                <li key={ev.id} className="flex items-start gap-2 text-xs">
                                  <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", colors.dot)} />
                                  <div className="min-w-0">
                                    <p className={cn("font-medium truncate", colors.text)}>
                                      {ev.equipmentName}
                                    </p>
                                    <p className="text-muted-foreground truncate">
                                      {ev.description}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
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
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Calibration Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>PM Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-500" />
          <span>Corrective Maintenance</span>
        </div>
      </div>
    </div>
  );
}

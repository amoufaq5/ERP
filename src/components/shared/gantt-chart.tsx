"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Diamond } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  name: string;
  assignee: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";
  progress: number;  // 0–100
  dependsOn?: string[]; // IDs of tasks this depends on
  isMilestone?: boolean;
  project: string;
}

export interface GanttProject {
  id: string;
  name: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  projects: GanttProject[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return addDays(d, -day); // Sunday start
}

// Status colors
const STATUS_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  "Not Started": { bg: "bg-gray-200 dark:bg-gray-700", bar: "bg-gray-400 dark:bg-gray-500", text: "text-gray-700 dark:text-gray-300" },
  "In Progress": { bg: "bg-blue-100 dark:bg-blue-900/30", bar: "bg-blue-500 dark:bg-blue-400", text: "text-blue-700 dark:text-blue-300" },
  "Completed": { bg: "bg-green-100 dark:bg-green-900/30", bar: "bg-green-500 dark:bg-green-400", text: "text-green-700 dark:text-green-300" },
  "Delayed": { bg: "bg-red-100 dark:bg-red-900/30", bar: "bg-red-500 dark:bg-red-400", text: "text-red-700 dark:text-red-300" },
};

const STATUS_BADGE: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "In Progress": "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "Completed": "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  "Delayed": "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function GanttChart({ tasks, projects }: GanttChartProps) {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const chartRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Filter tasks by selected project
  const filteredTasks = useMemo(() => {
    if (selectedProject === "all") return tasks;
    return tasks.filter((t) => t.project === selectedProject);
  }, [tasks, selectedProject]);

  // Calculate timeline range
  const { timelineStart, timelineEnd, totalDays, weeks } = useMemo(() => {
    if (filteredTasks.length === 0) {
      const today = new Date();
      const start = startOfWeek(addDays(today, -7));
      const end = addDays(start, 84);
      return { timelineStart: start, timelineEnd: end, totalDays: 84, weeks: [] as { start: Date; label: string }[] };
    }

    let earliest = parseDate(filteredTasks[0].startDate);
    let latest = parseDate(filteredTasks[0].endDate);

    for (const t of filteredTasks) {
      const s = parseDate(t.startDate);
      const e = parseDate(t.endDate);
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    }

    // Add padding: 1 week before, 2 weeks after
    const start = startOfWeek(addDays(earliest, -7));
    const end = addDays(latest, 14);
    const days = daysBetween(start, end);

    // Generate week markers
    const wks: { start: Date; label: string }[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      wks.push({ start: new Date(cursor), label: formatDate(cursor) });
      cursor = addDays(cursor, 7);
    }

    return { timelineStart: start, timelineEnd: end, totalDays: days, weeks: wks };
  }, [filteredTasks]);

  // Today marker position
  const today = new Date();
  const todayOffset = daysBetween(timelineStart, today);
  const todayPct = (todayOffset / totalDays) * 100;
  const showTodayMarker = todayPct >= 0 && todayPct <= 100;

  // Sync horizontal scroll between header and body
  useEffect(() => {
    const body = bodyRef.current;
    const header = headerRef.current;
    if (!body || !header) return;
    const onScroll = () => {
      header.scrollLeft = body.scrollLeft;
    };
    body.addEventListener("scroll", onScroll);
    return () => body.removeEventListener("scroll", onScroll);
  }, []);

  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 420;
  const DAY_WIDTH = 28;
  const chartWidth = totalDays * DAY_WIDTH;

  // Build a map from task id to row index for dependency arrows
  const taskRowMap = useMemo(() => {
    const m = new Map<string, number>();
    filteredTasks.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [filteredTasks]);

  return (
    <div className="space-y-4">
      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Project:</label>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-4 ml-auto text-xs">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-400" />Not Started</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />In Progress</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" />Completed</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500" />Delayed</span>
          <span className="flex items-center gap-1.5"><Diamond className="h-3 w-3 text-amber-500 fill-amber-500" />Milestone</span>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No tasks found for the selected project.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden" ref={chartRef}>
          {/* ── Header row: task list labels + timeline weeks ── */}
          <div className="flex border-b border-border bg-muted/50">
            {/* Fixed label header */}
            <div
              className="shrink-0 grid grid-cols-[1fr_90px_80px_80px_50px_80px_50px] gap-1 items-center px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border"
              style={{ width: LABEL_WIDTH }}
            >
              <span>Task</span>
              <span>Assignee</span>
              <span>Start</span>
              <span>End</span>
              <span>Days</span>
              <span>Status</span>
              <span>%</span>
            </div>
            {/* Scrollable timeline header */}
            <div
              ref={headerRef}
              className="flex-1 overflow-hidden relative"
            >
              <div className="relative" style={{ width: chartWidth, height: 36 }}>
                {/* Week columns */}
                {weeks.map((w, i) => {
                  const offset = daysBetween(timelineStart, w.start);
                  const left = offset * DAY_WIDTH;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 flex flex-col items-start border-l border-border/50"
                      style={{ left, height: "100%" }}
                    >
                      <span className="text-[10px] text-muted-foreground px-1 py-1 whitespace-nowrap">
                        {w.label}
                      </span>
                    </div>
                  );
                })}
                {/* Today marker in header */}
                {showTodayMarker && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-10"
                    style={{ left: todayOffset * DAY_WIDTH, height: "100%" }}
                  >
                    <span className="absolute -top-0 -left-3 text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1 rounded">
                      Today
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Body: task rows + Gantt bars ── */}
          <div className="flex" style={{ maxHeight: 520, overflow: "hidden" }}>
            {/* Fixed task labels */}
            <div
              className="shrink-0 overflow-y-auto border-r border-border"
              style={{ width: LABEL_WIDTH, maxHeight: 520 }}
              onScroll={(e) => {
                // Sync vertical scroll
                if (bodyRef.current) {
                  bodyRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
                }
              }}
            >
              {filteredTasks.map((task, idx) => {
                const start = parseDate(task.startDate);
                const end = parseDate(task.endDate);
                const duration = daysBetween(start, end) + 1;
                const colors = STATUS_BADGE[task.status] || STATUS_BADGE["Not Started"];
                return (
                  <div
                    key={task.id}
                    className={`grid grid-cols-[1fr_90px_80px_80px_50px_80px_50px] gap-1 items-center px-3 text-xs border-b border-border/50 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="font-medium truncate flex items-center gap-1">
                      {task.isMilestone && <Diamond className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      {task.name}
                    </span>
                    <span className="text-muted-foreground truncate">{task.assignee}</span>
                    <span className="text-muted-foreground">{formatDateShort(start)}</span>
                    <span className="text-muted-foreground">{formatDateShort(end)}</span>
                    <span className="text-muted-foreground">{duration}d</span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colors}`}>
                      {task.status}
                    </span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable Gantt chart area */}
            <div
              ref={bodyRef}
              className="flex-1 overflow-auto relative"
              style={{ maxHeight: 520 }}
            >
              <div className="relative" style={{ width: chartWidth, height: filteredTasks.length * ROW_HEIGHT }}>
                {/* Week grid lines */}
                {weeks.map((w, i) => {
                  const offset = daysBetween(timelineStart, w.start);
                  const left = offset * DAY_WIDTH;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 border-l border-border/30"
                      style={{ left, height: "100%" }}
                    />
                  );
                })}

                {/* Row zebra stripes */}
                {filteredTasks.map((_, idx) => (
                  <div
                    key={idx}
                    className={`absolute w-full border-b border-border/30 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                    style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                ))}

                {/* Today marker */}
                {showTodayMarker && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500/70 z-20 pointer-events-none"
                    style={{ left: todayOffset * DAY_WIDTH, height: "100%" }}
                  />
                )}

                {/* Dependency arrows (SVG overlay) */}
                <svg
                  className="absolute inset-0 z-10 pointer-events-none"
                  width={chartWidth}
                  height={filteredTasks.length * ROW_HEIGHT}
                >
                  {filteredTasks.map((task) => {
                    if (!task.dependsOn || task.dependsOn.length === 0) return null;
                    return task.dependsOn.map((depId) => {
                      const fromIdx = taskRowMap.get(depId);
                      const toIdx = taskRowMap.get(task.id);
                      if (fromIdx === undefined || toIdx === undefined) return null;

                      const fromTask = filteredTasks[fromIdx];
                      const fromEnd = parseDate(fromTask.endDate);
                      const fromEndOffset = daysBetween(timelineStart, fromEnd);
                      const fromX = (fromEndOffset + 1) * DAY_WIDTH;
                      const fromY = fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                      const toStart = parseDate(task.startDate);
                      const toStartOffset = daysBetween(timelineStart, toStart);
                      const toX = toStartOffset * DAY_WIDTH;
                      const toY = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                      // Draw a path: right from end of source, then down/up, then right to start of target
                      const midX = (fromX + toX) / 2;

                      return (
                        <g key={`${depId}-${task.id}`}>
                          <path
                            d={`M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`}
                            fill="none"
                            stroke="currentColor"
                            className="text-muted-foreground/50"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                          />
                          {/* Arrow head */}
                          <polygon
                            points={`${toX},${toY} ${toX - 6},${toY - 4} ${toX - 6},${toY + 4}`}
                            className="fill-muted-foreground/50"
                          />
                        </g>
                      );
                    });
                  })}
                </svg>

                {/* Task bars */}
                {filteredTasks.map((task, idx) => {
                  const start = parseDate(task.startDate);
                  const end = parseDate(task.endDate);
                  const startOffset = daysBetween(timelineStart, start);
                  const duration = daysBetween(start, end) + 1;
                  const left = startOffset * DAY_WIDTH;
                  const width = duration * DAY_WIDTH;
                  const top = idx * ROW_HEIGHT + 8;
                  const barHeight = ROW_HEIGHT - 16;
                  const colors = STATUS_COLORS[task.status] || STATUS_COLORS["Not Started"];

                  if (task.isMilestone) {
                    // Render milestone as a diamond
                    const cx = left + width / 2;
                    const cy = idx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    return (
                      <div
                        key={task.id}
                        className="absolute z-30 flex items-center justify-center"
                        style={{
                          left: cx - 10,
                          top: cy - 10,
                          width: 20,
                          height: 20,
                        }}
                        title={`${task.name} — ${formatDateShort(start)}`}
                      >
                        <Diamond className="h-5 w-5 text-amber-500 fill-amber-500 drop-shadow" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={task.id}
                      className={`absolute rounded-md z-20 overflow-hidden ${colors.bg}`}
                      style={{ left, top, width: Math.max(width, 20), height: barHeight }}
                      title={`${task.name}: ${task.progress}% — ${formatDateShort(start)} to ${formatDateShort(end)}`}
                    >
                      {/* Progress fill */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-md transition-all ${colors.bar}`}
                        style={{ width: `${task.progress}%`, opacity: 0.85 }}
                      />
                      {/* Label inside bar */}
                      {width > 60 && (
                        <div className="relative z-10 flex items-center justify-center h-full px-2">
                          <span className="text-[10px] font-bold text-white drop-shadow-sm truncate">
                            {task.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

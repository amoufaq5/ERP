"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, Clock, CheckCircle, Star, Plus, ClipboardCheck } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Interview {
  id: number;
  candidate: string;
  job: string;
  type: string;
  interviewer: string;
  interviewerRole: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  rating: number | null;
}

interface Scorecard {
  interviewId: number;
  competencies: { name: string; rating: number; notes: string }[];
  overallRecommendation: "STRONG_YES" | "YES" | "MAYBE" | "NO" | "STRONG_NO";
  strengths: string;
  concerns: string;
  submittedAt: string;
}

const DEFAULT_COMPETENCIES = [
  "Technical Knowledge",
  "Communication",
  "Problem Solving",
  "Industry Experience",
  "Cultural Fit",
  "Leadership Potential",
];

const RECOMMENDATION_OPTIONS: { label: string; value: Scorecard["overallRecommendation"] }[] = [
  { label: "Strong Yes", value: "STRONG_YES" },
  { label: "Yes", value: "YES" },
  { label: "Maybe", value: "MAYBE" },
  { label: "No", value: "NO" },
  { label: "Strong No", value: "STRONG_NO" },
];

const RECOMMENDATION_COLORS: Record<string, string> = {
  STRONG_YES: "text-green-700 dark:text-green-400",
  YES: "text-green-600 dark:text-green-500",
  MAYBE: "text-yellow-600 dark:text-yellow-400",
  NO: "text-red-600 dark:text-red-400",
  STRONG_NO: "text-red-700 dark:text-red-500",
};

const INITIAL_INTERVIEWS: Interview[] = [
  { id: 1, candidate: "Dr. Amira Hassan", job: "District Sales Manager", type: "PANEL", interviewer: "Dr. Samir Farid", interviewerRole: "National Sales Director", date: "2026-04-14", time: "10:00", duration: 60, status: "SCHEDULED", rating: null },
  { id: 2, candidate: "Mohamed El-Sayed", job: "Medical Representative", type: "FIELD_ASSESSMENT", interviewer: "Ahmed Mostafa (DM)", interviewerRole: "District Manager - Cairo North", date: "2026-04-14", time: "09:00", duration: 90, status: "SCHEDULED", rating: null },
  { id: 3, candidate: "Dr. Fatima Khaled", job: "Quality Control Analyst", type: "TECHNICAL", interviewer: "Dr. Hala Nasser", interviewerRole: "QC Lab Manager", date: "2026-04-15", time: "10:00", duration: 60, status: "SCHEDULED", rating: null },
  { id: 4, candidate: "Ahmed Mansour", job: "Regulatory Affairs Specialist", type: "TECHNICAL", interviewer: "Dr. Laila Abdel-Rahman", interviewerRole: "Head of Regulatory", date: "2026-04-15", time: "14:00", duration: 45, status: "SCHEDULED", rating: null },
  { id: 5, candidate: "Sara Ibrahim", job: "Medical Representative", type: "PHONE_SCREEN", interviewer: "Karim Sayed (HR)", interviewerRole: "HR Business Partner", date: "2026-04-16", time: "11:00", duration: 30, status: "SCHEDULED", rating: null },
  { id: 6, candidate: "Dr. Khaled Nabil", job: "R&D Formulation Scientist", type: "TECHNICAL", interviewer: "Dr. Youssef Hamdy", interviewerRole: "R&D Director", date: "2026-04-11", time: "10:00", duration: 90, status: "COMPLETED", rating: 5 },
  { id: 7, candidate: "Noura Youssef", job: "Production Pharmacist", type: "PLANT_VISIT", interviewer: "Eng. Mostafa Ali", interviewerRole: "Plant Manager", date: "2026-04-10", time: "09:00", duration: 120, status: "COMPLETED", rating: 4 },
  { id: 8, candidate: "Dr. Tarek Abdel-Fattah", job: "Pharmacovigilance Officer", type: "CASE_STUDY", interviewer: "Dr. Rania El-Sherif", interviewerRole: "Medical Director", date: "2026-04-09", time: "14:00", duration: 60, status: "COMPLETED", rating: 5 },
  { id: 9, candidate: "Omar Farouk", job: "Quality Control Analyst", type: "PRACTICAL_LAB", interviewer: "Dr. Hala Nasser", interviewerRole: "QC Lab Manager", date: "2026-04-08", time: "10:00", duration: 120, status: "COMPLETED", rating: 4 },
  { id: 10, candidate: "Dina Samy", job: "Clinical Research Associate", type: "BEHAVIORAL", interviewer: "Dr. Rania El-Sherif", interviewerRole: "Medical Director", date: "2026-04-16", time: "15:00", duration: 45, status: "SCHEDULED", rating: null },
];

const TYPE_COLORS: Record<string, string> = {
  TECHNICAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PHONE_SCREEN: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PANEL: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  BEHAVIORAL: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  FIELD_ASSESSMENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PRACTICAL_LAB: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  CASE_STUDY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  PLANT_VISIT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NO_SHOW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`} />
      ))}
    </div>
  );
}

// INTERVIEW_FIELDS is now computed inside the component to use store data

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Scheduled", value: "SCHEDULED" }, { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" }, { label: "No Show", value: "NO_SHOW" },
  ]},
  { key: "type", label: "Type", type: "select" as const, options: [
    { label: "Technical", value: "TECHNICAL" }, { label: "Phone Screen", value: "PHONE_SCREEN" },
    { label: "Panel", value: "PANEL" }, { label: "Behavioral", value: "BEHAVIORAL" },
    { label: "Field Assessment", value: "FIELD_ASSESSMENT" }, { label: "Lab Test", value: "PRACTICAL_LAB" },
  ]},
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_DATES = ["2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"];

function ScorecardStarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star className={`h-5 w-5 transition-colors ${s <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"}`} />
        </button>
      ))}
    </div>
  );
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
    }
  } catch (error) { console.error("Failed to load from localStorage:", error); }
  return fallback;
}

export default function InterviewsPage() {
  const store = useApiDataStore();
  const [interviews, setInterviews] = useState<Interview[]>(() => loadFromStorage<Interview[]>("ats-interviews", INITIAL_INTERVIEWS));
  const [scorecards, setScorecards] = useState<Scorecard[]>(() => loadFromStorage<Scorecard[]>("ats-scorecards", []));
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "" });
  const [view, setView] = useState<"table" | "calendar">("table");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [detailInterview, setDetailInterview] = useState<Interview | null>(null);
  const [scorecardInterview, setScorecardInterview] = useState<Interview | null>(null);
  const [scorecardViewInterview, setScorecardViewInterview] = useState<Interview | null>(null);
  const [scorecardForm, setScorecardForm] = useState<{
    competencies: { name: string; rating: number; notes: string }[];
    overallRecommendation: Scorecard["overallRecommendation"];
    strengths: string;
    concerns: string;
  }>({
    competencies: DEFAULT_COMPETENCIES.map((name) => ({ name, rating: 0, notes: "" })),
    overallRecommendation: "MAYBE",
    strengths: "",
    concerns: "",
  });

  useEffect(() => {
    localStorage.setItem("ats-interviews", JSON.stringify(interviews));
  }, [interviews]);

  useEffect(() => {
    localStorage.setItem("ats-scorecards", JSON.stringify(scorecards));
  }, [scorecards]);

  const interviewFields: EntityField[] = useMemo(() => [
    { name: "candidate", label: "Candidate", type: "select" as const, required: true, options: store.candidates.map(c => ({ label: c.name, value: c.name })) },
    { name: "job", label: "Position", type: "select" as const, required: true, options: store.jobs.filter(j => j.status === "OPEN").map(j => ({ label: j.title, value: j.title })) },
    { name: "type", label: "Interview Type", type: "select" as const, defaultValue: "TECHNICAL", options: [
      { label: "Phone Screen", value: "PHONE_SCREEN" }, { label: "Technical", value: "TECHNICAL" },
      { label: "Behavioral", value: "BEHAVIORAL" }, { label: "Panel", value: "PANEL" },
      { label: "Field Assessment", value: "FIELD_ASSESSMENT" }, { label: "Practical Lab Test", value: "PRACTICAL_LAB" },
      { label: "Case Study / PV", value: "CASE_STUDY" }, { label: "Plant Visit", value: "PLANT_VISIT" },
    ]},
    { name: "interviewer", label: "Interviewer", type: "text" as const, placeholder: "Interviewer name" },
    { name: "interviewerRole", label: "Interviewer Role", type: "text" as const, placeholder: "e.g. QC Lab Manager", fullWidth: true },
    { name: "date", label: "Date", type: "text" as const, placeholder: "YYYY-MM-DD" },
    { name: "time", label: "Time", type: "text" as const, placeholder: "HH:MM" },
    { name: "duration", label: "Duration (min)", type: "select" as const, defaultValue: "60", options: [
      { label: "30 minutes", value: "30" }, { label: "45 minutes", value: "45" },
      { label: "60 minutes", value: "60" }, { label: "90 minutes", value: "90" },
      { label: "120 minutes (Lab/Plant)", value: "120" },
    ]},
  ], [store.candidates, store.jobs]);

  const filtered = interviews.filter((i) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || i.candidate.toLowerCase().includes(q) || i.job.toLowerCase().includes(q) || i.interviewer.toLowerCase().includes(q);
    const matchesStatus = !filters.status || i.status === filters.status;
    const matchesType = !filters.type || i.type === filters.type;
    return matchesSearch && matchesStatus && matchesType;
  });

  const scheduledToday = interviews.filter((i) => i.date === "2026-04-14" && i.status === "SCHEDULED").length;
  const scheduledWeek = interviews.filter((i) => i.status === "SCHEDULED").length;
  const completed = interviews.filter((i) => i.status === "COMPLETED").length;
  const avgRating = (() => {
    const rated = interviews.filter((i) => i.rating !== null);
    if (!rated.length) return "—";
    return (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1);
  })();

  const statusFlow: Record<string, string> = { SCHEDULED: "COMPLETED" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pharmaceutical Interviews" description="Schedule and manage interviews for pharma positions — field assessments, lab practicals, panel reviews">
        <div className="flex items-center gap-2">
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}>Week View</Button>
          <Button onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Scheduled Today" value={scheduledToday} icon={Calendar} />
        <StatsCard title="This Week" value={scheduledWeek} icon={Clock} />
        <StatsCard title="Completed" value={completed} icon={CheckCircle} change={12.5} changeLabel="vs last week" />
        <StatsCard title="Avg Rating" value={avgRating} icon={Star} />
        <StatsCard title="Scorecards Filled" value={scorecards.length} icon={ClipboardCheck} />
      </div>

      {view === "calendar" ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Week of Apr 13 – Apr 17, 2026</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
            {DAYS.map((day, idx) => {
              const date = WEEK_DATES[idx];
              const dayInterviews = interviews.filter((i) => i.date === date);
              return (
                <div key={day} className="min-h-[200px] p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{day}</div>
                  <div className="text-xs text-muted-foreground mb-3">{date.slice(5)}</div>
                  <div className="space-y-2">
                    {dayInterviews.map((i) => (
                      <div key={i.id} className={`rounded p-2 text-xs ${TYPE_COLORS[i.type] ?? "bg-muted"}`}>
                        <div className="font-medium truncate">{i.candidate}</div>
                        <div className="opacity-80 truncate">{i.job}</div>
                        <div className="opacity-80 truncate">{i.time} · {i.duration}m · {i.type.replace(/_/g, " ")}</div>
                      </div>
                    ))}
                    {dayInterviews.length === 0 && (
                      <div className="text-xs text-muted-foreground/50 italic">No interviews</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable
            columns={[
              {
                key: "candidate",
                label: "Candidate",
                render: (v: unknown) => <span className="font-medium text-foreground">{v as string}</span>,
              },
              { key: "job", label: "Position" },
              {
                key: "type",
                label: "Type",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[iv.type] ?? ""}`}>
                      {iv.type.replace(/_/g, " ")}
                    </span>
                  );
                },
              },
              {
                key: "interviewer",
                label: "Interviewer",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return (
                    <div>
                      <div className="text-foreground">{iv.interviewer}</div>
                      <div className="text-xs text-muted-foreground">{iv.interviewerRole}</div>
                    </div>
                  );
                },
              },
              {
                key: "date",
                label: "Date / Time",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return <span className="text-muted-foreground">{iv.date} {iv.time}</span>;
                },
              },
              {
                key: "duration",
                label: "Duration",
                render: (v: unknown) => <span className="text-muted-foreground">{v as number} min</span>,
              },
              {
                key: "status",
                label: "Status",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[iv.status] ?? ""}`}>
                      {iv.status}
                    </span>
                  );
                },
              },
              {
                key: "rating",
                label: "Rating",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return <StarRating rating={iv.rating} />;
                },
              },
              {
                key: "actions",
                label: "",
                render: (_v: unknown, row: unknown) => {
                  const iv = row as Interview;
                  return (
                    <EditDeleteMenu
                      onEdit={() => { setEditing(iv); setShowModal(true); }}
                      onDelete={() => setInterviews((prev) => prev.filter((x) => x.id !== iv.id))}
                      onView={() => setDetailInterview(iv)}
                      canView
                      itemLabel={`${iv.candidate} interview`}
                      extraItems={[
                        ...(statusFlow[iv.status] ? [{ label: `Mark ${statusFlow[iv.status]}`, onClick: () => setInterviews((prev) => prev.map((x) => x.id === iv.id ? { ...x, status: statusFlow[iv.status] } : x)) }] : []),
                        ...(iv.status === "SCHEDULED" ? [{ label: "Cancel", onClick: () => setInterviews((prev) => prev.map((x) => x.id === iv.id ? { ...x, status: "CANCELLED" } : x)) }] : []),
                        ...(iv.status === "COMPLETED" && !scorecards.find((sc) => sc.interviewId === iv.id) ? [{
                          label: "Fill Scorecard",
                          onClick: () => {
                            setScorecardForm({
                              competencies: DEFAULT_COMPETENCIES.map((name) => ({ name, rating: 0, notes: "" })),
                              overallRecommendation: "MAYBE",
                              strengths: "",
                              concerns: "",
                            });
                            setScorecardInterview(iv);
                          },
                        }] : []),
                        ...(iv.status === "COMPLETED" && scorecards.find((sc) => sc.interviewId === iv.id) ? [{
                          label: "View Scorecard",
                          onClick: () => setScorecardViewInterview(iv),
                        }] : []),
                      ]}
                    />
                  );
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={filtered as unknown as Record<string, unknown>[]}
            emptyMessage="No interviews found."
            exportable
            exportFilename="interviews.csv"
          />
        </div>
      )}

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditing(null); }}
        title={editing ? "Edit Interview" : "Schedule Pharma Interview"}
        fields={interviewFields}
        initialData={editing ? { candidate: editing.candidate, job: editing.job, type: editing.type, interviewer: editing.interviewer, interviewerRole: editing.interviewerRole, date: editing.date, time: editing.time, duration: String(editing.duration) } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setInterviews((prev) => prev.map((i) => i.id === editing.id ? {
              ...i,
              candidate: data.candidate as string,
              job: (data.job as string) || i.job,
              type: (data.type as string) || i.type,
              interviewer: (data.interviewer as string) || i.interviewer,
              interviewerRole: (data.interviewerRole as string) || i.interviewerRole,
              date: (data.date as string) || i.date,
              time: (data.time as string) || i.time,
              duration: parseInt(data.duration as string) || i.duration,
            } : i));
          } else {
            setInterviews((prev) => [...prev, {
              id: Date.now(),
              candidate: data.candidate as string,
              job: (data.job as string) || "",
              type: (data.type as string) || "TECHNICAL",
              interviewer: (data.interviewer as string) || "",
              interviewerRole: (data.interviewerRole as string) || "",
              date: (data.date as string) || "",
              time: (data.time as string) || "",
              duration: parseInt(data.duration as string) || 60,
              status: "SCHEDULED",
              rating: null,
            }]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Interview Detail Dialog ── */}
      <Dialog open={!!detailInterview} onOpenChange={(open) => { if (!open) setDetailInterview(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailInterview?.candidate} &mdash; Interview</DialogTitle>
          </DialogHeader>
          {detailInterview && (
            <div className="space-y-5">
              {/* Prominent date/time banner */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center gap-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{detailInterview.date} at {detailInterview.time}</p>
                  <p className="text-sm text-muted-foreground">{detailInterview.duration} minutes &middot; {detailInterview.type.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Candidate</span><p className="font-medium">{detailInterview.candidate}</p></div>
                <div><span className="text-sm text-muted-foreground">Position</span><p className="font-medium">{detailInterview.job}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground">Interview Type</span>
                  <p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[detailInterview.type] ?? ""}`}>{detailInterview.type.replace(/_/g, " ")}</span></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[detailInterview.status] ?? ""}`}>{detailInterview.status}</span></p>
                </div>
                <div><span className="text-sm text-muted-foreground">Interviewer</span><p className="font-medium">{detailInterview.interviewer}</p></div>
                <div><span className="text-sm text-muted-foreground">Interviewer Role</span><p className="font-medium">{detailInterview.interviewerRole}</p></div>
                <div><span className="text-sm text-muted-foreground">Duration</span><p className="font-medium">{detailInterview.duration} minutes</p></div>
              </div>
              {/* Rating */}
              <div>
                <span className="text-sm text-muted-foreground">Rating</span>
                <div className="mt-1">
                  <StarRating rating={detailInterview.rating} />
                </div>
              </div>
              {/* Cross-reference: Candidate status from ATS store */}
              {(() => {
                const storeCandidate = store.candidates.find(c => c.name === detailInterview.candidate);
                if (!storeCandidate) return null;
                return (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ATS Candidate Record</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-foreground font-medium">{storeCandidate.name}</span>
                      <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                        {storeCandidate.status}
                      </span>
                      <span className="text-muted-foreground">Applied for: {storeCandidate.appliedFor}</span>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const sc = scorecards.find((s) => s.interviewId === detailInterview.id);
                if (!sc) return null;
                return (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interview Scorecard</span>
                      <span className={`text-sm font-semibold ${RECOMMENDATION_COLORS[sc.overallRecommendation] ?? ""}`}>
                        {sc.overallRecommendation.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sc.competencies.map((comp) => (
                        <div key={comp.name} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{comp.name}</span>
                          <StarRating rating={comp.rating} />
                        </div>
                      ))}
                    </div>
                    {sc.strengths && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Strengths</span>
                        <p className="text-sm text-foreground mt-0.5">{sc.strengths}</p>
                      </div>
                    )}
                    {sc.concerns && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Concerns</span>
                        <p className="text-sm text-foreground mt-0.5">{sc.concerns}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">Submitted: {new Date(sc.submittedAt).toLocaleString()}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!scorecardInterview} onOpenChange={(open) => { if (!open) setScorecardInterview(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interview Scorecard &mdash; {scorecardInterview?.candidate}</DialogTitle>
          </DialogHeader>
          {scorecardInterview && (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm">
                <span className="font-medium">{scorecardInterview.candidate}</span>
                <span className="text-muted-foreground"> for </span>
                <span className="font-medium">{scorecardInterview.job}</span>
                <span className="text-muted-foreground"> on {scorecardInterview.date}</span>
              </div>
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Competency Ratings</Label>
                {scorecardForm.competencies.map((comp, idx) => (
                  <div key={comp.name} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{comp.name}</span>
                      <ScorecardStarInput
                        value={comp.rating}
                        onChange={(rating) => {
                          setScorecardForm((prev) => {
                            const updated = [...prev.competencies];
                            updated[idx] = { ...updated[idx], rating };
                            return { ...prev, competencies: updated };
                          });
                        }}
                      />
                    </div>
                    <Textarea
                      placeholder={`Notes for ${comp.name}...`}
                      className="min-h-[48px] text-sm"
                      value={comp.notes}
                      onChange={(e) => {
                        setScorecardForm((prev) => {
                          const updated = [...prev.competencies];
                          updated[idx] = { ...updated[idx], notes: e.target.value };
                          return { ...prev, competencies: updated };
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Overall Recommendation</Label>
                <Select
                  value={scorecardForm.overallRecommendation}
                  onValueChange={(v) => setScorecardForm((prev) => ({ ...prev, overallRecommendation: v as Scorecard["overallRecommendation"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMMENDATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Strengths</Label>
                <Textarea
                  placeholder="Key strengths observed..."
                  value={scorecardForm.strengths}
                  onChange={(e) => setScorecardForm((prev) => ({ ...prev, strengths: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Concerns</Label>
                <Textarea
                  placeholder="Areas of concern..."
                  value={scorecardForm.concerns}
                  onChange={(e) => setScorecardForm((prev) => ({ ...prev, concerns: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setScorecardInterview(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const newScorecard: Scorecard = {
                      interviewId: scorecardInterview.id,
                      competencies: scorecardForm.competencies,
                      overallRecommendation: scorecardForm.overallRecommendation,
                      strengths: scorecardForm.strengths,
                      concerns: scorecardForm.concerns,
                      submittedAt: new Date().toISOString(),
                    };
                    setScorecards((prev) => [...prev.filter((sc) => sc.interviewId !== scorecardInterview.id), newScorecard]);
                    setScorecardInterview(null);
                  }}
                  disabled={scorecardForm.competencies.some((c) => c.rating === 0)}
                >
                  Submit Scorecard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!scorecardViewInterview} onOpenChange={(open) => { if (!open) setScorecardViewInterview(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scorecard &mdash; {scorecardViewInterview?.candidate}</DialogTitle>
          </DialogHeader>
          {scorecardViewInterview && (() => {
            const sc = scorecards.find((s) => s.interviewId === scorecardViewInterview.id);
            if (!sc) return null;
            return (
              <div className="space-y-5">
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm">
                  <span className="font-medium">{scorecardViewInterview.candidate}</span>
                  <span className="text-muted-foreground"> for </span>
                  <span className="font-medium">{scorecardViewInterview.job}</span>
                  <span className="text-muted-foreground"> on {scorecardViewInterview.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overall Recommendation</span>
                  <span className={`text-lg font-bold ${RECOMMENDATION_COLORS[sc.overallRecommendation] ?? ""}`}>
                    {sc.overallRecommendation.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="space-y-3">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Competency Ratings</span>
                  {sc.competencies.map((comp) => (
                    <div key={comp.name} className="rounded-lg border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{comp.name}</span>
                        <StarRating rating={comp.rating} />
                      </div>
                      {comp.notes && <p className="text-sm text-muted-foreground">{comp.notes}</p>}
                    </div>
                  ))}
                </div>
                {sc.strengths && (
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Strengths</span>
                    <p className="text-sm text-foreground mt-1">{sc.strengths}</p>
                  </div>
                )}
                {sc.concerns && (
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Concerns</span>
                    <p className="text-sm text-foreground mt-1">{sc.concerns}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">Submitted: {new Date(sc.submittedAt).toLocaleString()}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

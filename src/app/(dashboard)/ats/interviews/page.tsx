"use client";

import { useState } from "react";
import { Calendar, Clock, CheckCircle, Star, Plus } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

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

const INTERVIEW_FIELDS: EntityField[] = [
  { name: "candidate", label: "Candidate", type: "text", placeholder: "Dr. Ahmed Mohamed", required: true },
  { name: "job", label: "Position", type: "select", required: true, options: [
    { label: "Medical Representative", value: "Medical Representative" },
    { label: "District Sales Manager", value: "District Sales Manager" },
    { label: "Quality Control Analyst", value: "Quality Control Analyst" },
    { label: "Production Pharmacist", value: "Production Pharmacist" },
    { label: "R&D Formulation Scientist", value: "R&D Formulation Scientist" },
    { label: "Regulatory Affairs Specialist", value: "Regulatory Affairs Specialist" },
    { label: "Pharmacovigilance Officer", value: "Pharmacovigilance Officer" },
    { label: "Clinical Research Associate", value: "Clinical Research Associate" },
  ]},
  { name: "type", label: "Interview Type", type: "select", defaultValue: "TECHNICAL", options: [
    { label: "Phone Screen", value: "PHONE_SCREEN" }, { label: "Technical", value: "TECHNICAL" },
    { label: "Behavioral", value: "BEHAVIORAL" }, { label: "Panel", value: "PANEL" },
    { label: "Field Assessment", value: "FIELD_ASSESSMENT" }, { label: "Practical Lab Test", value: "PRACTICAL_LAB" },
    { label: "Case Study / PV", value: "CASE_STUDY" }, { label: "Plant Visit", value: "PLANT_VISIT" },
  ]},
  { name: "interviewer", label: "Interviewer", type: "text", placeholder: "Interviewer name" },
  { name: "interviewerRole", label: "Interviewer Role", type: "text", placeholder: "e.g. QC Lab Manager", fullWidth: true },
  { name: "date", label: "Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "time", label: "Time", type: "text", placeholder: "HH:MM" },
  { name: "duration", label: "Duration (min)", type: "select", defaultValue: "60", options: [
    { label: "30 minutes", value: "30" }, { label: "45 minutes", value: "45" },
    { label: "60 minutes", value: "60" }, { label: "90 minutes", value: "90" },
    { label: "120 minutes (Lab/Plant)", value: "120" },
  ]},
];

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

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>(INITIAL_INTERVIEWS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "" });
  const [view, setView] = useState<"table" | "calendar">("table");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Scheduled Today" value={scheduledToday} icon={<Calendar className="h-5 w-5" />} />
        <StatsCard title="This Week" value={scheduledWeek} icon={<Clock className="h-5 w-5" />} />
        <StatsCard title="Completed" value={completed} icon={<CheckCircle className="h-5 w-5" />} trend={{ value: 12.5, label: "vs last week" }} />
        <StatsCard title="Avg Rating" value={avgRating} icon={<Star className="h-5 w-5" />} />
      </div>

      {view === "calendar" ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Week of Apr 13 – Apr 17, 2026</h2>
          </div>
          <div className="grid grid-cols-5 divide-x divide-border">
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
                      itemLabel={`${iv.candidate} interview`}
                      extraItems={[
                        ...(statusFlow[iv.status] ? [{ label: `Mark ${statusFlow[iv.status]}`, onClick: () => setInterviews((prev) => prev.map((x) => x.id === iv.id ? { ...x, status: statusFlow[iv.status] } : x)) }] : []),
                        ...(iv.status === "SCHEDULED" ? [{ label: "Cancel", onClick: () => setInterviews((prev) => prev.map((x) => x.id === iv.id ? { ...x, status: "CANCELLED" } : x)) }] : []),
                      ]}
                    />
                  );
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={filtered as unknown as Record<string, unknown>[]}
            emptyMessage="No interviews found."
            pagination={false}
          />
        </div>
      )}

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Interview" : "Schedule Pharma Interview"}
        fields={INTERVIEW_FIELDS}
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
              id: prev.length + 1,
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
    </div>
  );
}

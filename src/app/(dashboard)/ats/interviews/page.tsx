"use client";

import { useState } from "react";
import {
  Calendar, Clock, CheckCircle, Star, Plus, Search,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_DATES = ["2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"];

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>(INITIAL_INTERVIEWS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "calendar">("table");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    candidate: "", job: "", type: "TECHNICAL", interviewer: "", interviewerRole: "", date: "", time: "", duration: "60",
  });

  const filtered = interviews.filter(
    (i) =>
      i.candidate.toLowerCase().includes(search.toLowerCase()) ||
      i.job.toLowerCase().includes(search.toLowerCase()) ||
      i.interviewer.toLowerCase().includes(search.toLowerCase())
  );

  const scheduledToday = interviews.filter((i) => i.date === "2026-04-14" && i.status === "SCHEDULED").length;
  const scheduledWeek = interviews.filter((i) => i.status === "SCHEDULED").length;
  const completed = interviews.filter((i) => i.status === "COMPLETED").length;
  const avgRating = (() => {
    const rated = interviews.filter((i) => i.rating !== null);
    if (!rated.length) return "—";
    return (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1);
  })();

  function handleAdd() {
    if (!form.candidate || !form.job) return;
    setInterviews([...interviews, {
      id: interviews.length + 1,
      candidate: form.candidate,
      job: form.job,
      type: form.type,
      interviewer: form.interviewer,
      interviewerRole: form.interviewerRole,
      date: form.date,
      time: form.time,
      duration: parseInt(form.duration),
      status: "SCHEDULED",
      rating: null,
    }]);
    setForm({ candidate: "", job: "", type: "TECHNICAL", interviewer: "", interviewerRole: "", date: "", time: "", duration: "60" });
    setOpen(false);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pharmaceutical Interviews" description="Schedule and manage interviews for pharma positions — field assessments, lab practicals, panel reviews">
        <div className="flex items-center gap-2">
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}>Week View</Button>
          <Button onClick={() => setOpen(true)}>
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
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate, position, interviewer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Interviewer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date / Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((iv) => (
                  <tr key={iv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{iv.candidate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{iv.job}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[iv.type] ?? ""}`}>
                        {iv.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{iv.interviewer}</div>
                      <div className="text-xs text-muted-foreground">{iv.interviewerRole}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{iv.date} {iv.time}</td>
                    <td className="px-4 py-3 text-muted-foreground">{iv.duration} min</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[iv.status] ?? ""}`}>
                        {iv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StarRating rating={iv.rating} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No interviews found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Pharma Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Candidate</Label>
                <Input placeholder="Dr. Ahmed Mohamed" value={form.candidate} onChange={(e) => setForm({ ...form, candidate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Position</Label>
                <Select value={form.job} onValueChange={(v) => setForm({ ...form, job: v })}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {["Medical Representative", "District Sales Manager", "Quality Control Analyst", "Production Pharmacist", "R&D Formulation Scientist", "Regulatory Affairs Specialist", "Pharmacovigilance Officer", "Clinical Research Associate"].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Interview Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE_SCREEN">Phone Screen</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                    <SelectItem value="PANEL">Panel</SelectItem>
                    <SelectItem value="FIELD_ASSESSMENT">Field Assessment</SelectItem>
                    <SelectItem value="PRACTICAL_LAB">Practical Lab Test</SelectItem>
                    <SelectItem value="CASE_STUDY">Case Study / PV</SelectItem>
                    <SelectItem value="PLANT_VISIT">Plant Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Interviewer</Label>
                <Input placeholder="Interviewer name" value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Interviewer Role</Label>
              <Input placeholder="e.g. QC Lab Manager, Sales Director" value={form.interviewerRole} onChange={(e) => setForm({ ...form, interviewerRole: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes (Lab/Plant)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.candidate || !form.job}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Users, Activity, CheckCircle2, MapPin, Plus, XCircle, Target, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FormModal, type FormField } from "@/components/ui/form-modal";

const INITIAL_TEAM = [
  { id: "MR-001", name: "Ahmed Hassan", territory: "Cairo North", status: "In Field", calls: 11, target: 12, compliance: 92, lastGPS: "New Cairo", doctorCount: 45 },
  { id: "MR-002", name: "Sara Mohamed", territory: "Alexandria", status: "In Field", calls: 9, target: 10, compliance: 90, lastGPS: "Smouha", doctorCount: 38 },
  { id: "MR-003", name: "Omar Khalil", territory: "Giza", status: "In Field", calls: 12, target: 12, compliance: 100, lastGPS: "Dokki", doctorCount: 52 },
  { id: "MR-004", name: "Fatima Ali", territory: "Cairo South", status: "In Field", calls: 8, target: 11, compliance: 73, lastGPS: "Maadi", doctorCount: 41 },
  { id: "MR-005", name: "Mahmoud Farouk", territory: "Mansoura", status: "Office", calls: 10, target: 10, compliance: 100, lastGPS: "Mansoura Center", doctorCount: 36 },
  { id: "MR-006", name: "Nour Ibrahim", territory: "Tanta", status: "In Field", calls: 7, target: 9, compliance: 78, lastGPS: "Tanta City", doctorCount: 33 },
  { id: "MR-007", name: "Karim Saeed", territory: "Zagazig", status: "In Field", calls: 9, target: 9, compliance: 100, lastGPS: "Zagazig", doctorCount: 29 },
  { id: "MR-008", name: "Dina Mostafa", territory: "Suez", status: "Leave", calls: 0, target: 8, compliance: 0, lastGPS: "N/A", doctorCount: 27 },
];

const INITIAL_DOCTORS = [
  { name: "Dr. Tarek Hamdy", specialty: "Cardiologist", classification: "A", hospital: "Cairo Heart Center", currentRep: "Ahmed Hassan", frequency: "Weekly", lastVisit: "2026-03-30", status: "Covered" },
  { name: "Dr. Mona Abdelrahman", specialty: "Pediatrician", classification: "A", hospital: "Children's Hospital", currentRep: "Ahmed Hassan", frequency: "Weekly", lastVisit: "2026-03-30", status: "Covered" },
  { name: "Dr. Sherif Nabil", specialty: "GP", classification: "B", hospital: "Alex Medical Center", currentRep: "Sara Mohamed", frequency: "Bi-Weekly", lastVisit: "2026-03-25", status: "Covered" },
  { name: "Dr. Laila Saad", specialty: "Dermatologist", classification: "A", hospital: "Skin Care Clinic", currentRep: "Omar Khalil", frequency: "Weekly", lastVisit: "2026-03-30", status: "Covered" },
  { name: "Dr. Hossam Ezzat", specialty: "Orthopedic", classification: "A", hospital: "Ortho Care Center", currentRep: "Fatima Ali", frequency: "Weekly", lastVisit: "2026-03-27", status: "Covered" },
  { name: "Dr. Amira Gaber", specialty: "Neurologist", classification: "A", hospital: "Neuro Institute", currentRep: "Ahmed Hassan", frequency: "Weekly", lastVisit: "2026-03-26", status: "Covered" },
  { name: "Dr. Walid Fathy", specialty: "Oncologist", classification: "A", hospital: "Cancer Institute", currentRep: "Fatima Ali", frequency: "Weekly", lastVisit: "2026-03-28", status: "Covered" },
  { name: "Dr. Nada Hussein", specialty: "Internal Medicine", classification: "B", hospital: "Mansoura University", currentRep: "Mahmoud Farouk", frequency: "Bi-Weekly", lastVisit: "2026-03-22", status: "Covered" },
  { name: "Dr. Rami Adel", specialty: "GP", classification: "C", hospital: "Family Clinic", currentRep: "Nour Ibrahim", frequency: "Monthly", lastVisit: "2026-02-28", status: "Gap" },
  { name: "Dr. Yasmin Tarek", specialty: "Pediatrician", classification: "A", hospital: "Giza Children's Hospital", currentRep: "Omar Khalil", frequency: "Weekly", lastVisit: "2026-03-30", status: "Covered" },
  { name: "Dr. Ashraf Zaki", specialty: "Cardiologist", classification: "A", hospital: "Heart & Vascular Clinic", currentRep: "Sara Mohamed", frequency: "Weekly", lastVisit: "2026-03-29", status: "Covered" },
  { name: "Dr. Rania Sobhy", specialty: "Dermatologist", classification: "B", hospital: "Skin Clinic Alex", currentRep: "Unassigned", frequency: "Bi-Weekly", lastVisit: "N/A", status: "Unassigned" },
  { name: "Dr. Emad Shawky", specialty: "ENT", classification: "B", hospital: "ENT Hospital", currentRep: "Karim Saeed", frequency: "Bi-Weekly", lastVisit: "2026-03-23", status: "Covered" },
  { name: "Dr. Samia Magdy", specialty: "Psychiatrist", classification: "A", hospital: "Psychiatry Center", currentRep: "Fatima Ali", frequency: "Weekly", lastVisit: "2026-03-27", status: "Covered" },
  { name: "Dr. Khaled Adham", specialty: "Urologist", classification: "C", hospital: "Urology Center", currentRep: "Unassigned", frequency: "Monthly", lastVisit: "N/A", status: "Unassigned" },
];

const INITIAL_SETTINGS = [
  { rep: "Ahmed Hassan", territory: "Cairo North", dailyTarget: 12, monthlyTarget: 240, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-03-01" },
  { rep: "Sara Mohamed", territory: "Alexandria", dailyTarget: 10, monthlyTarget: 200, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-03-01" },
  { rep: "Omar Khalil", territory: "Giza", dailyTarget: 12, monthlyTarget: 240, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-03-01" },
  { rep: "Fatima Ali", territory: "Cairo South", dailyTarget: 11, monthlyTarget: 220, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-03-01" },
  { rep: "Mahmoud Farouk", territory: "Mansoura", dailyTarget: 10, monthlyTarget: 200, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-02-15" },
  { rep: "Nour Ibrahim", territory: "Tanta", dailyTarget: 9, monthlyTarget: 180, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-02-15" },
  { rep: "Karim Saeed", territory: "Zagazig", dailyTarget: 9, monthlyTarget: 180, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-02-15" },
  { rep: "Dina Mostafa", territory: "Suez", dailyTarget: 8, monthlyTarget: 160, aFreq: "Weekly", bFreq: "Bi-Weekly", cFreq: "Monthly", updated: "2026-01-20" },
];

const INITIAL_VISIT_REVIEWS = [
  { id: "V-1001", rep: "Ahmed Hassan", doctor: "Dr. Tarek Hamdy", date: "2026-03-30", duration: "27 min", products: "Cardizem", gpsVerified: true, quality: "Excellent", comments: "Well-prepared, good outcome", status: "Reviewed" },
  { id: "V-1002", rep: "Ahmed Hassan", doctor: "Dr. Mona Abdelrahman", date: "2026-03-30", duration: "25 min", products: "Augmentin", gpsVerified: true, quality: "Good", comments: "Follow-up needed on samples", status: "Reviewed" },
  { id: "V-1003", rep: "Sara Mohamed", doctor: "Dr. Sherif Nabil", date: "2026-03-30", duration: "20 min", products: "Panadol Extra", gpsVerified: true, quality: "Average", comments: "Short visit", status: "Reviewed" },
  { id: "V-1004", rep: "Omar Khalil", doctor: "Dr. Laila Saad", date: "2026-03-30", duration: "35 min", products: "Fucidin, Elocon", gpsVerified: true, quality: "Excellent", comments: "KOL engagement", status: "Reviewed" },
  { id: "V-1005", rep: "Fatima Ali", doctor: "Dr. Hossam Ezzat", date: "2026-03-30", duration: "25 min", products: "Voltaren", gpsVerified: true, quality: "Good", comments: "Competitive win", status: "Reviewed" },
  { id: "V-1009", rep: "Nour Ibrahim", doctor: "Dr. Rami Adel", date: "2026-03-28", duration: "15 min", products: "Panadol", gpsVerified: false, quality: "Poor", comments: "GPS mismatch - investigate", status: "Flagged" },
  { id: "V-1010", rep: "Omar Khalil", doctor: "Dr. Yasmin Tarek", date: "2026-03-30", duration: "28 min", products: "Augmentin", gpsVerified: true, quality: "Excellent", comments: "Great KOL relationship", status: "Reviewed" },
  { id: "V-1011", rep: "Sara Mohamed", doctor: "Dr. Ashraf Zaki", date: "2026-03-29", duration: "35 min", products: "Plavix, Crestor", gpsVerified: true, quality: "Excellent", comments: "Top tier KOL", status: "Reviewed" },
  { id: "V-1015", rep: "Dina Mostafa", doctor: "Dr. Tarek Hamdy", date: "2026-03-25", duration: "-", products: "-", gpsVerified: false, quality: "Poor", comments: "Missed visit - no GPS check-in", status: "Flagged" },
  { id: "V-1020", rep: "Mahmoud Farouk", doctor: "Dr. Nada Hussein", date: "2026-03-29", duration: "25 min", products: "Nexium 40mg", gpsVerified: true, quality: "Good", comments: "On target", status: "Pending" },
  { id: "V-1021", rep: "Karim Saeed", doctor: "Dr. Emad Shawky", date: "2026-03-29", duration: "25 min", products: "Otrivin", gpsVerified: true, quality: "Good", comments: "Regular visit", status: "Pending" },
  { id: "V-1022", rep: "Fatima Ali", doctor: "Dr. Samia Magdy", date: "2026-03-27", duration: "30 min", products: "Zoloft", gpsVerified: true, quality: "Good", comments: "Product trial discussion", status: "Pending" },
];

const INITIAL_APPROVALS = [
  { id: "REQ-002", rep: "Sara Mohamed", type: "Conference Sponsorship", description: "Alex Cardiology Conference", cost: "$1,200", priority: "High", date: "2026-03-27", decision: "Approved", notes: "KOL engagement", decidedDate: "2026-03-28" },
  { id: "REQ-004", rep: "Fatima Ali", type: "Doctor Sponsorship", description: "Dr. Walid Fathy - Int'l Oncology", cost: "$3,500", priority: "Urgent", date: "2026-03-25", decision: "Escalated", notes: "Value exceeds DM authority", decidedDate: "2026-03-26" },
  { id: "REQ-006", rep: "Nour Ibrahim", type: "Product Sample", description: "Panadol Extra samples", cost: "$210", priority: "Medium", date: "2026-03-23", decision: "Approved", notes: "Standard request", decidedDate: "2026-03-23" },
  { id: "REQ-008", rep: "Dina Mostafa", type: "Promo Material", description: "Pens and notepads branded", cost: "$550", priority: "Low", date: "2026-03-21", decision: "Approved", notes: "", decidedDate: "2026-03-22" },
  { id: "REQ-009", rep: "Yousef Ahmad", type: "Product Sample", description: "New launch samples", cost: "$380", priority: "High", date: "2026-03-20", decision: "Pending", notes: "", decidedDate: "-" },
  { id: "REQ-010", rep: "Hala Samir", type: "Doctor Sponsorship", description: "Dr. Khaled - Urology Symposium", cost: "$1,800", priority: "High", date: "2026-03-19", decision: "Escalated", notes: "Requires Marketeer approval", decidedDate: "2026-03-20" },
  { id: "REQ-011", rep: "Ahmed Hassan", type: "Medical Literature", description: "Clinical studies pack", cost: "$250", priority: "Medium", date: "2026-03-29", decision: "Approved", notes: "", decidedDate: "2026-03-29" },
  { id: "REQ-012", rep: "Omar Khalil", type: "Product Sample", description: "Derma line samples", cost: "$400", priority: "Medium", date: "2026-03-30", decision: "Pending", notes: "", decidedDate: "-" },
];

const INITIAL_MY_VISITS = [
  { id: "DM-V-001", accompanying: "Ahmed Hassan", doctor: "Dr. Tarek Hamdy", date: "2026-03-25", duration: "40 min", purpose: "Coaching", observations: "Rep handled objections well", actionItems: "Focus on closing technique", status: "Completed" },
  { id: "DM-V-002", accompanying: "Sara Mohamed", doctor: "Dr. Ashraf Zaki", date: "2026-03-22", duration: "50 min", purpose: "Key Account", observations: "KOL very engaged", actionItems: "Quarterly follow-up planned", status: "Completed" },
  { id: "DM-V-003", accompanying: "Fatima Ali", doctor: "Dr. Walid Fathy", date: "2026-03-18", duration: "60 min", purpose: "New Product Launch", observations: "Strong interest in oncology line", actionItems: "Send clinical data", status: "Completed" },
  { id: "DM-V-004", accompanying: "Omar Khalil", doctor: "Dr. Laila Saad", date: "2026-03-15", duration: "35 min", purpose: "Complaint Resolution", observations: "Issue resolved satisfactorily", actionItems: "Replace defective samples", status: "Completed" },
  { id: "DM-V-005", accompanying: "Karim Saeed", doctor: "Dr. Emad Shawky", date: "2026-03-10", duration: "30 min", purpose: "Coaching", observations: "Rep needs product knowledge", actionItems: "Training session scheduled", status: "Completed" },
  { id: "DM-V-006", accompanying: "Mahmoud Farouk", doctor: "Dr. Nada Hussein", date: "2026-03-05", duration: "45 min", purpose: "Key Account", observations: "University hospital - expand coverage", actionItems: "Increase visit frequency", status: "Completed" },
];

const assignFields: FormField[] = [
  { name: "doctor", label: "Doctor", type: "text", required: true },
  { name: "rep", label: "Assign to Rep", type: "text", required: true },
  { name: "frequency", label: "Visit Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
  { name: "startDate", label: "Start Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const settingsFields: FormField[] = [
  { name: "rep", label: "Rep", type: "text", required: true },
  { name: "dailyTarget", label: "Daily Call Target", type: "number", required: true },
  { name: "monthlyTarget", label: "Monthly Target", type: "number", required: true },
  { name: "aFreq", label: "A-Class Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
  { name: "bFreq", label: "B-Class Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
  { name: "cFreq", label: "C-Class Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
];

const dmVisitFields: FormField[] = [
  { name: "accompanying", label: "Accompanying Rep", type: "text", required: true },
  { name: "doctor", label: "Doctor Visited", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "purpose", label: "Purpose", type: "select", options: [
    "Coaching", "Key Account", "Complaint Resolution", "New Product Launch", "Performance Review",
  ].map(p => ({ label: p, value: p })) },
  { name: "observations", label: "Observations", type: "textarea" },
  { name: "actionItems", label: "Action Items", type: "textarea" },
];

export default function DistrictManagerPage() {
  const [team] = useState(INITIAL_TEAM);
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [reviews] = useState(INITIAL_VISIT_REVIEWS);
  const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
  const [myVisits, setMyVisits] = useState(INITIAL_MY_VISITS);

  const [showAssign, setShowAssign] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDmVisit, setShowDmVisit] = useState(false);

  const pendingApprovals = approvals.filter(a => a.decision === "Pending").length;
  const avgCallRate = (team.reduce((s, t) => s + t.compliance, 0) / team.length).toFixed(0);
  const coveredPct = Math.round((doctors.filter(d => d.status === "Covered").length / doctors.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="District Manager Dashboard"
        description="Oversee medical reps, assign doctors, configure call settings, and approve requests"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="Reps Under Management" value={team.length} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={Activity} title="Avg Team Call Rate" value={`${avgCallRate}%`} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={ClipboardCheck} title="Approvals Pending" value={pendingApprovals} iconColor="bg-amber-100 text-amber-700" />
        <StatsCard icon={Target} title="Field Coverage" value={`${coveredPct}%`} iconColor="bg-purple-100 text-purple-700" />
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team Overview</TabsTrigger>
          <TabsTrigger value="assign">Doctor Assignment</TabsTrigger>
          <TabsTrigger value="settings">Call Settings</TabsTrigger>
          <TabsTrigger value="reviews">Visit Reviews</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="myvisits">My Visits</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {team.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <Badge variant={r.status === "In Field" ? "default" : r.status === "Office" ? "secondary" : "outline"}>{r.status}</Badge>
                  </div>
                  <CardDescription>{r.territory} • {r.doctorCount} doctors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calls Today</span>
                    <span className="font-medium">{r.calls} / {r.target}</span>
                  </div>
                  <div className="h-2 w-full rounded bg-muted overflow-hidden">
                    <div className={`h-full ${r.compliance >= 90 ? "bg-green-500" : r.compliance >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.compliance}%` }} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{r.lastGPS}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">View Details</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAssign(true)}>Assign</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assign">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Doctor Assignment</CardTitle><CardDescription>Assign doctors to medical reps</CardDescription></div>
              <Button size="sm" onClick={() => setShowAssign(true)}><Plus className="mr-2 h-4 w-4" />Assign Doctor</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Doctor</th><th className="p-3">Specialty</th><th className="p-3">Class</th><th className="p-3">Hospital</th><th className="p-3">Current Rep</th><th className="p-3">Frequency</th><th className="p-3">Last Visit</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {doctors.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3">{d.specialty}</td>
                        <td className="p-3"><Badge variant={d.classification === "A" ? "default" : "secondary"}>{d.classification}</Badge></td>
                        <td className="p-3">{d.hospital}</td>
                        <td className="p-3">{d.currentRep}</td>
                        <td className="p-3">{d.frequency}</td>
                        <td className="p-3">{d.lastVisit}</td>
                        <td className="p-3"><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Call Rate & Frequency Settings</CardTitle><CardDescription>Configure targets per rep and doctor classification</CardDescription></div>
              <Button size="sm" onClick={() => setShowSettings(true)}><Plus className="mr-2 h-4 w-4" />Update Settings</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Rep</th><th className="p-3">Territory</th><th className="p-3">Daily Target</th><th className="p-3">Monthly Target</th><th className="p-3">A-Class</th><th className="p-3">B-Class</th><th className="p-3">C-Class</th><th className="p-3">Last Updated</th></tr>
                  </thead>
                  <tbody>
                    {settings.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{s.rep}</td>
                        <td className="p-3">{s.territory}</td>
                        <td className="p-3">{s.dailyTarget}</td>
                        <td className="p-3">{s.monthlyTarget}</td>
                        <td className="p-3">{s.aFreq}</td>
                        <td className="p-3">{s.bFreq}</td>
                        <td className="p-3">{s.cFreq}</td>
                        <td className="p-3 text-muted-foreground">{s.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader><CardTitle>Visit Reviews</CardTitle><CardDescription>Review and validate rep visits with GPS verification</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Visit#</th><th className="p-3">Rep</th><th className="p-3">Doctor</th><th className="p-3">Date</th><th className="p-3">Duration</th><th className="p-3">GPS</th><th className="p-3">Quality</th><th className="p-3">Comments</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {reviews.map(v => (
                      <tr key={v.id} className="border-t">
                        <td className="p-3 font-mono">{v.id}</td>
                        <td className="p-3">{v.rep}</td>
                        <td className="p-3 font-medium">{v.doctor}</td>
                        <td className="p-3">{v.date}</td>
                        <td className="p-3">{v.duration}</td>
                        <td className="p-3">
                          {v.gpsVerified ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                        </td>
                        <td className="p-3"><StatusBadge status={v.quality} /></td>
                        <td className="p-3 max-w-xs truncate">{v.comments}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader><CardTitle>Market Request Approvals</CardTitle><CardDescription>Review and approve requests from your team</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Request#</th><th className="p-3">Rep</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Cost</th><th className="p-3">Priority</th><th className="p-3">Submitted</th><th className="p-3">Decision</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {approvals.map(a => (
                      <tr key={a.id} className="border-t">
                        <td className="p-3 font-mono">{a.id}</td>
                        <td className="p-3">{a.rep}</td>
                        <td className="p-3">{a.type}</td>
                        <td className="p-3 max-w-xs truncate">{a.description}</td>
                        <td className="p-3 font-medium">{a.cost}</td>
                        <td className="p-3"><StatusBadge status={a.priority} /></td>
                        <td className="p-3">{a.date}</td>
                        <td className="p-3"><StatusBadge status={a.decision} /></td>
                        <td className="p-3">
                          {a.decision === "Pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-green-600"
                                onClick={() => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Approved", decidedDate: new Date().toISOString().slice(0, 10) } : x))}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-red-600"
                                onClick={() => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Rejected", decidedDate: new Date().toISOString().slice(0, 10) } : x))}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="myvisits">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>My Field Visits</CardTitle><CardDescription>Double visits accompanying reps</CardDescription></div>
              <Button size="sm" onClick={() => setShowDmVisit(true)}><Plus className="mr-2 h-4 w-4" />Register Visit</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Visit#</th><th className="p-3">Accompanying</th><th className="p-3">Doctor</th><th className="p-3">Date</th><th className="p-3">Duration</th><th className="p-3">Purpose</th><th className="p-3">Action Items</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {myVisits.map(v => (
                      <tr key={v.id} className="border-t">
                        <td className="p-3 font-mono">{v.id}</td>
                        <td className="p-3 font-medium">{v.accompanying}</td>
                        <td className="p-3">{v.doctor}</td>
                        <td className="p-3">{v.date}</td>
                        <td className="p-3">{v.duration}</td>
                        <td className="p-3"><StatusBadge status={v.purpose} /></td>
                        <td className="p-3 max-w-xs truncate">{v.actionItems}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal open={showAssign} onOpenChange={setShowAssign} title="Assign Doctor to Rep" fields={assignFields}
        onSubmit={(d) => setDoctors(prev => prev.map(x => x.name === d.doctor ? { ...x, currentRep: d.rep, frequency: d.frequency || x.frequency, status: "Covered" } : x))} />

      <FormModal open={showSettings} onOpenChange={setShowSettings} title="Update Call Settings" fields={settingsFields}
        onSubmit={(d) => setSettings(prev => [{
          rep: d.rep, territory: "-", dailyTarget: Number(d.dailyTarget), monthlyTarget: Number(d.monthlyTarget),
          aFreq: d.aFreq || "Weekly", bFreq: d.bFreq || "Bi-Weekly", cFreq: d.cFreq || "Monthly",
          updated: new Date().toISOString().slice(0, 10),
        }, ...prev])} />

      <FormModal open={showDmVisit} onOpenChange={setShowDmVisit} title="Register DM Visit" fields={dmVisitFields}
        onSubmit={(d) => setMyVisits(prev => [{
          id: `DM-V-${String(prev.length + 1).padStart(3, "0")}`, accompanying: d.accompanying, doctor: d.doctor,
          date: d.date, duration: "-", purpose: d.purpose || "Coaching",
          observations: d.observations || "", actionItems: d.actionItems || "", status: "Completed",
        }, ...prev])} />
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Users, UserCheck, Activity, ClipboardList, MapPin, Plus,
  Stethoscope, Phone, Calendar, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FormModal, type FormField } from "@/components/ui/form-modal";

interface Rep {
  id: string; name: string; territory: string; doctors: number;
  callTarget: number; callActual: number; frequency: string;
  compliance: number; pendingRequests: number; status: string;
}

interface Doctor {
  id: string; name: string; specialty: string; hospital: string;
  city: string; phone: string; classification: "A" | "B" | "C";
  assignedRep: string; visitFrequency: string; lastVisit: string;
  products: string;
}

interface Visit {
  id: string; rep: string; doctor: string; hospital: string;
  date: string; timeIn: string; timeOut: string; duration: string;
  products: string; samples: number; feedback: string;
  gpsVerified: boolean; type: "Planned" | "Unplanned"; status: string;
}

interface MarketRequest {
  id: string; rep: string; type: string; description: string;
  qty: number; cost: string; priority: string; date: string;
  approvedBy: string; status: string;
}

const INITIAL_REPS: Rep[] = [
  { id: "MR-001", name: "Ahmed Hassan", territory: "Cairo North", doctors: 45, callTarget: 12, callActual: 11, frequency: "Weekly", compliance: 92, pendingRequests: 2, status: "Active" },
  { id: "MR-002", name: "Sara Mohamed", territory: "Alexandria", doctors: 38, callTarget: 10, callActual: 9, frequency: "Weekly", compliance: 90, pendingRequests: 1, status: "Active" },
  { id: "MR-003", name: "Omar Khalil", territory: "Giza", doctors: 52, callTarget: 12, callActual: 12, frequency: "Weekly", compliance: 100, pendingRequests: 3, status: "Active" },
  { id: "MR-004", name: "Fatima Ali", territory: "Cairo South", doctors: 41, callTarget: 11, callActual: 8, frequency: "Weekly", compliance: 73, pendingRequests: 4, status: "Active" },
  { id: "MR-005", name: "Mahmoud Farouk", territory: "Mansoura", doctors: 36, callTarget: 10, callActual: 10, frequency: "Bi-Weekly", compliance: 100, pendingRequests: 0, status: "Active" },
  { id: "MR-006", name: "Nour Ibrahim", territory: "Tanta", doctors: 33, callTarget: 9, callActual: 7, frequency: "Weekly", compliance: 78, pendingRequests: 2, status: "Active" },
  { id: "MR-007", name: "Karim Saeed", territory: "Zagazig", doctors: 29, callTarget: 9, callActual: 9, frequency: "Weekly", compliance: 100, pendingRequests: 1, status: "Active" },
  { id: "MR-008", name: "Dina Mostafa", territory: "Suez", doctors: 27, callTarget: 8, callActual: 6, frequency: "Bi-Weekly", compliance: 75, pendingRequests: 3, status: "On Leave" },
  { id: "MR-009", name: "Yousef Ahmad", territory: "Ismailia", doctors: 31, callTarget: 9, callActual: 9, frequency: "Weekly", compliance: 100, pendingRequests: 0, status: "Active" },
  { id: "MR-010", name: "Hala Samir", territory: "Assiut", doctors: 34, callTarget: 10, callActual: 8, frequency: "Weekly", compliance: 80, pendingRequests: 2, status: "Training" },
];

const INITIAL_DOCTORS: Doctor[] = [
  { id: "DR-001", name: "Dr. Tarek Hamdy", specialty: "Cardiologist", hospital: "Cairo Heart Center", city: "Cairo", phone: "+20 100 111 2222", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Cardizem, Atenol" },
  { id: "DR-002", name: "Dr. Mona Abdelrahman", specialty: "Pediatrician", hospital: "Children's Hospital", city: "Cairo", phone: "+20 100 222 3333", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-29", products: "Augmentin, Zinnat" },
  { id: "DR-003", name: "Dr. Sherif Nabil", specialty: "GP", hospital: "Alex Medical Center", city: "Alexandria", phone: "+20 100 333 4444", classification: "B", assignedRep: "Sara Mohamed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-25", products: "Panadol, Voltaren" },
  { id: "DR-004", name: "Dr. Laila Saad", specialty: "Dermatologist", hospital: "Skin Care Clinic", city: "Giza", phone: "+20 100 444 5555", classification: "A", assignedRep: "Omar Khalil", visitFrequency: "Weekly", lastVisit: "2026-03-30", products: "Fucidin, Elocon" },
  { id: "DR-005", name: "Dr. Hossam Ezzat", specialty: "Orthopedic", hospital: "Ortho Care Center", city: "Cairo", phone: "+20 100 555 6666", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-27", products: "Voltaren, Celebrex" },
  { id: "DR-006", name: "Dr. Amira Gaber", specialty: "Neurologist", hospital: "Neuro Institute", city: "Cairo", phone: "+20 100 666 7777", classification: "A", assignedRep: "Ahmed Hassan", visitFrequency: "Weekly", lastVisit: "2026-03-26", products: "Depakine, Tegretol" },
  { id: "DR-007", name: "Dr. Walid Fathy", specialty: "Oncologist", hospital: "Cancer Institute", city: "Cairo", phone: "+20 100 777 8888", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Herceptin, Avastin" },
  { id: "DR-008", name: "Dr. Nada Hussein", specialty: "Internal Medicine", hospital: "Mansoura University", city: "Mansoura", phone: "+20 100 888 9999", classification: "B", assignedRep: "Mahmoud Farouk", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-22", products: "Nexium, Losec" },
  { id: "DR-009", name: "Dr. Rami Adel", specialty: "GP", hospital: "Family Clinic", city: "Tanta", phone: "+20 100 999 0000", classification: "C", assignedRep: "Nour Ibrahim", visitFrequency: "Monthly", lastVisit: "2026-03-15", products: "Panadol, Brufen" },
  { id: "DR-010", name: "Dr. Yasmin Tarek", specialty: "Pediatrician", hospital: "Giza Children's Hospital", city: "Giza", phone: "+20 101 111 2222", classification: "A", assignedRep: "Omar Khalil", visitFrequency: "Weekly", lastVisit: "2026-03-30", products: "Augmentin, Klacid" },
  { id: "DR-011", name: "Dr. Ashraf Zaki", specialty: "Cardiologist", hospital: "Heart & Vascular Clinic", city: "Alexandria", phone: "+20 101 222 3333", classification: "A", assignedRep: "Sara Mohamed", visitFrequency: "Weekly", lastVisit: "2026-03-29", products: "Plavix, Crestor" },
  { id: "DR-012", name: "Dr. Rania Sobhy", specialty: "Dermatologist", hospital: "Skin Clinic Alex", city: "Alexandria", phone: "+20 101 333 4444", classification: "B", assignedRep: "Sara Mohamed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-24", products: "Fucidin, Differin" },
  { id: "DR-013", name: "Dr. Emad Shawky", specialty: "ENT", hospital: "ENT Hospital", city: "Zagazig", phone: "+20 101 444 5555", classification: "B", assignedRep: "Karim Saeed", visitFrequency: "Bi-Weekly", lastVisit: "2026-03-23", products: "Otrivin, Avamys" },
  { id: "DR-014", name: "Dr. Samia Magdy", specialty: "Psychiatrist", hospital: "Psychiatry Center", city: "Cairo", phone: "+20 101 555 6666", classification: "A", assignedRep: "Fatima Ali", visitFrequency: "Weekly", lastVisit: "2026-03-28", products: "Zoloft, Xanax" },
  { id: "DR-015", name: "Dr. Khaled Adham", specialty: "Urologist", hospital: "Urology Center", city: "Ismailia", phone: "+20 101 666 7777", classification: "C", assignedRep: "Yousef Ahmad", visitFrequency: "Monthly", lastVisit: "2026-03-10", products: "Cialis, Levitra" },
];

const INITIAL_VISITS: Visit[] = [
  { id: "V-1001", rep: "Ahmed Hassan", doctor: "Dr. Tarek Hamdy", hospital: "Cairo Heart Center", date: "2026-03-30", timeIn: "09:15", timeOut: "09:42", duration: "27 min", products: "Cardizem 60mg", samples: 10, feedback: "Positive, will prescribe", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1002", rep: "Ahmed Hassan", doctor: "Dr. Mona Abdelrahman", hospital: "Children's Hospital", date: "2026-03-30", timeIn: "11:00", timeOut: "11:25", duration: "25 min", products: "Augmentin Susp", samples: 15, feedback: "Requested more samples", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1003", rep: "Sara Mohamed", doctor: "Dr. Sherif Nabil", hospital: "Alex Medical Center", date: "2026-03-30", timeIn: "10:00", timeOut: "10:20", duration: "20 min", products: "Panadol Extra", samples: 20, feedback: "Regular user", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1004", rep: "Omar Khalil", doctor: "Dr. Laila Saad", hospital: "Skin Care Clinic", date: "2026-03-30", timeIn: "14:30", timeOut: "15:05", duration: "35 min", products: "Fucidin H, Elocon", samples: 12, feedback: "New product interest", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1005", rep: "Fatima Ali", doctor: "Dr. Hossam Ezzat", hospital: "Ortho Care Center", date: "2026-03-30", timeIn: "09:30", timeOut: "09:55", duration: "25 min", products: "Voltaren 75mg", samples: 15, feedback: "Will switch from competitor", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1006", rep: "Ahmed Hassan", doctor: "Dr. Amira Gaber", hospital: "Neuro Institute", date: "2026-03-29", timeIn: "13:00", timeOut: "13:30", duration: "30 min", products: "Depakine Chrono", samples: 8, feedback: "Requests clinical data", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1007", rep: "Mahmoud Farouk", doctor: "Dr. Nada Hussein", hospital: "Mansoura University", date: "2026-03-29", timeIn: "10:15", timeOut: "10:40", duration: "25 min", products: "Nexium 40mg", samples: 20, feedback: "Positive response", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1008", rep: "Fatima Ali", doctor: "Dr. Walid Fathy", hospital: "Cancer Institute", date: "2026-03-28", timeIn: "11:00", timeOut: "11:45", duration: "45 min", products: "Herceptin", samples: 2, feedback: "Detailed discussion", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1009", rep: "Nour Ibrahim", doctor: "Dr. Rami Adel", hospital: "Family Clinic", date: "2026-03-28", timeIn: "15:00", timeOut: "15:15", duration: "15 min", products: "Panadol", samples: 25, feedback: "Short meeting", gpsVerified: false, type: "Unplanned", status: "Completed" },
  { id: "V-1010", rep: "Omar Khalil", doctor: "Dr. Yasmin Tarek", hospital: "Giza Children's Hospital", date: "2026-03-30", timeIn: "09:00", timeOut: "09:28", duration: "28 min", products: "Augmentin, Klacid", samples: 18, feedback: "Prescribes regularly", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1011", rep: "Sara Mohamed", doctor: "Dr. Ashraf Zaki", hospital: "Heart & Vascular Clinic", date: "2026-03-29", timeIn: "12:00", timeOut: "12:35", duration: "35 min", products: "Plavix, Crestor", samples: 10, feedback: "KOL - strong supporter", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1012", rep: "Karim Saeed", doctor: "Dr. Emad Shawky", hospital: "ENT Hospital", date: "2026-03-29", timeIn: "14:00", timeOut: "14:25", duration: "25 min", products: "Otrivin Nasal", samples: 15, feedback: "Good response", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1013", rep: "Fatima Ali", doctor: "Dr. Samia Magdy", hospital: "Psychiatry Center", date: "2026-03-27", timeIn: "10:30", timeOut: "11:00", duration: "30 min", products: "Zoloft 50mg", samples: 12, feedback: "Interested in trial", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1014", rep: "Hala Samir", doctor: "Dr. Khaled Adham", hospital: "Urology Center", date: "2026-03-26", timeIn: "11:00", timeOut: "11:20", duration: "20 min", products: "Cialis", samples: 8, feedback: "Regular prescriber", gpsVerified: true, type: "Planned", status: "Completed" },
  { id: "V-1015", rep: "Dina Mostafa", doctor: "Dr. Tarek Hamdy", hospital: "Cairo Heart Center", date: "2026-03-25", timeIn: "-", timeOut: "-", duration: "-", products: "-", samples: 0, feedback: "Rescheduled", gpsVerified: false, type: "Planned", status: "Missed" },
];

const INITIAL_REQUESTS: MarketRequest[] = [
  { id: "REQ-001", rep: "Ahmed Hassan", type: "Product Sample", description: "Cardizem 60mg - 200 units for Q2 campaign", qty: 200, cost: "$450", priority: "High", date: "2026-03-28", approvedBy: "DM-Cairo", status: "Approved" },
  { id: "REQ-002", rep: "Sara Mohamed", type: "Conference Sponsorship", description: "Alex Cardiology Conference attendance", qty: 1, cost: "$1,200", priority: "High", date: "2026-03-27", approvedBy: "Marketeer", status: "Pending" },
  { id: "REQ-003", rep: "Omar Khalil", type: "Promo Material", description: "Brochures for new derma line (500 pcs)", qty: 500, cost: "$320", priority: "Medium", date: "2026-03-26", approvedBy: "DM-Giza", status: "Approved" },
  { id: "REQ-004", rep: "Fatima Ali", type: "Doctor Sponsorship", description: "Dr. Walid Fathy - Int'l Oncology Congress", qty: 1, cost: "$3,500", priority: "Urgent", date: "2026-03-25", approvedBy: "BUM", status: "Pending" },
  { id: "REQ-005", rep: "Mahmoud Farouk", type: "Medical Literature", description: "Nexium clinical studies pack", qty: 50, cost: "$180", priority: "Low", date: "2026-03-24", approvedBy: "DM-Delta", status: "Fulfilled" },
  { id: "REQ-006", rep: "Nour Ibrahim", type: "Product Sample", description: "Panadol Extra samples", qty: 300, cost: "$210", priority: "Medium", date: "2026-03-23", approvedBy: "DM-Delta", status: "Approved" },
  { id: "REQ-007", rep: "Karim Saeed", type: "Conference Sponsorship", description: "ENT regional meeting Zagazig", qty: 1, cost: "$800", priority: "Medium", date: "2026-03-22", approvedBy: "Marketeer", status: "Rejected" },
  { id: "REQ-008", rep: "Dina Mostafa", type: "Promo Material", description: "Pens and notepads branded", qty: 1000, cost: "$550", priority: "Low", date: "2026-03-21", approvedBy: "DM-Canal", status: "Approved" },
  { id: "REQ-009", rep: "Yousef Ahmad", type: "Product Sample", description: "New launch product samples", qty: 150, cost: "$380", priority: "High", date: "2026-03-20", approvedBy: "DM-Canal", status: "Pending" },
  { id: "REQ-010", rep: "Hala Samir", type: "Doctor Sponsorship", description: "Dr. Khaled - Urology Symposium", qty: 1, cost: "$1,800", priority: "High", date: "2026-03-19", approvedBy: "Marketeer", status: "Pending" },
];

const repFields: FormField[] = [
  { name: "name", label: "Rep Name", type: "text", required: true },
  { name: "territory", label: "Territory", type: "text", required: true },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "callRateTarget", label: "Daily Call Target", type: "number", required: true },
  { name: "frequencyTarget", label: "Frequency Target", type: "select", options: [
    { label: "Daily", value: "Daily" }, { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" },
  ]},
];

const doctorFields: FormField[] = [
  { name: "name", label: "Doctor Name", type: "text", required: true },
  { name: "specialty", label: "Specialty", type: "select", required: true, options: [
    "Cardiologist", "GP", "Pediatrician", "Dermatologist", "Orthopedic", "Neurologist", "Oncologist", "Internal Medicine", "ENT", "Urologist", "Psychiatrist",
  ].map(s => ({ label: s, value: s })) },
  { name: "hospital", label: "Hospital/Clinic", type: "text", required: true },
  { name: "city", label: "City", type: "text", required: true },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "classification", label: "Classification", type: "select", required: true, options: [
    { label: "A - High Priority", value: "A" }, { label: "B - Medium", value: "B" }, { label: "C - Low", value: "C" },
  ]},
  { name: "assignedRep", label: "Assigned Rep", type: "text", required: true },
  { name: "visitFrequency", label: "Visit Frequency", type: "select", options: [
    { label: "Weekly", value: "Weekly" }, { label: "Bi-Weekly", value: "Bi-Weekly" }, { label: "Monthly", value: "Monthly" },
  ]},
];

const visitFields: FormField[] = [
  { name: "rep", label: "Medical Rep", type: "text", required: true },
  { name: "doctor", label: "Doctor", type: "text", required: true },
  { name: "date", label: "Visit Date", type: "date", required: true },
  { name: "timeIn", label: "Time In", type: "text", placeholder: "HH:MM" },
  { name: "timeOut", label: "Time Out", type: "text", placeholder: "HH:MM" },
  { name: "products", label: "Products Presented", type: "text" },
  { name: "samples", label: "Samples Given", type: "number" },
  { name: "type", label: "Visit Type", type: "select", options: [
    { label: "Planned", value: "Planned" }, { label: "Unplanned", value: "Unplanned" },
  ]},
  { name: "feedback", label: "Doctor Feedback", type: "textarea" },
];

const requestFields: FormField[] = [
  { name: "rep", label: "Requesting Rep", type: "text", required: true },
  { name: "type", label: "Request Type", type: "select", required: true, options: [
    "Product Sample", "Promo Material", "Medical Literature", "Conference Sponsorship", "Doctor Sponsorship",
  ].map(t => ({ label: t, value: t })) },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "qty", label: "Quantity", type: "number" },
  { name: "cost", label: "Estimated Cost", type: "text" },
  { name: "priority", label: "Priority", type: "select", options: [
    { label: "Urgent", value: "Urgent" }, { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
];

export default function MedicalRepPage() {
  const [reps, setReps] = useState(INITIAL_REPS);
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [visits, setVisits] = useState(INITIAL_VISITS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [showRepForm, setShowRepForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [search, setSearch] = useState("");

  const activeInField = reps.filter(r => r.status === "Active").length;
  const avgCallRate = (reps.reduce((s, r) => s + r.callActual, 0) / reps.length).toFixed(1);
  const pendingRequests = requests.filter(r => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Representatives"
        description="Manage medical reps, doctor visits, call rates, and market requests"
        actions={
          <Button onClick={() => setShowRepForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Rep
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="Total Reps" value={reps.length} subtitle="Field force" iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={UserCheck} title="Active in Field" value={activeInField} subtitle="Today" iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={Activity} title="Avg Call Rate" value={`${avgCallRate}/day`} subtitle="Visits per day" iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={ClipboardList} title="Pending Requests" value={pendingRequests} subtitle="Market requests" iconColor="bg-amber-100 text-amber-700" />
      </div>

      <Tabs defaultValue="reps">
        <TabsList>
          <TabsTrigger value="reps">My Reps</TabsTrigger>
          <TabsTrigger value="doctors">Doctor Directory</TabsTrigger>
          <TabsTrigger value="visits">Visit Log</TabsTrigger>
          <TabsTrigger value="callrate">Call Rate & Frequency</TabsTrigger>
          <TabsTrigger value="requests">Market Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="reps">
          <Card>
            <CardHeader><CardTitle>Medical Reps</CardTitle><CardDescription>{reps.length} reps under management</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Rep ID</th><th className="p-3">Name</th><th className="p-3">Territory</th><th className="p-3">Doctors</th><th className="p-3">Call Target</th><th className="p-3">Actual</th><th className="p-3">Frequency</th><th className="p-3">Compliance</th><th className="p-3">Pending</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {reps.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-mono">{r.id}</td>
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3">{r.territory}</td>
                        <td className="p-3">{r.doctors}</td>
                        <td className="p-3">{r.callTarget}</td>
                        <td className="p-3">{r.callActual}</td>
                        <td className="p-3">{r.frequency}</td>
                        <td className="p-3">
                          <span className={r.compliance >= 90 ? "text-green-600" : r.compliance >= 75 ? "text-amber-600" : "text-red-600"}>
                            {r.compliance}%
                          </span>
                        </td>
                        <td className="p-3">{r.pendingRequests}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Doctor Directory</CardTitle><CardDescription>{doctors.length} doctors across all territories</CardDescription></div>
              <Button size="sm" onClick={() => setShowDoctorForm(true)}><Plus className="mr-2 h-4 w-4" />Add Doctor</Button>
            </CardHeader>
            <CardContent>
              <Input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3 max-w-sm" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Specialty</th><th className="p-3">Hospital</th><th className="p-3">City</th><th className="p-3">Class</th><th className="p-3">Assigned Rep</th><th className="p-3">Frequency</th><th className="p-3">Last Visit</th></tr>
                  </thead>
                  <tbody>
                    {doctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase())).map(d => (
                      <tr key={d.id} className="border-t">
                        <td className="p-3 font-mono">{d.id}</td>
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3">{d.specialty}</td>
                        <td className="p-3">{d.hospital}</td>
                        <td className="p-3">{d.city}</td>
                        <td className="p-3">
                          <Badge variant={d.classification === "A" ? "default" : "secondary"}>{d.classification}</Badge>
                        </td>
                        <td className="p-3">{d.assignedRep}</td>
                        <td className="p-3">{d.visitFrequency}</td>
                        <td className="p-3">{d.lastVisit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Visit Log</CardTitle><CardDescription>All registered doctor visits - GPS validated</CardDescription></div>
              <Button size="sm" onClick={() => setShowVisitForm(true)}><Plus className="mr-2 h-4 w-4" />Register Visit</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Visit#</th><th className="p-3">Rep</th><th className="p-3">Doctor</th><th className="p-3">Date</th><th className="p-3">Duration</th><th className="p-3">Products</th><th className="p-3">Samples</th><th className="p-3">GPS</th><th className="p-3">Type</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id} className="border-t">
                        <td className="p-3 font-mono">{v.id}</td>
                        <td className="p-3">{v.rep}</td>
                        <td className="p-3 font-medium">{v.doctor}</td>
                        <td className="p-3">{v.date}</td>
                        <td className="p-3">{v.duration}</td>
                        <td className="p-3">{v.products}</td>
                        <td className="p-3">{v.samples}</td>
                        <td className="p-3">
                          {v.gpsVerified ? (
                            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" />Verified</span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />Unverified</span>
                          )}
                        </td>
                        <td className="p-3">{v.type}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callrate">
          <Card>
            <CardHeader><CardTitle>Call Rate & Frequency Performance</CardTitle><CardDescription>Target vs Actual per rep</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reps.map(r => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{r.name} <span className="text-muted-foreground">({r.territory})</span></span>
                      <span className="text-muted-foreground">{r.callActual}/{r.callTarget} calls • {r.compliance}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div
                        className={`h-full ${r.compliance >= 90 ? "bg-green-500" : r.compliance >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(r.compliance, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Market Requests</CardTitle><CardDescription>Sample, sponsorship, and promotional requests</CardDescription></div>
              <Button size="sm" onClick={() => setShowRequestForm(true)}><Plus className="mr-2 h-4 w-4" />New Request</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Request#</th><th className="p-3">Rep</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Cost</th><th className="p-3">Priority</th><th className="p-3">Approver</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-mono">{r.id}</td>
                        <td className="p-3">{r.rep}</td>
                        <td className="p-3">{r.type}</td>
                        <td className="p-3 max-w-xs truncate">{r.description}</td>
                        <td className="p-3">{r.qty}</td>
                        <td className="p-3 font-medium">{r.cost}</td>
                        <td className="p-3"><StatusBadge status={r.priority} /></td>
                        <td className="p-3">{r.approvedBy}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal open={showRepForm} onOpenChange={setShowRepForm} title="Add Medical Rep" fields={repFields}
        onSubmit={(d) => setReps(prev => [{
          id: `MR-${String(prev.length + 11).padStart(3, "0")}`, name: d.name, territory: d.territory, doctors: 0,
          callTarget: Number(d.callRateTarget) || 10, callActual: 0, frequency: d.frequencyTarget || "Weekly",
          compliance: 0, pendingRequests: 0, status: "Active",
        }, ...prev])} />

      <FormModal open={showDoctorForm} onOpenChange={setShowDoctorForm} title="Add Doctor" fields={doctorFields}
        onSubmit={(d) => setDoctors(prev => [{
          id: `DR-${String(prev.length + 16).padStart(3, "0")}`, name: d.name, specialty: d.specialty,
          hospital: d.hospital, city: d.city, phone: d.phone || "", classification: (d.classification || "B") as "A" | "B" | "C",
          assignedRep: d.assignedRep, visitFrequency: d.visitFrequency || "Monthly", lastVisit: "-", products: "-",
        }, ...prev])} />

      <FormModal open={showVisitForm} onOpenChange={setShowVisitForm} title="Register Visit" fields={visitFields}
        onSubmit={(d) => setVisits(prev => [{
          id: `V-${1016 + prev.length}`, rep: d.rep, doctor: d.doctor, hospital: "-", date: d.date,
          timeIn: d.timeIn || "-", timeOut: d.timeOut || "-", duration: "-", products: d.products || "-",
          samples: Number(d.samples) || 0, feedback: d.feedback || "", gpsVerified: true,
          type: (d.type || "Planned") as "Planned" | "Unplanned", status: "Completed",
        }, ...prev])} />

      <FormModal open={showRequestForm} onOpenChange={setShowRequestForm} title="New Market Request" fields={requestFields}
        onSubmit={(d) => setRequests(prev => [{
          id: `REQ-${String(prev.length + 11).padStart(3, "0")}`, rep: d.rep, type: d.type,
          description: d.description, qty: Number(d.qty) || 1, cost: d.cost || "$0",
          priority: d.priority || "Medium", date: new Date().toISOString().slice(0, 10),
          approvedBy: "Pending", status: "Pending",
        }, ...prev])} />
    </div>
  );
}

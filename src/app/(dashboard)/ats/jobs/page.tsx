"use client";

import { useState } from "react";
import { Briefcase, MapPin, Users, Clock, Plus, Search, Filter, FlaskConical, ShieldCheck, Stethoscope } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  applications: number;
  postedDate: string;
  closingDate: string;
  description: string;
  salaryRange: string;
  requirements: string;
}

const initialJobs: Job[] = [
  { id: 1, title: "Medical Representative", department: "Sales & Marketing", location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", applications: 45, postedDate: "2026-03-01", closingDate: "2026-04-15", description: "Promote pharmaceutical products to healthcare professionals in assigned territory.", salaryRange: "$18,000 - $24,000/yr", requirements: "BSc Pharmacy/Science, 1-3 yrs pharma sales" },
  { id: 2, title: "District Sales Manager", department: "Sales & Marketing", location: "Alexandria, Egypt", type: "FULL_TIME", status: "OPEN", applications: 18, postedDate: "2026-03-05", closingDate: "2026-04-20", description: "Lead and manage a team of medical representatives across the district.", salaryRange: "$30,000 - $42,000/yr", requirements: "BSc Pharmacy, 5+ yrs pharma sales, 2+ yrs management" },
  { id: 3, title: "Quality Control Analyst", department: "Quality Assurance", location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "OPEN", applications: 32, postedDate: "2026-03-08", closingDate: "2026-04-10", description: "Perform analytical testing of raw materials, intermediates, and finished products per pharmacopoeial methods.", salaryRange: "$15,000 - $22,000/yr", requirements: "BSc Pharmacy/Chemistry, HPLC/GC experience" },
  { id: 4, title: "Regulatory Affairs Specialist", department: "Regulatory Affairs", location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", applications: 14, postedDate: "2026-03-10", closingDate: "2026-04-25", description: "Prepare and submit drug registration dossiers to EDA and other regulatory authorities.", salaryRange: "$25,000 - $35,000/yr", requirements: "BSc Pharmacy, 3+ yrs regulatory affairs, CTD knowledge" },
  { id: 5, title: "Production Pharmacist", department: "Manufacturing", location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "OPEN", applications: 22, postedDate: "2026-03-12", closingDate: "2026-04-18", description: "Supervise pharmaceutical manufacturing operations including tablets, capsules, and liquid dosage forms.", salaryRange: "$20,000 - $28,000/yr", requirements: "BSc Pharmacy, GMP knowledge, 2+ yrs manufacturing" },
  { id: 6, title: "Pharmacovigilance Officer", department: "Medical Affairs", location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", applications: 8, postedDate: "2026-03-15", closingDate: "2026-04-30", description: "Monitor and report adverse drug reactions, manage safety database, and ensure compliance with pharmacovigilance regulations.", salaryRange: "$22,000 - $32,000/yr", requirements: "BSc Pharmacy/Medicine, PV experience preferred" },
  { id: 7, title: "Supply Chain Manager", department: "Supply Chain", location: "Cairo, Egypt", type: "FULL_TIME", status: "PAUSED", applications: 12, postedDate: "2026-02-20", closingDate: "2026-03-31", description: "Manage end-to-end pharmaceutical supply chain including cold chain logistics.", salaryRange: "$35,000 - $48,000/yr", requirements: "BSc + MBA, 7+ yrs supply chain, pharma industry" },
  { id: 8, title: "R&D Formulation Scientist", department: "Research & Development", location: "6th October, Egypt", type: "FULL_TIME", status: "OPEN", applications: 16, postedDate: "2026-03-18", closingDate: "2026-05-01", description: "Develop and optimize pharmaceutical formulations for generic and branded products.", salaryRange: "$28,000 - $40,000/yr", requirements: "MSc/PhD Pharmaceutics, formulation development" },
  { id: 9, title: "Clinical Research Associate", department: "Medical Affairs", location: "Cairo, Egypt", type: "CONTRACT", status: "OPEN", applications: 11, postedDate: "2026-03-20", closingDate: "2026-04-28", description: "Monitor clinical trials, ensure GCP compliance, and manage site relationships.", salaryRange: "$30,000 - $38,000/yr", requirements: "BSc Pharmacy/Medicine, GCP certified, CRA experience" },
  { id: 10, title: "Warehouse Supervisor (Pharma)", department: "Logistics", location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "CLOSED", applications: 28, postedDate: "2026-02-01", closingDate: "2026-03-01", description: "Manage pharmaceutical warehouse operations including GDP compliance and temperature monitoring.", salaryRange: "$14,000 - $18,000/yr", requirements: "BSc, GDP knowledge, warehouse management" },
];

const statusColors: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  DRAFT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const typeLabels: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "", department: "", location: "", type: "FULL_TIME", description: "", salaryRange: "", requirements: "",
  });

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newJob.title) return;
    const job: Job = {
      id: jobs.length + 1,
      ...newJob,
      status: "OPEN",
      applications: 0,
      postedDate: new Date().toISOString().split("T")[0],
      closingDate: "",
    };
    setJobs([job, ...jobs]);
    setNewJob({ title: "", department: "", location: "", type: "FULL_TIME", description: "", salaryRange: "", requirements: "" });
    setIsDialogOpen(false);
  };

  const columns: Column<Job>[] = [
    {
      key: "title",
      label: "Position",
      render: (_, row) => (
        <div>
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.salaryRange}</p>
        </div>
      ),
    },
    { key: "department", label: "Department" },
    {
      key: "location",
      label: "Location",
      render: (val) => (
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {String(val)}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (val) => (
        <Badge variant="outline">{typeLabels[String(val)] ?? String(val)}</Badge>
      ),
    },
    {
      key: "requirements",
      label: "Key Requirements",
      render: (val) => <span className="text-xs text-muted-foreground">{String(val)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[String(val)] ?? ""}`}>
          {String(val)}
        </span>
      ),
    },
    {
      key: "applications",
      label: "Applications",
      render: (val) => (
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {String(val)}
        </span>
      ),
    },
    { key: "postedDate", label: "Posted" },
    { key: "closingDate", label: "Closing", render: (val) => <span className="text-muted-foreground">{String(val) || "—"}</span> },
  ];

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const totalApps = jobs.reduce((s, j) => s + j.applications, 0);

  return (
    <div className="p-6">
      <PageHeader title="Pharmaceutical Job Postings" description="Manage open positions across pharma departments — sales, manufacturing, QA, R&D, regulatory">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Post New Position
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Positions" value={jobs.length} icon={<Briefcase className="h-5 w-5" />} />
        <StatsCard title="Open Positions" value={openCount} icon={<Stethoscope className="h-5 w-5" />} trend={{ value: 8.5, label: "vs last month" }} />
        <StatsCard title="Total Applications" value={totalApps} icon={<Users className="h-5 w-5" />} trend={{ value: 15.2, label: "vs last month" }} />
        <StatsCard title="Avg. Time to Fill" value="32 days" icon={<Clock className="h-5 w-5" />} trend={{ value: -5.1, label: "vs last quarter" }} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions, departments, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="No positions found." />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post New Pharmaceutical Position</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Job Title</Label>
              <Input placeholder="e.g. Medical Representative" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Department</Label>
                <Select value={newJob.department} onValueChange={(v) => setNewJob({ ...newJob, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {["Sales & Marketing", "Quality Assurance", "Manufacturing", "Research & Development", "Regulatory Affairs", "Medical Affairs", "Supply Chain", "Logistics", "Finance", "HR"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input placeholder="Cairo, Egypt" value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Employment Type</Label>
                <Select value={newJob.type} onValueChange={(v) => setNewJob({ ...newJob, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Salary Range</Label>
                <Input placeholder="$18,000 - $24,000/yr" value={newJob.salaryRange} onChange={(e) => setNewJob({ ...newJob, salaryRange: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Key Requirements</Label>
              <Input placeholder="BSc Pharmacy, 2+ yrs experience..." value={newJob.requirements} onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Job Description</Label>
              <Textarea placeholder="Describe the role, responsibilities..." value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Post Position</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Briefcase, MapPin, Users, Clock, Plus, Stethoscope } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";

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
  FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract", INTERNSHIP: "Internship",
};

const JOB_FIELDS: EntityField[] = [
  { name: "title", label: "Job Title", type: "text", placeholder: "e.g. Medical Representative", required: true, fullWidth: true },
  { name: "department", label: "Department", type: "select", options: [
    { label: "Sales & Marketing", value: "Sales & Marketing" }, { label: "Quality Assurance", value: "Quality Assurance" },
    { label: "Manufacturing", value: "Manufacturing" }, { label: "Research & Development", value: "Research & Development" },
    { label: "Regulatory Affairs", value: "Regulatory Affairs" }, { label: "Medical Affairs", value: "Medical Affairs" },
    { label: "Supply Chain", value: "Supply Chain" }, { label: "Logistics", value: "Logistics" },
  ]},
  { name: "location", label: "Location", type: "text", placeholder: "Cairo, Egypt" },
  { name: "type", label: "Employment Type", type: "select", defaultValue: "FULL_TIME", options: [
    { label: "Full Time", value: "FULL_TIME" }, { label: "Part Time", value: "PART_TIME" },
    { label: "Contract", value: "CONTRACT" }, { label: "Internship", value: "INTERNSHIP" },
  ]},
  { name: "salaryRange", label: "Salary Range", type: "text", placeholder: "$18,000 - $24,000/yr" },
  { name: "requirements", label: "Key Requirements", type: "text", placeholder: "BSc Pharmacy, 2+ yrs experience...", fullWidth: true },
  { name: "description", label: "Job Description", type: "textarea", placeholder: "Describe the role, responsibilities...", fullWidth: true },
];

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Open", value: "OPEN" }, { label: "Paused", value: "PAUSED" },
    { label: "Closed", value: "CLOSED" }, { label: "Draft", value: "DRAFT" },
  ]},
  { key: "department", label: "Department", type: "select" as const, options: [
    { label: "Sales & Marketing", value: "Sales & Marketing" }, { label: "Quality Assurance", value: "Quality Assurance" },
    { label: "Manufacturing", value: "Manufacturing" }, { label: "R&D", value: "Research & Development" },
    { label: "Medical Affairs", value: "Medical Affairs" },
  ]},
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", department: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);

  const filtered = jobs.filter((j) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q) || j.location.toLowerCase().includes(q);
    const matchesStatus = !filters.status || j.status === filters.status;
    const matchesDept = !filters.department || j.department === filters.department;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const statusFlow: Record<string, string> = { OPEN: "PAUSED", PAUSED: "OPEN", DRAFT: "OPEN" };

  const columns: Column<Job>[] = [
    {
      key: "title", label: "Position",
      render: (_, row) => (<div><p className="font-medium text-foreground">{row.title}</p><p className="text-xs text-muted-foreground">{row.salaryRange}</p></div>),
    },
    { key: "department", label: "Department" },
    { key: "location", label: "Location", render: (val) => (<span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{String(val)}</span>) },
    { key: "type", label: "Type", render: (val) => (<Badge variant="outline">{typeLabels[String(val)] ?? String(val)}</Badge>) },
    { key: "requirements", label: "Key Requirements", render: (val) => <span className="text-xs text-muted-foreground">{String(val)}</span> },
    { key: "status", label: "Status", render: (val) => (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[String(val)] ?? ""}`}>{String(val)}</span>) },
    { key: "applications", label: "Applications", render: (val) => (<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" />{String(val)}</span>) },
    { key: "postedDate", label: "Posted" },
    { key: "closingDate", label: "Closing", render: (val) => <span className="text-muted-foreground">{String(val) || "—"}</span> },
    {
      key: "id", label: "",
      render: (_, row) => {
        const next = statusFlow[row.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(row); setShowModal(true); }}
            onDelete={() => setJobs((prev) => prev.filter((j) => j.id !== row.id))}
            itemLabel={row.title}
            extraItems={[
              ...(next ? [{ label: `Set ${next}`, onClick: () => setJobs((prev) => prev.map((j) => j.id === row.id ? { ...j, status: next } : j)) }] : []),
              ...(row.status !== "CLOSED" ? [{ label: "Close Position", onClick: () => setJobs((prev) => prev.map((j) => j.id === row.id ? { ...j, status: "CLOSED" } : j)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const totalApps = jobs.reduce((s, j) => s + j.applications, 0);

  return (
    <div className="p-6">
      <PageHeader title="Pharmaceutical Job Postings" description="Manage open positions across pharma departments — sales, manufacturing, QA, R&D, regulatory">
        <Button onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Post New Position
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Positions" value={jobs.length} icon={Briefcase} />
        <StatsCard title="Open Positions" value={openCount} icon={Stethoscope} change={8.5} changeLabel="vs last month" />
        <StatsCard title="Total Applications" value={totalApps} icon={Users} change={15.2} changeLabel="vs last month" />
        <StatsCard title="Avg. Time to Fill" value="32 days" icon={Clock} change={-5.1} changeLabel="vs last quarter" />
      </div>

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
        <DataTable columns={columns} data={filtered} emptyMessage="No positions found." />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Position" : "Post New Pharmaceutical Position"}
        fields={JOB_FIELDS}
        initialData={editing ? { title: editing.title, department: editing.department, location: editing.location, type: editing.type, salaryRange: editing.salaryRange, requirements: editing.requirements, description: editing.description } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setJobs((prev) => prev.map((j) => j.id === editing.id ? {
              ...j,
              title: data.title as string,
              department: (data.department as string) || j.department,
              location: (data.location as string) || j.location,
              type: (data.type as string) || j.type,
              salaryRange: (data.salaryRange as string) || j.salaryRange,
              requirements: (data.requirements as string) || j.requirements,
              description: (data.description as string) || j.description,
            } : j));
          } else {
            const job: Job = {
              id: Date.now(),
              title: data.title as string,
              department: (data.department as string) || "",
              location: (data.location as string) || "",
              type: (data.type as string) || "FULL_TIME",
              status: "OPEN",
              applications: 0,
              postedDate: new Date().toISOString().split("T")[0],
              closingDate: "",
              description: (data.description as string) || "",
              salaryRange: (data.salaryRange as string) || "",
              requirements: (data.requirements as string) || "",
            };
            setJobs((prev) => [job, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

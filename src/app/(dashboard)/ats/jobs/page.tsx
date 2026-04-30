"use client";

import { useState } from "react";
import { Briefcase, MapPin, Users, Clock, Plus, Stethoscope } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { useDataStore, type Job } from "@/lib/data-store";

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
  { name: "salaryRange", label: "Salary Range", type: "text", placeholder: "EGP 18,000 - EGP 24,000/yr" },
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
  const store = useDataStore();
  const jobs = store.jobs;
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", department: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);

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
            onDelete={() => store.remove("jobs", row.id)}
            onView={() => setDetailJob(row)}
            canView
            itemLabel={row.title}
            extraItems={[
              ...(next ? [{ label: `Set ${next}`, onClick: () => store.update("jobs", row.id, { status: next }) }] : []),
              ...(row.status !== "CLOSED" ? [{ label: "Close Position", onClick: () => store.update("jobs", row.id, { status: "CLOSED" }) }] : []),
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
        <DataTable columns={columns} data={filtered} emptyMessage="No positions found." exportable exportFilename="jobs.csv" />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Position" : "Post New Pharmaceutical Position"}
        fields={JOB_FIELDS}
        initialData={editing ? { title: editing.title, department: editing.department, location: editing.location, type: editing.type, salaryRange: editing.salaryRange, requirements: editing.requirements, description: editing.description } : undefined}
        onSubmit={(data) => {
          if (editing) {
            store.update("jobs", editing.id, {
              title: data.title as string,
              department: (data.department as string) || editing.department,
              location: (data.location as string) || editing.location,
              type: (data.type as string) || editing.type,
              salaryRange: (data.salaryRange as string) || editing.salaryRange,
              requirements: (data.requirements as string) || editing.requirements,
              description: (data.description as string) || editing.description,
            });
          } else {
            store.add("jobs", {
              id: store.genId("job"),
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
            });
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Job Detail Dialog ── */}
      <Dialog open={!!detailJob} onOpenChange={(open) => { if (!open) setDetailJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailJob?.title}</DialogTitle>
          </DialogHeader>
          {detailJob && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Department</span><p className="font-medium">{detailJob.department}</p></div>
                <div><span className="text-sm text-muted-foreground">Location</span><p className="font-medium">{detailJob.location}</p></div>
                <div><span className="text-sm text-muted-foreground">Employment Type</span><p className="font-medium">{typeLabels[detailJob.type] ?? detailJob.type}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[detailJob.status] ?? ""}`}>{detailJob.status}</span></p>
                </div>
                <div><span className="text-sm text-muted-foreground">Salary Range</span><p className="font-medium">{detailJob.salaryRange || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Applications</span><p className="font-medium">{detailJob.applications}</p></div>
                <div><span className="text-sm text-muted-foreground">Posted Date</span><p className="font-medium">{detailJob.postedDate}</p></div>
                <div><span className="text-sm text-muted-foreground">Closing Date</span><p className="font-medium">{detailJob.closingDate || "—"}</p></div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Requirements</span>
                <p className="font-medium mt-1">{detailJob.requirements || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Full Description</span>
                <p className="font-medium mt-1 whitespace-pre-wrap">{detailJob.description || "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

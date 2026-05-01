"use client";

import { useState } from "react";
import { Users, UserCheck, Star, GraduationCap, Plus } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type Candidate } from "@/lib/data-store";

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SCREENING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFFER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  HIRED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SOURCE_OPTIONS = [
  { label: "LinkedIn", value: "LinkedIn" }, { label: "Indeed", value: "Indeed" },
  { label: "Referral", value: "Referral" }, { label: "Company Site", value: "Company Site" },
  { label: "University Career Fair", value: "University Career Fair" },
  { label: "Recruitment Agency", value: "Recruitment Agency" },
];

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Applied", value: "APPLIED" }, { label: "Screening", value: "SCREENING" },
    { label: "Interview", value: "INTERVIEW" }, { label: "Offer", value: "OFFER" },
    { label: "Hired", value: "HIRED" }, { label: "Rejected", value: "REJECTED" },
  ]},
  { key: "source", label: "Source", type: "select" as const, options: [
    { label: "LinkedIn", value: "LinkedIn" }, { label: "Indeed", value: "Indeed" },
    { label: "Referral", value: "Referral" }, { label: "Company Site", value: "Company Site" },
    { label: "University Career Fair", value: "University Career Fair" },
  ]},
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
        />
      ))}
    </div>
  );
}

export default function CandidatesPage() {
  const store = useDataStore();
  const candidates = store.candidates;
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", source: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  const filtered = candidates.filter((c) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.appliedFor.toLowerCase().includes(q) || c.degree.toLowerCase().includes(q);
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesSource = !filters.source || c.source === filters.source;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const inInterview = candidates.filter((c) => c.status === "INTERVIEW").length;
  const offersSent = candidates.filter((c) => c.status === "OFFER").length;
  const pharmacyDegrees = candidates.filter((c) => c.degree.toLowerCase().includes("pharmacy") || c.degree.toLowerCase().includes("phd")).length;

  const statusFlow: Record<string, string> = {
    APPLIED: "SCREENING", SCREENING: "INTERVIEW", INTERVIEW: "OFFER", OFFER: "HIRED",
  };

  const jobOptions = store.jobs
    .filter(j => j.status === "OPEN")
    .map(j => ({ label: j.title, value: j.title }));

  const candidateFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", placeholder: "Dr. Ahmed Mohamed", required: true },
    { name: "email", label: "Email", type: "email", placeholder: "ahmed@email.com", required: true },
    { name: "degree", label: "Qualification / Degree", type: "text", placeholder: "BSc Pharmacy, Cairo University", fullWidth: true },
    { name: "currentCompany", label: "Current Employer", type: "text", placeholder: "Current company" },
    { name: "appliedFor", label: "Applying For", type: "select", options: jobOptions.length > 0 ? jobOptions : [{ label: "No open positions", value: "" }] },
    { name: "experience", label: "Experience", type: "text", placeholder: "3 yrs pharma sales" },
    { name: "source", label: "Source", type: "select", defaultValue: "LinkedIn", options: SOURCE_OPTIONS },
  ];

  const columns: Column<Candidate>[] = [
    {
      key: "name",
      label: "Candidate",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {row.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: "degree", label: "Qualification", render: (val) => <span className="text-xs">{String(val)}</span> },
    { key: "currentCompany", label: "Current Employer" },
    { key: "appliedFor", label: "Applied For" },
    { key: "experience", label: "Experience", render: (val) => <span className="text-xs text-muted-foreground">{String(val)}</span> },
    { key: "source", label: "Source", render: (val) => <Badge variant="outline">{String(val)}</Badge> },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[String(val)] ?? ""}`}>
          {String(val)}
        </span>
      ),
    },
    { key: "rating", label: "Rating", render: (val) => <StarRating rating={Number(val)} /> },
    { key: "appliedDate", label: "Applied" },
    {
      key: "id",
      label: "",
      render: (_, row) => {
        const next = statusFlow[row.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(row); setShowModal(true); }}
            onDelete={() => store.remove("candidates", row.id)}
            onView={() => setDetailCandidate(row)}
            canView
            itemLabel={row.name}
            extraItems={[
              ...(next ? [{ label: `Move to ${next}`, onClick: () => store.update("candidates", row.id, { status: next }) }] : []),
              ...(row.status !== "REJECTED" && row.status !== "HIRED" ? [{ label: "Reject", onClick: () => store.update("candidates", row.id, { status: "REJECTED" }) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Pharmaceutical Candidates" description="Track applicants for pharma positions — sales, QA, manufacturing, R&D, regulatory">
        <Button onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Candidates" value={candidates.length} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="In Interview" value={inInterview} icon={<UserCheck className="h-5 w-5" />} trend={{ value: 22.0, label: "vs last week" }} />
        <StatsCard title="Offers Extended" value={offersSent} icon={<Star className="h-5 w-5" />} />
        <StatsCard title="Pharmacy Graduates" value={pharmacyDegrees} icon={<GraduationCap className="h-5 w-5" />} subtitle={`${Math.round(pharmacyDegrees / candidates.length * 100)}% of pool`} />
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
        <DataTable columns={columns} data={filtered} emptyMessage="No candidates found." exportable exportFilename="candidates.csv" />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Candidate" : "Add Pharmaceutical Candidate"}
        fields={candidateFields}
        initialData={editing ? { name: editing.name, email: editing.email, degree: editing.degree, currentCompany: editing.currentCompany, appliedFor: editing.appliedFor, experience: editing.experience, source: editing.source } : undefined}
        onSubmit={(data) => {
          if (editing) {
            store.update("candidates", editing.id, {
              name: data.name as string,
              email: data.email as string,
              degree: (data.degree as string) || editing.degree,
              currentCompany: (data.currentCompany as string) || editing.currentCompany,
              appliedFor: (data.appliedFor as string) || editing.appliedFor,
              experience: (data.experience as string) || editing.experience,
              source: (data.source as string) || editing.source,
            });
          } else {
            store.add("candidates", {
              id: store.genId("cand"),
              name: data.name as string,
              email: data.email as string,
              degree: (data.degree as string) || "",
              currentCompany: (data.currentCompany as string) || "",
              appliedFor: (data.appliedFor as string) || "",
              experience: (data.experience as string) || "",
              source: (data.source as string) || "LinkedIn",
              status: "APPLIED",
              rating: 3,
              appliedDate: new Date().toISOString().split("T")[0],
            });
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Candidate Detail Dialog ── */}
      <Dialog open={!!detailCandidate} onOpenChange={(open) => { if (!open) setDetailCandidate(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCandidate?.name}</DialogTitle>
          </DialogHeader>
          {detailCandidate && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Full Name</span><p className="font-medium">{detailCandidate.name}</p></div>
                <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailCandidate.email}</p></div>
                <div><span className="text-sm text-muted-foreground">Current Employer</span><p className="font-medium">{detailCandidate.currentCompany || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Applied For</span><p className="font-medium">{detailCandidate.appliedFor}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[detailCandidate.status] ?? ""}`}>{detailCandidate.status}</span></p>
                </div>
                <div><span className="text-sm text-muted-foreground">Source</span><p className="font-medium">{detailCandidate.source}</p></div>
                <div><span className="text-sm text-muted-foreground">Degree / Qualification</span><p className="font-medium">{detailCandidate.degree || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Experience</span><p className="font-medium">{detailCandidate.experience || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Applied Date</span><p className="font-medium">{detailCandidate.appliedDate}</p></div>
              </div>
              {/* Rating with stars */}
              <div>
                <span className="text-sm text-muted-foreground">Rating</span>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-5 w-5 ${s <= detailCandidate.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  ))}
                  <span className="ml-2 font-semibold">{detailCandidate.rating} / 5</span>
                </div>
              </div>
              {detailCandidate.status === "HIRED" && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Cross-Module Actions</span>
                  {store.employees.some(e => e.email === detailCandidate.email) ? (
                    <p className="text-sm text-green-600 font-medium mt-1">Employee record already exists in HR</p>
                  ) : (
                    <Button
                      className="mt-2 w-full"
                      onClick={() => {
                        store.add("employees", {
                          id: store.genId("emp"),
                          employeeId: `EMP-${String(store.employees.length + 1).padStart(3, "0")}`,
                          name: detailCandidate.name,
                          email: detailCandidate.email,
                          department: detailCandidate.appliedFor,
                          position: detailCandidate.appliedFor,
                          hireDate: new Date().toISOString().split("T")[0],
                          salary: 0,
                          status: "ACTIVE",
                          manager: "—",
                          phone: "",
                        });
                        setDetailCandidate(null);
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Create Employee Record in HR
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

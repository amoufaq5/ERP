"use client";

import { useState } from "react";
import { Users, UserCheck, Star, GraduationCap, Plus } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";

interface Candidate {
  id: number;
  name: string;
  email: string;
  degree: string;
  currentCompany: string;
  appliedFor: string;
  experience: string;
  source: string;
  status: string;
  rating: number;
  appliedDate: string;
}

const initialCandidates: Candidate[] = [
  { id: 1, name: "Dr. Amira Hassan", email: "amira.h@email.com", degree: "BSc Pharmacy, Ain Shams", currentCompany: "Hikma Pharmaceuticals", appliedFor: "District Sales Manager", experience: "6 yrs pharma sales", source: "LinkedIn", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-01" },
  { id: 2, name: "Mohamed El-Sayed", email: "mohamed.e@email.com", degree: "BSc Pharmacy, Cairo Univ", currentCompany: "EIPICO", appliedFor: "Medical Representative", experience: "2 yrs pharma sales", source: "Referral", status: "SCREENING", rating: 4, appliedDate: "2026-03-05" },
  { id: 3, name: "Dr. Fatima Khaled", email: "fatima.k@email.com", degree: "MSc Analytical Chemistry", currentCompany: "Pharco Pharmaceuticals", appliedFor: "Quality Control Analyst", experience: "4 yrs QC lab", source: "Company Site", status: "OFFER", rating: 5, appliedDate: "2026-03-02" },
  { id: 4, name: "Ahmed Mansour", email: "ahmed.m@email.com", degree: "BSc Pharmacy, Alex Univ", currentCompany: "Novartis Egypt", appliedFor: "Regulatory Affairs Specialist", experience: "5 yrs regulatory", source: "LinkedIn", status: "INTERVIEW", rating: 4, appliedDate: "2026-03-08" },
  { id: 5, name: "Sara Ibrahim", email: "sara.i@email.com", degree: "BSc Pharmacy, Tanta Univ", currentCompany: "Fresh Graduate", appliedFor: "Medical Representative", experience: "Internship only", source: "University Career Fair", status: "APPLIED", rating: 3, appliedDate: "2026-03-10" },
  { id: 6, name: "Dr. Khaled Nabil", email: "khaled.n@email.com", degree: "PhD Pharmaceutics", currentCompany: "GSK Egypt", appliedFor: "R&D Formulation Scientist", experience: "8 yrs R&D", source: "LinkedIn", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-09" },
  { id: 7, name: "Noura Youssef", email: "noura.y@email.com", degree: "BSc Pharmacy, Mansoura", currentCompany: "Amoun Pharmaceutical", appliedFor: "Production Pharmacist", experience: "3 yrs manufacturing", source: "Indeed", status: "SCREENING", rating: 4, appliedDate: "2026-03-12" },
  { id: 8, name: "Dr. Tarek Abdel-Fattah", email: "tarek.a@email.com", degree: "MD, MSc Pharmacology", currentCompany: "Pfizer Egypt", appliedFor: "Pharmacovigilance Officer", experience: "4 yrs PV", source: "Referral", status: "OFFER", rating: 5, appliedDate: "2026-03-06" },
  { id: 9, name: "Yasser Reda", email: "yasser.r@email.com", degree: "BSc + MBA", currentCompany: "Bayer Egypt", appliedFor: "Supply Chain Manager", experience: "9 yrs supply chain", source: "LinkedIn", status: "APPLIED", rating: 4, appliedDate: "2026-03-14" },
  { id: 10, name: "Heba Mostafa", email: "heba.m@email.com", degree: "BSc Pharmacy, Zagazig", currentCompany: "Sedico Pharma", appliedFor: "Medical Representative", experience: "1 yr pharma sales", source: "Indeed", status: "REJECTED", rating: 2, appliedDate: "2026-02-28" },
  { id: 11, name: "Omar Farouk", email: "omar.f@email.com", degree: "BSc Chemistry", currentCompany: "National Org for Drug Control", appliedFor: "Quality Control Analyst", experience: "6 yrs analytical", source: "Company Site", status: "INTERVIEW", rating: 4, appliedDate: "2026-03-15" },
  { id: 12, name: "Dina Samy", email: "dina.s@email.com", degree: "BSc Pharmacy, Cairo Univ", currentCompany: "AstraZeneca Egypt", appliedFor: "Clinical Research Associate", experience: "3 yrs CRA, GCP certified", source: "LinkedIn", status: "SCREENING", rating: 4, appliedDate: "2026-03-16" },
];

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SCREENING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFFER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  HIRED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const CANDIDATE_FIELDS: EntityField[] = [
  { name: "name", label: "Full Name", type: "text", placeholder: "Dr. Ahmed Mohamed", required: true },
  { name: "email", label: "Email", type: "email", placeholder: "ahmed@email.com", required: true },
  { name: "degree", label: "Qualification / Degree", type: "text", placeholder: "BSc Pharmacy, Cairo University", fullWidth: true },
  { name: "currentCompany", label: "Current Employer", type: "text", placeholder: "Current company" },
  { name: "appliedFor", label: "Applying For", type: "select", options: [
    { label: "Medical Representative", value: "Medical Representative" },
    { label: "District Sales Manager", value: "District Sales Manager" },
    { label: "Quality Control Analyst", value: "Quality Control Analyst" },
    { label: "Production Pharmacist", value: "Production Pharmacist" },
    { label: "R&D Formulation Scientist", value: "R&D Formulation Scientist" },
    { label: "Regulatory Affairs Specialist", value: "Regulatory Affairs Specialist" },
    { label: "Pharmacovigilance Officer", value: "Pharmacovigilance Officer" },
    { label: "Supply Chain Manager", value: "Supply Chain Manager" },
    { label: "Clinical Research Associate", value: "Clinical Research Associate" },
  ]},
  { name: "experience", label: "Experience", type: "text", placeholder: "3 yrs pharma sales" },
  { name: "source", label: "Source", type: "select", defaultValue: "LinkedIn", options: [
    { label: "LinkedIn", value: "LinkedIn" }, { label: "Indeed", value: "Indeed" },
    { label: "Referral", value: "Referral" }, { label: "Company Site", value: "Company Site" },
    { label: "University Career Fair", value: "University Career Fair" },
    { label: "Recruitment Agency", value: "Recruitment Agency" },
  ]},
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
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", source: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);

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
            onDelete={() => setCandidates((prev) => prev.filter((c) => c.id !== row.id))}
            itemLabel={row.name}
            extraItems={[
              ...(next ? [{ label: `Move to ${next}`, onClick: () => setCandidates((prev) => prev.map((c) => c.id === row.id ? { ...c, status: next } : c)) }] : []),
              ...(row.status !== "REJECTED" && row.status !== "HIRED" ? [{ label: "Reject", onClick: () => setCandidates((prev) => prev.map((c) => c.id === row.id ? { ...c, status: "REJECTED" } : c)) }] : []),
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
        <DataTable columns={columns} data={filtered} emptyMessage="No candidates found." />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Candidate" : "Add Pharmaceutical Candidate"}
        fields={CANDIDATE_FIELDS}
        initialData={editing ? { name: editing.name, email: editing.email, degree: editing.degree, currentCompany: editing.currentCompany, appliedFor: editing.appliedFor, experience: editing.experience, source: editing.source } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setCandidates((prev) => prev.map((c) => c.id === editing.id ? {
              ...c,
              name: data.name as string,
              email: data.email as string,
              degree: (data.degree as string) || c.degree,
              currentCompany: (data.currentCompany as string) || c.currentCompany,
              appliedFor: (data.appliedFor as string) || c.appliedFor,
              experience: (data.experience as string) || c.experience,
              source: (data.source as string) || c.source,
            } : c));
          } else {
            const candidate: Candidate = {
              id: candidates.length + 1,
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
            };
            setCandidates((prev) => [candidate, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Users, UserCheck, Star, TrendingUp, Plus, Search, GraduationCap } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "", email: "", degree: "", currentCompany: "", appliedFor: "", experience: "", source: "LinkedIn",
  });

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.appliedFor.toLowerCase().includes(search.toLowerCase()) ||
      c.degree.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newCandidate.name || !newCandidate.email) return;
    const candidate: Candidate = {
      id: candidates.length + 1,
      ...newCandidate,
      status: "APPLIED",
      rating: 3,
      appliedDate: new Date().toISOString().split("T")[0],
    };
    setCandidates([candidate, ...candidates]);
    setNewCandidate({ name: "", email: "", degree: "", currentCompany: "", appliedFor: "", experience: "", source: "LinkedIn" });
    setIsDialogOpen(false);
  };

  const inInterview = candidates.filter((c) => c.status === "INTERVIEW").length;
  const offersSent = candidates.filter((c) => c.status === "OFFER").length;
  const pharmacyDegrees = candidates.filter((c) => c.degree.toLowerCase().includes("pharmacy") || c.degree.toLowerCase().includes("phd")).length;

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
    {
      key: "degree",
      label: "Qualification",
      render: (val) => <span className="text-xs">{String(val)}</span>,
    },
    { key: "currentCompany", label: "Current Employer" },
    { key: "appliedFor", label: "Applied For" },
    {
      key: "experience",
      label: "Experience",
      render: (val) => <span className="text-xs text-muted-foreground">{String(val)}</span>,
    },
    {
      key: "source",
      label: "Source",
      render: (val) => <Badge variant="outline">{String(val)}</Badge>,
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
      key: "rating",
      label: "Rating",
      render: (val) => <StarRating rating={Number(val)} />,
    },
    { key: "appliedDate", label: "Applied" },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Pharmaceutical Candidates" description="Track applicants for pharma positions — sales, QA, manufacturing, R&D, regulatory">
        <Button onClick={() => setIsDialogOpen(true)}>
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
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, qualification, position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="No candidates found." />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Pharmaceutical Candidate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Full Name</Label>
                <Input placeholder="Dr. Ahmed Mohamed" value={newCandidate.name} onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="ahmed@email.com" value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Qualification / Degree</Label>
              <Input placeholder="BSc Pharmacy, Cairo University" value={newCandidate.degree} onChange={(e) => setNewCandidate({ ...newCandidate, degree: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Current Employer</Label>
                <Input placeholder="Current company" value={newCandidate.currentCompany} onChange={(e) => setNewCandidate({ ...newCandidate, currentCompany: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Applying For</Label>
                <Select value={newCandidate.appliedFor} onValueChange={(v) => setNewCandidate({ ...newCandidate, appliedFor: v })}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {["Medical Representative", "District Sales Manager", "Quality Control Analyst", "Production Pharmacist", "R&D Formulation Scientist", "Regulatory Affairs Specialist", "Pharmacovigilance Officer", "Supply Chain Manager", "Clinical Research Associate"].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Experience</Label>
                <Input placeholder="3 yrs pharma sales" value={newCandidate.experience} onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Source</Label>
                <Select value={newCandidate.source} onValueChange={(v) => setNewCandidate({ ...newCandidate, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LinkedIn", "Indeed", "Referral", "Company Site", "University Career Fair", "Recruitment Agency"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

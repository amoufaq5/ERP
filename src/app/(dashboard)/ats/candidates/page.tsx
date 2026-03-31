"use client"

import { useState } from "react"
import {
  Users,
  UserCheck,
  Star,
  TrendingUp,
  Plus,
  Search,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable, { Column } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Candidate {
  id: number
  name: string
  email: string
  currentCompany: string
  appliedFor: string
  source: string
  status: string
  rating: number
  appliedDate: string
}

const initialCandidates: Candidate[] = [
  { id: 1, name: "Alice Johnson", email: "alice.j@email.com", currentCompany: "TechCorp", appliedFor: "Senior Software Engineer", source: "LinkedIn", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-01" },
  { id: 2, name: "Bob Martinez", email: "bob.m@email.com", currentCompany: "DataSoft", appliedFor: "Data Analyst", source: "Indeed", status: "SCREENING", rating: 4, appliedDate: "2026-03-05" },
  { id: 3, name: "Carol White", email: "carol.w@email.com", currentCompany: "DesignHub", appliedFor: "UX Designer", source: "Referral", status: "OFFER", rating: 5, appliedDate: "2026-03-02" },
  { id: 4, name: "David Kim", email: "david.k@email.com", currentCompany: "StartupXYZ", appliedFor: "Product Manager", source: "Company Site", status: "APPLIED", rating: 3, appliedDate: "2026-03-10" },
  { id: 5, name: "Emma Davis", email: "emma.d@email.com", currentCompany: "ConsultCo", appliedFor: "Senior Software Engineer", source: "LinkedIn", status: "REJECTED", rating: 2, appliedDate: "2026-02-28" },
  { id: 6, name: "Frank Wilson", email: "frank.w@email.com", currentCompany: "CloudTech", appliedFor: "DevOps Engineer", source: "AngelList", status: "INTERVIEW", rating: 4, appliedDate: "2026-03-08" },
  { id: 7, name: "Grace Lee", email: "grace.l@email.com", currentCompany: "MediaGroup", appliedFor: "Marketing Intern", source: "Indeed", status: "SCREENING", rating: 3, appliedDate: "2026-03-12" },
  { id: 8, name: "Henry Brown", email: "henry.b@email.com", currentCompany: "FinancePro", appliedFor: "Data Analyst", source: "Referral", status: "OFFER", rating: 4, appliedDate: "2026-03-06" },
  { id: 9, name: "Iris Chen", email: "iris.c@email.com", currentCompany: "HealthTech", appliedFor: "Product Manager", source: "LinkedIn", status: "APPLIED", rating: 4, appliedDate: "2026-03-14" },
  { id: 10, name: "Jack Taylor", email: "jack.t@email.com", currentCompany: "RetailMax", appliedFor: "UX Designer", source: "Dribbble", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-09" },
]

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SCREENING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFFER: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  HIRED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

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
  )
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    email: "",
    currentCompany: "",
    appliedFor: "",
    source: "LinkedIn",
  })

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.appliedFor.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!newCandidate.name || !newCandidate.email) return
    const candidate: Candidate = {
      id: candidates.length + 1,
      ...newCandidate,
      status: "APPLIED",
      rating: 3,
      appliedDate: new Date().toISOString().split("T")[0],
    }
    setCandidates([candidate, ...candidates])
    setNewCandidate({ name: "", email: "", currentCompany: "", appliedFor: "", source: "LinkedIn" })
    setIsDialogOpen(false)
  }

  const newThisWeek = candidates.filter((c) => {
    const d = new Date(c.appliedDate)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  }).length

  const inInterview = candidates.filter((c) => c.status === "INTERVIEW").length
  const offersSent = candidates.filter((c) => c.status === "OFFER").length

  const columns: Column<Candidate>[] = [
    {
      key: "name",
      label: "Name",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: "currentCompany", label: "Current Company" },
    { key: "appliedFor", label: "Applied For" },
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
    { key: "appliedDate", label: "Applied Date" },
  ]

  return (
    <div className="p-6">
      <PageHeader title="Candidates" description="Track and manage job applicants">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Candidates" value={candidates.length} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="New This Week" value={newThisWeek} icon={<TrendingUp className="h-5 w-5" />} trend={{ value: 18.2, label: "vs last week" }} />
        <StatsCard title="In Interview" value={inInterview} icon={<UserCheck className="h-5 w-5" />} />
        <StatsCard title="Offers Sent" value={offersSent} icon={<Star className="h-5 w-5" />} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
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
            <DialogTitle>Add New Candidate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={newCandidate.name} onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="john@email.com" value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Current Company</Label>
                <Input placeholder="Acme Corp" value={newCandidate.currentCompany} onChange={(e) => setNewCandidate({ ...newCandidate, currentCompany: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Applying For</Label>
                <Input placeholder="Software Engineer" value={newCandidate.appliedFor} onChange={(e) => setNewCandidate({ ...newCandidate, appliedFor: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Source</Label>
              <Select value={newCandidate.source} onValueChange={(v) => setNewCandidate({ ...newCandidate, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Indeed">Indeed</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Company Site">Company Site</SelectItem>
                  <SelectItem value="AngelList">AngelList</SelectItem>
                  <SelectItem value="Dribbble">Dribbble</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import {
  Briefcase,
  MapPin,
  Users,
  Clock,
  Plus,
  Search,
  Filter,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable, { Column } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface Job {
  id: number
  title: string
  department: string
  location: string
  type: string
  status: string
  applications: number
  postedDate: string
  closingDate: string
  description: string
  salaryRange: string
}

const initialJobs: Job[] = [
  {
    id: 1,
    title: "Senior Software Engineer",
    department: "Engineering",
    location: "San Francisco, CA",
    type: "FULL_TIME",
    status: "OPEN",
    applications: 42,
    postedDate: "2026-03-01",
    closingDate: "2026-04-15",
    description: "Lead development of core platform features.",
    salaryRange: "$140,000 - $180,000",
  },
  {
    id: 2,
    title: "Product Manager",
    department: "Product",
    location: "New York, NY",
    type: "FULL_TIME",
    status: "OPEN",
    applications: 31,
    postedDate: "2026-03-05",
    closingDate: "2026-04-20",
    description: "Drive product strategy and roadmap.",
    salaryRange: "$120,000 - $155,000",
  },
  {
    id: 3,
    title: "UX Designer",
    department: "Design",
    location: "Remote",
    type: "FULL_TIME",
    status: "OPEN",
    applications: 28,
    postedDate: "2026-03-08",
    closingDate: "2026-04-10",
    description: "Design intuitive user experiences.",
    salaryRange: "$95,000 - $125,000",
  },
  {
    id: 4,
    title: "Data Analyst",
    department: "Analytics",
    location: "Austin, TX",
    type: "FULL_TIME",
    status: "PAUSED",
    applications: 19,
    postedDate: "2026-02-20",
    closingDate: "2026-03-31",
    description: "Analyze business data and create dashboards.",
    salaryRange: "$80,000 - $105,000",
  },
  {
    id: 5,
    title: "Marketing Intern",
    department: "Marketing",
    location: "Chicago, IL",
    type: "INTERNSHIP",
    status: "OPEN",
    applications: 67,
    postedDate: "2026-03-10",
    closingDate: "2026-04-01",
    description: "Support marketing campaigns and content creation.",
    salaryRange: "$20/hr",
  },
  {
    id: 6,
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Seattle, WA",
    type: "CONTRACT",
    status: "CLOSED",
    applications: 15,
    postedDate: "2026-02-01",
    closingDate: "2026-03-01",
    description: "Manage CI/CD pipelines and cloud infrastructure.",
    salaryRange: "$90/hr",
  },
]

const statusColors: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  DRAFT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

const typeLabels: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "",
    type: "FULL_TIME",
    description: "",
    salaryRange: "",
  })

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!newJob.title) return
    const job: Job = {
      id: jobs.length + 1,
      ...newJob,
      status: "OPEN",
      applications: 0,
      postedDate: new Date().toISOString().split("T")[0],
      closingDate: "",
    }
    setJobs([job, ...jobs])
    setNewJob({ title: "", department: "", location: "", type: "FULL_TIME", description: "", salaryRange: "" })
    setIsDialogOpen(false)
  }

  const columns: Column<Job>[] = [
    {
      key: "title",
      label: "Title",
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
    { key: "postedDate", label: "Posted Date" },
    { key: "closingDate", label: "Closing Date", render: (val) => <span className="text-muted-foreground">{String(val) || "—"}</span> },
  ]

  const openCount = jobs.filter((j) => j.status === "OPEN").length
  const totalApps = jobs.reduce((s, j) => s + j.applications, 0)

  return (
    <div className="p-6">
      <PageHeader title="Jobs" description="Manage open positions and job postings">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Job
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Jobs" value={jobs.length} icon={<Briefcase className="h-5 w-5" />} />
        <StatsCard title="Open Positions" value={openCount} icon={<Briefcase className="h-5 w-5" />} trend={{ value: 5.2, label: "vs last month" }} />
        <StatsCard title="Applications Received" value={totalApps} icon={<Users className="h-5 w-5" />} trend={{ value: 12.1, label: "vs last month" }} />
        <StatsCard title="Time to Fill (days)" value="28" icon={<Clock className="h-5 w-5" />} trend={{ value: -3.4, label: "vs last month" }} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
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
        <DataTable columns={columns} data={filtered} emptyMessage="No jobs found." />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Job</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Job Title</Label>
              <Input placeholder="e.g. Senior Engineer" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Department</Label>
                <Input placeholder="Engineering" value={newJob.department} onChange={(e) => setNewJob({ ...newJob, department: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input placeholder="Remote" value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={newJob.type} onValueChange={(v) => setNewJob({ ...newJob, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Salary Range</Label>
                <Input placeholder="$80,000 - $100,000" value={newJob.salaryRange} onChange={(e) => setNewJob({ ...newJob, salaryRange: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Job description..." value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import {
  BookOpen, Users, CheckCircle, Star, Plus, Clock, Monitor, Users2, Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"
import PageHeader from "@/components/shared/page-header"

interface Course {
  id: number
  title: string
  description: string
  category: string
  duration: string
  format: "ONLINE" | "CLASSROOM" | "HYBRID"
  enrolled: number
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
}

interface Enrollment {
  id: number
  employee: string
  course: string
  status: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "DROPPED"
  enrolledDate: string
  completedDate: string | null
  score: number | null
}

const initialCourses: Course[] = [
  { id: 1, title: "Security Awareness Training", description: "Learn best practices for cybersecurity and data protection in the workplace.", category: "IT & Security", duration: "2 hours", format: "ONLINE", enrolled: 45, status: "ACTIVE" },
  { id: 2, title: "Leadership Foundations", description: "Core leadership skills for new and aspiring managers.", category: "Management", duration: "8 hours", format: "CLASSROOM", enrolled: 12, status: "ACTIVE" },
  { id: 3, title: "Technical Writing", description: "Effective documentation, reports, and professional communication.", category: "Communication", duration: "4 hours", format: "ONLINE", enrolled: 28, status: "ACTIVE" },
  { id: 4, title: "Project Management Essentials", description: "Introduction to PM methodologies including Agile, Scrum, and Waterfall.", category: "Operations", duration: "12 hours", format: "HYBRID", enrolled: 19, status: "ACTIVE" },
  { id: 5, title: "Sales Training Program", description: "Consultative selling techniques, negotiation, and CRM best practices.", category: "Sales", duration: "6 hours", format: "CLASSROOM", enrolled: 31, status: "ACTIVE" },
  { id: 6, title: "Compliance & Ethics", description: "Regulatory compliance, workplace ethics, and policy adherence.", category: "Compliance", duration: "3 hours", format: "ONLINE", enrolled: 58, status: "ACTIVE" },
]

const initialEnrollments: Enrollment[] = [
  { id: 1, employee: "Alice Johnson", course: "Security Awareness Training", status: "COMPLETED", enrolledDate: "2026-02-01", completedDate: "2026-02-03", score: 94 },
  { id: 2, employee: "Bob Smith", course: "Leadership Foundations", status: "IN_PROGRESS", enrolledDate: "2026-03-10", completedDate: null, score: null },
  { id: 3, employee: "Carol Davis", course: "Technical Writing", status: "COMPLETED", enrolledDate: "2026-01-15", completedDate: "2026-01-18", score: 88 },
  { id: 4, employee: "David Lee", course: "Project Management Essentials", status: "NOT_STARTED", enrolledDate: "2026-03-20", completedDate: null, score: null },
  { id: 5, employee: "Emma Wilson", course: "Sales Training Program", status: "COMPLETED", enrolledDate: "2026-02-10", completedDate: "2026-02-15", score: 91 },
  { id: 6, employee: "Frank Brown", course: "Compliance & Ethics", status: "COMPLETED", enrolledDate: "2026-01-05", completedDate: "2026-01-06", score: 82 },
  { id: 7, employee: "Grace Kim", course: "Security Awareness Training", status: "IN_PROGRESS", enrolledDate: "2026-03-25", completedDate: null, score: null },
  { id: 8, employee: "Henry Zhang", course: "Leadership Foundations", status: "COMPLETED", enrolledDate: "2026-02-20", completedDate: "2026-03-01", score: 79 },
  { id: 9, employee: "Isabella Martinez", course: "Technical Writing", status: "NOT_STARTED", enrolledDate: "2026-03-28", completedDate: null, score: null },
  { id: 10, employee: "James Taylor", course: "Compliance & Ethics", status: "COMPLETED", enrolledDate: "2026-03-01", completedDate: "2026-03-02", score: 96 },
]

const formatColors: Record<string, string> = {
  ONLINE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CLASSROOM: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  HYBRID: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  NOT_STARTED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  DROPPED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const FormatIcon = ({ format }: { format: string }) => {
  if (format === "ONLINE") return <Monitor className="h-3.5 w-3.5" />
  if (format === "CLASSROOM") return <Users2 className="h-3.5 w-3.5" />
  return <Layers className="h-3.5 w-3.5" />
}

const COURSE_FIELDS: EntityField[] = [
  { name: "title", label: "Course Title", type: "text", placeholder: "e.g. Advanced Excel", required: true, fullWidth: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Brief course description", fullWidth: true },
  { name: "category", label: "Category", type: "text", placeholder: "e.g. IT & Security" },
  { name: "duration", label: "Duration", type: "text", placeholder: "e.g. 4 hours" },
  { name: "format", label: "Format", type: "select", defaultValue: "ONLINE", options: [
    { label: "Online", value: "ONLINE" }, { label: "Classroom", value: "CLASSROOM" }, { label: "Hybrid", value: "HYBRID" },
  ]},
]

const FILTER_FIELDS = [
  { key: "format", label: "Format", type: "select" as const, options: [
    { label: "Online", value: "ONLINE" }, { label: "Classroom", value: "CLASSROOM" }, { label: "Hybrid", value: "HYBRID" },
  ]},
]

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "enrollments">("catalog")
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [filters, setFilters] = useState<FilterState>({ _search: "", format: "" })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [viewItem, setViewItem] = useState<Course | null>(null)
  const [viewEnrollment, setViewEnrollment] = useState<Enrollment | null>(null)

  const totalCourses = courses.length
  const activeEnrollments = initialEnrollments.filter((e) => e.status === "IN_PROGRESS").length
  const completed = initialEnrollments.filter((e) => e.status === "COMPLETED").length
  const scores = initialEnrollments.filter((e) => e.score !== null).map((e) => e.score as number)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const filteredCourses = courses.filter((c) => {
    const q = (filters._search || "").toLowerCase()
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    const matchesFormat = !filters.format || c.format === filters.format
    return matchesSearch && matchesFormat
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Training & Learning" description="Manage courses and track employee learning progress">
        <Button onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Courses</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><BookOpen className="h-[18px] w-[18px]" /></div>
            </div>
            <p className="text-2xl font-bold mt-3">{totalCourses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active Enrollments</span>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Users className="h-[18px] w-[18px]" /></div>
            </div>
            <p className="text-2xl font-bold mt-3">{activeEnrollments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
              <div className="h-9 w-9 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center"><CheckCircle className="h-[18px] w-[18px]" /></div>
            </div>
            <p className="text-2xl font-bold mt-3">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center"><Star className="h-[18px] w-[18px]" /></div>
            </div>
            <p className="text-2xl font-bold mt-3">{avgScore}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setActiveTab("catalog")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "catalog" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Course Catalog</button>
        <button onClick={() => setActiveTab("enrollments")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "enrollments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Enrollments</button>
      </div>

      {activeTab === "catalog" && (
        <>
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={FILTER_FIELDS}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <EditDeleteMenu
                      onView={() => setViewItem(course)}
                      onEdit={() => { setEditing(course); setShowModal(true) }}
                      onDelete={() => setCourses((prev) => prev.filter((c) => c.id !== course.id))}
                      itemLabel={course.title}
                      extraItems={course.status === "ACTIVE" ? [{ label: "Archive", onClick: () => setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, status: "ARCHIVED" } : c)) }] : [{ label: "Activate", onClick: () => setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, status: "ACTIVE" } : c)) }]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`shrink-0 text-xs ${formatColors[course.format]}`}>
                      <FormatIcon format={course.format} />
                      <span className="ml-1">{course.format}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.enrolled} enrolled</span>
                  </div>
                  <Badge className={course.status === "ACTIVE" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}>
                    {course.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {filteredCourses.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-10">No courses found.</div>
            )}
          </div>
        </>
      )}

      {activeTab === "enrollments" && (
        <DataTable
          columns={[
            { key: "employee", label: "Employee" },
            { key: "course", label: "Course" },
            {
              key: "status",
              label: "Status",
              render: (_v: unknown, row: unknown) => {
                const enrollment = row as Enrollment;
                return (
                  <Badge className={`text-xs ${statusColors[enrollment.status]}`}>{enrollment.status.replace(/_/g, " ")}</Badge>
                );
              },
            },
            { key: "enrolledDate", label: "Enrolled Date" },
            {
              key: "completedDate",
              label: "Completed Date",
              render: (v: unknown) => <span>{(v as string | null) ?? "—"}</span>,
            },
            {
              key: "score",
              label: "Score",
              render: (_v: unknown, row: unknown) => {
                const enrollment = row as Enrollment;
                if (enrollment.score !== null) {
                  return (
                    <span className={`font-semibold ${enrollment.score >= 90 ? "text-green-600" : enrollment.score >= 75 ? "text-yellow-600" : "text-red-600"}`}>{enrollment.score}%</span>
                  );
                }
                return <span className="text-muted-foreground">—</span>;
              },
            },
            {
              key: "actions",
              label: "",
              render: (_v: unknown, row: unknown) => {
                const enrollment = row as Enrollment;
                return (
                  <EditDeleteMenu
                    onView={() => setViewEnrollment(enrollment)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    canEdit={false}
                    canDelete={false}
                    itemLabel={enrollment.employee}
                  />
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={initialEnrollments as unknown as Record<string, unknown>[]}
          emptyMessage="No enrollments found."
          exportable
          exportFilename="training-enrollments.csv"
        />
      )}

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><span className="text-sm text-muted-foreground">Category</span><p className="font-medium">{viewItem?.category}</p></div>
            <div><span className="text-sm text-muted-foreground">Format</span><p className="font-medium">{viewItem?.format}</p></div>
            <div><span className="text-sm text-muted-foreground">Duration</span><p className="font-medium">{viewItem?.duration}</p></div>
            <div><span className="text-sm text-muted-foreground">Enrolled</span><p className="font-medium">{viewItem?.enrolled}</p></div>
            <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewItem?.status}</p></div>
            <div className="col-span-2"><span className="text-sm text-muted-foreground">Description</span><p className="font-medium">{viewItem?.description}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEnrollment} onOpenChange={(o) => !o && setViewEnrollment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewEnrollment?.employee} - {viewEnrollment?.course}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><span className="text-sm text-muted-foreground">Employee</span><p className="font-medium">{viewEnrollment?.employee}</p></div>
            <div><span className="text-sm text-muted-foreground">Course</span><p className="font-medium">{viewEnrollment?.course}</p></div>
            <div><span className="text-sm text-muted-foreground">Status</span><p className="font-medium">{viewEnrollment?.status?.replace(/_/g, " ")}</p></div>
            <div><span className="text-sm text-muted-foreground">Enrolled Date</span><p className="font-medium">{viewEnrollment?.enrolledDate}</p></div>
            <div><span className="text-sm text-muted-foreground">Completed Date</span><p className="font-medium">{viewEnrollment?.completedDate ?? "—"}</p></div>
            <div><span className="text-sm text-muted-foreground">Score</span><p className="font-medium">{viewEnrollment?.score !== null && viewEnrollment?.score !== undefined ? `${viewEnrollment.score}%` : "—"}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditing(null); }}
        title={editing ? "Edit Course" : "Add New Course"}
        fields={COURSE_FIELDS}
        initialData={editing ? { title: editing.title, description: editing.description, category: editing.category, duration: editing.duration, format: editing.format } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setCourses((prev) => prev.map((c) => c.id === editing.id ? {
              ...c,
              title: data.title as string,
              description: (data.description as string) || c.description,
              category: (data.category as string) || c.category,
              duration: (data.duration as string) || c.duration,
              format: (data.format as Course["format"]) || c.format,
            } : c))
          } else {
            setCourses((prev) => [...prev, {
              id: Date.now(),
              title: data.title as string,
              description: (data.description as string) || "",
              category: (data.category as string) || "General",
              duration: (data.duration as string) || "1 hour",
              format: (data.format as Course["format"]) || "ONLINE",
              enrolled: 0,
              status: "ACTIVE",
            }])
          }
          setShowModal(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

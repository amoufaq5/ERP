"use client"

import { useState } from "react"
import {
  BookOpen,
  Users,
  CheckCircle,
  Star,
  Plus,
  Clock,
  Monitor,
  Users2,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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
  {
    id: 1,
    title: "Security Awareness Training",
    description: "Learn best practices for cybersecurity and data protection in the workplace.",
    category: "IT & Security",
    duration: "2 hours",
    format: "ONLINE",
    enrolled: 45,
    status: "ACTIVE",
  },
  {
    id: 2,
    title: "Leadership Foundations",
    description: "Core leadership skills for new and aspiring managers.",
    category: "Management",
    duration: "8 hours",
    format: "CLASSROOM",
    enrolled: 12,
    status: "ACTIVE",
  },
  {
    id: 3,
    title: "Technical Writing",
    description: "Effective documentation, reports, and professional communication.",
    category: "Communication",
    duration: "4 hours",
    format: "ONLINE",
    enrolled: 28,
    status: "ACTIVE",
  },
  {
    id: 4,
    title: "Project Management Essentials",
    description: "Introduction to PM methodologies including Agile, Scrum, and Waterfall.",
    category: "Operations",
    duration: "12 hours",
    format: "HYBRID",
    enrolled: 19,
    status: "ACTIVE",
  },
  {
    id: 5,
    title: "Sales Training Program",
    description: "Consultative selling techniques, negotiation, and CRM best practices.",
    category: "Sales",
    duration: "6 hours",
    format: "CLASSROOM",
    enrolled: 31,
    status: "ACTIVE",
  },
  {
    id: 6,
    title: "Compliance & Ethics",
    description: "Regulatory compliance, workplace ethics, and policy adherence.",
    category: "Compliance",
    duration: "3 hours",
    format: "ONLINE",
    enrolled: 58,
    status: "ACTIVE",
  },
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

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "enrollments">("catalog")
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "",
    duration: "",
    format: "ONLINE" as Course["format"],
  })

  const totalCourses = courses.length
  const activeEnrollments = initialEnrollments.filter((e) => e.status === "IN_PROGRESS").length
  const completed = initialEnrollments.filter((e) => e.status === "COMPLETED").length
  const scores = initialEnrollments.filter((e) => e.score !== null).map((e) => e.score as number)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const handleAddCourse = () => {
    if (!newCourse.title) return
    const course: Course = {
      id: courses.length + 1,
      title: newCourse.title,
      description: newCourse.description,
      category: newCourse.category || "General",
      duration: newCourse.duration || "1 hour",
      format: newCourse.format,
      enrolled: 0,
      status: "ACTIVE",
    }
    setCourses([...courses, course])
    setNewCourse({ title: "", description: "", category: "", duration: "", format: "ONLINE" })
    setIsDialogOpen(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training & Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage courses and track employee learning progress</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Courses</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="h-[18px] w-[18px]" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{totalCourses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active Enrollments</span>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="h-[18px] w-[18px]" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{activeEnrollments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
              <div className="h-9 w-9 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                <CheckCircle className="h-[18px] w-[18px]" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                <Star className="h-[18px] w-[18px]" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{avgScore}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Course Catalog
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "enrollments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Enrollments
        </button>
      </div>

      {/* Course Catalog */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                  <Badge className={`shrink-0 text-xs ${formatColors[course.format]}`}>
                    <FormatIcon format={course.format} />
                    <span className="ml-1">{course.format}</span>
                  </Badge>
                </div>
                <Badge variant="outline" className="w-fit text-xs">{course.category}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.enrolled} enrolled
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    className={
                      course.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }
                  >
                    {course.status}
                  </Badge>
                  <Button variant="outline" size="sm" className="h-7 text-xs">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enrollments Table */}
      {activeTab === "enrollments" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {initialEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{enrollment.employee}</td>
                      <td className="px-4 py-3 text-muted-foreground">{enrollment.course}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${statusColors[enrollment.status]}`}>
                          {enrollment.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{enrollment.enrolledDate}</td>
                      <td className="px-4 py-3 text-muted-foreground">{enrollment.completedDate ?? "—"}</td>
                      <td className="px-4 py-3">
                        {enrollment.score !== null ? (
                          <span className={`font-semibold ${enrollment.score >= 90 ? "text-green-600" : enrollment.score >= 75 ? "text-yellow-600" : "text-red-600"}`}>
                            {enrollment.score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Course Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Course Title</Label>
              <Input
                placeholder="e.g. Advanced Excel"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief course description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g. IT & Security"
                  value={newCourse.category}
                  onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g. 4 hours"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newCourse.format}
                onChange={(e) => setNewCourse({ ...newCourse, format: e.target.value as Course["format"] })}
              >
                <option value="ONLINE">Online</option>
                <option value="CLASSROOM">Classroom</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCourse}>Add Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client";

import { useState } from "react";
import {
  BookOpen,
  Plus,
  Clock,
  Users,
  CheckCircle,
  Search,
  Send,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PolicyCategory = "IT" | "HR" | "Finance" | "Operations" | "Safety" | "Privacy";
type PolicyStatus = "Draft" | "Under Review" | "Approved" | "Effective" | "Archived";
type AckStatus = "Pending" | "Acknowledged" | "Overdue";
type ReviewStatus = "Not Started" | "In Review" | "Approved";

interface Policy {
  id: string;
  title: string;
  category: PolicyCategory;
  version: string;
  effectiveDate: string;
  reviewDate: string;
  owner: string;
  status: PolicyStatus;
}

interface Acknowledgment {
  id: string;
  policyId: string;
  policyTitle: string;
  employee: string;
  department: string;
  status: AckStatus;
  dueDate: string;
  acknowledgedDate: string | null;
}

interface ReviewRecord {
  id: string;
  policyId: string;
  policyTitle: string;
  reviewer: string;
  dueDate: string;
  status: ReviewStatus;
  changesMade: string;
}

interface TrainingRecord {
  id: string;
  policyTitle: string;
  trainingType: string;
  assignedTo: string;
  dueDate: string;
  completedDate: string | null;
  status: "Assigned" | "In Progress" | "Completed" | "Overdue";
}

const POLICIES: Policy[] = [
  { id: "POL-001", title: "Information Security Policy", category: "IT", version: "3.2", effectiveDate: "2025-09-01", reviewDate: "2026-09-01", owner: "Omar Khalil", status: "Effective" },
  { id: "POL-002", title: "Anti-Bribery and Corruption Policy", category: "Finance", version: "2.0", effectiveDate: "2025-06-15", reviewDate: "2026-06-15", owner: "Fatima Ali", status: "Effective" },
  { id: "POL-003", title: "Employee Code of Conduct", category: "HR", version: "4.1", effectiveDate: "2025-01-01", reviewDate: "2026-01-01", owner: "Sara Mahmoud", status: "Effective" },
  { id: "POL-004", title: "Data Retention Policy", category: "Privacy", version: "2.1", effectiveDate: "2025-03-01", reviewDate: "2026-03-01", owner: "Omar Khalil", status: "Effective" },
  { id: "POL-005", title: "Workplace Safety Policy", category: "Safety", version: "3.0", effectiveDate: "2025-07-01", reviewDate: "2026-07-01", owner: "Youssef Nabil", status: "Effective" },
  { id: "POL-006", title: "Remote Work Policy", category: "HR", version: "1.5", effectiveDate: "2025-04-01", reviewDate: "2026-04-01", owner: "Sara Mahmoud", status: "Under Review" },
  { id: "POL-007", title: "Procurement Ethics Policy", category: "Operations", version: "2.3", effectiveDate: "2025-08-01", reviewDate: "2026-08-01", owner: "Layla Ibrahim", status: "Effective" },
  { id: "POL-008", title: "Incident Response Plan", category: "IT", version: "1.0", effectiveDate: "", reviewDate: "2026-06-01", owner: "Omar Khalil", status: "Draft" },
  { id: "POL-009", title: "Environmental Sustainability Policy", category: "Operations", version: "1.2", effectiveDate: "2025-11-01", reviewDate: "2026-05-01", owner: "Youssef Nabil", status: "Effective" },
];

const ACKNOWLEDGMENTS: Acknowledgment[] = [
  { id: "ACK-001", policyId: "POL-001", policyTitle: "Information Security Policy", employee: "Ahmed Hassan", department: "Engineering", status: "Acknowledged", dueDate: "2025-10-01", acknowledgedDate: "2025-09-28" },
  { id: "ACK-002", policyId: "POL-001", policyTitle: "Information Security Policy", employee: "Layla Ibrahim", department: "Procurement", status: "Acknowledged", dueDate: "2025-10-01", acknowledgedDate: "2025-09-30" },
  { id: "ACK-003", policyId: "POL-003", policyTitle: "Employee Code of Conduct", employee: "Mohamed Fathy", department: "Sales", status: "Overdue", dueDate: "2026-02-01", acknowledgedDate: null },
  { id: "ACK-004", policyId: "POL-005", policyTitle: "Workplace Safety Policy", employee: "Nour El-Din", department: "Manufacturing", status: "Pending", dueDate: "2026-06-01", acknowledgedDate: null },
  { id: "ACK-005", policyId: "POL-002", policyTitle: "Anti-Bribery and Corruption Policy", employee: "Karim Adel", department: "Finance", status: "Acknowledged", dueDate: "2025-07-15", acknowledgedDate: "2025-07-10" },
  { id: "ACK-006", policyId: "POL-004", policyTitle: "Data Retention Policy", employee: "Hana Mostafa", department: "IT", status: "Pending", dueDate: "2026-05-30", acknowledgedDate: null },
];

const REVIEWS: ReviewRecord[] = [
  { id: "REV-001", policyId: "POL-006", policyTitle: "Remote Work Policy", reviewer: "Sara Mahmoud", dueDate: "2026-04-30", status: "In Review", changesMade: "Updated equipment allowance and reporting requirements" },
  { id: "REV-002", policyId: "POL-009", policyTitle: "Environmental Sustainability Policy", reviewer: "Youssef Nabil", dueDate: "2026-05-31", status: "Not Started", changesMade: "" },
  { id: "REV-003", policyId: "POL-003", policyTitle: "Employee Code of Conduct", reviewer: "Sara Mahmoud", dueDate: "2026-01-31", status: "Approved", changesMade: "Added social media guidelines section" },
  { id: "REV-004", policyId: "POL-004", policyTitle: "Data Retention Policy", reviewer: "Omar Khalil", dueDate: "2026-03-31", status: "Approved", changesMade: "Aligned retention periods with new regulations" },
];

const TRAINING: TrainingRecord[] = [
  { id: "TRN-001", policyTitle: "Information Security Policy", trainingType: "E-Learning Module", assignedTo: "All Employees", dueDate: "2026-06-30", completedDate: null, status: "In Progress" },
  { id: "TRN-002", policyTitle: "Anti-Bribery and Corruption Policy", trainingType: "Workshop", assignedTo: "Finance, Procurement", dueDate: "2026-05-15", completedDate: null, status: "Assigned" },
  { id: "TRN-003", policyTitle: "Workplace Safety Policy", trainingType: "Hands-on Training", assignedTo: "Manufacturing", dueDate: "2026-04-30", completedDate: "2026-04-25", status: "Completed" },
  { id: "TRN-004", policyTitle: "Employee Code of Conduct", trainingType: "E-Learning Module", assignedTo: "New Hires", dueDate: "2026-03-01", completedDate: null, status: "Overdue" },
];

const CATEGORY_COLORS: Record<PolicyCategory, string> = {
  IT: "bg-indigo-100 text-indigo-800",
  HR: "bg-pink-100 text-pink-800",
  Finance: "bg-emerald-100 text-emerald-800",
  Operations: "bg-orange-100 text-orange-800",
  Safety: "bg-amber-100 text-amber-800",
  Privacy: "bg-purple-100 text-purple-800",
};

const POLICY_STATUS_COLORS: Record<PolicyStatus, string> = {
  Draft: "bg-gray-100 text-gray-800",
  "Under Review": "bg-amber-100 text-amber-800",
  Approved: "bg-blue-100 text-blue-800",
  Effective: "bg-green-100 text-green-800",
  Archived: "bg-slate-100 text-slate-700",
};

const ACK_STATUS_COLORS: Record<AckStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Acknowledged: "bg-green-100 text-green-800",
  Overdue: "bg-red-100 text-red-800",
};

const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  "Not Started": "bg-gray-100 text-gray-800",
  "In Review": "bg-blue-100 text-blue-800",
  Approved: "bg-green-100 text-green-800",
};

const TRAINING_STATUS_COLORS: Record<TrainingRecord["status"], string> = {
  Assigned: "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function PolicyManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("policies");

  const filteredPolicies = POLICIES.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePolicies = POLICIES.filter((p) => p.status === "Effective").length;
  const dueForReview = POLICIES.filter((p) => {
    const review = new Date(p.reviewDate);
    const now = new Date();
    const diffDays = (review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 60 && diffDays >= 0 && p.status === "Effective";
  }).length;
  const ackPending = ACKNOWLEDGMENTS.filter((a) => a.status === "Pending" || a.status === "Overdue").length;
  const complianceRate = Math.round(
    (ACKNOWLEDGMENTS.filter((a) => a.status === "Acknowledged").length / ACKNOWLEDGMENTS.length) * 100
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Policy Management"
        description="Create, review, and manage organizational policies and acknowledgment tracking"
        icon={<BookOpen className="h-6 w-6 text-teal-600" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Request Acknowledgment
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={BookOpen} title="Active Policies" value={activePolicies} change={5} changeLabel="vs last quarter" />
        <StatsCard icon={Clock} title="Due for Review" value={dueForReview} iconColor="bg-amber-100 text-amber-600" subtitle="Within 60 days" />
        <StatsCard icon={Users} title="Acknowledgments Pending" value={ackPending} iconColor="bg-red-100 text-red-600" change={-15} changeLabel="vs last month" />
        <StatsCard icon={CheckCircle} title="Compliance Rate" value={`${complianceRate}%`} subtitle="Target: > 95%" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="acknowledgments">Acknowledgments</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search policies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((pol) => (
                  <TableRow key={pol.id}>
                    <TableCell className="font-mono text-sm">{pol.id}</TableCell>
                    <TableCell className="font-medium">{pol.title}</TableCell>
                    <TableCell><Badge className={CATEGORY_COLORS[pol.category]}>{pol.category}</Badge></TableCell>
                    <TableCell>{pol.version}</TableCell>
                    <TableCell>{pol.effectiveDate || "-"}</TableCell>
                    <TableCell>{pol.reviewDate}</TableCell>
                    <TableCell>{pol.owner}</TableCell>
                    <TableCell><Badge className={POLICY_STATUS_COLORS[pol.status]}>{pol.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="acknowledgments" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Acknowledged Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACKNOWLEDGMENTS.map((ack) => (
                  <TableRow key={ack.id}>
                    <TableCell className="font-medium">{ack.policyTitle}</TableCell>
                    <TableCell>{ack.employee}</TableCell>
                    <TableCell>{ack.department}</TableCell>
                    <TableCell><Badge className={ACK_STATUS_COLORS[ack.status]}>{ack.status}</Badge></TableCell>
                    <TableCell>{ack.dueDate}</TableCell>
                    <TableCell>{ack.acknowledgedDate || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Changes Made</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REVIEWS.map((rev) => (
                  <TableRow key={rev.id}>
                    <TableCell className="font-medium">{rev.policyTitle}</TableCell>
                    <TableCell>{rev.reviewer}</TableCell>
                    <TableCell>{rev.dueDate}</TableCell>
                    <TableCell><Badge className={REVIEW_STATUS_COLORS[rev.status]}>{rev.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rev.changesMade || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Training Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRAINING.map((trn) => (
                  <TableRow key={trn.id}>
                    <TableCell className="font-medium">{trn.policyTitle}</TableCell>
                    <TableCell>{trn.trainingType}</TableCell>
                    <TableCell>{trn.assignedTo}</TableCell>
                    <TableCell>{trn.dueDate}</TableCell>
                    <TableCell>{trn.completedDate || "-"}</TableCell>
                    <TableCell><Badge className={TRAINING_STATUS_COLORS[trn.status]}>{trn.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Policy Title" />
            <Select>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
                <SelectItem value="Privacy">Privacy</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Version (e.g., 1.0)" />
            <Input placeholder="Owner" />
            <Input type="date" placeholder="Effective Date" />
            <Input type="date" placeholder="Review Date" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Save Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

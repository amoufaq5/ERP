"use client";

import { useState } from "react";
import {
  Shield,
  Plus,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Search,
  Calendar,
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

type ControlType = "Preventive" | "Detective" | "Corrective";
type ControlFrequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";
type ControlStatus = "Active" | "Inactive";
type TestStatus = "Not Started" | "In Progress" | "Complete";
type TestResult = "Effective" | "Deficiency" | "Material Weakness";
type DeficiencySeverity = "Low" | "Medium" | "High" | "Critical";
type DeficiencyStatus = "Open" | "Remediation" | "Closed";

interface Control {
  id: string;
  name: string;
  processArea: string;
  type: ControlType;
  frequency: ControlFrequency;
  owner: string;
  status: ControlStatus;
}

interface TestSchedule {
  id: string;
  controlId: string;
  controlName: string;
  tester: string;
  period: string;
  dueDate: string;
  status: TestStatus;
}

interface TestResultRecord {
  id: string;
  controlId: string;
  controlName: string;
  period: string;
  result: TestResult;
  findings: string;
  tester: string;
  date: string;
}

interface Deficiency {
  id: string;
  controlId: string;
  controlName: string;
  finding: string;
  severity: DeficiencySeverity;
  status: DeficiencyStatus;
  dueDate: string;
}

const CONTROLS: Control[] = [
  { id: "CTL-001", name: "Revenue Recognition Approval", processArea: "Revenue", type: "Preventive", frequency: "Daily", owner: "Fatima Ali", status: "Active" },
  { id: "CTL-002", name: "Bank Reconciliation Review", processArea: "Treasury", type: "Detective", frequency: "Monthly", owner: "Ahmed Hassan", status: "Active" },
  { id: "CTL-003", name: "Access Rights Review", processArea: "IT General Controls", type: "Detective", frequency: "Quarterly", owner: "Omar Khalil", status: "Active" },
  { id: "CTL-004", name: "Journal Entry Approval", processArea: "Financial Close", type: "Preventive", frequency: "Daily", owner: "Fatima Ali", status: "Active" },
  { id: "CTL-005", name: "Segregation of Duties Check", processArea: "Procurement", type: "Preventive", frequency: "Monthly", owner: "Sara Mahmoud", status: "Active" },
  { id: "CTL-006", name: "Inventory Count Reconciliation", processArea: "Inventory", type: "Detective", frequency: "Quarterly", owner: "Youssef Nabil", status: "Active" },
  { id: "CTL-007", name: "Vendor Master Data Changes", processArea: "Accounts Payable", type: "Detective", frequency: "Weekly", owner: "Layla Ibrahim", status: "Active" },
  { id: "CTL-008", name: "Financial Statement Disclosure Review", processArea: "Financial Close", type: "Preventive", frequency: "Quarterly", owner: "Fatima Ali", status: "Inactive" },
];

const TEST_SCHEDULES: TestSchedule[] = [
  { id: "TS-001", controlId: "CTL-001", controlName: "Revenue Recognition Approval", tester: "External Audit", period: "Q1 2026", dueDate: "2026-04-15", status: "Complete" },
  { id: "TS-002", controlId: "CTL-002", controlName: "Bank Reconciliation Review", tester: "Internal Audit", period: "Q1 2026", dueDate: "2026-04-30", status: "Complete" },
  { id: "TS-003", controlId: "CTL-003", controlName: "Access Rights Review", tester: "IT Audit", period: "Q2 2026", dueDate: "2026-06-30", status: "In Progress" },
  { id: "TS-004", controlId: "CTL-004", controlName: "Journal Entry Approval", tester: "Internal Audit", period: "Q2 2026", dueDate: "2026-06-15", status: "Not Started" },
  { id: "TS-005", controlId: "CTL-005", controlName: "Segregation of Duties Check", tester: "Internal Audit", period: "Q2 2026", dueDate: "2026-07-01", status: "Not Started" },
  { id: "TS-006", controlId: "CTL-006", controlName: "Inventory Count Reconciliation", tester: "External Audit", period: "Q2 2026", dueDate: "2026-07-15", status: "Not Started" },
];

const TEST_RESULTS: TestResultRecord[] = [
  { id: "TR-001", controlId: "CTL-001", controlName: "Revenue Recognition Approval", period: "Q1 2026", result: "Effective", findings: "All samples tested showed proper approval", tester: "External Audit", date: "2026-04-10" },
  { id: "TR-002", controlId: "CTL-002", controlName: "Bank Reconciliation Review", period: "Q1 2026", result: "Deficiency", findings: "2 of 12 reconciliations lacked timely review signature", tester: "Internal Audit", date: "2026-04-25" },
  { id: "TR-003", controlId: "CTL-003", controlName: "Access Rights Review", period: "Q4 2025", result: "Effective", findings: "No exceptions noted", tester: "IT Audit", date: "2026-01-15" },
  { id: "TR-004", controlId: "CTL-005", controlName: "Segregation of Duties Check", period: "Q4 2025", result: "Material Weakness", findings: "Conflicting roles identified in 3 user accounts", tester: "Internal Audit", date: "2026-01-20" },
];

const DEFICIENCIES: Deficiency[] = [
  { id: "DEF-001", controlId: "CTL-002", controlName: "Bank Reconciliation Review", finding: "Untimely reconciliation review - 2 instances", severity: "Medium", status: "Remediation", dueDate: "2026-06-30" },
  { id: "DEF-002", controlId: "CTL-005", controlName: "Segregation of Duties Check", finding: "Conflicting roles in procurement module", severity: "Critical", status: "Open", dueDate: "2026-05-31" },
  { id: "DEF-003", controlId: "CTL-007", controlName: "Vendor Master Data Changes", finding: "Missing approval for 1 vendor modification", severity: "Low", status: "Closed", dueDate: "2026-03-15" },
];

const TYPE_COLORS: Record<ControlType, string> = {
  Preventive: "bg-blue-100 text-blue-800",
  Detective: "bg-purple-100 text-purple-800",
  Corrective: "bg-orange-100 text-orange-800",
};

const TEST_STATUS_COLORS: Record<TestStatus, string> = {
  "Not Started": "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Complete: "bg-green-100 text-green-800",
};

const RESULT_COLORS: Record<TestResult, string> = {
  Effective: "bg-green-100 text-green-800",
  Deficiency: "bg-amber-100 text-amber-800",
  "Material Weakness": "bg-red-100 text-red-800",
};

const SEVERITY_COLORS: Record<DeficiencySeverity, string> = {
  Low: "bg-gray-100 text-gray-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
};

const DEF_STATUS_COLORS: Record<DeficiencyStatus, string> = {
  Open: "bg-red-100 text-red-800",
  Remediation: "bg-blue-100 text-blue-800",
  Closed: "bg-green-100 text-green-800",
};

export default function InternalControlsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("library");

  const filteredControls = CONTROLS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.processArea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const testedThisPeriod = TEST_RESULTS.filter((r) => r.period === "Q1 2026").length;
  const deficienciesFound = DEFICIENCIES.filter((d) => d.status !== "Closed").length;
  const remediationRate = Math.round(
    (DEFICIENCIES.filter((d) => d.status === "Closed").length / DEFICIENCIES.length) * 100
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Internal Controls (SOX/J-SOX)"
        description="Manage internal control framework, testing schedules, and remediation tracking"
        icon={<Shield className="h-6 w-6 text-blue-600" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Test
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Control
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ClipboardList} title="Total Controls" value={CONTROLS.length} change={5} changeLabel="vs last period" />
        <StatsCard icon={CheckCircle2} title="Tested This Period" value={testedThisPeriod} iconColor="bg-green-100 text-green-600" change={15} changeLabel="vs last period" />
        <StatsCard icon={AlertCircle} title="Deficiencies Found" value={deficienciesFound} iconColor="bg-red-100 text-red-600" change={-20} changeLabel="vs last period" />
        <StatsCard icon={Shield} title="Remediation Rate" value={`${remediationRate}%`} subtitle="Target: > 90%" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Control Library</TabsTrigger>
          <TabsTrigger value="schedule">Testing Schedule</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search controls..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Process Area</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredControls.map((ctrl) => (
                  <TableRow key={ctrl.id}>
                    <TableCell className="font-mono text-sm">{ctrl.id}</TableCell>
                    <TableCell className="font-medium">{ctrl.name}</TableCell>
                    <TableCell>{ctrl.processArea}</TableCell>
                    <TableCell><Badge className={TYPE_COLORS[ctrl.type]}>{ctrl.type}</Badge></TableCell>
                    <TableCell>{ctrl.frequency}</TableCell>
                    <TableCell>{ctrl.owner}</TableCell>
                    <TableCell>
                      <Badge className={ctrl.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {ctrl.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Tester</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEST_SCHEDULES.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">{ts.controlName}</TableCell>
                    <TableCell>{ts.tester}</TableCell>
                    <TableCell>{ts.period}</TableCell>
                    <TableCell>{ts.dueDate}</TableCell>
                    <TableCell><Badge className={TEST_STATUS_COLORS[ts.status]}>{ts.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Tester</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEST_RESULTS.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium">{tr.controlName}</TableCell>
                    <TableCell>{tr.period}</TableCell>
                    <TableCell><Badge className={RESULT_COLORS[tr.result]}>{tr.result}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{tr.findings}</TableCell>
                    <TableCell>{tr.tester}</TableCell>
                    <TableCell>{tr.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deficiencies" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFICIENCIES.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell className="font-medium">{def.controlName}</TableCell>
                    <TableCell className="text-sm">{def.finding}</TableCell>
                    <TableCell><Badge className={SEVERITY_COLORS[def.severity]}>{def.severity}</Badge></TableCell>
                    <TableCell><Badge className={DEF_STATUS_COLORS[def.status]}>{def.status}</Badge></TableCell>
                    <TableCell>{def.dueDate}</TableCell>
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
            <DialogTitle>Add New Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Control Name" />
            <Input placeholder="Process Area" />
            <Select>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Preventive">Preventive</SelectItem>
                <SelectItem value="Detective">Detective</SelectItem>
                <SelectItem value="Corrective">Corrective</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Annual">Annual</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Owner" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Save Control</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

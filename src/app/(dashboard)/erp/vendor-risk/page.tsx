"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  AlertTriangle,
  ClipboardCheck,
  Search,
  ShieldAlert,
  Ban,
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

type VendorCategory = "Critical" | "High" | "Medium" | "Low";
type VendorStatus = "Approved" | "Conditional" | "Under Review" | "Blocked";
type AssessmentType = "Initial" | "Annual" | "Triggered";
type AssessmentStatus = "Scheduled" | "In Progress" | "Complete";
type DueDiligenceCheck = "Financial" | "Legal" | "Security" | "Compliance";
type DueDiligenceResult = "Pass" | "Fail" | "Concern";

interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  servicesProvided: string;
  dataAccess: boolean;
  lastAssessment: string;
  riskScore: number;
  status: VendorStatus;
}

interface RiskAssessment {
  id: string;
  vendorId: string;
  vendorName: string;
  assessmentType: AssessmentType;
  dueDate: string;
  status: AssessmentStatus;
  riskRating: VendorCategory;
  assessor: string;
}

interface DueDiligence {
  id: string;
  vendorId: string;
  vendorName: string;
  checkType: DueDiligenceCheck;
  result: DueDiligenceResult;
  date: string;
  notes: string;
}

interface MonitoringEvent {
  id: string;
  vendorName: string;
  eventType: string;
  date: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  actionTaken: string;
}

const VENDORS: Vendor[] = [
  { id: "VND-001", name: "CloudTech Solutions", category: "Critical", servicesProvided: "Cloud Infrastructure & Hosting", dataAccess: true, lastAssessment: "2026-01-15", riskScore: 72, status: "Approved" },
  { id: "VND-002", name: "SecurePay Inc.", category: "Critical", servicesProvided: "Payment Processing", dataAccess: true, lastAssessment: "2026-02-20", riskScore: 65, status: "Approved" },
  { id: "VND-003", name: "LogiFreight Corp", category: "High", servicesProvided: "Logistics & Shipping", dataAccess: false, lastAssessment: "2025-11-10", riskScore: 45, status: "Approved" },
  { id: "VND-004", name: "DataAnalytics Pro", category: "High", servicesProvided: "Business Intelligence & Analytics", dataAccess: true, lastAssessment: "2026-03-05", riskScore: 58, status: "Conditional" },
  { id: "VND-005", name: "GreenClean Services", category: "Low", servicesProvided: "Facility Maintenance", dataAccess: false, lastAssessment: "2025-08-20", riskScore: 15, status: "Approved" },
  { id: "VND-006", name: "MedSupply International", category: "High", servicesProvided: "Raw Material Supply", dataAccess: false, lastAssessment: "2026-01-30", riskScore: 52, status: "Approved" },
  { id: "VND-007", name: "TechStaff Agency", category: "Medium", servicesProvided: "IT Staffing & Consulting", dataAccess: true, lastAssessment: "2025-12-15", riskScore: 38, status: "Under Review" },
  { id: "VND-008", name: "QuickPrint Ltd", category: "Low", servicesProvided: "Printing & Stationery", dataAccess: false, lastAssessment: "2025-06-01", riskScore: 10, status: "Approved" },
  { id: "VND-009", name: "CyberShield Corp", category: "Critical", servicesProvided: "Managed Security Services", dataAccess: true, lastAssessment: "2026-04-01", riskScore: 78, status: "Approved" },
  { id: "VND-010", name: "OffshoreDevs LLC", category: "High", servicesProvided: "Software Development", dataAccess: true, lastAssessment: "2025-10-20", riskScore: 68, status: "Blocked" },
];

const RISK_ASSESSMENTS: RiskAssessment[] = [
  { id: "RA-001", vendorId: "VND-001", vendorName: "CloudTech Solutions", assessmentType: "Annual", dueDate: "2026-01-15", status: "Complete", riskRating: "Critical", assessor: "Omar Khalil" },
  { id: "RA-002", vendorId: "VND-002", vendorName: "SecurePay Inc.", assessmentType: "Annual", dueDate: "2026-02-20", status: "Complete", riskRating: "Critical", assessor: "Fatima Ali" },
  { id: "RA-003", vendorId: "VND-004", vendorName: "DataAnalytics Pro", assessmentType: "Triggered", dueDate: "2026-03-05", status: "Complete", riskRating: "High", assessor: "Omar Khalil" },
  { id: "RA-004", vendorId: "VND-007", vendorName: "TechStaff Agency", assessmentType: "Annual", dueDate: "2026-06-15", status: "Scheduled", riskRating: "Medium", assessor: "Sara Mahmoud" },
  { id: "RA-005", vendorId: "VND-009", vendorName: "CyberShield Corp", assessmentType: "Annual", dueDate: "2026-04-01", status: "Complete", riskRating: "Critical", assessor: "Omar Khalil" },
  { id: "RA-006", vendorId: "VND-003", vendorName: "LogiFreight Corp", assessmentType: "Annual", dueDate: "2026-05-10", status: "In Progress", riskRating: "High", assessor: "Layla Ibrahim" },
  { id: "RA-007", vendorId: "VND-006", vendorName: "MedSupply International", assessmentType: "Annual", dueDate: "2026-07-30", status: "Scheduled", riskRating: "High", assessor: "Youssef Nabil" },
];

const DUE_DILIGENCE: DueDiligence[] = [
  { id: "DD-001", vendorId: "VND-001", vendorName: "CloudTech Solutions", checkType: "Security", result: "Pass", date: "2026-01-10", notes: "SOC 2 Type II certified, penetration test passed" },
  { id: "DD-002", vendorId: "VND-001", vendorName: "CloudTech Solutions", checkType: "Financial", result: "Pass", date: "2026-01-12", notes: "Strong financial position, no concerns" },
  { id: "DD-003", vendorId: "VND-002", vendorName: "SecurePay Inc.", checkType: "Compliance", result: "Pass", date: "2026-02-15", notes: "PCI DSS Level 1 compliant" },
  { id: "DD-004", vendorId: "VND-004", vendorName: "DataAnalytics Pro", checkType: "Security", result: "Concern", date: "2026-03-01", notes: "Encryption at rest not fully implemented" },
  { id: "DD-005", vendorId: "VND-004", vendorName: "DataAnalytics Pro", checkType: "Legal", result: "Pass", date: "2026-03-02", notes: "DPA signed, GDPR compliant" },
  { id: "DD-006", vendorId: "VND-010", vendorName: "OffshoreDevs LLC", checkType: "Security", result: "Fail", date: "2025-10-15", notes: "Failed security assessment - inadequate access controls" },
  { id: "DD-007", vendorId: "VND-010", vendorName: "OffshoreDevs LLC", checkType: "Compliance", result: "Fail", date: "2025-10-18", notes: "No ISO 27001 certification, non-compliant data handling" },
  { id: "DD-008", vendorId: "VND-009", vendorName: "CyberShield Corp", checkType: "Security", result: "Pass", date: "2026-03-28", notes: "ISO 27001 certified, annual pen testing" },
];

const MONITORING_EVENTS: MonitoringEvent[] = [
  { id: "MON-001", vendorName: "CloudTech Solutions", eventType: "Service Disruption", date: "2026-03-15", severity: "Medium", description: "2-hour outage in EU region", actionTaken: "RCA requested, SLA credit applied" },
  { id: "MON-002", vendorName: "DataAnalytics Pro", eventType: "Security Alert", date: "2026-04-20", severity: "High", description: "Unauthorized access attempt detected in logs", actionTaken: "Triggered reassessment, conditional approval applied" },
  { id: "MON-003", vendorName: "OffshoreDevs LLC", eventType: "Compliance Failure", date: "2025-10-20", severity: "High", description: "Failed to remediate security findings within 30 days", actionTaken: "Vendor blocked, contract terminated" },
  { id: "MON-004", vendorName: "LogiFreight Corp", eventType: "Financial Alert", date: "2026-04-05", severity: "Low", description: "Credit rating downgraded one notch", actionTaken: "Added to watchlist, monitoring increased" },
  { id: "MON-005", vendorName: "SecurePay Inc.", eventType: "Certificate Renewal", date: "2026-02-28", severity: "Low", description: "PCI DSS recertification completed", actionTaken: "Documentation updated" },
];

const VENDOR_CATEGORY_COLORS: Record<VendorCategory, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-amber-100 text-amber-800",
  Low: "bg-green-100 text-green-800",
};

const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  Approved: "bg-green-100 text-green-800",
  Conditional: "bg-amber-100 text-amber-800",
  "Under Review": "bg-blue-100 text-blue-800",
  Blocked: "bg-red-100 text-red-800",
};

const ASSESSMENT_STATUS_COLORS: Record<AssessmentStatus, string> = {
  Scheduled: "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Complete: "bg-green-100 text-green-800",
};

const DD_RESULT_COLORS: Record<DueDiligenceResult, string> = {
  Pass: "bg-green-100 text-green-800",
  Fail: "bg-red-100 text-red-800",
  Concern: "bg-amber-100 text-amber-800",
};

const SEVERITY_COLORS: Record<"Low" | "Medium" | "High", string> = {
  Low: "bg-gray-100 text-gray-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-red-100 text-red-800",
};

export default function VendorRiskPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("register");

  const filteredVendors = VENDORS.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.servicesProvided.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVendors = VENDORS.filter((v) => v.status !== "Blocked").length;
  const highRiskVendors = VENDORS.filter((v) => v.category === "Critical" || v.category === "High").length;
  const assessmentsDue = RISK_ASSESSMENTS.filter((a) => a.status === "Scheduled").length;
  const avgRiskScore = Math.round(VENDORS.reduce((s, v) => s + v.riskScore, 0) / VENDORS.length);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Third-Party / Vendor Risk Management"
        description="Assess and monitor third-party vendor risks, due diligence, and compliance"
        icon={<Building2 className="h-6 w-6 text-orange-600" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Block Vendor
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Initiate Assessment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Building2} title="Active Vendors" value={activeVendors} change={3} changeLabel="vs last quarter" />
        <StatsCard icon={AlertTriangle} title="High Risk Vendors" value={highRiskVendors} iconColor="bg-red-100 text-red-600" change={-5} changeLabel="vs last quarter" />
        <StatsCard icon={ClipboardCheck} title="Assessments Due" value={assessmentsDue} iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={ShieldAlert} title="Avg Risk Score" value={avgRiskScore} subtitle="Scale: 0-100" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="register">Vendor Register</TabsTrigger>
          <TabsTrigger value="assessments">Risk Assessments</TabsTrigger>
          <TabsTrigger value="diligence">Due Diligence</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Services Provided</TableHead>
                  <TableHead>Data Access</TableHead>
                  <TableHead>Last Assessment</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell><Badge className={VENDOR_CATEGORY_COLORS[vendor.category]}>{vendor.category}</Badge></TableCell>
                    <TableCell className="text-sm">{vendor.servicesProvided}</TableCell>
                    <TableCell>
                      <Badge className={vendor.dataAccess ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}>
                        {vendor.dataAccess ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{vendor.lastAssessment}</TableCell>
                    <TableCell>
                      <Badge className={vendor.riskScore >= 60 ? "bg-red-100 text-red-800" : vendor.riskScore >= 40 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                        {vendor.riskScore}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge className={VENDOR_STATUS_COLORS[vendor.status]}>{vendor.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Assessment Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Rating</TableHead>
                  <TableHead>Assessor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RISK_ASSESSMENTS.map((ra) => (
                  <TableRow key={ra.id}>
                    <TableCell className="font-medium">{ra.vendorName}</TableCell>
                    <TableCell><Badge variant="outline">{ra.assessmentType}</Badge></TableCell>
                    <TableCell>{ra.dueDate}</TableCell>
                    <TableCell><Badge className={ASSESSMENT_STATUS_COLORS[ra.status]}>{ra.status}</Badge></TableCell>
                    <TableCell><Badge className={VENDOR_CATEGORY_COLORS[ra.riskRating]}>{ra.riskRating}</Badge></TableCell>
                    <TableCell>{ra.assessor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="diligence" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Check Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DUE_DILIGENCE.map((dd) => (
                  <TableRow key={dd.id}>
                    <TableCell className="font-medium">{dd.vendorName}</TableCell>
                    <TableCell><Badge variant="outline">{dd.checkType}</Badge></TableCell>
                    <TableCell><Badge className={DD_RESULT_COLORS[dd.result]}>{dd.result}</Badge></TableCell>
                    <TableCell>{dd.date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{dd.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action Taken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONITORING_EVENTS.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell className="font-medium">{evt.vendorName}</TableCell>
                    <TableCell><Badge variant="outline">{evt.eventType}</Badge></TableCell>
                    <TableCell>{evt.date}</TableCell>
                    <TableCell><Badge className={SEVERITY_COLORS[evt.severity]}>{evt.severity}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{evt.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{evt.actionTaken}</TableCell>
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
            <DialogTitle>Initiate Vendor Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select>
              <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
              <SelectContent>
                {VENDORS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Assessment Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Initial">Initial</SelectItem>
                <SelectItem value="Annual">Annual</SelectItem>
                <SelectItem value="Triggered">Triggered</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Assessor" />
            <Input type="date" placeholder="Due Date" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Create Assessment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

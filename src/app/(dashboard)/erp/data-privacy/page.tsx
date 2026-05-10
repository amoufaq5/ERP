"use client";

import { useState } from "react";
import {
  Lock,
  Plus,
  Users,
  FileText,
  AlertOctagon,
  Search,
  ShieldCheck,
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

type RequestType = "Access" | "Erasure" | "Portability" | "Rectification" | "Restriction";
type RequestStatus = "Received" | "Verified" | "Processing" | "Completed" | "Denied";
type BreachSeverity = "Low" | "Medium" | "High" | "Critical";
type BreachStatus = "Detected" | "Investigating" | "Contained" | "Resolved" | "Closed";

interface ProcessingActivity {
  id: string;
  activity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string;
  recipients: string;
  retentionPeriod: string;
  status: "Active" | "Under Review" | "Archived";
}

interface SubjectRequest {
  id: string;
  type: RequestType;
  requester: string;
  status: RequestStatus;
  receivedDate: string;
  dueDate: string;
}

interface ConsentRecord {
  id: string;
  customer: string;
  purpose: string;
  channel: string;
  consentGiven: boolean;
  date: string;
  expiry: string;
}

interface BreachRecord {
  id: string;
  date: string;
  nature: string;
  recordsAffected: number;
  severity: BreachSeverity;
  reportedToAuthority: boolean;
  status: BreachStatus;
}

const PROCESSING_ACTIVITIES: ProcessingActivity[] = [
  { id: "PA-001", activity: "Employee Payroll Processing", purpose: "Employment contract fulfillment", legalBasis: "Contractual Necessity", dataCategories: "Personal, Financial", recipients: "Payroll Provider, Tax Authority", retentionPeriod: "7 years", status: "Active" },
  { id: "PA-002", activity: "Customer Marketing Communications", purpose: "Direct marketing", legalBasis: "Consent", dataCategories: "Contact, Preferences", recipients: "Marketing Platform", retentionPeriod: "Until withdrawal", status: "Active" },
  { id: "PA-003", activity: "Clinical Trial Data Collection", purpose: "Regulatory compliance", legalBasis: "Legal Obligation", dataCategories: "Health, Personal, Genetic", recipients: "Regulatory Authority, CRO", retentionPeriod: "25 years", status: "Active" },
  { id: "PA-004", activity: "Website Analytics", purpose: "Service improvement", legalBasis: "Legitimate Interest", dataCategories: "Behavioral, Technical", recipients: "Analytics Provider", retentionPeriod: "2 years", status: "Active" },
  { id: "PA-005", activity: "Vendor Due Diligence", purpose: "Risk management", legalBasis: "Legitimate Interest", dataCategories: "Business Contact, Financial", recipients: "Internal Compliance", retentionPeriod: "5 years", status: "Under Review" },
];

const SUBJECT_REQUESTS: SubjectRequest[] = [
  { id: "DSR-001", type: "Access", requester: "John Smith", status: "Completed", receivedDate: "2026-04-01", dueDate: "2026-05-01" },
  { id: "DSR-002", type: "Erasure", requester: "Maria Garcia", status: "Processing", receivedDate: "2026-04-15", dueDate: "2026-05-15" },
  { id: "DSR-003", type: "Portability", requester: "David Chen", status: "Verified", receivedDate: "2026-04-20", dueDate: "2026-05-20" },
  { id: "DSR-004", type: "Rectification", requester: "Sophie Martin", status: "Completed", receivedDate: "2026-03-10", dueDate: "2026-04-10" },
  { id: "DSR-005", type: "Restriction", requester: "Ahmed Youssef", status: "Received", receivedDate: "2026-05-05", dueDate: "2026-06-05" },
  { id: "DSR-006", type: "Erasure", requester: "Lisa Wong", status: "Denied", receivedDate: "2026-03-25", dueDate: "2026-04-25" },
];

const CONSENT_RECORDS: ConsentRecord[] = [
  { id: "CON-001", customer: "John Smith", purpose: "Marketing emails", channel: "Web Form", consentGiven: true, date: "2026-01-15", expiry: "2027-01-15" },
  { id: "CON-002", customer: "Maria Garcia", purpose: "Product analytics", channel: "Mobile App", consentGiven: true, date: "2026-02-20", expiry: "2027-02-20" },
  { id: "CON-003", customer: "David Chen", purpose: "Third-party sharing", channel: "Email", consentGiven: false, date: "2026-03-10", expiry: "N/A" },
  { id: "CON-004", customer: "Sophie Martin", purpose: "Marketing emails", channel: "In-Store", consentGiven: true, date: "2026-01-05", expiry: "2027-01-05" },
  { id: "CON-005", customer: "Ahmed Youssef", purpose: "Clinical research", channel: "Paper Form", consentGiven: true, date: "2025-11-20", expiry: "2026-11-20" },
];

const BREACH_RECORDS: BreachRecord[] = [
  { id: "BRH-001", date: "2026-02-14", nature: "Unauthorized email disclosure", recordsAffected: 150, severity: "Medium", reportedToAuthority: true, status: "Closed" },
  { id: "BRH-002", date: "2026-04-03", nature: "Laptop theft with unencrypted data", recordsAffected: 2300, severity: "High", reportedToAuthority: true, status: "Resolved" },
  { id: "BRH-003", date: "2026-05-02", nature: "Phishing attack - credential compromise", recordsAffected: 45, severity: "Medium", reportedToAuthority: false, status: "Investigating" },
];

const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  Received: "bg-gray-100 text-gray-800",
  Verified: "bg-blue-100 text-blue-800",
  Processing: "bg-amber-100 text-amber-800",
  Completed: "bg-green-100 text-green-800",
  Denied: "bg-red-100 text-red-800",
};

const REQUEST_TYPE_COLORS: Record<RequestType, string> = {
  Access: "bg-blue-100 text-blue-800",
  Erasure: "bg-red-100 text-red-800",
  Portability: "bg-purple-100 text-purple-800",
  Rectification: "bg-amber-100 text-amber-800",
  Restriction: "bg-orange-100 text-orange-800",
};

const SEVERITY_COLORS: Record<BreachSeverity, string> = {
  Low: "bg-gray-100 text-gray-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
};

const BREACH_STATUS_COLORS: Record<BreachStatus, string> = {
  Detected: "bg-red-100 text-red-800",
  Investigating: "bg-amber-100 text-amber-800",
  Contained: "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-slate-100 text-slate-800",
};

export default function DataPrivacyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"request" | "consent" | "breach">("request");
  const [activeTab, setActiveTab] = useState("activities");

  const filteredActivities = PROCESSING_ACTIVITIES.filter(
    (a) =>
      a.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openRequests = SUBJECT_REQUESTS.filter((r) => r.status !== "Completed" && r.status !== "Denied").length;
  const consentCount = CONSENT_RECORDS.filter((c) => c.consentGiven).length;
  const breachesThisYear = BREACH_RECORDS.length;

  function openDialog(type: "request" | "consent" | "breach") {
    setDialogType(type);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Data Privacy (GDPR/CCPA)"
        description="Manage data processing activities, subject requests, consents, and breach reporting"
        icon={<Lock className="h-6 w-6 text-indigo-600" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog("breach")}>
              <AlertOctagon className="h-4 w-4 mr-2" />
              Report Breach
            </Button>
            <Button variant="outline" onClick={() => openDialog("consent")}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Record Consent
            </Button>
            <Button onClick={() => openDialog("request")}>
              <Plus className="h-4 w-4 mr-2" />
              Log Request
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Users} title="Data Subject Requests" value={openRequests} subtitle="Open requests" change={10} changeLabel="vs last month" />
        <StatsCard icon={ShieldCheck} title="Consent Records" value={consentCount} iconColor="bg-green-100 text-green-600" change={8} changeLabel="vs last month" />
        <StatsCard icon={FileText} title="Processing Activities" value={PROCESSING_ACTIVITIES.length} change={2} changeLabel="new this quarter" />
        <StatsCard icon={AlertOctagon} title="Breaches This Year" value={breachesThisYear} iconColor="bg-red-100 text-red-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activities">Processing Activities</TabsTrigger>
          <TabsTrigger value="requests">Subject Requests</TabsTrigger>
          <TabsTrigger value="consents">Consents</TabsTrigger>
          <TabsTrigger value="breaches">Breach Register</TabsTrigger>
          <TabsTrigger value="dpia">DPIA</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search activities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Legal Basis</TableHead>
                  <TableHead>Data Categories</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="font-medium">{act.activity}</TableCell>
                    <TableCell className="text-sm">{act.purpose}</TableCell>
                    <TableCell><Badge variant="outline">{act.legalBasis}</Badge></TableCell>
                    <TableCell className="text-sm">{act.dataCategories}</TableCell>
                    <TableCell className="text-sm">{act.recipients}</TableCell>
                    <TableCell>{act.retentionPeriod}</TableCell>
                    <TableCell>
                      <Badge className={act.status === "Active" ? "bg-green-100 text-green-800" : act.status === "Under Review" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}>
                        {act.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECT_REQUESTS.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-sm">{req.id}</TableCell>
                    <TableCell><Badge className={REQUEST_TYPE_COLORS[req.type]}>{req.type}</Badge></TableCell>
                    <TableCell className="font-medium">{req.requester}</TableCell>
                    <TableCell><Badge className={REQUEST_STATUS_COLORS[req.status]}>{req.status}</Badge></TableCell>
                    <TableCell>{req.receivedDate}</TableCell>
                    <TableCell>{req.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="consents" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Consent Given</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONSENT_RECORDS.map((con) => (
                  <TableRow key={con.id}>
                    <TableCell className="font-medium">{con.customer}</TableCell>
                    <TableCell>{con.purpose}</TableCell>
                    <TableCell>{con.channel}</TableCell>
                    <TableCell>
                      <Badge className={con.consentGiven ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {con.consentGiven ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{con.date}</TableCell>
                    <TableCell>{con.expiry}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="breaches" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead>Records Affected</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BREACH_RECORDS.map((br) => (
                  <TableRow key={br.id}>
                    <TableCell className="font-mono text-sm">{br.id}</TableCell>
                    <TableCell>{br.date}</TableCell>
                    <TableCell className="font-medium">{br.nature}</TableCell>
                    <TableCell>{br.recordsAffected.toLocaleString()}</TableCell>
                    <TableCell><Badge className={SEVERITY_COLORS[br.severity]}>{br.severity}</Badge></TableCell>
                    <TableCell>
                      <Badge className={br.reportedToAuthority ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {br.reportedToAuthority ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge className={BREACH_STATUS_COLORS[br.status]}>{br.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dpia" className="space-y-4">
          <div className="border rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Data Protection Impact Assessments</h3>
            <p className="text-muted-foreground mb-4">No DPIAs created yet. Create one when processing may result in high risk.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create DPIA</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "request" && "Log Subject Request"}
              {dialogType === "consent" && "Record Consent"}
              {dialogType === "breach" && "Report Data Breach"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogType === "request" && (
              <>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Request Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Access">Access</SelectItem>
                    <SelectItem value="Erasure">Erasure</SelectItem>
                    <SelectItem value="Portability">Portability</SelectItem>
                    <SelectItem value="Rectification">Rectification</SelectItem>
                    <SelectItem value="Restriction">Restriction</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Requester Name" />
                <Input type="date" placeholder="Received Date" />
              </>
            )}
            {dialogType === "consent" && (
              <>
                <Input placeholder="Customer Name" />
                <Input placeholder="Purpose" />
                <Select>
                  <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Web Form">Web Form</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Mobile App">Mobile App</SelectItem>
                    <SelectItem value="In-Store">In-Store</SelectItem>
                    <SelectItem value="Paper Form">Paper Form</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Consent Given?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {dialogType === "breach" && (
              <>
                <Input placeholder="Nature of Breach" />
                <Input type="number" placeholder="Records Affected" />
                <Select>
                  <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Date Detected" />
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

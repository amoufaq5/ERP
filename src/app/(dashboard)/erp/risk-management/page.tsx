"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Search,
  ClipboardCheck,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RiskCategory = "Operational" | "Financial" | "Strategic" | "Compliance" | "Cyber" | "Reputational";
type RiskStatus = "Identified" | "Assessed" | "Mitigated" | "Accepted" | "Closed";
type MitigationStatus = "Planned" | "In Progress" | "Implemented" | "Verified";

interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  riskScore: number;
  owner: string;
  status: RiskStatus;
  reviewDate: string;
}

interface Mitigation {
  id: string;
  riskId: string;
  riskTitle: string;
  action: string;
  owner: string;
  dueDate: string;
  status: MitigationStatus;
  effectiveness: string;
}

interface Assessment {
  id: string;
  riskId: string;
  riskTitle: string;
  assessor: string;
  date: string;
  previousScore: number;
  newScore: number;
  notes: string;
}

const RISKS: Risk[] = [
  { id: "RSK-001", title: "Supply chain disruption", category: "Operational", likelihood: 4, impact: 5, riskScore: 20, owner: "Ahmed Hassan", status: "Assessed", reviewDate: "2026-06-15" },
  { id: "RSK-002", title: "Currency exchange volatility", category: "Financial", likelihood: 3, impact: 4, riskScore: 12, owner: "Fatima Ali", status: "Mitigated", reviewDate: "2026-07-01" },
  { id: "RSK-003", title: "Ransomware attack", category: "Cyber", likelihood: 3, impact: 5, riskScore: 15, owner: "Omar Khalil", status: "Assessed", reviewDate: "2026-05-30" },
  { id: "RSK-004", title: "Regulatory non-compliance (GMP)", category: "Compliance", likelihood: 2, impact: 5, riskScore: 10, owner: "Sara Mahmoud", status: "Mitigated", reviewDate: "2026-08-20" },
  { id: "RSK-005", title: "Key personnel departure", category: "Strategic", likelihood: 3, impact: 3, riskScore: 9, owner: "Youssef Nabil", status: "Identified", reviewDate: "2026-06-01" },
  { id: "RSK-006", title: "Product recall event", category: "Reputational", likelihood: 2, impact: 5, riskScore: 10, owner: "Layla Ibrahim", status: "Accepted", reviewDate: "2026-09-10" },
  { id: "RSK-007", title: "IT infrastructure failure", category: "Cyber", likelihood: 2, impact: 4, riskScore: 8, owner: "Omar Khalil", status: "Mitigated", reviewDate: "2026-07-15" },
  { id: "RSK-008", title: "Market share erosion", category: "Strategic", likelihood: 3, impact: 4, riskScore: 12, owner: "Youssef Nabil", status: "Assessed", reviewDate: "2026-06-30" },
];

const MITIGATIONS: Mitigation[] = [
  { id: "MIT-001", riskId: "RSK-001", riskTitle: "Supply chain disruption", action: "Diversify supplier base across 3 regions", owner: "Ahmed Hassan", dueDate: "2026-06-30", status: "In Progress", effectiveness: "High" },
  { id: "MIT-002", riskId: "RSK-002", riskTitle: "Currency exchange volatility", action: "Implement hedging strategy for 6-month horizon", owner: "Fatima Ali", dueDate: "2026-05-15", status: "Implemented", effectiveness: "Medium" },
  { id: "MIT-003", riskId: "RSK-003", riskTitle: "Ransomware attack", action: "Deploy EDR solution and conduct tabletop exercises", owner: "Omar Khalil", dueDate: "2026-07-01", status: "In Progress", effectiveness: "High" },
  { id: "MIT-004", riskId: "RSK-004", riskTitle: "Regulatory non-compliance (GMP)", action: "Quarterly internal audits and staff training", owner: "Sara Mahmoud", dueDate: "2026-05-30", status: "Verified", effectiveness: "High" },
  { id: "MIT-005", riskId: "RSK-005", riskTitle: "Key personnel departure", action: "Succession planning and retention bonuses", owner: "Youssef Nabil", dueDate: "2026-08-01", status: "Planned", effectiveness: "Medium" },
  { id: "MIT-006", riskId: "RSK-007", riskTitle: "IT infrastructure failure", action: "Implement redundant failover and daily backups", owner: "Omar Khalil", dueDate: "2026-06-15", status: "Implemented", effectiveness: "High" },
];

const ASSESSMENTS: Assessment[] = [
  { id: "ASS-001", riskId: "RSK-001", riskTitle: "Supply chain disruption", assessor: "Ahmed Hassan", date: "2026-04-10", previousScore: 16, newScore: 20, notes: "Geopolitical tensions increased likelihood" },
  { id: "ASS-002", riskId: "RSK-003", riskTitle: "Ransomware attack", assessor: "Omar Khalil", date: "2026-04-15", previousScore: 20, newScore: 15, notes: "EDR deployment reduced likelihood" },
  { id: "ASS-003", riskId: "RSK-002", riskTitle: "Currency exchange volatility", assessor: "Fatima Ali", date: "2026-03-20", previousScore: 16, newScore: 12, notes: "Hedging reduced impact exposure" },
  { id: "ASS-004", riskId: "RSK-004", riskTitle: "Regulatory non-compliance (GMP)", assessor: "Sara Mahmoud", date: "2026-04-01", previousScore: 15, newScore: 10, notes: "Training program showing positive results" },
];

const STATUS_COLORS: Record<RiskStatus, string> = {
  Identified: "bg-gray-100 text-gray-800",
  Assessed: "bg-blue-100 text-blue-800",
  Mitigated: "bg-green-100 text-green-800",
  Accepted: "bg-amber-100 text-amber-800",
  Closed: "bg-slate-100 text-slate-700",
};

const MITIGATION_STATUS_COLORS: Record<MitigationStatus, string> = {
  Planned: "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Implemented: "bg-green-100 text-green-800",
  Verified: "bg-emerald-100 text-emerald-800",
};

const CATEGORY_COLORS: Record<RiskCategory, string> = {
  Operational: "bg-orange-100 text-orange-800",
  Financial: "bg-emerald-100 text-emerald-800",
  Strategic: "bg-purple-100 text-purple-800",
  Compliance: "bg-blue-100 text-blue-800",
  Cyber: "bg-red-100 text-red-800",
  Reputational: "bg-amber-100 text-amber-800",
};

function buildHeatMap(risks: Risk[]): number[][] {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach((r) => {
    grid[5 - r.likelihood][r.impact - 1] += 1;
  });
  return grid;
}

export default function RiskManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("register");

  const filteredRisks = RISKS.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const heatMap = buildHeatMap(RISKS);
  const highCriticalCount = RISKS.filter((r) => r.riskScore >= 15).length;
  const mitigatedThisQtr = RISKS.filter((r) => r.status === "Mitigated").length;
  const avgScore = Math.round(RISKS.reduce((s, r) => s + r.riskScore, 0) / RISKS.length);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Enterprise Risk Management"
        description="Identify, assess, and mitigate organizational risks across all categories"
        icon={<ShieldAlert className="h-6 w-6 text-red-600" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Schedule Review
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Risk
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ShieldAlert} title="Total Risks" value={RISKS.length} change={12} changeLabel="vs last quarter" />
        <StatsCard icon={AlertTriangle} title="High/Critical Risks" value={highCriticalCount} iconColor="bg-red-100 text-red-600" change={-8} changeLabel="vs last quarter" />
        <StatsCard icon={TrendingDown} title="Mitigated This Quarter" value={mitigatedThisQtr} change={25} changeLabel="vs last quarter" />
        <StatsCard icon={BarChart3} title="Risk Score Avg" value={avgScore} subtitle="Target: < 8" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="register">Risk Register</TabsTrigger>
          <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
          <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Likelihood</TableHead>
                  <TableHead className="text-center">Impact</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-mono text-sm">{risk.id}</TableCell>
                    <TableCell className="font-medium">{risk.title}</TableCell>
                    <TableCell><Badge className={CATEGORY_COLORS[risk.category]}>{risk.category}</Badge></TableCell>
                    <TableCell className="text-center">{risk.likelihood}</TableCell>
                    <TableCell className="text-center">{risk.impact}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={risk.riskScore >= 15 ? "bg-red-100 text-red-800" : risk.riskScore >= 10 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                        {risk.riskScore}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.owner}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[risk.status]}>{risk.status}</Badge></TableCell>
                    <TableCell>{risk.reviewDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Heat Map - Likelihood vs Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="text-sm font-medium text-muted-foreground writing-mode-vertical rotate-180 [writing-mode:vertical-rl]">
                  Likelihood
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-5 gap-1">
                    {heatMap.map((row, rowIdx) =>
                      row.map((count, colIdx) => {
                        const likelihood = 5 - rowIdx;
                        const impact = colIdx + 1;
                        const score = likelihood * impact;
                        let bgColor = "bg-green-100";
                        if (score >= 15) bgColor = "bg-red-200";
                        else if (score >= 10) bgColor = "bg-amber-200";
                        else if (score >= 5) bgColor = "bg-yellow-100";
                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className={`${bgColor} border rounded-md h-16 flex flex-col items-center justify-center text-xs font-medium`}
                          >
                            <span className="text-muted-foreground">{likelihood}x{impact}</span>
                            {count > 0 && <span className="text-lg font-bold">{count}</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="text-center text-sm font-medium text-muted-foreground mt-2">Impact</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigations" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Mitigation Action</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effectiveness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MITIGATIONS.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.riskTitle}</TableCell>
                    <TableCell>{m.action}</TableCell>
                    <TableCell>{m.owner}</TableCell>
                    <TableCell>{m.dueDate}</TableCell>
                    <TableCell><Badge className={MITIGATION_STATUS_COLORS[m.status]}>{m.status}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.effectiveness}</Badge>
                    </TableCell>
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
                  <TableHead>Risk</TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Previous Score</TableHead>
                  <TableHead className="text-center">New Score</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ASSESSMENTS.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.riskTitle}</TableCell>
                    <TableCell>{a.assessor}</TableCell>
                    <TableCell>{a.date}</TableCell>
                    <TableCell className="text-center">{a.previousScore}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={a.newScore >= 15 ? "bg-red-100 text-red-800" : a.newScore >= 10 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                        {a.newScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.notes}</TableCell>
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
            <DialogTitle>Register New Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Risk Title" />
            <Select>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Operational">Operational</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="Strategic">Strategic</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Cyber">Cyber</SelectItem>
                <SelectItem value="Reputational">Reputational</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Select>
                <SelectTrigger><SelectValue placeholder="Likelihood (1-5)" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger><SelectValue placeholder="Impact (1-5)" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Owner" />
            <Input type="date" placeholder="Review Date" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Save Risk</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Send,
  Download,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// --- Mock Data ---

interface TimesheetEntry {
  project: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface TeamTimesheet {
  id: string;
  employee: string;
  week: string;
  totalHours: number;
  billableHours: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedDate: string | null;
}

interface ApprovalEntry {
  id: string;
  employee: string;
  week: string;
  totalHours: number;
  billableHours: number;
  status: 'Submitted' | 'Approved' | 'Rejected';
  submittedDate: string;
  notes: string;
}

interface Report {
  id: string;
  name: string;
  period: string;
  totalHours: number;
  billableHours: number;
  utilization: number;
  generatedDate: string;
}

const myTimesheet: TimesheetEntry[] = [
  { project: 'ERP Implementation', mon: 3, tue: 4, wed: 3, thu: 4, fri: 2, sat: 0, sun: 0 },
  { project: 'Client Portal Redesign', mon: 2, tue: 2, wed: 3, thu: 2, fri: 3, sat: 0, sun: 0 },
  { project: 'Internal Tools', mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 },
  { project: 'Team Meetings', mon: 1, tue: 0.5, wed: 0.5, thu: 1, fri: 1, sat: 0, sun: 0 },
  { project: 'Training & Development', mon: 0.5, tue: 0, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0 },
];

const teamTimesheets: TeamTimesheet[] = [
  { id: 'ts-1', employee: 'Ahmed Hassan', week: 'May 5-11, 2026', totalHours: 42, billableHours: 35, status: 'Approved', submittedDate: '2026-05-09' },
  { id: 'ts-2', employee: 'Fatma El-Sayed', week: 'May 5-11, 2026', totalHours: 40, billableHours: 32, status: 'Approved', submittedDate: '2026-05-09' },
  { id: 'ts-3', employee: 'Mohamed Ali', week: 'May 5-11, 2026', totalHours: 38, billableHours: 28, status: 'Submitted', submittedDate: '2026-05-10' },
  { id: 'ts-4', employee: 'Nour Ibrahim', week: 'May 5-11, 2026', totalHours: 40, billableHours: 30, status: 'Draft', submittedDate: null },
  { id: 'ts-5', employee: 'Omar Farouk', week: 'May 5-11, 2026', totalHours: 44, billableHours: 38, status: 'Submitted', submittedDate: '2026-05-09' },
  { id: 'ts-6', employee: 'Yasmin Mostafa', week: 'May 5-11, 2026', totalHours: 41, billableHours: 36, status: 'Approved', submittedDate: '2026-05-08' },
  { id: 'ts-7', employee: 'Khaled Abdel-Rahman', week: 'May 5-11, 2026', totalHours: 39, billableHours: 25, status: 'Rejected', submittedDate: '2026-05-09' },
  { id: 'ts-8', employee: 'Sara Mahmoud', week: 'May 5-11, 2026', totalHours: 40, billableHours: 34, status: 'Submitted', submittedDate: '2026-05-10' },
];

const approvals: ApprovalEntry[] = [
  { id: 'ap-1', employee: 'Mohamed Ali', week: 'May 5-11, 2026', totalHours: 38, billableHours: 28, status: 'Submitted', submittedDate: '2026-05-10', notes: 'Includes 4h client meeting' },
  { id: 'ap-2', employee: 'Omar Farouk', week: 'May 5-11, 2026', totalHours: 44, billableHours: 38, status: 'Submitted', submittedDate: '2026-05-09', notes: '4h overtime - project deadline' },
  { id: 'ap-3', employee: 'Sara Mahmoud', week: 'May 5-11, 2026', totalHours: 40, billableHours: 34, status: 'Submitted', submittedDate: '2026-05-10', notes: '' },
  { id: 'ap-4', employee: 'Khaled Abdel-Rahman', week: 'Apr 28 - May 4, 2026', totalHours: 39, billableHours: 25, status: 'Rejected', submittedDate: '2026-05-05', notes: 'Missing project codes for 6h' },
  { id: 'ap-5', employee: 'Tarek Samy', week: 'May 5-11, 2026', totalHours: 36, billableHours: 30, status: 'Submitted', submittedDate: '2026-05-10', notes: 'Half day Friday - PTO' },
];

const reports: Report[] = [
  { id: 'rp-1', name: 'Weekly Summary', period: 'May 5-11, 2026', totalHours: 314, billableHours: 258, utilization: 82, generatedDate: '2026-05-11' },
  { id: 'rp-2', name: 'Monthly Report - April', period: 'Apr 2026', totalHours: 1280, billableHours: 1024, utilization: 80, generatedDate: '2026-05-01' },
  { id: 'rp-3', name: 'Project Hours - ERP', period: 'Q2 2026', totalHours: 580, billableHours: 580, utilization: 100, generatedDate: '2026-05-10' },
  { id: 'rp-4', name: 'Team Utilization', period: 'May 2026', totalHours: 640, billableHours: 512, utilization: 80, generatedDate: '2026-05-10' },
];

// --- Helpers ---

function statusColor(status: string) {
  switch (status) {
    case 'Approved': return 'default';
    case 'Submitted': return 'secondary';
    case 'Draft': return 'outline';
    case 'Rejected': return 'destructive';
    default: return 'outline';
  }
}

// --- Page Component ---

export default function TimeTrackingPage() {
  const [activeTab, setActiveTab] = useState('my-timesheet');
  const [searchTerm, setSearchTerm] = useState('');

  const totalWeekHours = myTimesheet.reduce((sum, row) =>
    sum + row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun, 0
  );
  const billableProjects = ['ERP Implementation', 'Client Portal Redesign'];
  const billableHours = myTimesheet
    .filter(e => billableProjects.includes(e.project))
    .reduce((sum, row) => sum + row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun, 0);
  const billablePercent = Math.round((billableHours / totalWeekHours) * 100);

  const filteredTeam = teamTimesheets.filter(t =>
    t.employee.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking & Timesheets</h1>
          <p className="text-muted-foreground">Log hours, submit timesheets, and manage approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Submit Timesheet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Logged This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWeekHours}h</div>
            <p className="text-xs text-muted-foreground">Target: 40h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable %</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billablePercent}%</div>
            <p className="text-xs text-muted-foreground">{billableHours}h billable of {totalWeekHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground">Team average this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Timesheets awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="my-timesheet">My Timesheet</TabsTrigger>
            <TabsTrigger value="team">Team Timesheets</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* My Timesheet Tab */}
        <TabsContent value="my-timesheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Week: May 5-11, 2026</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Project</TableHead>
                    <TableHead className="text-center">Mon</TableHead>
                    <TableHead className="text-center">Tue</TableHead>
                    <TableHead className="text-center">Wed</TableHead>
                    <TableHead className="text-center">Thu</TableHead>
                    <TableHead className="text-center">Fri</TableHead>
                    <TableHead className="text-center">Sat</TableHead>
                    <TableHead className="text-center">Sun</TableHead>
                    <TableHead className="text-center font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTimesheet.map((row, idx) => {
                    const rowTotal = row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.project}</TableCell>
                        <TableCell className="text-center">{row.mon || '-'}</TableCell>
                        <TableCell className="text-center">{row.tue || '-'}</TableCell>
                        <TableCell className="text-center">{row.wed || '-'}</TableCell>
                        <TableCell className="text-center">{row.thu || '-'}</TableCell>
                        <TableCell className="text-center">{row.fri || '-'}</TableCell>
                        <TableCell className="text-center">{row.sat || '-'}</TableCell>
                        <TableCell className="text-center">{row.sun || '-'}</TableCell>
                        <TableCell className="text-center font-bold">{rowTotal}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.mon, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.tue, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.wed, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.thu, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.fri, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.sat, 0)}</TableCell>
                    <TableCell className="text-center">{myTimesheet.reduce((s, r) => s + r.sun, 0)}</TableCell>
                    <TableCell className="text-center">{totalWeekHours}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Timesheets Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Billable Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeam.map((ts) => (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{ts.employee}</TableCell>
                      <TableCell>{ts.week}</TableCell>
                      <TableCell className="text-right">{ts.totalHours}h</TableCell>
                      <TableCell className="text-right">{ts.billableHours}h</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(ts.status)}>{ts.status}</Badge>
                      </TableCell>
                      <TableCell>{ts.submittedDate || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Billable Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((ap) => (
                    <TableRow key={ap.id}>
                      <TableCell className="font-medium">{ap.employee}</TableCell>
                      <TableCell>{ap.week}</TableCell>
                      <TableCell className="text-right">{ap.totalHours}h</TableCell>
                      <TableCell className="text-right">{ap.billableHours}h</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(ap.status)}>{ap.status}</Badge>
                      </TableCell>
                      <TableCell>{ap.submittedDate}</TableCell>
                      <TableCell>
                        {ap.status === 'Submitted' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Billable Hours</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((rp) => (
                    <TableRow key={rp.id}>
                      <TableCell className="font-medium">{rp.name}</TableCell>
                      <TableCell>{rp.period}</TableCell>
                      <TableCell className="text-right">{rp.totalHours}h</TableCell>
                      <TableCell className="text-right">{rp.billableHours}h</TableCell>
                      <TableCell>
                        <Badge variant={rp.utilization >= 80 ? 'default' : 'secondary'}>{rp.utilization}%</Badge>
                      </TableCell>
                      <TableCell>{rp.generatedDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

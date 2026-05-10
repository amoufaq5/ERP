'use client';

import { useState } from 'react';
import {
  DollarSign,
  Users,
  Clock,
  FileText,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Download,
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

interface PayrollRun {
  id: string;
  period: string;
  status: 'Draft' | 'Processing' | 'Completed' | 'Failed';
  employees: number;
  grossTotal: number;
  netTotal: number;
  runDate: string;
}

interface EmployeePay {
  id: string;
  employee: string;
  department: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
}

interface Deduction {
  id: string;
  name: string;
  type: string;
  amount: number;
  employees: number;
  frequency: string;
}

interface TaxSummary {
  id: string;
  category: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  period: string;
}

const payrollRuns: PayrollRun[] = [
  { id: 'PR-2026-05', period: 'May 2026', status: 'Draft', employees: 156, grossTotal: 1245000, netTotal: 987000, runDate: '2026-05-25' },
  { id: 'PR-2026-04', period: 'Apr 2026', status: 'Completed', employees: 154, grossTotal: 1230000, netTotal: 975000, runDate: '2026-04-25' },
  { id: 'PR-2026-03', period: 'Mar 2026', status: 'Completed', employees: 152, grossTotal: 1218000, netTotal: 965000, runDate: '2026-03-25' },
  { id: 'PR-2026-02', period: 'Feb 2026', status: 'Completed', employees: 150, grossTotal: 1200000, netTotal: 952000, runDate: '2026-02-25' },
  { id: 'PR-2026-01', period: 'Jan 2026', status: 'Completed', employees: 148, grossTotal: 1185000, netTotal: 940000, runDate: '2026-01-25' },
  { id: 'PR-2025-12', period: 'Dec 2025', status: 'Completed', employees: 148, grossTotal: 1420000, netTotal: 1125000, runDate: '2025-12-25' },
];

const employeePay: EmployeePay[] = [
  { id: 'ep-1', employee: 'Ahmed Hassan', department: 'Engineering', basicSalary: 18000, allowances: 7200, deductions: 5180, netPay: 20020 },
  { id: 'ep-2', employee: 'Fatma El-Sayed', department: 'Marketing', basicSalary: 15000, allowances: 6000, deductions: 4150, netPay: 16850 },
  { id: 'ep-3', employee: 'Mohamed Ali', department: 'Finance', basicSalary: 22000, allowances: 8800, deductions: 6580, netPay: 24220 },
  { id: 'ep-4', employee: 'Nour Ibrahim', department: 'HR', basicSalary: 13000, allowances: 5250, deductions: 3470, netPay: 14780 },
  { id: 'ep-5', employee: 'Omar Farouk', department: 'Sales', basicSalary: 16000, allowances: 6400, deductions: 4440, netPay: 17960 },
  { id: 'ep-6', employee: 'Yasmin Mostafa', department: 'Engineering', basicSalary: 20000, allowances: 7900, deductions: 5800, netPay: 22100 },
  { id: 'ep-7', employee: 'Khaled Abdel-Rahman', department: 'Operations', basicSalary: 17000, allowances: 6800, deductions: 4730, netPay: 19070 },
  { id: 'ep-8', employee: 'Sara Mahmoud', department: 'Finance', basicSalary: 14000, allowances: 5600, deductions: 3760, netPay: 15840 },
];

const deductions: Deduction[] = [
  { id: 'd-1', name: 'Social Insurance', type: 'Statutory', amount: 2450, employees: 156, frequency: 'Monthly' },
  { id: 'd-2', name: 'Income Tax', type: 'Tax', amount: 2800, employees: 156, frequency: 'Monthly' },
  { id: 'd-3', name: 'Health Insurance', type: 'Benefit', amount: 850, employees: 142, frequency: 'Monthly' },
  { id: 'd-4', name: 'Retirement Fund', type: 'Voluntary', amount: 1200, employees: 98, frequency: 'Monthly' },
  { id: 'd-5', name: 'Loan Repayment', type: 'Other', amount: 1500, employees: 23, frequency: 'Monthly' },
  { id: 'd-6', name: 'Union Dues', type: 'Voluntary', amount: 150, employees: 67, frequency: 'Monthly' },
];

const taxSummary: TaxSummary[] = [
  { id: 't-1', category: 'Income Tax - Bracket 1 (0-15k)', taxableAmount: 450000, taxRate: 0, taxAmount: 0, period: 'May 2026' },
  { id: 't-2', category: 'Income Tax - Bracket 2 (15k-30k)', taxableAmount: 620000, taxRate: 10, taxAmount: 62000, period: 'May 2026' },
  { id: 't-3', category: 'Income Tax - Bracket 3 (30k-45k)', taxableAmount: 380000, taxRate: 15, taxAmount: 57000, period: 'May 2026' },
  { id: 't-4', category: 'Income Tax - Bracket 4 (45k-60k)', taxableAmount: 210000, taxRate: 20, taxAmount: 42000, period: 'May 2026' },
  { id: 't-5', category: 'Income Tax - Bracket 5 (60k+)', taxableAmount: 95000, taxRate: 25, taxAmount: 23750, period: 'May 2026' },
  { id: 't-6', category: 'Social Insurance Contribution', taxableAmount: 1245000, taxRate: 14, taxAmount: 174300, period: 'May 2026' },
];

// --- Helpers ---

function statusColor(status: string) {
  switch (status) {
    case 'Completed': return 'default';
    case 'Processing': return 'secondary';
    case 'Draft': return 'outline';
    case 'Failed': return 'destructive';
    default: return 'outline';
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

// --- Page Component ---

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('runs');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRuns = payrollRuns.filter(r =>
    r.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployeePay = employeePay.filter(e =>
    e.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Payroll</h1>
          <p className="text-muted-foreground">Manage payroll processing, deductions, and tax compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Generate Payslips
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Run
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(1245000)}</div>
            <p className="text-xs text-muted-foreground">+1.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees Processed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+2 new this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Requires manager sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Deductions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(359050)}</div>
            <p className="text-xs text-muted-foreground">All statutory deductions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
            <TabsTrigger value="employee-pay">Employee Pay</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="tax">Tax Summary</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Payroll Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Gross Total</TableHead>
                    <TableHead className="text-right">Net Total</TableHead>
                    <TableHead>Run Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.id}</TableCell>
                      <TableCell>{run.period}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(run.status)}>{run.status}</Badge>
                      </TableCell>
                      <TableCell>{run.employees}</TableCell>
                      <TableCell className="text-right">{formatCurrency(run.grossTotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(run.netTotal)}</TableCell>
                      <TableCell>{run.runDate}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {run.status === 'Draft' && (
                            <Button size="sm" variant="outline">
                              <Play className="h-3 w-3 mr-1" />
                              Process
                            </Button>
                          )}
                          {run.status === 'Processing' && (
                            <Button size="sm" variant="outline">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Pay Tab */}
        <TabsContent value="employee-pay" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployeePay.map((ep) => (
                    <TableRow key={ep.id}>
                      <TableCell className="font-medium">{ep.employee}</TableCell>
                      <TableCell>{ep.department}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ep.basicSalary)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(ep.allowances)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(ep.deductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(ep.netPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions Tab */}
        <TabsContent value="deductions" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Avg Amount</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(d.amount)}</TableCell>
                      <TableCell>{d.employees}</TableCell>
                      <TableCell>{d.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Summary Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Taxable Amount</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxSummary.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.taxableAmount)}</TableCell>
                      <TableCell className="text-right">{t.taxRate}%</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(t.taxAmount)}</TableCell>
                      <TableCell>{t.period}</TableCell>
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

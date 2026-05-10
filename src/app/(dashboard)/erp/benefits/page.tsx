'use client';

import { useState } from 'react';
import {
  Heart,
  Users,
  FileText,
  DollarSign,
  Plus,
  CheckCircle2,
  Eye,
  Shield,
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

interface BenefitPlan {
  id: string;
  name: string;
  type: 'Health' | 'Dental' | 'Vision' | 'Life' | 'Retirement';
  provider: string;
  coverage: string;
  monthlyCost: number;
  enrolledCount: number;
}

interface Enrollment {
  id: string;
  employee: string;
  plan: string;
  enrollDate: string;
  status: 'Active' | 'Pending' | 'Cancelled';
  dependents: number;
}

interface Claim {
  id: string;
  employee: string;
  plan: string;
  amount: number;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';
  date: string;
  description: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  plans: number;
  contactEmail: string;
  rating: number;
}

const plans: BenefitPlan[] = [
  { id: 'bp-1', name: 'Premium Health Plus', type: 'Health', provider: 'BlueCross', coverage: 'Full medical, hospital, prescriptions', monthlyCost: 850, enrolledCount: 124 },
  { id: 'bp-2', name: 'Dental Care Standard', type: 'Dental', provider: 'DentaMax', coverage: 'Preventive, basic, major dental', monthlyCost: 120, enrolledCount: 98 },
  { id: 'bp-3', name: 'Vision Essential', type: 'Vision', provider: 'EyeCare Inc', coverage: 'Annual exam, lenses, frames', monthlyCost: 65, enrolledCount: 87 },
  { id: 'bp-4', name: 'Life Protection 3x', type: 'Life', provider: 'SecureLife', coverage: '3x annual salary', monthlyCost: 45, enrolledCount: 142 },
  { id: 'bp-5', name: '401k Match Plan', type: 'Retirement', provider: 'Vanguard', coverage: '6% employer match', monthlyCost: 0, enrolledCount: 136 },
  { id: 'bp-6', name: 'Health Basic', type: 'Health', provider: 'Aetna', coverage: 'Basic medical, emergency only', monthlyCost: 450, enrolledCount: 32 },
];

const enrollments: Enrollment[] = [
  { id: 'en-1', employee: 'Ahmed Hassan', plan: 'Premium Health Plus', enrollDate: '2025-01-15', status: 'Active', dependents: 3 },
  { id: 'en-2', employee: 'Fatma El-Sayed', plan: 'Dental Care Standard', enrollDate: '2025-02-01', status: 'Active', dependents: 1 },
  { id: 'en-3', employee: 'Mohamed Ali', plan: '401k Match Plan', enrollDate: '2025-01-15', status: 'Active', dependents: 0 },
  { id: 'en-4', employee: 'Nour Ibrahim', plan: 'Vision Essential', enrollDate: '2026-04-01', status: 'Pending', dependents: 2 },
  { id: 'en-5', employee: 'Omar Farouk', plan: 'Life Protection 3x', enrollDate: '2025-03-10', status: 'Active', dependents: 4 },
  { id: 'en-6', employee: 'Yasmin Mostafa', plan: 'Premium Health Plus', enrollDate: '2025-06-15', status: 'Cancelled', dependents: 0 },
  { id: 'en-7', employee: 'Khaled Abdel-Rahman', plan: 'Health Basic', enrollDate: '2026-01-01', status: 'Active', dependents: 2 },
];

const claims: Claim[] = [
  { id: 'CLM-001', employee: 'Ahmed Hassan', plan: 'Premium Health Plus', amount: 2500, status: 'Paid', date: '2026-05-02', description: 'Hospital visit - cardiology' },
  { id: 'CLM-002', employee: 'Fatma El-Sayed', plan: 'Dental Care Standard', amount: 380, status: 'Approved', date: '2026-05-05', description: 'Root canal treatment' },
  { id: 'CLM-003', employee: 'Omar Farouk', plan: 'Premium Health Plus', amount: 1200, status: 'Under Review', date: '2026-05-07', description: 'MRI scan and consultation' },
  { id: 'CLM-004', employee: 'Sara Mahmoud', plan: 'Vision Essential', amount: 450, status: 'Submitted', date: '2026-05-09', description: 'New prescription lenses' },
  { id: 'CLM-005', employee: 'Khaled Abdel-Rahman', plan: 'Health Basic', amount: 890, status: 'Rejected', date: '2026-04-28', description: 'Elective procedure - not covered' },
  { id: 'CLM-006', employee: 'Mohamed Ali', plan: 'Premium Health Plus', amount: 3200, status: 'Under Review', date: '2026-05-08', description: 'Surgery - orthopedic' },
  { id: 'CLM-007', employee: 'Nour Ibrahim', plan: 'Dental Care Standard', amount: 220, status: 'Paid', date: '2026-04-20', description: 'Routine cleaning and x-ray' },
];

const providers: Provider[] = [
  { id: 'pv-1', name: 'BlueCross', type: 'Health Insurance', plans: 2, contactEmail: 'corporate@bluecross.com', rating: 4.5 },
  { id: 'pv-2', name: 'DentaMax', type: 'Dental Insurance', plans: 1, contactEmail: 'plans@dentamax.com', rating: 4.2 },
  { id: 'pv-3', name: 'EyeCare Inc', type: 'Vision Insurance', plans: 1, contactEmail: 'business@eyecare.com', rating: 4.0 },
  { id: 'pv-4', name: 'SecureLife', type: 'Life Insurance', plans: 1, contactEmail: 'corporate@securelife.com', rating: 4.7 },
  { id: 'pv-5', name: 'Vanguard', type: 'Retirement Services', plans: 1, contactEmail: 'employer@vanguard.com', rating: 4.8 },
  { id: 'pv-6', name: 'Aetna', type: 'Health Insurance', plans: 1, contactEmail: 'groups@aetna.com', rating: 4.1 },
];

// --- Helpers ---

function claimStatusColor(status: string) {
  switch (status) {
    case 'Paid': return 'default';
    case 'Approved': return 'default';
    case 'Under Review': return 'secondary';
    case 'Submitted': return 'outline';
    case 'Rejected': return 'destructive';
    default: return 'outline';
  }
}

function planTypeColor(type: string) {
  switch (type) {
    case 'Health': return 'default';
    case 'Dental': return 'secondary';
    case 'Vision': return 'outline';
    case 'Life': return 'destructive';
    case 'Retirement': return 'default';
    default: return 'outline';
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

// --- Page Component ---

export default function BenefitsPage() {
  const [activeTab, setActiveTab] = useState('plans');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClaims = claims.filter(c =>
    c.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benefits Administration</h1>
          <p className="text-muted-foreground">Manage employee benefit plans, enrollments, and claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Enroll Employee
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">Across 5 providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">148</div>
            <p className="text-xs text-muted-foreground">95% participation rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">3 pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(142800)}</div>
            <p className="text-xs text-muted-foreground">Employer contribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead className="text-right">Monthly Cost</TableHead>
                    <TableHead>Enrolled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge variant={planTypeColor(plan.type)}>{plan.type}</Badge>
                      </TableCell>
                      <TableCell>{plan.provider}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{plan.coverage}</TableCell>
                      <TableCell className="text-right">{plan.monthlyCost === 0 ? 'N/A' : formatCurrency(plan.monthlyCost)}</TableCell>
                      <TableCell>{plan.enrolledCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollment Tab */}
        <TabsContent value="enrollment" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Enroll Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dependents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enr) => (
                    <TableRow key={enr.id}>
                      <TableCell className="font-medium">{enr.employee}</TableCell>
                      <TableCell>{enr.plan}</TableCell>
                      <TableCell>{enr.enrollDate}</TableCell>
                      <TableCell>
                        <Badge variant={enr.status === 'Active' ? 'default' : enr.status === 'Pending' ? 'secondary' : 'destructive'}>
                          {enr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{enr.dependents}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.id}</TableCell>
                      <TableCell>{claim.employee}</TableCell>
                      <TableCell>{claim.plan}</TableCell>
                      <TableCell className="text-right">{formatCurrency(claim.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={claimStatusColor(claim.status)}>{claim.status}</Badge>
                      </TableCell>
                      <TableCell>{claim.date}</TableCell>
                      <TableCell>
                        {(claim.status === 'Submitted' || claim.status === 'Under Review') && (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Process
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((pv) => (
                    <TableRow key={pv.id}>
                      <TableCell className="font-medium">{pv.name}</TableCell>
                      <TableCell>{pv.type}</TableCell>
                      <TableCell>{pv.plans}</TableCell>
                      <TableCell>{pv.contactEmail}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pv.rating}/5</Badge>
                      </TableCell>
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

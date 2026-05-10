'use client';

import { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Plus,
  Send,
  XCircle,
  Clock,
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

interface Contract {
  id: string;
  contractNumber: string;
  clientVendor: string;
  type: 'Service' | 'License' | 'Lease' | 'NDA' | 'Employment';
  value: number;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
}

interface Renewal {
  id: string;
  contract: string;
  client: string;
  expiryDate: string;
  autoRenew: boolean;
  actionRequired: string;
}

interface Obligation {
  id: string;
  contract: string;
  obligation: string;
  party: string;
  dueDate: string;
  status: 'Pending' | 'Completed' | 'Overdue';
}

interface Template {
  id: string;
  name: string;
  type: string;
  lastUpdated: string;
  usageCount: number;
  version: string;
}

const contracts: Contract[] = [
  { id: 'ct-1', contractNumber: 'CTR-2026-001', clientVendor: 'Acme Corp', type: 'Service', value: 450000, startDate: '2025-06-01', endDate: '2026-05-31', status: 'Active' },
  { id: 'ct-2', contractNumber: 'CTR-2026-002', clientVendor: 'TechStart Inc', type: 'Service', value: 280000, startDate: '2026-01-15', endDate: '2027-01-14', status: 'Active' },
  { id: 'ct-3', contractNumber: 'CTR-2026-003', clientVendor: 'Global Systems', type: 'License', value: 95000, startDate: '2026-03-01', endDate: '2027-02-28', status: 'Active' },
  { id: 'ct-4', contractNumber: 'CTR-2026-004', clientVendor: 'BuildRight LLC', type: 'Lease', value: 180000, startDate: '2024-01-01', endDate: '2026-12-31', status: 'Active' },
  { id: 'ct-5', contractNumber: 'CTR-2026-005', clientVendor: 'DataFlow Partners', type: 'NDA', value: 0, startDate: '2026-02-10', endDate: '2028-02-09', status: 'Active' },
  { id: 'ct-6', contractNumber: 'CTR-2025-018', clientVendor: 'OldVendor Co', type: 'Service', value: 120000, startDate: '2024-06-01', endDate: '2025-05-31', status: 'Expired' },
  { id: 'ct-7', contractNumber: 'CTR-2026-006', clientVendor: 'NewClient Ltd', type: 'Service', value: 350000, startDate: '2026-06-01', endDate: '2027-05-31', status: 'Draft' },
  { id: 'ct-8', contractNumber: 'CTR-2025-012', clientVendor: 'FailedDeal Inc', type: 'Service', value: 200000, startDate: '2025-03-01', endDate: '2026-02-28', status: 'Terminated' },
  { id: 'ct-9', contractNumber: 'CTR-2026-007', clientVendor: 'MegaCorp', type: 'License', value: 520000, startDate: '2026-04-01', endDate: '2029-03-31', status: 'Active' },
];

const renewals: Renewal[] = [
  { id: 'rn-1', contract: 'CTR-2026-001', client: 'Acme Corp', expiryDate: '2026-05-31', autoRenew: false, actionRequired: 'Send renewal proposal' },
  { id: 'rn-2', contract: 'CTR-2026-004', client: 'BuildRight LLC', expiryDate: '2026-12-31', autoRenew: true, actionRequired: 'Review terms before auto-renewal' },
  { id: 'rn-3', contract: 'CTR-2026-003', client: 'Global Systems', expiryDate: '2027-02-28', autoRenew: false, actionRequired: 'Negotiate new pricing' },
  { id: 'rn-4', contract: 'CTR-2026-002', client: 'TechStart Inc', expiryDate: '2027-01-14', autoRenew: true, actionRequired: 'No action needed' },
];

const obligations: Obligation[] = [
  { id: 'ob-1', contract: 'CTR-2026-001', obligation: 'Monthly progress report delivery', party: 'Us', dueDate: '2026-05-15', status: 'Pending' },
  { id: 'ob-2', contract: 'CTR-2026-001', obligation: 'Payment milestone - Phase 2', party: 'Acme Corp', dueDate: '2026-05-20', status: 'Pending' },
  { id: 'ob-3', contract: 'CTR-2026-002', obligation: 'Quarterly security audit', party: 'Us', dueDate: '2026-04-15', status: 'Overdue' },
  { id: 'ob-4', contract: 'CTR-2026-003', obligation: 'License key renewal', party: 'Global Systems', dueDate: '2026-05-01', status: 'Completed' },
  { id: 'ob-5', contract: 'CTR-2026-004', obligation: 'Annual maintenance inspection', party: 'BuildRight LLC', dueDate: '2026-06-01', status: 'Pending' },
  { id: 'ob-6', contract: 'CTR-2026-007', obligation: 'SLA uptime guarantee (99.9%)', party: 'Us', dueDate: '2026-05-31', status: 'Pending' },
];

const templates: Template[] = [
  { id: 'tp-1', name: 'Standard Service Agreement', type: 'Service', lastUpdated: '2026-03-15', usageCount: 24, version: '3.2' },
  { id: 'tp-2', name: 'Software License Agreement', type: 'License', lastUpdated: '2026-01-20', usageCount: 12, version: '2.1' },
  { id: 'tp-3', name: 'Non-Disclosure Agreement', type: 'NDA', lastUpdated: '2026-04-01', usageCount: 45, version: '4.0' },
  { id: 'tp-4', name: 'Office Lease Agreement', type: 'Lease', lastUpdated: '2025-11-10', usageCount: 3, version: '1.5' },
  { id: 'tp-5', name: 'Employment Contract', type: 'Employment', lastUpdated: '2026-02-28', usageCount: 38, version: '5.1' },
  { id: 'tp-6', name: 'Master Service Agreement', type: 'Service', lastUpdated: '2026-04-20', usageCount: 8, version: '2.0' },
];

// --- Helpers ---

function contractStatusColor(status: string) {
  switch (status) {
    case 'Active': return 'default';
    case 'Draft': return 'outline';
    case 'Expired': return 'secondary';
    case 'Terminated': return 'destructive';
    default: return 'outline';
  }
}

function obligationStatusColor(status: string) {
  switch (status) {
    case 'Completed': return 'default';
    case 'Pending': return 'secondary';
    case 'Overdue': return 'destructive';
    default: return 'outline';
  }
}

function contractTypeColor(type: string) {
  switch (type) {
    case 'Service': return 'default';
    case 'License': return 'secondary';
    case 'Lease': return 'outline';
    case 'NDA': return 'outline';
    case 'Employment': return 'default';
    default: return 'outline';
  }
}

function formatCurrency(value: number) {
  if (value === 0) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

// --- Page Component ---

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchTerm, setSearchTerm] = useState('');

  const activeContracts = contracts.filter(c => c.status === 'Active').length;
  const expiringIn30 = contracts.filter(c => {
    if (c.status !== 'Active') return false;
    const end = new Date(c.endDate);
    const now = new Date('2026-05-10');
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  }).length;
  const totalValue = contracts.filter(c => c.status === 'Active').reduce((s, c) => s + c.value, 0);
  const renewalsDue = renewals.filter(r => !r.autoRenew).length;

  const filteredContracts = contracts.filter(c =>
    c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientVendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
          <p className="text-muted-foreground">Track contracts, renewals, and obligations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Send for Signature
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Contract
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
            <p className="text-xs text-muted-foreground">Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring in 30 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringIn30}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Active contracts only</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewals Due</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewalsDue}</div>
            <p className="text-xs text-muted-foreground">Manual renewal required</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="renewals">Renewals</TabsTrigger>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Client/Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.contractNumber}</TableCell>
                      <TableCell>{c.clientVendor}</TableCell>
                      <TableCell>
                        <Badge variant={contractTypeColor(c.type)}>{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(c.value)}</TableCell>
                      <TableCell>{c.startDate}</TableCell>
                      <TableCell>{c.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={contractStatusColor(c.status)}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === 'Active' && (
                            <Button size="sm" variant="outline">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Renew
                            </Button>
                          )}
                          {c.status === 'Active' && (
                            <Button size="sm" variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Terminate
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

        {/* Renewals Tab */}
        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                    <TableHead>Action Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((rn) => (
                    <TableRow key={rn.id}>
                      <TableCell className="font-medium">{rn.contract}</TableCell>
                      <TableCell>{rn.client}</TableCell>
                      <TableCell>{rn.expiryDate}</TableCell>
                      <TableCell>
                        <Badge variant={rn.autoRenew ? 'default' : 'secondary'}>
                          {rn.autoRenew ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{rn.actionRequired}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obligations Tab */}
        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Responsible Party</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((ob) => (
                    <TableRow key={ob.id}>
                      <TableCell className="font-medium">{ob.contract}</TableCell>
                      <TableCell>{ob.obligation}</TableCell>
                      <TableCell>{ob.party}</TableCell>
                      <TableCell>{ob.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={obligationStatusColor(ob.status)}>{ob.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Usage Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tp) => (
                    <TableRow key={tp.id}>
                      <TableCell className="font-medium">{tp.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tp.type}</Badge>
                      </TableCell>
                      <TableCell>v{tp.version}</TableCell>
                      <TableCell>{tp.lastUpdated}</TableCell>
                      <TableCell>{tp.usageCount} uses</TableCell>
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

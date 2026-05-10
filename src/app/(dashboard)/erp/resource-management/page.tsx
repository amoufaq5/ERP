'use client';

import { useState } from 'react';
import {
  Users,
  Briefcase,
  BarChart3,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  UserMinus,
  Calendar,
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

interface Resource {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availability: number;
  currentProject: string | null;
  utilization: number;
}

interface Allocation {
  id: string;
  resource: string;
  project: string;
  role: string;
  startDate: string;
  endDate: string;
  allocation: number;
  status: 'Active' | 'Planned' | 'Completed';
}

interface CapacityRow {
  id: string;
  resource: string;
  role: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  projects: string[];
}

interface SkillEntry {
  id: string;
  resource: string;
  skill: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsExp: number;
  certified: boolean;
}

const resources: Resource[] = [
  { id: 'r-1', name: 'Ahmed Hassan', role: 'Senior Developer', skills: ['React', 'Node.js', 'TypeScript'], availability: 20, currentProject: 'ERP Implementation', utilization: 80 },
  { id: 'r-2', name: 'Fatma El-Sayed', role: 'UX Designer', skills: ['Figma', 'Research', 'Prototyping'], availability: 40, currentProject: 'Client Portal', utilization: 60 },
  { id: 'r-3', name: 'Mohamed Ali', role: 'Project Manager', skills: ['Agile', 'PMP', 'Risk Management'], availability: 10, currentProject: 'ERP Implementation', utilization: 90 },
  { id: 'r-4', name: 'Nour Ibrahim', role: 'Business Analyst', skills: ['Requirements', 'SQL', 'BPMN'], availability: 100, currentProject: null, utilization: 0 },
  { id: 'r-5', name: 'Omar Farouk', role: 'DevOps Engineer', skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'], availability: 30, currentProject: 'Infrastructure Upgrade', utilization: 70 },
  { id: 'r-6', name: 'Yasmin Mostafa', role: 'Senior Developer', skills: ['Python', 'Django', 'PostgreSQL'], availability: 0, currentProject: 'Data Platform', utilization: 100 },
  { id: 'r-7', name: 'Khaled Abdel-Rahman', role: 'QA Engineer', skills: ['Selenium', 'Cypress', 'API Testing'], availability: 50, currentProject: 'Client Portal', utilization: 50 },
  { id: 'r-8', name: 'Sara Mahmoud', role: 'Data Analyst', skills: ['Python', 'SQL', 'Tableau', 'Power BI'], availability: 60, currentProject: 'Reporting Module', utilization: 40 },
  { id: 'r-9', name: 'Tarek Samy', role: 'Junior Developer', skills: ['JavaScript', 'React'], availability: 100, currentProject: null, utilization: 0 },
  { id: 'r-10', name: 'Hana Adel', role: 'Scrum Master', skills: ['Agile', 'SAFe', 'Facilitation'], availability: 25, currentProject: 'ERP Implementation', utilization: 75 },
];

const allocations: Allocation[] = [
  { id: 'al-1', resource: 'Ahmed Hassan', project: 'ERP Implementation', role: 'Tech Lead', startDate: '2026-01-15', endDate: '2026-07-31', allocation: 80, status: 'Active' },
  { id: 'al-2', resource: 'Fatma El-Sayed', project: 'Client Portal', role: 'Lead Designer', startDate: '2026-03-01', endDate: '2026-06-30', allocation: 60, status: 'Active' },
  { id: 'al-3', resource: 'Mohamed Ali', project: 'ERP Implementation', role: 'PM', startDate: '2026-01-01', endDate: '2026-08-31', allocation: 90, status: 'Active' },
  { id: 'al-4', resource: 'Omar Farouk', project: 'Infrastructure Upgrade', role: 'DevOps Lead', startDate: '2026-04-01', endDate: '2026-06-15', allocation: 70, status: 'Active' },
  { id: 'al-5', resource: 'Yasmin Mostafa', project: 'Data Platform', role: 'Backend Developer', startDate: '2026-02-01', endDate: '2026-05-31', allocation: 100, status: 'Active' },
  { id: 'al-6', resource: 'Khaled Abdel-Rahman', project: 'Client Portal', role: 'QA Lead', startDate: '2026-03-15', endDate: '2026-06-30', allocation: 50, status: 'Active' },
  { id: 'al-7', resource: 'Sara Mahmoud', project: 'Reporting Module', role: 'Data Analyst', startDate: '2026-04-15', endDate: '2026-06-30', allocation: 40, status: 'Active' },
  { id: 'al-8', resource: 'Hana Adel', project: 'ERP Implementation', role: 'Scrum Master', startDate: '2026-01-15', endDate: '2026-07-31', allocation: 75, status: 'Active' },
  { id: 'al-9', resource: 'Ahmed Hassan', project: 'Mobile App', role: 'Architect', startDate: '2026-08-01', endDate: '2026-12-31', allocation: 60, status: 'Planned' },
  { id: 'al-10', resource: 'Nour Ibrahim', project: 'CRM Integration', role: 'BA', startDate: '2026-05-15', endDate: '2026-08-31', allocation: 100, status: 'Planned' },
];

const capacityPlanning: CapacityRow[] = [
  { id: 'cp-1', resource: 'Ahmed Hassan', role: 'Senior Developer', week1: 80, week2: 80, week3: 80, week4: 80, projects: ['ERP Implementation'] },
  { id: 'cp-2', resource: 'Fatma El-Sayed', role: 'UX Designer', week1: 60, week2: 60, week3: 40, week4: 40, projects: ['Client Portal'] },
  { id: 'cp-3', resource: 'Mohamed Ali', role: 'Project Manager', week1: 90, week2: 90, week3: 90, week4: 90, projects: ['ERP Implementation'] },
  { id: 'cp-4', resource: 'Nour Ibrahim', role: 'Business Analyst', week1: 0, week2: 50, week3: 100, week4: 100, projects: ['CRM Integration'] },
  { id: 'cp-5', resource: 'Omar Farouk', role: 'DevOps Engineer', week1: 70, week2: 70, week3: 70, week4: 50, projects: ['Infrastructure Upgrade'] },
  { id: 'cp-6', resource: 'Yasmin Mostafa', role: 'Senior Developer', week1: 100, week2: 100, week3: 80, week4: 60, projects: ['Data Platform'] },
  { id: 'cp-7', resource: 'Khaled Abdel-Rahman', role: 'QA Engineer', week1: 50, week2: 50, week3: 50, week4: 50, projects: ['Client Portal'] },
  { id: 'cp-8', resource: 'Sara Mahmoud', role: 'Data Analyst', week1: 40, week2: 40, week3: 40, week4: 40, projects: ['Reporting Module'] },
];

const skillsMatrix: SkillEntry[] = [
  { id: 'sk-1', resource: 'Ahmed Hassan', skill: 'React', level: 'Expert', yearsExp: 6, certified: true },
  { id: 'sk-2', resource: 'Ahmed Hassan', skill: 'Node.js', level: 'Advanced', yearsExp: 5, certified: false },
  { id: 'sk-3', resource: 'Fatma El-Sayed', skill: 'Figma', level: 'Expert', yearsExp: 4, certified: true },
  { id: 'sk-4', resource: 'Mohamed Ali', skill: 'PMP', level: 'Expert', yearsExp: 8, certified: true },
  { id: 'sk-5', resource: 'Omar Farouk', skill: 'AWS', level: 'Advanced', yearsExp: 4, certified: true },
  { id: 'sk-6', resource: 'Omar Farouk', skill: 'Kubernetes', level: 'Intermediate', yearsExp: 2, certified: false },
  { id: 'sk-7', resource: 'Yasmin Mostafa', skill: 'Python', level: 'Expert', yearsExp: 7, certified: false },
  { id: 'sk-8', resource: 'Sara Mahmoud', skill: 'Power BI', level: 'Advanced', yearsExp: 3, certified: true },
  { id: 'sk-9', resource: 'Khaled Abdel-Rahman', skill: 'Cypress', level: 'Advanced', yearsExp: 3, certified: false },
  { id: 'sk-10', resource: 'Tarek Samy', skill: 'React', level: 'Beginner', yearsExp: 1, certified: false },
];

// --- Helpers ---

function utilizationColor(util: number) {
  if (util >= 90) return 'destructive';
  if (util >= 70) return 'default';
  if (util >= 40) return 'secondary';
  return 'outline';
}

function skillLevelColor(level: string) {
  switch (level) {
    case 'Expert': return 'default';
    case 'Advanced': return 'secondary';
    case 'Intermediate': return 'outline';
    case 'Beginner': return 'outline';
    default: return 'outline';
  }
}

function capacityCellColor(pct: number) {
  if (pct >= 90) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (pct >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  if (pct > 0) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  return 'text-muted-foreground';
}

// --- Page Component ---

export default function ResourceManagementPage() {
  const [activeTab, setActiveTab] = useState('pool');
  const [searchTerm, setSearchTerm] = useState('');

  const totalResources = resources.length;
  const allocatedCount = resources.filter(r => r.currentProject !== null).length;
  const allocatedPct = Math.round((allocatedCount / totalResources) * 100);
  const benchCount = resources.filter(r => r.utilization === 0).length;
  const avgUtilization = Math.round(resources.reduce((s, r) => s + r.utilization, 0) / totalResources);

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAllocations = allocations.filter(a =>
    a.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
          <p className="text-muted-foreground">Manage resource allocation, capacity, and skills</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserMinus className="mr-2 h-4 w-4" />
            Release
          </Button>
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Request Resource
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Allocate Resource
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allocatedPct}%</div>
            <p className="text-xs text-muted-foreground">{allocatedCount} of {totalResources} assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bench Count</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{benchCount}</div>
            <p className="text-xs text-muted-foreground">Available for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <p className="text-xs text-muted-foreground">Target: 75%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pool">Resource Pool</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
            <TabsTrigger value="skills">Skills Matrix</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Resource Pool Tab */}
        <TabsContent value="pool" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Current Project</TableHead>
                    <TableHead>Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.skills.slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                          {r.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{r.skills.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{r.availability}%</TableCell>
                      <TableCell>{r.currentProject || <span className="text-muted-foreground">Bench</span>}</TableCell>
                      <TableCell>
                        <Badge variant={utilizationColor(r.utilization)}>{r.utilization}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocations Tab */}
        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.resource}</TableCell>
                      <TableCell>{a.project}</TableCell>
                      <TableCell>{a.role}</TableCell>
                      <TableCell>{a.startDate}</TableCell>
                      <TableCell>{a.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={utilizationColor(a.allocation)}>{a.allocation}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.status === 'Active' ? 'default' : a.status === 'Planned' ? 'secondary' : 'outline'}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Planning Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4-Week Capacity View (May 2026)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Week 1</TableHead>
                    <TableHead className="text-center">Week 2</TableHead>
                    <TableHead className="text-center">Week 3</TableHead>
                    <TableHead className="text-center">Week 4</TableHead>
                    <TableHead>Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacityPlanning.map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">{cp.resource}</TableCell>
                      <TableCell>{cp.role}</TableCell>
                      <TableCell className={`text-center ${capacityCellColor(cp.week1)}`}>{cp.week1}%</TableCell>
                      <TableCell className={`text-center ${capacityCellColor(cp.week2)}`}>{cp.week2}%</TableCell>
                      <TableCell className={`text-center ${capacityCellColor(cp.week3)}`}>{cp.week3}%</TableCell>
                      <TableCell className={`text-center ${capacityCellColor(cp.week4)}`}>{cp.week4}%</TableCell>
                      <TableCell>{cp.projects.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Matrix Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Years Exp</TableHead>
                    <TableHead>Certified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillsMatrix.map((sk) => (
                    <TableRow key={sk.id}>
                      <TableCell className="font-medium">{sk.resource}</TableCell>
                      <TableCell>{sk.skill}</TableCell>
                      <TableCell>
                        <Badge variant={skillLevelColor(sk.level)}>{sk.level}</Badge>
                      </TableCell>
                      <TableCell>{sk.yearsExp} yrs</TableCell>
                      <TableCell>
                        {sk.certified ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
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

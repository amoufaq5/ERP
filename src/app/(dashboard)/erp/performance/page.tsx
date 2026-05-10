'use client';

import { useState } from 'react';
import {
  Target,
  Star,
  TrendingUp,
  Users,
  Plus,
  UserCheck,
  Send,
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

interface ReviewCycle {
  id: string;
  name: string;
  period: string;
  status: 'Active' | 'Completed' | 'Planned';
  totalReviews: number;
  completedReviews: number;
  dueDate: string;
}

interface Review {
  id: string;
  employee: string;
  reviewer: string;
  cycle: string;
  rating: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
}

interface Goal {
  id: string;
  employee: string;
  goal: string;
  category: string;
  progress: number;
  status: 'On Track' | 'At Risk' | 'Behind' | 'Completed';
  dueDate: string;
}

interface Feedback {
  id: string;
  subject: string;
  reviewer: string;
  relationship: string;
  cycle: string;
  status: 'Pending' | 'Submitted';
  submittedDate: string | null;
}

const reviewCycles: ReviewCycle[] = [
  { id: 'rc-1', name: 'H1 2026 Performance Review', period: 'Jan - Jun 2026', status: 'Active', totalReviews: 156, completedReviews: 89, dueDate: '2026-06-30' },
  { id: 'rc-2', name: 'H2 2025 Performance Review', period: 'Jul - Dec 2025', status: 'Completed', totalReviews: 148, completedReviews: 148, dueDate: '2025-12-31' },
  { id: 'rc-3', name: 'H2 2026 Performance Review', period: 'Jul - Dec 2026', status: 'Planned', totalReviews: 0, completedReviews: 0, dueDate: '2026-12-31' },
];

const reviews: Review[] = [
  { id: 'rv-1', employee: 'Ahmed Hassan', reviewer: 'Mohamed Ali', cycle: 'H1 2026', rating: 4.5, status: 'Completed', dueDate: '2026-06-15' },
  { id: 'rv-2', employee: 'Fatma El-Sayed', reviewer: 'Sara Mahmoud', cycle: 'H1 2026', rating: 4.0, status: 'Completed', dueDate: '2026-06-15' },
  { id: 'rv-3', employee: 'Nour Ibrahim', reviewer: 'Khaled Abdel-Rahman', cycle: 'H1 2026', rating: 0, status: 'In Progress', dueDate: '2026-06-15' },
  { id: 'rv-4', employee: 'Omar Farouk', reviewer: 'Mohamed Ali', cycle: 'H1 2026', rating: 3.5, status: 'Completed', dueDate: '2026-06-15' },
  { id: 'rv-5', employee: 'Yasmin Mostafa', reviewer: 'Ahmed Hassan', cycle: 'H1 2026', rating: 0, status: 'Pending', dueDate: '2026-06-15' },
  { id: 'rv-6', employee: 'Khaled Abdel-Rahman', reviewer: 'Mohamed Ali', cycle: 'H1 2026', rating: 0, status: 'In Progress', dueDate: '2026-06-15' },
];

const goals: Goal[] = [
  { id: 'g-1', employee: 'Ahmed Hassan', goal: 'Complete microservices migration', category: 'Technical', progress: 75, status: 'On Track', dueDate: '2026-06-30' },
  { id: 'g-2', employee: 'Fatma El-Sayed', goal: 'Launch Q2 marketing campaign', category: 'Business', progress: 90, status: 'On Track', dueDate: '2026-05-31' },
  { id: 'g-3', employee: 'Mohamed Ali', goal: 'Reduce operational costs by 15%', category: 'Financial', progress: 45, status: 'At Risk', dueDate: '2026-06-30' },
  { id: 'g-4', employee: 'Nour Ibrahim', goal: 'Implement new onboarding process', category: 'Process', progress: 30, status: 'Behind', dueDate: '2026-05-15' },
  { id: 'g-5', employee: 'Omar Farouk', goal: 'Achieve $2M in Q2 sales', category: 'Business', progress: 62, status: 'On Track', dueDate: '2026-06-30' },
  { id: 'g-6', employee: 'Yasmin Mostafa', goal: 'Deploy CI/CD pipeline', category: 'Technical', progress: 100, status: 'Completed', dueDate: '2026-04-30' },
];

const feedbacks: Feedback[] = [
  { id: 'fb-1', subject: 'Ahmed Hassan', reviewer: 'Fatma El-Sayed', relationship: 'Peer', cycle: 'H1 2026', status: 'Submitted', submittedDate: '2026-05-03' },
  { id: 'fb-2', subject: 'Ahmed Hassan', reviewer: 'Nour Ibrahim', relationship: 'Direct Report', cycle: 'H1 2026', status: 'Submitted', submittedDate: '2026-05-05' },
  { id: 'fb-3', subject: 'Omar Farouk', reviewer: 'Khaled Abdel-Rahman', relationship: 'Peer', cycle: 'H1 2026', status: 'Pending', submittedDate: null },
  { id: 'fb-4', subject: 'Yasmin Mostafa', reviewer: 'Ahmed Hassan', relationship: 'Manager', cycle: 'H1 2026', status: 'Submitted', submittedDate: '2026-05-08' },
];

// --- Helpers ---

function reviewStatusColor(status: string) {
  switch (status) {
    case 'Completed': return 'default';
    case 'In Progress': return 'secondary';
    case 'Pending': return 'outline';
    default: return 'outline';
  }
}

function goalStatusColor(status: string) {
  switch (status) {
    case 'On Track': return 'default';
    case 'At Risk': return 'secondary';
    case 'Behind': return 'destructive';
    case 'Completed': return 'default';
    default: return 'outline';
  }
}

function renderRating(rating: number) {
  if (rating === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      <span>{rating.toFixed(1)}</span>
    </div>
  );
}

// --- Page Component ---

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('cycles');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReviews = reviews.filter(r =>
    r.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reviewer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGoals = goals.filter(g =>
    g.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.goal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completedReviews = reviews.filter(r => r.status === 'Completed').length;
  const avgRating = reviews.filter(r => r.rating > 0).reduce((sum, r) => sum + r.rating, 0) / reviews.filter(r => r.rating > 0).length;
  const goalsOnTrack = goals.filter(g => g.status === 'On Track' || g.status === 'Completed').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Management</h1>
          <p className="text-muted-foreground">Track reviews, goals, and employee performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserCheck className="mr-2 h-4 w-4" />
            Assign Reviewers
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Start Review Cycle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Cycle Active</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">H1 2026</div>
            <p className="text-xs text-muted-foreground">Due Jun 30, 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reviews</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReviews} / {reviews.length}</div>
            <p className="text-xs text-muted-foreground">{Math.round((completedReviews / reviews.length) * 100)}% complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)} / 5.0</div>
            <p className="text-xs text-muted-foreground">From completed reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals On Track</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((goalsOnTrack / goals.length) * 100)}%</div>
            <p className="text-xs text-muted-foreground">{goalsOnTrack} of {goals.length} goals</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="cycles">Review Cycles</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="feedback">360 Feedback</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Review Cycles Tab */}
        <TabsContent value="cycles" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewCycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">{cycle.name}</TableCell>
                      <TableCell>{cycle.period}</TableCell>
                      <TableCell>
                        <Badge variant={cycle.status === 'Active' ? 'default' : cycle.status === 'Completed' ? 'secondary' : 'outline'}>
                          {cycle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cycle.totalReviews > 0
                          ? `${cycle.completedReviews}/${cycle.totalReviews} (${Math.round((cycle.completedReviews / cycle.totalReviews) * 100)}%)`
                          : '-'}
                      </TableCell>
                      <TableCell>{cycle.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.employee}</TableCell>
                      <TableCell>{review.reviewer}</TableCell>
                      <TableCell>{review.cycle}</TableCell>
                      <TableCell>{renderRating(review.rating)}</TableCell>
                      <TableCell>
                        <Badge variant={reviewStatusColor(review.status)}>{review.status}</Badge>
                      </TableCell>
                      <TableCell>{review.dueDate}</TableCell>
                      <TableCell>
                        {review.status === 'In Progress' && (
                          <Button size="sm" variant="outline">
                            <Send className="h-3 w-3 mr-1" />
                            Submit
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

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.employee}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{goal.goal}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{goal.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <span className="text-sm">{goal.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={goalStatusColor(goal.status)}>{goal.status}</Badge>
                      </TableCell>
                      <TableCell>{goal.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 360 Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((fb) => (
                    <TableRow key={fb.id}>
                      <TableCell className="font-medium">{fb.subject}</TableCell>
                      <TableCell>{fb.reviewer}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{fb.relationship}</Badge>
                      </TableCell>
                      <TableCell>{fb.cycle}</TableCell>
                      <TableCell>
                        <Badge variant={fb.status === 'Submitted' ? 'default' : 'secondary'}>
                          {fb.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{fb.submittedDate || '-'}</TableCell>
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

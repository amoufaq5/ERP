"use client";

import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap, Plus, Check, X, BookOpen, Award, Clock,
  FileText, Users, Target, ChevronRight, ChevronLeft, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel, SelectSeparator,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/user-context";
import { useApiDataStore } from "@/lib/api/use-api-store";

/* ─── Types ─── */

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  productArea: string;
  passingScore: number;
  dueDate: string;
  createdBy: string;
  assignedTo: string[];
  questions: QuizQuestion[];
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  answers: number[];
  score: number;
  passed: boolean;
  completedAt: string;
}

/* ─── Seed Data ─── */

const SEED_QUIZZES: Quiz[] = [
  {
    id: "quiz-1",
    title: "Cardiovascular Pharmacology Review",
    description: "Test your knowledge on cardiovascular drug classes, mechanisms, and interactions.",
    productArea: "Cardiovascular",
    passingScore: 80,
    dueDate: "2026-05-15",
    createdBy: "u-mkt-1",
    assignedTo: ["all"],
    status: "PUBLISHED",
    createdAt: "2026-04-01",
    questions: [
      { id: "q1-1", question: "Which drug class primarily acts by inhibiting ACE to reduce angiotensin II production?", options: ["Beta-blockers", "ACE Inhibitors", "Calcium Channel Blockers", "Diuretics"], correctAnswer: 1, explanation: "ACE inhibitors (e.g., enalapril, ramipril) block the angiotensin-converting enzyme, reducing angiotensin II levels and lowering blood pressure." },
      { id: "q1-2", question: "What is the primary mechanism of action of statins?", options: ["Inhibit cholesterol absorption", "Inhibit HMG-CoA reductase", "Increase bile acid excretion", "Block LDL receptors"], correctAnswer: 1, explanation: "Statins inhibit HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis, leading to reduced LDL cholesterol." },
      { id: "q1-3", question: "Which anticoagulant requires regular INR monitoring?", options: ["Rivaroxaban", "Apixaban", "Warfarin", "Dabigatran"], correctAnswer: 2, explanation: "Warfarin has a narrow therapeutic index and requires regular INR monitoring to maintain levels between 2.0-3.0." },
      { id: "q1-4", question: "What is the half-life classification of Amlodipine?", options: ["Ultra-short (< 1 hour)", "Short (1-4 hours)", "Intermediate (4-12 hours)", "Long (30-50 hours)"], correctAnswer: 3, explanation: "Amlodipine has a long half-life of 30-50 hours, allowing once-daily dosing for hypertension management." },
    ],
  },
  {
    id: "quiz-2",
    title: "Pharmaceutical Dosage Forms",
    description: "Review of dosage form types, advantages, and manufacturing considerations.",
    productArea: "General Pharma",
    passingScore: 80,
    dueDate: "2026-05-20",
    createdBy: "u-mkt-1",
    assignedTo: ["all"],
    status: "PUBLISHED",
    createdAt: "2026-04-05",
    questions: [
      { id: "q2-1", question: "Which dosage form provides the fastest onset of action?", options: ["Oral tablet", "Sublingual tablet", "Transdermal patch", "Rectal suppository"], correctAnswer: 1, explanation: "Sublingual tablets dissolve under the tongue and are absorbed directly into the bloodstream, bypassing first-pass metabolism." },
      { id: "q2-2", question: "What is the primary advantage of enteric-coated tablets?", options: ["Faster dissolution", "Protection from stomach acid", "Improved taste", "Extended release"], correctAnswer: 1, explanation: "Enteric coating resists dissolution in acidic stomach pH but dissolves in the alkaline environment of the intestine, protecting acid-sensitive drugs like omeprazole." },
      { id: "q2-3", question: "Which excipient class is used as a binder in tablet formulation?", options: ["Magnesium stearate", "Povidone (PVP)", "Talc", "Silicon dioxide"], correctAnswer: 1, explanation: "Povidone (PVP) is a commonly used binder that helps hold tablet ingredients together during compression." },
      { id: "q2-4", question: "What is bioavailability?", options: ["Drug potency measure", "Fraction of drug reaching systemic circulation", "Drug shelf life indicator", "Dissolution rate"], correctAnswer: 1, explanation: "Bioavailability is the fraction of an administered dose that reaches systemic circulation in unchanged form. IV administration has 100% bioavailability by definition." },
      { id: "q2-5", question: "Which storage condition is required for most injectable biologics?", options: ["Below 30°C", "Room temperature", "2-8°C (cold chain)", "-20°C"], correctAnswer: 2, explanation: "Most biologics (insulin, vaccines, monoclonal antibodies) require cold chain storage at 2-8°C to maintain protein stability." },
    ],
  },
  {
    id: "quiz-3",
    title: "Diabetes Management Update",
    description: "Latest guidelines on diabetes pharmacotherapy and patient counseling.",
    productArea: "Diabetes & Metabolic",
    passingScore: 75,
    dueDate: "2026-06-01",
    createdBy: "u-bum",
    assignedTo: ["u-rep-1"],
    status: "PUBLISHED",
    createdAt: "2026-04-10",
    questions: [
      { id: "q3-1", question: "What is the first-line pharmacotherapy for Type 2 diabetes?", options: ["Glimepiride", "Metformin", "Insulin Glargine", "Sitagliptin"], correctAnswer: 1, explanation: "Metformin remains the first-line agent per ADA/EASD guidelines due to efficacy, safety profile, weight neutrality, and cardiovascular benefits." },
      { id: "q3-2", question: "Which GLP-1 receptor agonist has shown cardiovascular mortality benefit?", options: ["Exenatide", "Liraglutide", "Dulaglutide", "All of the above"], correctAnswer: 1, explanation: "The LEADER trial demonstrated that liraglutide significantly reduced cardiovascular death, non-fatal MI, and non-fatal stroke in T2D patients." },
      { id: "q3-3", question: "What is the target HbA1c for most adult patients with Type 2 diabetes?", options: ["< 6.0%", "< 7.0%", "< 8.0%", "< 9.0%"], correctAnswer: 1, explanation: "The ADA recommends an HbA1c target of < 7.0% for most non-pregnant adults with diabetes, individualized based on patient factors." },
    ],
  },
];

const SEED_ATTEMPTS: QuizAttempt[] = [
  { id: "att-1", quizId: "quiz-1", userId: "u-rep-1", userName: "Mohamed El-Sayed", answers: [1, 1, 2, 3], score: 100, passed: true, completedAt: "2026-04-12" },
  { id: "att-2", quizId: "quiz-2", userId: "u-rep-1", userName: "Mohamed El-Sayed", answers: [1, 1, 0, 1, 2], score: 80, passed: true, completedAt: "2026-04-14" },
];

const STORAGE_QUIZZES = "pharma.quizzes";
const STORAGE_ATTEMPTS = "pharma.quizAttempts";

export default function QuizzesPage() {
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const store = useApiDataStore();
  const isManager = ["ADMIN", "BUM", "MARKETEER"].includes(user.role);
  const canCreate = isManager;

  const [quizzes, setQuizzes] = useState<Quiz[]>(SEED_QUIZZES);
  const [attempts, setAttempts] = useState<QuizAttempt[]>(SEED_ATTEMPTS);

  useEffect(() => {
    try {
      const sq = localStorage.getItem(STORAGE_QUIZZES);
      if (sq) setQuizzes(JSON.parse(sq));
      const sa = localStorage.getItem(STORAGE_ATTEMPTS);
      if (sa) setAttempts(JSON.parse(sa));
    } catch { /* ignore */ }
  }, []);

  function persistQuizzes(next: Quiz[]) {
    setQuizzes(next);
    try { localStorage.setItem(STORAGE_QUIZZES, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function persistAttempts(next: QuizAttempt[]) {
    setAttempts(next);
    try { localStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // Quizzes assigned to current user
  const myQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (q.status !== "PUBLISHED") return false;
      if (q.assignedTo.includes("all") || q.assignedTo.includes(user.id)) return true;
      // Check BU-based assignments: user must be a member (not manager) of the BU
      return q.assignedTo.some((entry) => {
        if (!entry.startsWith("bu:")) return false;
        const buId = entry.slice(3);
        const bu = store.businessUnits.find((b) => b.id === buId);
        return bu ? bu.memberIds.includes(user.id) && bu.managerId !== user.id : false;
      });
    });
  }, [quizzes, user.id, store.businessUnits]);

  const myAttempts = useMemo(() => attempts.filter((a) => a.userId === user.id), [attempts, user.id]);

  // Stats
  const totalQuizzes = quizzes.length;
  const completedByMe = myAttempts.length;
  const avgScore = myAttempts.length > 0 ? Math.round(myAttempts.reduce((s, a) => s + a.score, 0) / myAttempts.length) : 0;
  const passRate = attempts.length > 0 ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100) : 0;

  // ── Take Quiz State ──
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  function startQuiz(quiz: Quiz) {
    setTakingQuiz(quiz);
    setCurrentQ(0);
    setSelectedAnswers(new Array(quiz.questions.length).fill(-1));
    setQuizSubmitted(false);
    setQuizScore(0);
  }

  function selectAnswer(idx: number) {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = idx;
      return next;
    });
  }

  function submitQuiz() {
    if (!takingQuiz) return;
    let correct = 0;
    takingQuiz.questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) correct++;
    });
    const score = Math.round((correct / takingQuiz.questions.length) * 100);
    const passed = score >= takingQuiz.passingScore;
    setQuizScore(score);
    setQuizSubmitted(true);

    const attempt: QuizAttempt = {
      id: `att-${Date.now().toString(36)}`,
      quizId: takingQuiz.id,
      userId: user.id,
      userName: user.name,
      answers: selectedAnswers,
      score,
      passed,
      completedAt: new Date().toISOString().split("T")[0],
    };
    persistAttempts([...attempts, attempt]);
  }

  // ── Create Quiz State ──
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newPassing, setNewPassing] = useState("80");
  const [newDue, setNewDue] = useState("");
  const [newAssign, setNewAssign] = useState("all");
  const [newQuestions, setNewQuestions] = useState<QuizQuestion[]>([]);

  function addQuestion() {
    setNewQuestions((prev) => [...prev, {
      id: `nq-${Date.now().toString(36)}`,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
    }]);
  }

  function updateQuestion(idx: number, field: string, value: string | number) {
    setNewQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setNewQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  }

  function removeQuestion(idx: number) {
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function saveQuiz() {
    if (!newTitle || newQuestions.length === 0) return;
    const quiz: Quiz = {
      id: `quiz-${Date.now().toString(36)}`,
      title: newTitle,
      description: newDesc,
      productArea: newArea,
      passingScore: Number(newPassing) || 80,
      dueDate: newDue,
      createdBy: user.id,
      assignedTo: newAssign === "all" ? ["all"] : newAssign.startsWith("bu:") ? [newAssign] : [newAssign],
      questions: newQuestions,
      status: "PUBLISHED",
      createdAt: new Date().toISOString().split("T")[0],
    };
    persistQuizzes([...quizzes, quiz]);
    setCreateOpen(false);
    setNewTitle("");
    setNewDesc("");
    setNewArea("");
    setNewPassing("80");
    setNewDue("");
    setNewAssign("all");
    setNewQuestions([]);
  }

  // Results for managers
  const allAttempts = useMemo(() => {
    if (!isManager) return attempts.filter((a) => a.userId === user.id);
    return attempts;
  }, [attempts, isManager, user.id]);

  const resultColumns: Column<Record<string, unknown>>[] = [
    { key: "userName", label: "Rep Name", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "quizId", label: "Quiz", render: (v) => {
      const q = quizzes.find((qz) => qz.id === v);
      return <span>{q?.title ?? (v as string)}</span>;
    }},
    { key: "score", label: "Score", className: "text-right", render: (v) => {
      const s = v as number;
      return <span className={`font-semibold ${s >= 80 ? "text-green-600" : s >= 60 ? "text-amber-600" : "text-red-600"}`}>{s}%</span>;
    }},
    { key: "passed", label: "Result", render: (v) => (
      <Badge className={v ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{v ? "PASS" : "FAIL"}</Badge>
    )},
    { key: "completedAt", label: "Date" },
  ];

  // Subordinate reps for assignment
  const reps = allUsers.filter((u) => u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Quizzes"
        description="Knowledge assessment and medical review for field force"
        actions={canCreate ? (
          <Button onClick={() => { setCreateOpen(true); addQuestion(); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Quiz
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={BookOpen} title="Total Quizzes" value={totalQuizzes} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Check} title="Completed by Me" value={completedByMe} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Award} title="My Avg Score" value={`${avgScore}%`} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={Target} title="Overall Pass Rate" value={`${passRate}%`} iconColor="bg-amber-100 text-amber-600" />
      </div>

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Available Quizzes ({myQuizzes.length})</TabsTrigger>
          {canCreate && <TabsTrigger value="create"><Plus className="h-3.5 w-3.5 mr-1.5" />Manage Quizzes ({quizzes.length})</TabsTrigger>}
          <TabsTrigger value="results"><Award className="h-3.5 w-3.5 mr-1.5" />Results ({allAttempts.length})</TabsTrigger>
        </TabsList>

        {/* ── Available Quizzes ── */}
        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myQuizzes.map((quiz) => {
              const attempt = myAttempts.find((a) => a.quizId === quiz.id);
              const creator = allUsers.find((u) => u.id === quiz.createdBy);
              return (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">{quiz.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">{quiz.description}</CardDescription>
                      </div>
                      {attempt ? (
                        <Badge className={attempt.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {attempt.score}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{quiz.productArea}</Badge>
                      <span>{quiz.questions.length} questions</span>
                      <span>Pass: {quiz.passingScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {quiz.dueDate}</span>
                      <span>By: {creator?.name?.split(" ")[0] ?? "—"}</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={attempt ? "outline" : "default"}
                      onClick={() => startQuiz(quiz)}
                    >
                      {attempt ? "Retake Quiz" : "Start Quiz"}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {myQuizzes.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No quizzes assigned to you yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Manage Quizzes (Managers) ── */}
        {canCreate && (
          <TabsContent value="create" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => {
                const attemptCount = attempts.filter((a) => a.quizId === quiz.id).length;
                const avgQuizScore = attemptCount > 0
                  ? Math.round(attempts.filter((a) => a.quizId === quiz.id).reduce((s, a) => s + a.score, 0) / attemptCount)
                  : 0;
                return (
                  <Card key={quiz.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm">{quiz.title}</CardTitle>
                        <Badge className={quiz.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {quiz.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                      <p>{quiz.description}</p>
                      <div className="flex gap-3">
                        <span>{quiz.questions.length} questions</span>
                        <span>{attemptCount} attempts</span>
                        {attemptCount > 0 && <span>Avg: {avgQuizScore}%</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Assigned to: {
                          quiz.assignedTo.includes("all")
                            ? "All Reps"
                            : quiz.assignedTo.map((entry) => {
                                if (entry.startsWith("bu:")) {
                                  const bu = store.businessUnits.find((b) => b.id === entry.slice(3));
                                  return bu?.name ?? entry;
                                }
                                const rep = allUsers.find((u) => u.id === entry);
                                return rep?.name ?? entry;
                              }).join(", ")
                        }</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => {
                          persistQuizzes(quizzes.map((q) => q.id === quiz.id ? { ...q, status: q.status === "PUBLISHED" ? "DRAFT" as const : "PUBLISHED" as const } : q));
                        }}>
                          {quiz.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs text-red-600" onClick={() => {
                          persistQuizzes(quizzes.filter((q) => q.id !== quiz.id));
                        }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        {/* ── Results ── */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quiz Results</CardTitle>
              <CardDescription>{isManager ? "All team results" : "Your quiz history"}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={resultColumns}
                data={allAttempts as unknown as Record<string, unknown>[]}
                exportable
                exportFilename="quiz-results.csv"
                emptyMessage="No quiz attempts yet."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Take Quiz Dialog ── */}
      <Dialog open={!!takingQuiz} onOpenChange={(open) => { if (!open) { setTakingQuiz(null); setQuizSubmitted(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{takingQuiz?.title}</DialogTitle>
          </DialogHeader>
          {takingQuiz && !quizSubmitted && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Question {currentQ + 1} of {takingQuiz.questions.length}</Badge>
                <div className="flex gap-1">
                  {takingQuiz.questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentQ(i)}
                      className={`w-7 h-7 rounded-full text-xs font-medium border transition-colors ${
                        i === currentQ ? "bg-blue-600 text-white border-blue-600" :
                        selectedAnswers[i] >= 0 ? "bg-green-100 text-green-700 border-green-300" :
                        "bg-muted border-border"
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">{takingQuiz.questions[currentQ].question}</h3>
                <div className="space-y-2">
                  {takingQuiz.questions[currentQ].options.map((opt, i) => (
                    <button key={i} onClick={() => selectAnswer(i)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAnswers[currentQ] === i
                          ? "bg-blue-50 border-blue-400 text-blue-900"
                          : "hover:bg-muted/50 border-border"
                      }`}>
                      <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                {currentQ < takingQuiz.questions.length - 1 ? (
                  <Button onClick={() => setCurrentQ((p) => p + 1)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={submitQuiz} disabled={selectedAnswers.some((a) => a < 0)}
                    className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-1" /> Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          )}

          {takingQuiz && quizSubmitted && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${
                  quizScore >= takingQuiz.passingScore ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {quizScore}%
                </div>
                <h3 className={`text-xl font-bold mt-3 ${quizScore >= takingQuiz.passingScore ? "text-green-700" : "text-red-700"}`}>
                  {quizScore >= takingQuiz.passingScore ? "Passed!" : "Not Passed"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAnswers.filter((a, i) => a === takingQuiz.questions[i].correctAnswer).length} / {takingQuiz.questions.length} correct
                  · Passing score: {takingQuiz.passingScore}%
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Review Answers</h4>
                {takingQuiz.questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctAnswer;
                  return (
                    <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> : <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.question}</p>
                          <p className="text-xs mt-1">
                            Your answer: <span className={isCorrect ? "text-green-700 font-medium" : "text-red-700 font-medium"}>{q.options[selectedAnswers[i]] ?? "—"}</span>
                            {!isCorrect && <> · Correct: <span className="text-green-700 font-medium">{q.options[q.correctAnswer]}</span></>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setTakingQuiz(null); setQuizSubmitted(false); }}>Close</Button>
                <Button onClick={() => startQuiz(takingQuiz)}>Retake Quiz</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Quiz Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Quiz title..." />
              </div>
              <div>
                <Label>Product Area</Label>
                <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="e.g. Cardiovascular" />
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={newPassing} onChange={(e) => setNewPassing(e.target.value)} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              </div>
              <div>
                <Label>Assign To</Label>
                <Select value={newAssign} onValueChange={setNewAssign}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Medical Reps</SelectItem>
                    {store.businessUnits.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>By Business Unit</SelectLabel>
                          {store.businessUnits.map((bu) => (
                            <SelectItem key={bu.id} value={`bu:${bu.id}`}>BU: {bu.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Individual Reps</SelectLabel>
                      {reps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.role})</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description..." />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Questions ({newQuestions.length})</h4>
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-3 w-3 mr-1" /> Add Question
                </Button>
              </div>

              {newQuestions.map((q, qIdx) => (
                <Card key={q.id} className="mb-3">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Label className="text-xs font-semibold">Question {qIdx + 1}</Label>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => removeQuestion(qIdx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input value={q.question} onChange={(e) => updateQuestion(qIdx, "question", e.target.value)} placeholder="Enter question..." />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIdx, "correctAnswer", oIdx)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs ${
                              q.correctAnswer === oIdx ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                            }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </button>
                          <Input value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} className="h-8 text-sm" />
                        </div>
                      ))}
                    </div>
                    <Input value={q.explanation} onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)} placeholder="Explanation (shown after answering)..." className="text-sm" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveQuiz} disabled={!newTitle || newQuestions.length === 0}>Publish Quiz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

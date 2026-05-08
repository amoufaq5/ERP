"use client";

import { useState, useMemo, useRef } from "react";
import {
  Lightbulb,
  Shield,
  Heart,
  Globe,
  MapPin,
  Clock,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Award,
  Stethoscope,
  FlaskConical,
  Megaphone,
  FileCheck,
  Factory,
  ScrollText,
  HeartPulse,
  Car,
  GraduationCap,
  TrendingUp,
  Timer,
  Gift,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type Job } from "@/lib/data-store";

const typeLabels: Record<string, string> = {
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

const departmentIcons: Record<string, React.ReactNode> = {
  "Sales & Marketing": <Megaphone className="h-5 w-5" />,
  "Quality Assurance": <FileCheck className="h-5 w-5" />,
  "Manufacturing": <Factory className="h-5 w-5" />,
  "Research & Development": <FlaskConical className="h-5 w-5" />,
  "Regulatory Affairs": <ScrollText className="h-5 w-5" />,
  "Medical Affairs": <Stethoscope className="h-5 w-5" />,
  "Supply Chain": <Building2 className="h-5 w-5" />,
  "Logistics": <Building2 className="h-5 w-5" />,
};

const departmentColors: Record<string, string> = {
  "Sales & Marketing": "from-orange-500 to-amber-500",
  "Quality Assurance": "from-emerald-500 to-green-500",
  "Manufacturing": "from-slate-500 to-zinc-500",
  "Research & Development": "from-violet-500 to-purple-500",
  "Regulatory Affairs": "from-sky-500 to-cyan-500",
  "Medical Affairs": "from-rose-500 to-pink-500",
  "Supply Chain": "from-teal-500 to-emerald-500",
  "Logistics": "from-indigo-500 to-blue-500",
};

const values = [
  {
    title: "Innovation in Healthcare",
    description:
      "Developing cutting-edge pharmaceutical solutions for the Egyptian and MENA markets",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    title: "Quality Excellence",
    description:
      "GMP/WHO certified manufacturing with zero-compromise quality standards",
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    title: "People First",
    description:
      "Investing in our teams with continuous learning, pharma training, and career growth",
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    title: "Community Impact",
    description:
      "Providing affordable, accessible medicines across Egypt's healthcare network",
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
];

const benefits = [
  {
    title: "Medical Insurance",
    description: "Comprehensive medical, dental, and vision coverage for you and your family",
    icon: HeartPulse,
    color: "text-rose-500",
  },
  {
    title: "Company Vehicle",
    description: "Provided for field force roles including medical reps and sales teams",
    icon: Car,
    color: "text-blue-500",
  },
  {
    title: "Training Budget",
    description: "Annual pharma training allowance for certifications and conferences",
    icon: GraduationCap,
    color: "text-violet-500",
  },
  {
    title: "Career Growth",
    description: "Structured promotion tracks with clear milestones and mentorship programs",
    icon: TrendingUp,
    color: "text-emerald-500",
  },
  {
    title: "Flexible Hours",
    description: "Flexible working arrangements for R&D and office-based roles",
    icon: Timer,
    color: "text-amber-500",
  },
  {
    title: "Annual Bonus",
    description: "Performance-based bonus tied to individual and company achievements",
    icon: Gift,
    color: "text-teal-500",
  },
];

export default function CareersPage() {
  const store = useApiDataStore();
  const jobsSectionRef = useRef<HTMLDivElement>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    coverLetter: "",
    resume: "",
  });

  const openJobs = useMemo(
    () => store.jobs.filter((j) => j.status === "OPEN"),
    [store.jobs],
  );

  const departmentGroups = useMemo(() => {
    const groups: Record<string, Job[]> = {};
    for (const job of openJobs) {
      const dept = job.department || "Other";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(job);
    }
    return groups;
  }, [openJobs]);

  const scrollToJobs = () => {
    jobsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const openApplyDialog = (job: Job) => {
    setSelectedJob(job);
    setSubmitted(false);
    setForm({ name: "", email: "", phone: "", coverLetter: "", resume: "" });
    setApplyDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedJob || !form.name.trim() || !form.email.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const id = store.genId("cand");
    store.add("candidates", {
      id,
      name: form.name.trim(),
      email: form.email.trim(),
      degree: "",
      currentCompany: "",
      appliedFor: selectedJob.title,
      experience: "",
      source: "Career Page",
      status: "APPLIED",
      rating: 3,
      appliedDate: today,
    });
    setRefNumber(id);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <style>{`
        @media print {
          nav, header, aside, [data-sidebar], [role="navigation"],
          button, .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-600 via-teal-500 to-blue-600 px-6 py-16 text-white sm:px-12 sm:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHYyaC0ydjRoLTJ2LTRoLTJ2NGgtMnYyaDJ2NGgydi00aDJ2NGgydi00aDJ2LTJ6bTAtMTZoLTJ2LTRoMlY4aC00djJoLTJ2NGgtMnYtNGgtMnY0aC0ydjJoMnY0aDJ2LTRoMnY0aDJ2LTRoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Stethoscope className="h-4 w-4" />
            Pharmaceutical Excellence Since 1998
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            PharmaCorp Egypt
          </h1>
          <p className="mb-8 text-lg font-medium text-teal-50 sm:text-xl lg:text-2xl">
            Building Healthier Futures &mdash; Join Our Team
          </p>
          <div className="mb-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <div className="text-3xl font-bold sm:text-4xl">{openJobs.length}</div>
              <div className="text-sm text-teal-100">Open Positions</div>
            </div>
            <div className="h-10 w-px bg-white/25 hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl font-bold sm:text-4xl">2,500+</div>
              <div className="text-sm text-teal-100">Employees</div>
            </div>
            <div className="h-10 w-px bg-white/25 hidden sm:block" />
            <div className="flex flex-col items-center text-center">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">
                <Award className="h-4 w-4" />
                <span className="text-sm font-semibold">Top Employer 2026</span>
              </div>
              <div className="text-sm text-teal-100">Certified Workplace</div>
            </div>
          </div>
          <Button
            size="lg"
            onClick={scrollToJobs}
            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold shadow-lg shadow-teal-900/20 no-print"
          >
            View Positions
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
          <p className="mt-2 text-muted-foreground">
            The principles that drive everything we do
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <Card
              key={v.title}
              className="group border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${v.bg}`}
                >
                  <v.icon className={`h-6 w-6 ${v.color}`} />
                </div>
                <h3 className="mb-2 font-semibold">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {v.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 print-break">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Departments Hiring
            </h2>
            <p className="mt-2 text-muted-foreground">
              Explore opportunities across our organization
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(departmentGroups).map(([dept, jobs]) => (
              <Card
                key={dept}
                className="group cursor-pointer border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={scrollToJobs}
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${departmentColors[dept] || "from-gray-500 to-gray-600"} text-white shadow-sm`}
                  >
                    {departmentIcons[dept] || (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{dept}</h3>
                    <p className="text-sm text-muted-foreground">
                      {jobs.length} open position{jobs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {jobs.length}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {Object.keys(departmentGroups).length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No departments are currently hiring.
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={jobsSectionRef} className="mx-auto max-w-6xl px-4 py-16 print-break">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Open Positions</h2>
          <p className="mt-2 text-muted-foreground">
            {openJobs.length} role{openJobs.length !== 1 ? "s" : ""} available
            &mdash; find your perfect fit
          </p>
        </div>
        {openJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-1 text-lg font-semibold">
                No open positions right now
              </h3>
              <p className="text-sm text-muted-foreground">
                Check back soon — we are always growing!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {openJobs.map((job) => {
              const isExpanded = expandedJob === job.id;
              return (
                <Card
                  key={job.id}
                  className="group border shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg leading-snug">
                          {job.title}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.department}
                          </span>
                          <span className="text-muted-foreground/40">|</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      >
                        {typeLabels[job.type] || job.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Posted{" "}
                        {new Date(job.postedDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {job.salaryRange && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                          {job.salaryRange}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <>
                        <button
                          onClick={() =>
                            setExpandedJob(isExpanded ? null : job.id)
                          }
                          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 no-print"
                        >
                          {isExpanded ? "Hide" : "Show"} Description
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                            {job.description}
                            {job.requirements && (
                              <div className="mt-2 border-t pt-2">
                                <span className="font-medium text-foreground">
                                  Requirements:
                                </span>{" "}
                                {job.requirements}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      onClick={() => openApplyDialog(job)}
                      className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-sm no-print"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Apply Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-muted/30 print-break">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Why PharmaCorp?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Benefits designed for pharmaceutical professionals
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <Card
                key={b.title}
                className="group border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="pt-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <b.icon className={`h-5 w-5 ${b.color}`} />
                  </div>
                  <h3 className="mb-1 font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl dark:from-slate-800 dark:to-slate-700">
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2 className="mb-2 text-2xl font-bold">
                Ready to make an impact?
              </h2>
              <p className="text-slate-300">
                Our HR team is here to help you find the right role. Reach out
                anytime.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <a
                href="mailto:careers@pharmacorp.eg"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 font-medium transition-colors hover:bg-white/20"
              >
                <Mail className="h-4 w-4 text-teal-300" />
                careers@pharmacorp.eg
              </a>
              <a
                href="tel:+20225551234"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 font-medium transition-colors hover:bg-white/20"
              >
                <Phone className="h-4 w-4 text-teal-300" />
                +20 2 2555 1234
              </a>
            </div>
          </CardContent>
        </Card>
        <div className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PharmaCorp Egypt. All rights reserved.
        </div>
      </div>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Apply for Position</DialogTitle>
                <DialogDescription>
                  {selectedJob?.title} &mdash; {selectedJob?.department}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="apply-name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apply-name"
                    placeholder="e.g. Ahmed Hassan"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apply-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apply-email"
                    type="email"
                    placeholder="ahmed@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apply-phone">Phone</Label>
                  <Input
                    id="apply-phone"
                    placeholder="+20 1xx xxx xxxx"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apply-cover">Cover Letter</Label>
                  <Textarea
                    id="apply-cover"
                    rows={3}
                    placeholder="Tell us why you're a great fit..."
                    value={form.coverLetter}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, coverLetter: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apply-resume">Resume</Label>
                  <Textarea
                    id="apply-resume"
                    rows={3}
                    placeholder="Paste resume text or link"
                    value={form.resume}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, resume: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Position</Label>
                  <Input
                    disabled
                    value={selectedJob?.title || ""}
                    className="bg-muted"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setApplyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || !form.email.trim()}
                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Application
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Application Submitted!</DialogTitle>
                <DialogDescription>
                  Thank you for applying to {selectedJob?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="mb-1 text-sm text-muted-foreground">
                    Your application reference number:
                  </p>
                  <p className="rounded-lg bg-muted px-4 py-2 font-mono text-lg font-bold tracking-wide">
                    {refNumber}
                  </p>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Our HR team will review your application and reach out within
                  5-7 business days.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setApplyDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

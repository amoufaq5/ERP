"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Eye,
  Trash2,
  BarChart3,
  Sparkles,
  FileUp,
  History,
  AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type Candidate } from "@/lib/data-store";

interface Education {
  degree: string;
  university: string;
  year: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface ParsedResume {
  id: string;
  fileName: string;
  fullName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentPosition: string;
  education: Education[];
  experience: ExperienceEntry[];
  skills: string[];
  certifications: string[];
  languages: string[];
  matchScore: number;
  pharmaRelevanceScore: number;
  parsedDate: string;
  status: "PARSED" | "CANDIDATE_CREATED" | "REJECTED";
}

const PHARMA_TEMPLATES: Omit<ParsedResume, "id" | "fileName" | "parsedDate" | "status">[] = [
  {
    fullName: "Ahmed Hassan El-Sayed",
    email: "ahmed.elsayed@email.com",
    phone: "+20 100 234 5678",
    currentCompany: "Amoun Pharmaceutical",
    currentPosition: "Medical Representative",
    education: [
      { degree: "B.Sc. Pharmaceutical Sciences", university: "Cairo University", year: "2020" },
    ],
    experience: [
      {
        company: "Amoun Pharmaceutical",
        role: "Medical Representative",
        duration: "2021 - Present (3 years)",
        description: "Promoting cardiovascular and respiratory product lines across Cairo and Giza governorates. Managing a portfolio of 150+ physicians and achieving 115% of quarterly targets.",
      },
      {
        company: "Pharco Pharmaceuticals",
        role: "Junior Medical Representative",
        duration: "2020 - 2021 (1 year)",
        description: "Supported senior reps in antibiotics division. Conducted product presentations at hospitals and clinics.",
      },
    ],
    skills: ["Medical Detailing", "CRM Software", "Product Knowledge", "Territory Management", "Salesforce", "MS Office", "Communication Skills", "Negotiation"],
    certifications: ["Certified Medical Representative (CMR)", "Good Promotion Practice"],
    languages: ["Arabic (Native)", "English (Fluent)"],
    matchScore: 78,
    pharmaRelevanceScore: 85,
  },
  {
    fullName: "Mona Ibrahim Abdel-Fattah",
    email: "mona.ibrahim@email.com",
    phone: "+20 112 987 6543",
    currentCompany: "Multi-Pharma Group",
    currentPosition: "District Sales Manager",
    education: [
      { degree: "B.Sc. Pharmacy", university: "Ain Shams University", year: "2014" },
      { degree: "MBA Healthcare Management", university: "Arab Academy for Science", year: "2019" },
    ],
    experience: [
      {
        company: "Multi-Pharma Group",
        role: "District Sales Manager",
        duration: "2020 - Present (4 years)",
        description: "Leading a team of 12 medical representatives across Upper Egypt. Responsible for P&L of EGP 45M annual revenue. Achieved 120% target attainment for 3 consecutive years.",
      },
      {
        company: "GlaxoSmithKline Egypt",
        role: "Senior Medical Representative",
        duration: "2017 - 2020 (3 years)",
        description: "Top performer in respiratory portfolio. Ranked #2 nationally in sales achievement.",
      },
      {
        company: "Novartis Egypt",
        role: "Medical Representative",
        duration: "2014 - 2017 (3 years)",
        description: "Promoted oncology and immunology products to specialists in Delta region.",
      },
    ],
    skills: ["Team Leadership", "P&L Management", "Sales Strategy", "KPI Tracking", "Territory Planning", "Coaching & Mentoring", "Market Analysis", "CRM Systems", "Presentation Skills", "Forecasting"],
    certifications: ["Certified Sales Leader (CSL)", "Good Promotion Practice", "Leadership Excellence Program"],
    languages: ["Arabic (Native)", "English (Fluent)", "French (Intermediate)"],
    matchScore: 92,
    pharmaRelevanceScore: 90,
  },
  {
    fullName: "Karim Mostafa Shalaby",
    email: "karim.shalaby@email.com",
    phone: "+20 101 456 7890",
    currentCompany: "EIPICO",
    currentPosition: "Quality Control Analyst",
    education: [
      { degree: "B.Sc. Pharmaceutical Sciences", university: "Alexandria University", year: "2018" },
      { degree: "Diploma in Quality Management", university: "American University in Cairo", year: "2020" },
    ],
    experience: [
      {
        company: "EIPICO (Egyptian International Pharmaceutical Industries)",
        role: "Quality Control Analyst",
        duration: "2019 - Present (5 years)",
        description: "Performing HPLC, GC, and dissolution testing on solid dosage forms. Reviewing batch records and ensuring compliance with pharmacopeial standards (USP, BP, EP).",
      },
      {
        company: "Pharco Pharmaceuticals",
        role: "QC Lab Technician",
        duration: "2018 - 2019 (1 year)",
        description: "Supported raw material testing and stability studies. Maintained analytical instruments.",
      },
    ],
    skills: ["HPLC", "GC", "UV Spectrophotometry", "Dissolution Testing", "Method Validation", "LIMS", "Pharmacopeial Testing", "Statistical Analysis", "Documentation", "CAPA"],
    certifications: ["GMP Certified", "ISO 17025 Internal Auditor", "HPLC Method Development"],
    languages: ["Arabic (Native)", "English (Fluent)"],
    matchScore: 85,
    pharmaRelevanceScore: 95,
  },
  {
    fullName: "Nourhan Tarek El-Gendy",
    email: "nourhan.elgendy@email.com",
    phone: "+20 109 321 6549",
    currentCompany: "Hikma Pharmaceuticals",
    currentPosition: "Regulatory Affairs Specialist",
    education: [
      { degree: "B.Sc. Clinical Pharmacy", university: "Ain Shams University", year: "2019" },
      { degree: "Diploma in Regulatory Affairs", university: "Cairo University", year: "2021" },
    ],
    experience: [
      {
        company: "Hikma Pharmaceuticals",
        role: "Regulatory Affairs Specialist",
        duration: "2021 - Present (3 years)",
        description: "Preparing and submitting CTD dossiers to EDA (Egyptian Drug Authority). Managing regulatory lifecycle for 40+ products including variations and renewals.",
      },
      {
        company: "Marcyrl Pharmaceutical",
        role: "Regulatory Affairs Associate",
        duration: "2019 - 2021 (2 years)",
        description: "Assisted in compiling Module 3 (Quality) documentation. Tracked regulatory commitments and timelines.",
      },
    ],
    skills: ["CTD Compilation", "Regulatory Submissions", "eCTD", "EDA Guidelines", "ICH Guidelines", "Change Control", "Labeling Review", "GMP Documentation", "Pharmacovigilance Basics", "MS Office"],
    certifications: ["ICH Guidelines Training", "Regulatory Affairs Certification (RAC)", "eCTD Publishing"],
    languages: ["Arabic (Native)", "English (Fluent)", "German (Basic)"],
    matchScore: 80,
    pharmaRelevanceScore: 92,
  },
  {
    fullName: "Dr. Yasser Mahmoud Farouk",
    email: "yasser.farouk@email.com",
    phone: "+20 122 555 8901",
    currentCompany: "National Research Centre",
    currentPosition: "R&D Formulation Scientist",
    education: [
      { degree: "Ph.D. Pharmaceutics", university: "Cairo University", year: "2018" },
      { degree: "M.Sc. Industrial Pharmacy", university: "Cairo University", year: "2014" },
      { degree: "B.Sc. Pharmaceutical Sciences", university: "Cairo University", year: "2011" },
    ],
    experience: [
      {
        company: "National Research Centre",
        role: "Senior Formulation Scientist",
        duration: "2018 - Present (6 years)",
        description: "Leading R&D for novel drug delivery systems including nanoparticles and liposomal formulations. Published 12 peer-reviewed papers. Supervised 4 M.Sc. students.",
      },
      {
        company: "Sedico Pharmaceuticals",
        role: "Formulation Development Researcher",
        duration: "2014 - 2018 (4 years)",
        description: "Developed generic solid and semi-solid dosage forms. Conducted bioequivalence study protocols.",
      },
      {
        company: "Eva Pharma",
        role: "R&D Intern",
        duration: "2011 - 2012 (1 year)",
        description: "Rotated through formulation, analytical, and stability labs.",
      },
    ],
    skills: ["Formulation Development", "Nanoparticles", "Liposomes", "DoE (Design of Experiments)", "Dissolution Profiling", "Bioequivalence", "Scale-Up", "Patent Review", "Scientific Writing", "Statistical Analysis", "Stability Studies"],
    certifications: ["GMP Awareness", "ICH Q8-Q12", "Project Management Professional (PMP)"],
    languages: ["Arabic (Native)", "English (Fluent)", "French (Intermediate)"],
    matchScore: 88,
    pharmaRelevanceScore: 98,
  },
  {
    fullName: "Fatma Ali Mansour",
    email: "fatma.mansour@email.com",
    phone: "+20 115 678 2345",
    currentCompany: "MUP (Medical Union Pharmaceuticals)",
    currentPosition: "Production Pharmacist",
    education: [
      { degree: "B.Sc. Pharmacy", university: "Mansoura University", year: "2017" },
    ],
    experience: [
      {
        company: "MUP (Medical Union Pharmaceuticals)",
        role: "Production Pharmacist",
        duration: "2019 - Present (5 years)",
        description: "Managing tablet compression and coating operations on GMP production lines. Handling batch documentation, in-process controls, and deviation management for solid dosage forms.",
      },
      {
        company: "Kahira Pharmaceuticals",
        role: "Production Trainee",
        duration: "2017 - 2019 (2 years)",
        description: "Trained on aseptic manufacturing of injectable products. Participated in process validation.",
      },
    ],
    skills: ["GMP Manufacturing", "Batch Record Review", "In-Process Controls", "Tablet Compression", "Film Coating", "Deviation Management", "CAPA", "Equipment Qualification", "Process Validation", "SAP"],
    certifications: ["GMP Certified Professional", "Lean Six Sigma Green Belt", "Aseptic Processing"],
    languages: ["Arabic (Native)", "English (Good)"],
    matchScore: 82,
    pharmaRelevanceScore: 96,
  },
  {
    fullName: "Omar Khaled Abdelaziz",
    email: "omar.abdelaziz@email.com",
    phone: "+20 100 111 2233",
    currentCompany: "Pfizer Egypt",
    currentPosition: "Pharmacovigilance Officer",
    education: [
      { degree: "Pharm.D.", university: "Ain Shams University", year: "2018" },
      { degree: "Diploma in Drug Safety", university: "University of Hertfordshire (Online)", year: "2020" },
    ],
    experience: [
      {
        company: "Pfizer Egypt",
        role: "Pharmacovigilance Officer",
        duration: "2020 - Present (4 years)",
        description: "Processing ICSRs and managing safety database (Argus). Preparing PSURs and signal detection reports. Ensuring compliance with EDA and EMA pharmacovigilance regulations.",
      },
      {
        company: "Sanofi Egypt",
        role: "Drug Safety Associate",
        duration: "2018 - 2020 (2 years)",
        description: "Collected and triaged adverse event reports. Maintained safety tracking systems.",
      },
    ],
    skills: ["ICSR Processing", "Argus Safety", "PSUR Writing", "Signal Detection", "MedDRA Coding", "Risk Management Plans", "EDA Regulations", "EMA Guidelines", "Literature Surveillance", "Aggregate Reporting"],
    certifications: ["ICH E2E Training", "GVP Module Training", "MedDRA Coding Certification"],
    languages: ["Arabic (Native)", "English (Fluent)", "Spanish (Basic)"],
    matchScore: 86,
    pharmaRelevanceScore: 94,
  },
  {
    fullName: "Dina Samir El-Naggar",
    email: "dina.elnaggar@email.com",
    phone: "+20 112 444 5566",
    currentCompany: "ClinArt CRO",
    currentPosition: "Clinical Research Associate",
    education: [
      { degree: "B.Sc. Pharmacy", university: "Cairo University", year: "2017" },
      { degree: "Diploma in Clinical Research", university: "Cairo University", year: "2019" },
    ],
    experience: [
      {
        company: "ClinArt CRO",
        role: "Clinical Research Associate (CRA)",
        duration: "2021 - Present (3 years)",
        description: "Monitoring Phase II-III clinical trials across 8 investigational sites in Egypt. Conducting site initiation, routine monitoring, and close-out visits. Ensuring GCP compliance and data integrity.",
      },
      {
        company: "Pharos CRO",
        role: "Clinical Trial Assistant",
        duration: "2019 - 2021 (2 years)",
        description: "Managed TMF documentation and regulatory submissions. Coordinated site supplies and shipments.",
      },
      {
        company: "Faculty of Pharmacy - Cairo University",
        role: "Research Assistant",
        duration: "2017 - 2019 (2 years)",
        description: "Assisted in bioequivalence studies and pharmacokinetic data collection.",
      },
    ],
    skills: ["Site Monitoring", "GCP Compliance", "ICH-GCP", "Protocol Review", "Source Data Verification", "CTMS", "EDC Systems", "TMF Management", "Risk-Based Monitoring", "Medical Writing"],
    certifications: ["CRA Certified (ACRP)", "ICH-GCP Certification", "Good Clinical Practice"],
    languages: ["Arabic (Native)", "English (Fluent)"],
    matchScore: 84,
    pharmaRelevanceScore: 91,
  },
];

const STORAGE_KEY = "ats-parsed-resumes";

function loadHistory(): ParsedResume[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: ParsedResume[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function ResumeParserPage() {
  const store = useApiDataStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<ParsedResume[]>([]);
  const [parsedResult, setParsedResult] = useState<ParsedResume | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ParsedResume | null>(null);
  const [skillMatchJobId, setSkillMatchJobId] = useState("");
  const [activeTab, setActiveTab] = useState("upload");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const persistHistory = useCallback((updated: ParsedResume[]) => {
    setHistory(updated);
    saveHistory(updated);
  }, []);

  const openJobs = store.jobs.filter((j) => j.status === "OPEN");

  const simulateParsing = useCallback(
    (fileName: string) => {
      setIsParsing(true);
      setUploadedFileName(fileName);
      setParsedResult(null);
      setCreateSuccess(false);

      setTimeout(() => {
        const template = PHARMA_TEMPLATES[Math.floor(Math.random() * PHARMA_TEMPLATES.length)];
        const parsed: ParsedResume = {
          ...template,
          id: `resume-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName,
          parsedDate: new Date().toISOString().split("T")[0],
          status: "PARSED",
        };
        setParsedResult(parsed);
        setIsParsing(false);
        const updated = [parsed, ...loadHistory()];
        persistHistory(updated);
        setActiveTab("results");
      }, 2000);
    },
    [persistHistory]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        simulateParsing(file.name);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [simulateParsing]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        simulateParsing(file.name);
      }
    },
    [simulateParsing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleCreateCandidate = useCallback(() => {
    if (!parsedResult || !selectedJobId) return;
    const job = store.jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    store.add("candidates", {
      id: store.genId("cand"),
      name: parsedResult.fullName,
      email: parsedResult.email,
      degree: parsedResult.education[0]?.degree || "",
      currentCompany: parsedResult.currentCompany,
      appliedFor: job.title,
      experience: parsedResult.experience[0]?.duration || "",
      source: "Resume Parser",
      status: "APPLIED",
      rating: Math.round(parsedResult.matchScore / 20),
      appliedDate: new Date().toISOString().split("T")[0],
    } as Candidate);

    const updated = history.map((h) =>
      h.id === parsedResult.id ? { ...h, status: "CANDIDATE_CREATED" as const } : h
    );
    persistHistory(updated);
    setParsedResult({ ...parsedResult, status: "CANDIDATE_CREATED" });
    setCreateSuccess(true);
    setShowCreateDialog(false);
  }, [parsedResult, selectedJobId, store, history, persistHistory]);

  const handleReject = useCallback(
    (id: string) => {
      const updated = history.map((h) =>
        h.id === id ? { ...h, status: "REJECTED" as const } : h
      );
      persistHistory(updated);
      if (parsedResult?.id === id) {
        setParsedResult({ ...parsedResult, status: "REJECTED" });
      }
    },
    [history, persistHistory, parsedResult]
  );

  const handleDeleteHistory = useCallback(
    (id: string) => {
      const updated = history.filter((h) => h.id !== id);
      persistHistory(updated);
      if (parsedResult?.id === id) {
        setParsedResult(null);
      }
    },
    [history, persistHistory, parsedResult]
  );

  const handleViewHistory = useCallback((item: ParsedResume) => {
    setParsedResult(item);
    setCreateSuccess(false);
    setActiveTab("results");
  }, []);

  const selectedJobForSkills = store.jobs.find((j) => j.id === skillMatchJobId);
  const jobRequiredSkills = selectedJobForSkills?.requirements
    ? selectedJobForSkills.requirements
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const matchedSkills = parsedResult
    ? parsedResult.skills.filter((s) =>
        jobRequiredSkills.some(
          (r) =>
            r.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(r.toLowerCase())
        )
      )
    : [];
  const missingSkills = parsedResult
    ? jobRequiredSkills.filter(
        (r) =>
          !parsedResult.skills.some(
            (s) =>
              r.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(r.toLowerCase())
          )
      )
    : [];
  const extraSkills = parsedResult
    ? parsedResult.skills.filter(
        (s) =>
          !jobRequiredSkills.some(
            (r) =>
              r.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(r.toLowerCase())
          )
      )
    : [];
  const skillMatchPercent =
    jobRequiredSkills.length > 0
      ? Math.round((matchedSkills.length / jobRequiredSkills.length) * 100)
      : 0;

  const totalParsed = history.length;
  const totalCreated = history.filter((h) => h.status === "CANDIDATE_CREATED").length;
  const avgMatch = totalParsed > 0 ? Math.round(history.reduce((s, h) => s + h.matchScore, 0) / totalParsed) : 0;
  const avgPharma = totalParsed > 0 ? Math.round(history.reduce((s, h) => s + h.pharmaRelevanceScore, 0) / totalParsed) : 0;

  const historyColumns: Column<ParsedResume>[] = [
    { key: "fullName", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "parsedDate", label: "Parsed Date", sortable: true },
    {
      key: "matchScore",
      label: "Match Score",
      sortable: true,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress value={val} className="h-2 w-16" />
          <span className="text-sm font-medium">{val}%</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val: string) => (
        <Badge
          variant="outline"
          className={
            val === "CANDIDATE_CREATED"
              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
              : val === "REJECTED"
              ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
              : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
          }
        >
          {val === "CANDIDATE_CREATED" ? "Candidate Created" : val === "REJECTED" ? "Rejected" : "Parsed"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: unknown, row: ParsedResume) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleViewHistory(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteHistory(row.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Parser"
        description="AI-powered resume parsing for pharmaceutical recruitment"
        icon={<FileText className="h-6 w-6 text-violet-600" />}
        actions={
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resume
          </Button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={FileUp} title="Total Parsed" value={totalParsed} subtitle="Resumes processed" />
        <StatsCard icon={CheckCircle2} title="Candidates Created" value={totalCreated} subtitle="Added to ATS" />
        <StatsCard icon={Target} title="Avg Match Score" value={`${avgMatch}%`} subtitle="Overall match" />
        <StatsCard icon={Sparkles} title="Avg Pharma Score" value={`${avgPharma}%`} subtitle="Industry relevance" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="results">
            <BarChart3 className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                    : "border-gray-300 dark:border-gray-700 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {isParsing ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
                    </div>
                    <p className="text-lg font-medium text-violet-600">Parsing {uploadedFileName}...</p>
                    <p className="text-sm text-muted-foreground">Extracting candidate information using AI</p>
                    <Progress value={66} className="h-2 w-64 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-violet-100 dark:bg-violet-900/30 p-4">
                        <FileUp className="h-8 w-8 text-violet-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drop resume here or click to browse</p>
                      <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, and TXT files</p>
                    </div>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {!parsedResult ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No parsed results</p>
                <p className="text-sm text-muted-foreground mt-1">Upload a resume to see parsed results here</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("upload")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {createSuccess && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-400">Candidate Created Successfully</p>
                    <p className="text-sm text-green-700 dark:text-green-500">
                      {parsedResult.fullName} has been added to the ATS candidates pool.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Personal Information
                        </CardTitle>
                        <div className="flex gap-2">
                          {parsedResult.status === "PARSED" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setShowCreateDialog(true);
                                  setCreateSuccess(false);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create Candidate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(parsedResult.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              parsedResult.status === "CANDIDATE_CREATED"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : parsedResult.status === "REJECTED"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }
                          >
                            {parsedResult.status === "CANDIDATE_CREATED"
                              ? "Candidate Created"
                              : parsedResult.status === "REJECTED"
                              ? "Rejected"
                              : "Parsed"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Full Name</p>
                            <p className="font-medium">{parsedResult.fullName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="font-medium">{parsedResult.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium">{parsedResult.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Current Company</p>
                            <p className="font-medium">{parsedResult.currentCompany}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:col-span-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Current Position</p>
                            <p className="font-medium">{parsedResult.currentPosition}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
                        <Clock className="h-3 w-3" />
                        Parsed from: {parsedResult.fileName} on {parsedResult.parsedDate}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {parsedResult.education.map((edu, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <GraduationCap className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">{edu.degree}</p>
                              <p className="text-sm text-muted-foreground">{edu.university}</p>
                              <p className="text-xs text-muted-foreground">{edu.year}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {parsedResult.experience.map((exp, i) => (
                          <div key={i} className="relative pl-6 pb-4 last:pb-0">
                            {i < parsedResult.experience.length - 1 && (
                              <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                            )}
                            <div className="absolute left-0 top-1.5 h-[18px] w-[18px] rounded-full border-2 border-violet-500 bg-background flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-violet-500" />
                            </div>
                            <div>
                              <p className="font-medium">{exp.role}</p>
                              <p className="text-sm text-violet-600 dark:text-violet-400">{exp.company}</p>
                              <p className="text-xs text-muted-foreground mb-1">{exp.duration}</p>
                              <p className="text-sm text-muted-foreground">{exp.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Certifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {parsedResult.certifications.map((cert, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20">
                              <Award className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <span className="text-sm">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          Languages
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {parsedResult.languages.map((lang, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-sky-50 dark:bg-sky-950/20">
                              <Globe className="h-4 w-4 text-sky-600 flex-shrink-0" />
                              <span className="text-sm">{lang}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="w-full lg:w-80 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Match</span>
                          <span
                            className={`text-lg font-bold ${
                              parsedResult.matchScore >= 80
                                ? "text-green-600"
                                : parsedResult.matchScore >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {parsedResult.matchScore}%
                          </span>
                        </div>
                        <Progress value={parsedResult.matchScore} className="h-3" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Pharma Relevance</span>
                          <span
                            className={`text-lg font-bold ${
                              parsedResult.pharmaRelevanceScore >= 80
                                ? "text-green-600"
                                : parsedResult.pharmaRelevanceScore >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {parsedResult.pharmaRelevanceScore}%
                          </span>
                        </div>
                        <Progress value={parsedResult.pharmaRelevanceScore} className="h-3" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedResult.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-5 w-5" />
                        Skills Matching
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Compare with job</Label>
                        <Select value={skillMatchJobId} onValueChange={setSkillMatchJobId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                          <SelectContent>
                            {store.jobs.map((j) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {skillMatchJobId && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Match</span>
                              <span className="text-sm font-bold">{skillMatchPercent}%</span>
                            </div>
                            <Progress value={skillMatchPercent} className="h-2" />
                          </div>

                          {matchedSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Matched ({matchedSkills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {matchedSkills.map((s, i) => (
                                  <Badge key={i} className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {missingSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Missing ({missingSkills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {missingSkills.map((s, i) => (
                                  <Badge key={i} className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {extraSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Extra ({extraSkills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {extraSkills.map((s, i) => (
                                  <Badge key={i} className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Parsing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No parsing history yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Upload a resume to get started</p>
                </div>
              ) : (
                <DataTable
                  columns={historyColumns}
                  data={history}
                  searchable
                  searchKeys={["fullName", "email"]}
                  pagination
                  onRowClick={handleViewHistory}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Candidate from Parsed Resume</DialogTitle>
          </DialogHeader>
          {parsedResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <span className="font-medium">{parsedResult.fullName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{parsedResult.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>{" "}
                    <span className="font-medium">{parsedResult.currentCompany}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Position:</span>{" "}
                    <span className="font-medium">{parsedResult.currentPosition}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Education:</span>{" "}
                    <span className="font-medium">{parsedResult.education[0]?.degree || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Apply for Job *</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an open job" />
                  </SelectTrigger>
                  <SelectContent>
                    {openJobs.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No open jobs available
                      </SelectItem>
                    ) : (
                      openJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title} - {j.department}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCandidate} disabled={!selectedJobId}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Candidate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Mail,
  Send,
  FileText,
  TrendingUp,
  Plus,
  Eye,
  Reply,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  MailOpen,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";

type EmailCategory =
  | "DOCTOR_FOLLOW_UP"
  | "SAMPLE_REQUEST"
  | "MEETING_REQUEST"
  | "REPORT"
  | "INTERNAL"
  | "ESCALATION";

type SentStatus = "DELIVERED" | "OPENED" | "REPLIED";

interface InboxEmail {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  category: EmailCategory;
  linkedDoctorId?: string;
  linkedAccountId?: string;
}

interface SentEmail {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  date: string;
  linkedDoctorId?: string;
  linkedAccountId?: string;
  status: SentStatus;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const LS_INBOX = "crm-emails-inbox";
const LS_SENT = "crm-emails-sent";
const LS_TEMPLATES = "crm-email-templates";

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  DOCTOR_FOLLOW_UP: "bg-blue-100 text-blue-800",
  SAMPLE_REQUEST: "bg-purple-100 text-purple-800",
  MEETING_REQUEST: "bg-green-100 text-green-800",
  REPORT: "bg-orange-100 text-orange-800",
  INTERNAL: "bg-gray-100 text-gray-800",
  ESCALATION: "bg-red-100 text-red-800",
};

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  DOCTOR_FOLLOW_UP: "Doctor Follow-Up",
  SAMPLE_REQUEST: "Sample Request",
  MEETING_REQUEST: "Meeting Request",
  REPORT: "Report",
  INTERNAL: "Internal",
  ESCALATION: "Escalation",
};

const STATUS_COLORS: Record<SentStatus, string> = {
  DELIVERED: "bg-gray-100 text-gray-700",
  OPENED: "bg-blue-100 text-blue-700",
  REPLIED: "bg-green-100 text-green-700",
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

const SEED_INBOX: InboxEmail[] = [
  {
    id: "inbox-001",
    senderName: "Dr. Ahmed Hassan",
    senderEmail: "a.hassan@cairohospital.eg",
    subject: "Request for Metformin 850mg Samples",
    preview: "Dear representative, I would like to request samples of Metformin 850mg for my diabetic patients...",
    body: "Dear representative,\n\nI would like to request samples of Metformin 850mg for my diabetic patients who are currently on competitor products. I have approximately 15 patients who could benefit from switching.\n\nPlease arrange delivery to my clinic at Cairo Medical Center, Building 3, Floor 2.\n\nI am available for a brief meeting on Wednesday or Thursday afternoon.\n\nBest regards,\nDr. Ahmed Hassan\nEndocrinology Department",
    date: hoursAgo(2),
    read: false,
    category: "SAMPLE_REQUEST",
    linkedDoctorId: "doc-001",
  },
  {
    id: "inbox-002",
    senderName: "Dr. Fatima El-Sayed",
    senderEmail: "f.elsayed@nilemedical.eg",
    subject: "Follow-up on Amlodipine Discussion",
    preview: "Thank you for the presentation last week. I have some questions about the clinical trials...",
    body: "Dear Team,\n\nThank you for the detailed presentation on Amlodipine 5mg last week. I have reviewed the clinical trial data you shared and have a few questions:\n\n1. What is the comparative efficacy vs. Losartan in elderly patients?\n2. Are there any ongoing post-market surveillance studies in the MENA region?\n3. Can you share the pharmacokinetic data for the extended-release formulation?\n\nI am considering switching 20+ patients from their current regimen. Please schedule a follow-up at your earliest convenience.\n\nRegards,\nDr. Fatima El-Sayed\nCardiology Department",
    date: hoursAgo(5),
    read: false,
    category: "DOCTOR_FOLLOW_UP",
    linkedDoctorId: "doc-002",
  },
  {
    id: "inbox-003",
    senderName: "Mohamed Karim (DM - Upper Egypt)",
    senderEmail: "m.karim@company.eg",
    subject: "Monthly Performance Report - April 2026",
    preview: "Please find attached the April performance summary for Upper Egypt region...",
    body: "Hi Team,\n\nPlease find the April 2026 performance summary for Upper Egypt region:\n\n- Total visits completed: 342 / 380 target (90%)\n- New doctors onboarded: 8\n- Sample distribution: 1,240 units\n- Coverage rate: 87%\n- Top performer: Ahmed Mostafa (112% target achievement)\n\nKey challenges:\n- Aswan district is understaffed, need 1 additional rep\n- Competitor X launched aggressive pricing in Luxor\n\nAction items for May:\n1. Recruit for Aswan position\n2. Prepare counter-strategy for Luxor market\n3. Focus on Class A doctor conversion\n\nRegards,\nMohamed Karim\nDistrict Manager - Upper Egypt",
    date: hoursAgo(8),
    read: true,
    category: "REPORT",
  },
  {
    id: "inbox-004",
    senderName: "Dr. Sarah Mansour",
    senderEmail: "s.mansour@alexmed.eg",
    subject: "Meeting Request - New Insulin Product",
    preview: "I heard about your new insulin product launch. Can we schedule a meeting to discuss...",
    body: "Dear Representative,\n\nI learned about your upcoming insulin product launch from a colleague at the recent Diabetes Conference. As head of the Endocrinology Department at Alexandria Medical Center, I am very interested in learning more.\n\nCould we schedule a meeting, preferably next week? I would also like to invite two colleagues from the department.\n\nPlease suggest a convenient time.\n\nBest regards,\nDr. Sarah Mansour\nHead of Endocrinology\nAlexandria Medical Center",
    date: hoursAgo(12),
    read: false,
    category: "MEETING_REQUEST",
    linkedDoctorId: "doc-003",
  },
  {
    id: "inbox-005",
    senderName: "HQ Marketing Team",
    senderEmail: "marketing@company.eg",
    subject: "New Product Launch Kit - Cardiovascular Line",
    preview: "The Q2 product launch materials for the Cardiovascular line are now available...",
    body: "Dear Field Force,\n\nWe are pleased to announce that the Q2 product launch materials for the Cardiovascular line are now available for download from the company portal.\n\nThe kit includes:\n- Updated product monograph\n- Clinical trial summaries (3 new studies)\n- Patient education brochures (Arabic & English)\n- Competitive comparison charts\n- Sample request forms\n\nKey messages to communicate:\n1. Superior 24-hour blood pressure control\n2. Once-daily dosing convenience\n3. Proven safety profile in 10,000+ patients\n\nTraining webinar scheduled for May 12 at 2:00 PM. Attendance is mandatory.\n\nBest,\nMarketing Team",
    date: daysAgo(1),
    read: true,
    category: "INTERNAL",
  },
  {
    id: "inbox-006",
    senderName: "Dr. Omar Abdel-Rahman",
    senderEmail: "o.abdelrahman@ainshams.eg",
    subject: "URGENT: Adverse Event Report - Omeprazole",
    preview: "I need to report an adverse event observed in a patient taking your Omeprazole 20mg...",
    body: "Dear Pharmacovigilance Team,\n\nI need to report an adverse event observed in one of my patients:\n\nPatient: Male, 58 years old\nProduct: Omeprazole 20mg\nBatch: OMZ-2026-034\nEvent: Severe allergic reaction (angioedema) 30 minutes after first dose\nOutcome: Patient treated in ER, now stable\n\nThis is the first time I have seen this reaction with your product. Please investigate and provide feedback.\n\nI have filed the AEMR form and will send it via the official channel as well.\n\nUrgent response requested.\n\nDr. Omar Abdel-Rahman\nGastroenterology\nAin Shams University Hospital",
    date: daysAgo(1),
    read: false,
    category: "ESCALATION",
    linkedDoctorId: "doc-004",
  },
  {
    id: "inbox-007",
    senderName: "Pharmacy Manager - Al-Nour Chain",
    senderEmail: "procurement@alnourpharmacy.eg",
    subject: "Re: Stock Replenishment Order",
    preview: "We confirm receipt of your delivery. However, we noticed a shortage in the Amoxicillin...",
    body: "Dear Sales Team,\n\nWe confirm receipt of delivery note DN-2026-0145 dated May 3rd.\n\nHowever, we noticed a shortage in the following items:\n- Amoxicillin 500mg: Received 80 boxes, ordered 100 boxes\n- Azithromycin 250mg: Received 45 boxes, ordered 50 boxes\n\nPlease arrange for the remaining quantities to be delivered this week. Our Heliopolis branch is running low.\n\nAlso, kindly update us on the expected availability of Ciprofloxacin 750mg, which has been out of stock for 2 weeks.\n\nRegards,\nPharmacy Procurement Team\nAl-Nour Pharmacy Chain",
    date: daysAgo(2),
    read: true,
    category: "SAMPLE_REQUEST",
    linkedAccountId: "acc-001",
  },
  {
    id: "inbox-008",
    senderName: "Regional Director",
    senderEmail: "rd@company.eg",
    subject: "Q2 Target Adjustments & Incentive Program",
    preview: "Based on Q1 performance review, we are adjusting Q2 targets for all districts...",
    body: "Dear District Managers and BUMs,\n\nBased on the Q1 performance review, we are making the following adjustments for Q2:\n\nTarget Adjustments:\n- Diabetes BU: +10% (market growing faster than projected)\n- Cardiovascular BU: No change\n- Anti-infective BU: -5% (supply chain constraints)\n\nNew Incentive Program:\n- Top 3 reps per district: Extra 15% commission\n- 100% target achievement: Team dinner + certificate\n- Best new doctor conversion: EGP 5,000 bonus\n\nPlease cascade to your teams by end of this week.\n\nRegards,\nRegional Director",
    date: daysAgo(2),
    read: false,
    category: "INTERNAL",
  },
  {
    id: "inbox-009",
    senderName: "Dr. Layla Ibrahim",
    senderEmail: "l.ibrahim@mansoura.eg",
    subject: "Request for Clinical Trial Enrollment",
    preview: "I have a suitable candidate for the Phase III trial of your new anti-diabetic compound...",
    body: "Dear Clinical Research Team,\n\nI have identified a suitable candidate for the Phase III trial of your new anti-diabetic compound (Protocol #DM-2026-003):\n\n- Patient meets all inclusion criteria\n- No exclusion criteria identified\n- Patient has provided verbal consent, pending written ICF\n\nPlease send the enrollment package and schedule a site initiation visit at your earliest convenience.\n\nI can also refer 3-4 additional patients from my clinic who may qualify.\n\nLooking forward to your response.\n\nDr. Layla Ibrahim\nInternal Medicine\nMansoura University Hospital",
    date: daysAgo(3),
    read: true,
    category: "DOCTOR_FOLLOW_UP",
    linkedDoctorId: "doc-005",
  },
  {
    id: "inbox-010",
    senderName: "IT Support",
    senderEmail: "it@company.eg",
    subject: "CRM System Maintenance - May 10",
    preview: "Scheduled maintenance window for the CRM system on May 10, 2026...",
    body: "Dear All,\n\nPlease be informed that the CRM system will undergo scheduled maintenance:\n\nDate: May 10, 2026\nTime: 10:00 PM - 2:00 AM (Saturday night)\nImpact: CRM, reporting dashboard, and mobile app will be unavailable\n\nWhat to do:\n- Complete all pending data entries before 9:00 PM\n- Sync your mobile app before the maintenance window\n- Use offline mode if needed during the downtime\n\nNew features after maintenance:\n- Improved GPS tracking accuracy\n- New doctor segmentation filters\n- Faster report generation\n\nContact IT helpdesk for any concerns.\n\nIT Support Team",
    date: daysAgo(3),
    read: true,
    category: "INTERNAL",
  },
  {
    id: "inbox-011",
    senderName: "Dr. Khaled Nasser",
    senderEmail: "k.nasser@tanta.eg",
    subject: "Confirmation: CME Lecture - May 15",
    preview: "I confirm my availability to deliver the CME lecture on hypertension management...",
    body: "Dear Organizer,\n\nI confirm my availability to deliver the CME lecture on \"Modern Approaches to Hypertension Management\" on May 15, 2026 at the Grand Conference Hall.\n\nPresentation details:\n- Duration: 45 minutes + 15 minutes Q&A\n- Topic: Evidence-based hypertension management with focus on combination therapy\n- AV requirements: Projector, microphone, laser pointer\n\nPlease confirm:\n1. Expected audience size\n2. Whether product samples can be displayed\n3. Honorarium and logistics arrangements\n\nLooking forward to the event.\n\nDr. Khaled Nasser\nProfessor of Cardiology\nTanta University",
    date: daysAgo(4),
    read: false,
    category: "MEETING_REQUEST",
    linkedDoctorId: "doc-006",
  },
  {
    id: "inbox-012",
    senderName: "Compliance Department",
    senderEmail: "compliance@company.eg",
    subject: "Reminder: Mandatory Ethics Training Due",
    preview: "This is a reminder that all field force personnel must complete the annual ethics...",
    body: "Dear Team,\n\nThis is a reminder that all field force personnel must complete the annual ethics and compliance training by May 31, 2026.\n\nTraining covers:\n- Anti-bribery and corruption policies\n- Interactions with healthcare professionals\n- Sample management and documentation\n- Adverse event reporting obligations\n- Data privacy (PDPL compliance)\n\nHow to complete:\n1. Log in to the Learning Management System\n2. Navigate to \"Mandatory Training 2026\"\n3. Complete all 5 modules and pass the assessment (minimum 80%)\n\nNon-completion will result in:\n- Suspension of field activities\n- Impact on performance review\n\nContact HR for any technical issues.\n\nCompliance Department",
    date: daysAgo(5),
    read: true,
    category: "INTERNAL",
  },
];

const SEED_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-001",
    name: "Visit Follow-Up",
    subject: "Follow-Up: Our Recent Visit - {{productName}}",
    body: "Dear {{doctorName}},\n\nThank you for taking the time to meet with me on {{date}}. I truly appreciate the opportunity to discuss {{productName}} and its clinical benefits for your patients.\n\nAs discussed, I have attached the latest clinical data and prescribing information for your reference.\n\nPlease do not hesitate to reach out if you have any questions or would like to schedule a follow-up meeting.\n\nBest regards,\n{{repName}}",
  },
  {
    id: "tpl-002",
    name: "Sample Request Confirmation",
    subject: "Sample Request Confirmation - {{productName}}",
    body: "Dear {{doctorName}},\n\nThis email confirms that your request for {{productName}} samples has been received and is being processed.\n\nOrder Details:\n- Product: {{productName}}\n- Requested Date: {{date}}\n\nExpected delivery within 3-5 business days to your clinic address on file.\n\nPlease ensure the sample receipt form is signed upon delivery.\n\nThank you for your continued trust in our products.\n\nBest regards,\n{{repName}}",
  },
  {
    id: "tpl-003",
    name: "Product Information",
    subject: "Product Information: {{productName}}",
    body: "Dear {{doctorName}},\n\nAs requested, please find below key information about {{productName}}:\n\nIndications:\n- [Primary indication]\n- [Secondary indication]\n\nDosage & Administration:\n- [Recommended dosage]\n\nKey Clinical Data:\n- [Efficacy data summary]\n- [Safety profile summary]\n\nI would be happy to provide more detailed information or arrange a presentation at your convenience.\n\nBest regards,\n{{repName}}",
  },
  {
    id: "tpl-004",
    name: "Meeting Invitation",
    subject: "Meeting Invitation: {{productName}} - Clinical Discussion",
    body: "Dear {{doctorName}},\n\nI would like to invite you to a meeting to discuss the latest developments regarding {{productName}}.\n\nProposed Details:\n- Date: {{date}}\n- Duration: 30-45 minutes\n- Location: Your clinic or a venue of your preference\n\nAgenda:\n1. Latest clinical trial results\n2. Real-world evidence from the region\n3. Patient case discussions\n4. Q&A session\n\nPlease let me know your availability and preferred time slot.\n\nLooking forward to our discussion.\n\nBest regards,\n{{repName}}",
  },
  {
    id: "tpl-005",
    name: "Quarterly Review",
    subject: "Quarterly Business Review - Q{{quarter}} {{year}}",
    body: "Dear {{doctorName}},\n\nI hope this message finds you well. As we conclude Q{{quarter}}, I wanted to share a brief update on our partnership:\n\nHighlights:\n- [Number of visits conducted]\n- [Samples provided]\n- [New products discussed]\n\nUpcoming in the next quarter:\n- [New product launches]\n- [CME events]\n- [Clinical studies]\n\nI value our professional relationship and look forward to continuing to support your practice.\n\nPlease let me know if there is anything specific you would like us to focus on.\n\nBest regards,\n{{repName}}",
  },
  {
    id: "tpl-006",
    name: "New Product Launch",
    subject: "Introducing {{productName}} - A New Treatment Option",
    body: "Dear {{doctorName}},\n\nI am excited to introduce {{productName}}, the latest addition to our portfolio.\n\nKey Highlights:\n- [Mechanism of action]\n- [Clinical advantages]\n- [Patient convenience features]\n\nClinical Evidence:\n- [Pivotal trial results]\n- [Head-to-head comparison data]\n\nAvailability:\n- Launch date: {{date}}\n- Available in: [formulations/strengths]\n\nI would love to schedule a brief meeting to present the full clinical data and answer any questions.\n\nSamples are available upon request.\n\nBest regards,\n{{repName}}",
  },
];

const SEED_SENT: SentEmail[] = [
  {
    id: "sent-001",
    recipientName: "Dr. Ahmed Hassan",
    recipientEmail: "a.hassan@cairohospital.eg",
    subject: "Follow-Up: Our Recent Visit - Metformin 850mg",
    body: "Dear Dr. Hassan, Thank you for the meeting...",
    date: daysAgo(1),
    linkedDoctorId: "doc-001",
    status: "OPENED",
  },
  {
    id: "sent-002",
    recipientName: "Dr. Fatima El-Sayed",
    recipientEmail: "f.elsayed@nilemedical.eg",
    subject: "Product Information: Amlodipine 5mg",
    body: "Dear Dr. El-Sayed, As requested...",
    date: daysAgo(2),
    linkedDoctorId: "doc-002",
    status: "REPLIED",
  },
  {
    id: "sent-003",
    recipientName: "Dr. Sarah Mansour",
    recipientEmail: "s.mansour@alexmed.eg",
    subject: "Meeting Invitation: Insulin Product Launch",
    body: "Dear Dr. Mansour, I would like to invite you...",
    date: daysAgo(3),
    linkedDoctorId: "doc-003",
    status: "DELIVERED",
  },
  {
    id: "sent-004",
    recipientName: "Mohamed Karim",
    recipientEmail: "m.karim@company.eg",
    subject: "Re: Monthly Performance Report - April 2026",
    body: "Hi Mohamed, Thank you for the detailed report...",
    date: daysAgo(1),
    status: "OPENED",
  },
];

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function EmailIntegrationPage() {
  const store = useApiDataStore();
  const doctors = (store.doctors ?? []) as Array<{ id: string; name: string; email?: string }>;
  const employees = (store.employees ?? []) as Array<{ id: string; name: string; email: string }>;
  const amAccounts = (store.amAccounts ?? []) as Array<{ id: string; name: string }>;

  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState("inbox");
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const [composeTo, setComposeTo] = useState("");
  const [composeToSearch, setComposeToSearch] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTemplateId, setComposeTemplateId] = useState("");
  const [composeDoctorId, setComposeDoctorId] = useState("");
  const [composeAccountId, setComposeAccountId] = useState("");
  const [showRecipientList, setShowRecipientList] = useState(false);

  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  useEffect(() => {
    try {
      const storedInbox = localStorage.getItem(LS_INBOX);
      const storedSent = localStorage.getItem(LS_SENT);
      const storedTpl = localStorage.getItem(LS_TEMPLATES);
      setInbox(storedInbox ? JSON.parse(storedInbox) : SEED_INBOX);
      setSent(storedSent ? JSON.parse(storedSent) : SEED_SENT);
      setTemplates(storedTpl ? JSON.parse(storedTpl) : SEED_TEMPLATES);
    } catch {
      setInbox(SEED_INBOX);
      setSent(SEED_SENT);
      setTemplates(SEED_TEMPLATES);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS_INBOX, JSON.stringify(inbox));
  }, [inbox, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS_SENT, JSON.stringify(sent));
  }, [sent, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS_TEMPLATES, JSON.stringify(templates));
  }, [templates, mounted]);

  const unreadCount = useMemo(() => inbox.filter((e) => !e.read).length, [inbox]);
  const sentTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return sent.filter((e) => new Date(e.date).toDateString() === today).length;
  }, [sent]);
  const responseRate = useMemo(() => {
    if (sent.length === 0) return 0;
    return Math.round((sent.filter((e) => e.status === "REPLIED").length / sent.length) * 100);
  }, [sent]);

  const toggleRead = useCallback((id: string) => {
    setInbox((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: !e.read } : e))
    );
  }, []);

  const recipientOptions = useMemo(() => {
    const opts: Array<{ label: string; value: string; type: string }> = [];
    doctors.forEach((d) => opts.push({ label: `Dr. ${d.name}`, value: d.email || `${d.name.toLowerCase().replace(/\s+/g, ".")}@doctor.eg`, type: "Doctor" }));
    employees.forEach((e) => opts.push({ label: e.name, value: e.email, type: "Employee" }));
    return opts;
  }, [doctors, employees]);

  const filteredRecipients = useMemo(() => {
    if (!composeToSearch.trim()) return recipientOptions.slice(0, 10);
    const q = composeToSearch.toLowerCase();
    return recipientOptions.filter(
      (r) => r.label.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [recipientOptions, composeToSearch]);

  const openCompose = useCallback((replyTo?: InboxEmail) => {
    if (replyTo) {
      setComposeTo(replyTo.senderEmail);
      setComposeToSearch(replyTo.senderName);
      setComposeSubject(`Re: ${replyTo.subject}`);
      setComposeBody(`\n\n---\nOn ${formatRelativeDate(replyTo.date)}, ${replyTo.senderName} wrote:\n> ${replyTo.body.split("\n").join("\n> ")}`);
      setComposeDoctorId(replyTo.linkedDoctorId || "");
      setComposeAccountId(replyTo.linkedAccountId || "");
    } else {
      setComposeTo("");
      setComposeToSearch("");
      setComposeSubject("");
      setComposeBody("");
      setComposeDoctorId("");
      setComposeAccountId("");
    }
    setComposeTemplateId("");
    setShowRecipientList(false);
    setComposeOpen(true);
  }, []);

  const handleTemplateSelect = useCallback(
    (tplId: string) => {
      setComposeTemplateId(tplId);
      if (tplId && tplId !== "__none__") {
        const tpl = templates.find((t) => t.id === tplId);
        if (tpl) {
          setComposeSubject(tpl.subject);
          setComposeBody(tpl.body);
        }
      }
    },
    [templates]
  );

  const handleSend = useCallback(() => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    const recipientName =
      recipientOptions.find((r) => r.value === composeTo)?.label || composeTo;
    const newSent: SentEmail = {
      id: `sent-${genId()}`,
      recipientName,
      recipientEmail: composeTo,
      subject: composeSubject,
      body: composeBody,
      date: new Date().toISOString(),
      linkedDoctorId: composeDoctorId || undefined,
      linkedAccountId: composeAccountId || undefined,
      status: "DELIVERED",
    };
    setSent((prev) => [newSent, ...prev]);
    setComposeOpen(false);
  }, [composeTo, composeSubject, composeBody, composeDoctorId, composeAccountId, recipientOptions]);

  const openTemplateModal = useCallback((tpl?: EmailTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTplName(tpl.name);
      setTplSubject(tpl.subject);
      setTplBody(tpl.body);
    } else {
      setEditingTemplate(null);
      setTplName("");
      setTplSubject("");
      setTplBody("");
    }
    setTemplateModalOpen(true);
  }, []);

  const saveTemplate = useCallback(() => {
    if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) return;
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name: tplName, subject: tplSubject, body: tplBody }
            : t
        )
      );
    } else {
      setTemplates((prev) => [
        ...prev,
        { id: `tpl-${genId()}`, name: tplName, subject: tplSubject, body: tplBody },
      ]);
    }
    setTemplateModalOpen(false);
  }, [tplName, tplSubject, tplBody, editingTemplate]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const activityTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      type: "sent" | "received";
      subject: string;
      contactName: string;
      date: string;
      doctorId?: string;
      accountId?: string;
    }> = [];
    sent.forEach((s) =>
      items.push({
        id: s.id,
        type: "sent",
        subject: s.subject,
        contactName: s.recipientName,
        date: s.date,
        doctorId: s.linkedDoctorId,
        accountId: s.linkedAccountId,
      })
    );
    inbox.forEach((e) =>
      items.push({
        id: e.id,
        type: "received",
        subject: e.subject,
        contactName: e.senderName,
        date: e.date,
        doctorId: e.linkedDoctorId,
        accountId: e.linkedAccountId,
      })
    );
    return items
      .filter((i) => i.doctorId || i.accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, [sent, inbox]);

  const sentColumns: Column<SentEmail>[] = useMemo(
    () => [
      { key: "recipientName", label: "Recipient", sortable: true },
      { key: "subject", label: "Subject", sortable: true },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (v: string) => formatRelativeDate(v),
      },
      {
        key: "linkedDoctorId",
        label: "Linked Doctor",
        render: (v: string) => {
          if (!v) return <span className="text-muted-foreground">-</span>;
          const doc = doctors.find((d) => d.id === v);
          return doc ? (
            <span className="text-sm">Dr. {doc.name}</span>
          ) : (
            <span className="text-muted-foreground text-sm">{v}</span>
          );
        },
      },
      {
        key: "linkedAccountId",
        label: "Linked Account",
        render: (v: string) => {
          if (!v) return <span className="text-muted-foreground">-</span>;
          const acc = amAccounts.find((a) => a.id === v);
          return acc ? (
            <span className="text-sm">{acc.name}</span>
          ) : (
            <span className="text-muted-foreground text-sm">{v}</span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (v: SentStatus) => (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[v]}`}>
            {v}
          </span>
        ),
      },
    ],
    [doctors, amAccounts]
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Email Integration"
        description="Pharma field force communication hub - track emails, manage templates, and link communications to CRM records"
        icon={<Mail className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={() => openCompose()} className="gap-2">
            <Plus className="h-4 w-4" />
            Compose Email
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Mail} title="Inbox" value={unreadCount} subtitle={`${inbox.length} total emails`} />
        <StatsCard icon={Send} title="Sent Today" value={sentTodayCount} subtitle={`${sent.length} total sent`} />
        <StatsCard icon={FileText} title="Templates" value={templates.length} subtitle="Email templates" />
        <StatsCard icon={TrendingUp} title="Response Rate" value={`${responseRate}%`} subtitle="Emails that got replies" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inbox" className="gap-2">
            <Mail className="h-4 w-4" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-2">
          {inbox.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mb-3 opacity-40" />
                <p>No emails in inbox</p>
              </CardContent>
            </Card>
          ) : (
            inbox.map((email) => {
              const isExpanded = expandedEmailId === email.id;
              return (
                <Card
                  key={email.id}
                  className={`transition-colors ${!email.read ? "border-l-4 border-l-primary bg-primary/[0.02]" : ""}`}
                >
                  <CardContent className="p-4">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {!email.read ? (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-transparent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${!email.read ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                            {email.senderName}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[email.category]}`}>
                            {CATEGORY_LABELS[email.category]}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeDate(email.date)}
                          </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${!email.read ? "font-medium text-foreground" : "text-foreground"}`}>
                          {email.subject}
                        </p>
                        {!isExpanded && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {email.preview}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 ml-6 space-y-3">
                        <div className="text-xs text-muted-foreground">
                          From: {email.senderName} &lt;{email.senderEmail}&gt;
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4 border">
                          {email.body}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompose(email);
                            }}
                          >
                            <Reply className="h-3.5 w-3.5" />
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRead(email.id);
                            }}
                          >
                            {email.read ? (
                              <>
                                <Mail className="h-3.5 w-3.5" />
                                Mark Unread
                              </>
                            ) : (
                              <>
                                <MailOpen className="h-3.5 w-3.5" />
                                Mark Read
                              </>
                            )}
                          </Button>
                          {email.linkedDoctorId && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Stethoscope className="h-3 w-3" />
                              {doctors.find((d) => d.id === email.linkedDoctorId)?.name || email.linkedDoctorId}
                            </Badge>
                          )}
                          {email.linkedAccountId && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Building2 className="h-3 w-3" />
                              {amAccounts.find((a) => a.id === email.linkedAccountId)?.name || email.linkedAccountId}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <DataTable
            columns={sentColumns}
            data={sent}
            searchable
            searchKeys={["recipientName", "subject"]}
            pagination
            emptyMessage="No sent emails yet. Compose your first email!"
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Manage your email templates with placeholders like {"{{doctorName}}"}, {"{{productName}}"}, {"{{repName}}"}, {"{{date}}"}
            </p>
            <Button size="sm" onClick={() => openTemplateModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setPreviewTemplateId(tpl.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openTemplateModal(tpl)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplate(tpl.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                  <p className="text-sm mb-2">{tpl.subject}</p>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Body Preview:</p>
                  <p className="text-xs text-muted-foreground line-clamp-4">{tpl.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activityTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No email activity linked to CRM records yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activityTimeline.map((item) => {
                    const docName = item.doctorId
                      ? doctors.find((d) => d.id === item.doctorId)?.name
                      : null;
                    const accName = item.accountId
                      ? amAccounts.find((a) => a.id === item.accountId)?.name
                      : null;
                    return (
                      <div key={item.id} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              item.type === "sent"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {item.type === "sent" ? (
                              <Send className="h-3.5 w-3.5" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {item.type === "sent" ? "Sent to" : "Received from"}{" "}
                              {item.contactName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(item.date)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {item.subject}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {docName && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Stethoscope className="h-2.5 w-2.5" />
                                {docName}
                              </Badge>
                            )}
                            {accName && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Building2 className="h-2.5 w-2.5" />
                                {accName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>Send an email and link it to CRM records</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>To</Label>
              <div className="relative">
                <Input
                  value={composeToSearch}
                  onChange={(e) => {
                    setComposeToSearch(e.target.value);
                    setShowRecipientList(true);
                  }}
                  onFocus={() => setShowRecipientList(true)}
                  placeholder="Search doctors or employees..."
                  className="pr-8"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                {showRecipientList && filteredRecipients.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {filteredRecipients.map((r) => (
                      <button
                        key={r.value}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => {
                          setComposeTo(r.value);
                          setComposeToSearch(r.label);
                          setShowRecipientList(false);
                        }}
                      >
                        {r.type === "Doctor" ? (
                          <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-gray-500" />
                        )}
                        <span>{r.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{r.value}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {composeTo && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {composeTo}
                  <button
                    onClick={() => {
                      setComposeTo("");
                      setComposeToSearch("");
                    }}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={composeTemplateId || "__none__"} onValueChange={(v) => handleTemplateSelect(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your email..."
                rows={8}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Link to Doctor (optional)</Label>
                <Select value={composeDoctorId || "__none__"} onValueChange={(v) => setComposeDoctorId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Link to Account (optional)</Label>
                <Select value={composeAccountId || "__none__"} onValueChange={(v) => setComposeAccountId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {amAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!composeTo.trim() || !composeSubject.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>
              Use placeholders: {"{{doctorName}}"}, {"{{productName}}"}, {"{{repName}}"}, {"{{date}}"}, {"{{quarter}}"}, {"{{year}}"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g., Visit Follow-Up"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
                placeholder="Email subject template"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                placeholder="Email body template..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={!tplName.trim() || !tplSubject.trim() || !tplBody.trim()}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplateId} onOpenChange={() => setPreviewTemplateId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const tpl = templates.find((t) => t.id === previewTemplateId);
            if (!tpl) return null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Template Preview: {tpl.name}</DialogTitle>
                  <DialogDescription>Preview with sample data</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                    <p className="text-sm font-medium">
                      {tpl.subject
                        .replace(/\{\{doctorName\}\}/g, "Dr. Ahmed Hassan")
                        .replace(/\{\{productName\}\}/g, "Amlodipine 5mg")
                        .replace(/\{\{repName\}\}/g, "Mohamed Ali")
                        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
                        .replace(/\{\{quarter\}\}/g, "2")
                        .replace(/\{\{year\}\}/g, "2026")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Body:</p>
                    <div className="whitespace-pre-wrap text-sm bg-muted/30 rounded-lg p-4 border leading-relaxed">
                      {tpl.body
                        .replace(/\{\{doctorName\}\}/g, "Dr. Ahmed Hassan")
                        .replace(/\{\{productName\}\}/g, "Amlodipine 5mg")
                        .replace(/\{\{repName\}\}/g, "Mohamed Ali")
                        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
                        .replace(/\{\{quarter\}\}/g, "2")
                        .replace(/\{\{year\}\}/g, "2026")}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

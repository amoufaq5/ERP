"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "./user-context";

// ─── Entity types ────────────────────────────────────────────────────────────

export interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  description: string;
  managerId: string | null;  // userId of BUM
  productIds: string[];
  memberIds: string[];        // userIds of members (marketeers/DMs/reps/etc)
  color: string;              // for UI chips
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  strength: string;
  form: "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Drops" | "Inhaler" | "Suppository";
  buId: string | null;
  pricePerUnit: number;
  therapeuticArea: string;
  edaRegistration?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  city: string;
  phone: string;
  email?: string;
  classification: "A" | "B" | "C" | "D";
  assignedRepId: string | null;
  visitFrequency: number;       // required visits per month
  lastVisitAt?: string;
  notes?: string;
  createdAt: string;
  buId?: string | null;          // which BU "owns" the doctor
}

export type VisitType = "SINGLE" | "DOUBLE";
export type VisitStatus = "LOGGED" | "APPROVED" | "REJECTED";

export interface Visit {
  id: string;
  repId: string;
  doctorId: string;
  dateTime: string;
  type: VisitType;
  partnerId?: string;       // when DOUBLE, the senior who joined
  durationMin: number;
  productIds: string[];
  samplesDistributed: number;
  notes: string;
  feedback?: string;
  gpsVerified: boolean;
  lat?: number;
  lng?: number;
  status: VisitStatus;
  buId?: string | null;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedById: string;
  assignedToId: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  kpiMetric?: string;         // e.g., "Visits", "New Doctors", "Market Requests"
  kpiTarget?: number;
  kpiActual?: number;
  buId?: string | null;
  createdAt: string;
}

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
export type RequestType = "SAMPLE" | "LITERATURE" | "EVENT" | "DISCOUNT" | "DOCTOR_EDIT" | "OTHER";

export interface MarketRequest {
  id: string;
  type: RequestType;
  requestedById: string;
  doctorId?: string;
  productId?: string;
  description: string;
  quantity?: number;
  amount?: number;
  priority: TaskPriority;
  status: RequestStatus;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  buId?: string | null;
  // For DOCTOR_EDIT requests: the proposed changes
  proposedChanges?: Partial<Doctor>;
  targetEntityId?: string;    // e.g., the doctor id being edited
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;                // Pharmacy Chain / Hospital / MoH / Distributor
  phone: string;
  email: string;
  address: string;
  city?: string;
  creditLimit: number;
  outstanding: number;
  currency: string;            // EGP/USD/EUR
  paymentTerms: string;        // Net 30, Net 60
  status: "ACTIVE" | "HOLD" | "BLOCKED";
  createdAt: string;
  buId?: string | null;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;            // API Supplier / Packaging / Equipment / Lab Reagents
  phone: string;
  email: string;
  address: string;
  outstanding: number;
  paymentTerms: string;
  gmpCertified: boolean;
  createdAt: string;
}

export interface Cheque {
  id: string;
  number: string;
  bankName: string;
  bankAccountId?: string;
  type: "INCOMING" | "OUTGOING";
  partyName: string;            // customer or vendor name
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: "PENDING" | "DEPOSITED" | "CLEARED" | "BOUNCED" | "CANCELLED";
  notes?: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  items: { productId: string; description: string; quantity: number; unitPrice: number; total: number }[];
  notes?: string;
}

export interface KPIRecord {
  id: string;
  userId: string;
  period: string;              // YYYY-MM
  metric: string;
  target: number;
  actual: number;
  setBy: string;               // userId of the superior
}

export interface BankAccount {
  id: string;
  code: string;
  name: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  currency: string;
  balance: number;
  type: "CURRENT" | "SAVINGS" | "FOREIGN_CURRENCY";
  status: "ACTIVE" | "DORMANT" | "CLOSED";
  openedAt: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  channelId?: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  type: "RECEIVED" | "SENT";
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "CREDIT_CARD";
  bankAccountId?: string;
  chequeId?: string;
  date: string;
  notes?: string;
}

// ─── Store shape ─────────────────────────────────────────────────────────────

export interface DataStoreState {
  businessUnits: BusinessUnit[];
  products: Product[];
  doctors: Doctor[];
  visits: Visit[];
  tasks: Task[];
  marketRequests: MarketRequest[];
  customers: Customer[];
  vendors: Vendor[];
  cheques: Cheque[];
  invoices: Invoice[];
  kpis: KPIRecord[];
  bankAccounts: BankAccount[];
  messages: Message[];
  payments: Payment[];
  nextInvoiceSeq: number;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const today = new Date();
const isoNow = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

const SEED_BUS: BusinessUnit[] = [
  {
    id: "bu-cardio",
    name: "Cardiovascular BU",
    code: "CV",
    description: "Cardiology, hypertension, lipid-lowering and heart-failure therapeutics.",
    managerId: "u-bum",
    productIds: ["p-cardio-1", "p-cardio-2", "p-cardio-3"],
    memberIds: ["u-mkt-1", "u-dm-1", "u-rep-1"],
    color: "#ef4444",
    createdAt: daysAgo(365),
  },
  {
    id: "bu-diabetes",
    name: "Diabetes & Metabolic BU",
    code: "DM",
    description: "Insulin, oral antidiabetics, thyroid, and metabolic disorders.",
    managerId: "u-bum",
    productIds: ["p-diab-1", "p-diab-2"],
    memberIds: ["u-mkt-1", "u-dm-1"],
    color: "#3b82f6",
    createdAt: daysAgo(300),
  },
  {
    id: "bu-primary",
    name: "Primary Care BU",
    code: "PC",
    description: "GP, pediatrics, analgesics, antibiotics, OTC.",
    managerId: "u-bum",
    productIds: ["p-prim-1", "p-prim-2", "p-prim-3"],
    memberIds: ["u-mkt-1", "u-dm-1", "u-rep-1"],
    color: "#10b981",
    createdAt: daysAgo(200),
  },
];

const SEED_PRODUCTS: Product[] = [
  { id: "p-cardio-1", code: "CV-001", name: "Cardioprex", strength: "500mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 48, therapeuticArea: "Hypertension", edaRegistration: "EDA/2024/1001" },
  { id: "p-cardio-2", code: "CV-002", name: "Atorvastat", strength: "20mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 62, therapeuticArea: "Dyslipidemia", edaRegistration: "EDA/2024/1002" },
  { id: "p-cardio-3", code: "CV-003", name: "Metoprolax", strength: "50mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 35, therapeuticArea: "Beta-blocker", edaRegistration: "EDA/2023/0892" },
  { id: "p-diab-1", code: "DM-001", name: "Diabetex XR", strength: "1000mg", form: "Tablet", buId: "bu-diabetes", pricePerUnit: 95, therapeuticArea: "Type 2 Diabetes", edaRegistration: "EDA/2024/1101" },
  { id: "p-diab-2", code: "DM-002", name: "Glargin-Long", strength: "100U/ml", form: "Injection", buId: "bu-diabetes", pricePerUnit: 420, therapeuticArea: "Insulin", edaRegistration: "EDA/2023/0774" },
  { id: "p-prim-1", code: "PC-001", name: "Antibio-Z", strength: "1g", form: "Capsule", buId: "bu-primary", pricePerUnit: 28, therapeuticArea: "Antibiotic", edaRegistration: "EDA/2022/0550" },
  { id: "p-prim-2", code: "PC-002", name: "Paraflu Junior", strength: "120mg/5ml", form: "Syrup", buId: "bu-primary", pricePerUnit: 22, therapeuticArea: "Pediatric", edaRegistration: "EDA/2023/0612" },
  { id: "p-prim-3", code: "PC-003", name: "Nervocalm", strength: "10mg", form: "Tablet", buId: "bu-primary", pricePerUnit: 18, therapeuticArea: "Anxiolytic", edaRegistration: "EDA/2023/0713" },
];

const SEED_DOCTORS: Doctor[] = [
  { id: "dr-001", name: "Dr. Ahmed El-Gamal", specialty: "Cardiology", hospital: "Cleopatra Hospital", city: "Cairo", phone: "+20 100 111 2233", classification: "A", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(3), createdAt: daysAgo(180), buId: "bu-cardio" },
  { id: "dr-002", name: "Dr. Salma Ibrahim", specialty: "Endocrinology", hospital: "Dar Al Fouad", city: "Giza", phone: "+20 100 222 3344", classification: "A", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(5), createdAt: daysAgo(200), buId: "bu-diabetes" },
  { id: "dr-003", name: "Dr. Mahmoud Adel", specialty: "General Practice", hospital: "Private Clinic", city: "Cairo", phone: "+20 100 333 4455", classification: "B", assignedRepId: "u-rep-1", visitFrequency: 2, lastVisitAt: daysAgo(10), createdAt: daysAgo(150), buId: "bu-primary" },
  { id: "dr-004", name: "Dr. Rania Farouk", specialty: "Pediatrics", hospital: "As-Salam Hospital", city: "Cairo", phone: "+20 100 444 5566", classification: "A", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(2), createdAt: daysAgo(190), buId: "bu-primary" },
  { id: "dr-005", name: "Dr. Khaled Samy", specialty: "Internal Medicine", hospital: "Ain Shams University", city: "Cairo", phone: "+20 100 555 6677", classification: "B", assignedRepId: "u-rep-1", visitFrequency: 2, lastVisitAt: daysAgo(14), createdAt: daysAgo(120), buId: "bu-cardio" },
  { id: "dr-006", name: "Dr. Youssef Hamdi", specialty: "Cardiology", hospital: "Nasser Institute", city: "Cairo", phone: "+20 100 666 7788", classification: "B", assignedRepId: null, visitFrequency: 2, createdAt: daysAgo(90), buId: "bu-cardio" },
  { id: "dr-007", name: "Dr. Maha Gabr", specialty: "Endocrinology", hospital: "Maadi Military Hospital", city: "Cairo", phone: "+20 100 777 8899", classification: "C", assignedRepId: null, visitFrequency: 1, createdAt: daysAgo(60), buId: "bu-diabetes" },
  { id: "dr-008", name: "Dr. Tarek Shaker", specialty: "General Practice", hospital: "Family Clinic", city: "Giza", phone: "+20 100 888 9900", classification: "C", assignedRepId: null, visitFrequency: 1, createdAt: daysAgo(45), buId: "bu-primary" },
];

const SEED_VISITS: Visit[] = [
  { id: "v-001", repId: "u-rep-1", doctorId: "dr-001", dateTime: daysAgo(3), type: "SINGLE", durationMin: 25, productIds: ["p-cardio-1", "p-cardio-2"], samplesDistributed: 4, notes: "Good reception. Asked about cardio bundle.", gpsVerified: true, lat: 30.0988, lng: 31.3413, status: "APPROVED", buId: "bu-cardio" },
  { id: "v-002", repId: "u-rep-1", doctorId: "dr-002", dateTime: daysAgo(5), type: "DOUBLE", partnerId: "u-dm-1", durationMin: 40, productIds: ["p-diab-1", "p-diab-2"], samplesDistributed: 6, notes: "Joint visit with DM. Prescribed Diabetex for 3 patients.", gpsVerified: true, lat: 29.9627, lng: 30.9373, status: "APPROVED", buId: "bu-diabetes" },
  { id: "v-003", repId: "u-rep-1", doctorId: "dr-004", dateTime: daysAgo(2), type: "SINGLE", durationMin: 20, productIds: ["p-prim-2"], samplesDistributed: 8, notes: "New pediatric patient intake is high.", gpsVerified: true, lat: 30.0444, lng: 31.2357, status: "APPROVED", buId: "bu-primary" },
];

const SEED_TASKS: Task[] = [
  { id: "t-001", title: "Increase cardio coverage in Giza", description: "Visit all class-A cardiologists at least twice this month.", assignedById: "u-dm-1", assignedToId: "u-rep-1", dueDate: daysAhead(12), status: "IN_PROGRESS", priority: "HIGH", kpiMetric: "Cardio A-class visits", kpiTarget: 16, kpiActual: 9, buId: "bu-cardio", createdAt: daysAgo(10) },
  { id: "t-002", title: "Onboard 3 new diabetes specialists", description: "Identify and add 3 new endocrinologists in your territory.", assignedById: "u-dm-1", assignedToId: "u-rep-1", dueDate: daysAhead(20), status: "TODO", priority: "MEDIUM", kpiMetric: "New doctors", kpiTarget: 3, kpiActual: 1, buId: "bu-diabetes", createdAt: daysAgo(5) },
  { id: "t-003", title: "Q2 team review", description: "Prepare district Q2 review presentation with coverage & achievement.", assignedById: "u-mkt-1", assignedToId: "u-dm-1", dueDate: daysAhead(7), status: "TODO", priority: "URGENT", buId: null, createdAt: daysAgo(3) },
];

const SEED_MARKET_REQUESTS: MarketRequest[] = [
  { id: "mr-001", type: "SAMPLE", requestedById: "u-rep-1", doctorId: "dr-001", productId: "p-cardio-1", description: "Dr. El-Gamal requests 20 additional samples for next month.", quantity: 20, priority: "MEDIUM", status: "PENDING", createdAt: daysAgo(2), buId: "bu-cardio" },
  { id: "mr-002", type: "LITERATURE", requestedById: "u-rep-1", doctorId: "dr-002", productId: "p-diab-1", description: "Clinical studies pack for Diabetex XR.", priority: "HIGH", status: "APPROVED", approvedById: "u-dm-1", approvedAt: daysAgo(1), createdAt: daysAgo(3), buId: "bu-diabetes" },
  { id: "mr-003", type: "EVENT", requestedById: "u-dm-1", description: "Sponsor cardiology CME at Cleopatra Hospital.", amount: 35000, priority: "HIGH", status: "PENDING", createdAt: daysAgo(4), buId: "bu-cardio" },
];

const SEED_CUSTOMERS: Customer[] = [
  { id: "c-001", code: "CUST-1001", name: "El-Ezaby Pharmacies", type: "Pharmacy Chain", phone: "+20 2 2345 6789", email: "ap@elezaby.com", address: "Cairo HQ, Heliopolis", city: "Cairo", creditLimit: 5000000, outstanding: 2810000, currency: "EGP", paymentTerms: "Net 60", status: "ACTIVE", createdAt: daysAgo(720) },
  { id: "c-002", code: "CUST-1002", name: "Seif Pharmacies", type: "Pharmacy Chain", phone: "+20 2 3456 7890", email: "finance@seif-pharma.com", address: "Nasr City", city: "Cairo", creditLimit: 4000000, outstanding: 2140000, currency: "EGP", paymentTerms: "Net 60", status: "ACTIVE", createdAt: daysAgo(680) },
  { id: "c-003", code: "CUST-1003", name: "Ibnsina Pharma", type: "Distributor", phone: "+20 2 4567 8901", email: "ap@ibnsina.com", address: "6th October", city: "Giza", creditLimit: 8000000, outstanding: 1820000, currency: "EGP", paymentTerms: "Net 90", status: "ACTIVE", createdAt: daysAgo(900) },
  { id: "c-004", code: "CUST-1004", name: "Ministry of Health", type: "Government", phone: "+20 2 2794 0000", email: "procurement@moh.gov.eg", address: "Magles El Shaab St.", city: "Cairo", creditLimit: 15000000, outstanding: 1420000, currency: "EGP", paymentTerms: "Net 120", status: "ACTIVE", createdAt: daysAgo(1100) },
  { id: "c-005", code: "CUST-1005", name: "Cleopatra Hospital", type: "Hospital", phone: "+20 2 2514 4545", email: "ap@cleopatrahospital.com", address: "Heliopolis", city: "Cairo", creditLimit: 2500000, outstanding: 920000, currency: "EGP", paymentTerms: "Net 45", status: "ACTIVE", createdAt: daysAgo(540) },
];

const SEED_VENDORS: Vendor[] = [
  { id: "ve-001", code: "VEN-2001", name: "Sun Pharma API", category: "API Supplier", phone: "+91 22 6645 5645", email: "export@sunpharma.com", address: "Mumbai, India", outstanding: 1420000, paymentTerms: "Net 45", gmpCertified: true, createdAt: daysAgo(1000) },
  { id: "ve-002", code: "VEN-2002", name: "BASF Pharma Solutions", category: "Excipients", phone: "+49 621 60 0", email: "pharma@basf.com", address: "Ludwigshafen, Germany", outstanding: 620000, paymentTerms: "Net 30", gmpCertified: true, createdAt: daysAgo(900) },
  { id: "ve-003", code: "VEN-2003", name: "Schott Glass", category: "Primary Packaging", phone: "+49 6131 66 0", email: "pharma@schott.com", address: "Mainz, Germany", outstanding: 340000, paymentTerms: "Net 60", gmpCertified: true, createdAt: daysAgo(820) },
  { id: "ve-004", code: "VEN-2004", name: "Bormioli Pharma", category: "Primary Packaging", phone: "+39 0521 1234", email: "sales@bormioli.com", address: "Parma, Italy", outstanding: 275000, paymentTerms: "Net 60", gmpCertified: true, createdAt: daysAgo(700) },
  { id: "ve-005", code: "VEN-2005", name: "Egyptian Lab Reagents", category: "Lab Reagents", phone: "+20 2 3336 7788", email: "info@egyptlabs.com", address: "Alexandria", outstanding: 92000, paymentTerms: "Net 30", gmpCertified: false, createdAt: daysAgo(400) },
];

const SEED_CHEQUES: Cheque[] = [
  { id: "ch-001", number: "CHQ-0001", bankName: "CIB", type: "INCOMING", partyName: "El-Ezaby Pharmacies", amount: 850000, currency: "EGP", issueDate: daysAgo(5), dueDate: daysAhead(3), status: "PENDING" },
  { id: "ch-002", number: "CHQ-0002", bankName: "NBE", type: "INCOMING", partyName: "Seif Pharmacies", amount: 620000, currency: "EGP", issueDate: daysAgo(10), dueDate: daysAhead(5), status: "DEPOSITED" },
  { id: "ch-003", number: "CHQ-0003", bankName: "Banque Misr", type: "OUTGOING", partyName: "Sun Pharma API", amount: 1200000, currency: "EGP", issueDate: daysAgo(2), dueDate: daysAhead(12), status: "PENDING" },
  { id: "ch-004", number: "CHQ-0004", bankName: "QNB", type: "INCOMING", partyName: "Cleopatra Hospital", amount: 340000, currency: "EGP", issueDate: daysAgo(20), dueDate: daysAgo(2), status: "CLEARED" },
  { id: "ch-005", number: "CHQ-0005", bankName: "HSBC", type: "OUTGOING", partyName: "BASF Pharma Solutions", amount: 620000, currency: "EGP", issueDate: daysAgo(14), dueDate: daysAhead(1), status: "PENDING" },
];

const SEED_INVOICES: Invoice[] = [
  { id: "inv-001", number: "INV-2026-0001", customerId: "c-001", date: daysAgo(30), dueDate: daysAhead(30), subtotal: 850000, tax: 119000, total: 969000, currency: "EGP", status: "SENT", items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg box (100)", quantity: 500, unitPrice: 1700, total: 850000 }] },
  { id: "inv-002", number: "INV-2026-0002", customerId: "c-002", date: daysAgo(15), dueDate: daysAhead(45), subtotal: 620000, tax: 86800, total: 706800, currency: "EGP", status: "PARTIAL", items: [{ productId: "p-diab-1", description: "Diabetex XR 1000mg box (60)", quantity: 200, unitPrice: 3100, total: 620000 }] },
];

const SEED_KPIS: KPIRecord[] = [
  { id: "kpi-001", userId: "u-rep-1", period: "2026-04", metric: "Visits", target: 160, actual: 94, setBy: "u-dm-1" },
  { id: "kpi-002", userId: "u-rep-1", period: "2026-04", metric: "Coverage %", target: 90, actual: 87, setBy: "u-dm-1" },
  { id: "kpi-003", userId: "u-dm-1", period: "2026-04", metric: "District achievement %", target: 105, actual: 103, setBy: "u-mkt-1" },
];

const SEED_BANK_ACCOUNTS: BankAccount[] = [
  { id: "ba-001", code: "BA-CIB-EGP", name: "CIB Main Operating", bankName: "CIB", accountNumber: "1001-2345-6789-01", iban: "EG380010100012345678901", currency: "EGP", balance: 12450000, type: "CURRENT", status: "ACTIVE", openedAt: daysAgo(1500) },
  { id: "ba-002", code: "BA-NBE-EGP", name: "NBE Collections", bankName: "National Bank of Egypt", accountNumber: "2002-3456-7890-02", iban: "EG380020200023456789002", currency: "EGP", balance: 4820000, type: "CURRENT", status: "ACTIVE", openedAt: daysAgo(1200) },
  { id: "ba-003", code: "BA-HSBC-USD", name: "HSBC Foreign Currency", bankName: "HSBC Egypt", accountNumber: "3003-4567-8901-03", currency: "USD", balance: 285000, type: "FOREIGN_CURRENCY", status: "ACTIVE", openedAt: daysAgo(900) },
  { id: "ba-004", code: "BA-BM-EGP", name: "Banque Misr Payroll", bankName: "Banque Misr", accountNumber: "4004-5678-9012-04", iban: "EG380040400045678901204", currency: "EGP", balance: 2150000, type: "CURRENT", status: "ACTIVE", openedAt: daysAgo(1100) },
];

const SEED_MESSAGES: Message[] = [
  { id: "msg-001", fromUserId: "u-admin", toUserId: "u-bum", subject: "Q2 Budget Approval", body: "The Q2 operational budget of EGP 4.2M has been approved by the board. Please distribute to your marketeers and ensure district managers are informed. Key allocations: 40% field operations, 30% samples & literature, 20% events, 10% reserve.", read: true, starred: true, createdAt: daysAgo(3) },
  { id: "msg-002", fromUserId: "u-bum", toUserId: "u-mkt-1", subject: "Urgent: Cardio BU target adjustment", body: "Based on Q1 results, we're increasing the Cardiovascular BU visit targets by 15% for Q2. Please cascade to all DMs and ensure their reps update their plans. The new target is 184 visits/month per rep for Class A doctors.", read: true, starred: false, createdAt: daysAgo(2) },
  { id: "msg-003", fromUserId: "u-mkt-1", toUserId: "u-dm-1", subject: "District review meeting — Thursday", body: "Reminder: We have our monthly district review this Thursday at 10 AM. Please prepare your team's coverage report, visit compliance stats, and any pending market requests. Also bring the new doctor onboarding pipeline.", read: false, starred: false, createdAt: daysAgo(1) },
  { id: "msg-004", fromUserId: "u-dm-1", toUserId: "u-rep-1", subject: "Dr. El-Gamal follow-up", body: "Please prioritize the follow-up with Dr. El-Gamal this week. He showed strong interest in the Cardioprex bundle during the last visit. Prepare a detailed clinical study packet and bring additional samples. This is a high-value account.", read: false, starred: false, createdAt: daysAgo(0) },
  { id: "msg-005", fromUserId: "u-rep-1", toUserId: "u-dm-1", subject: "Re: Dr. El-Gamal follow-up", body: "Noted. I have a visit scheduled for tomorrow morning at Cleopatra Hospital. I'll bring the full Cardioprex clinical dossier and 10 sample boxes. Also planning to discuss the new Atorvastat 20mg with him.", read: false, starred: false, createdAt: daysAgo(0) },
  { id: "msg-006", fromUserId: "u-admin", toUserId: "u-hr-1", subject: "New hire onboarding — 3 medical reps", body: "We have 3 new medical reps starting next week (Cairo North district). Please ensure their onboarding packages are ready: ID badges, system access, product training schedule, and territory assignments. Coordinate with Ahmed Mostafa (DM) for field shadowing.", read: true, starred: false, createdAt: daysAgo(4) },
];

const SEED_PAYMENTS: Payment[] = [
  { id: "pay-001", reference: "PAY-2026-0001", type: "RECEIVED", customerId: "c-001", invoiceId: "inv-001", amount: 500000, currency: "EGP", method: "BANK_TRANSFER", bankAccountId: "ba-001", date: daysAgo(10), notes: "Partial payment against INV-2026-0001" },
  { id: "pay-002", reference: "PAY-2026-0002", type: "RECEIVED", customerId: "c-005", amount: 340000, currency: "EGP", method: "CHEQUE", bankAccountId: "ba-002", chequeId: "ch-004", date: daysAgo(8), notes: "Cheque cleared — Cleopatra Hospital" },
  { id: "pay-003", reference: "PAY-2026-0003", type: "SENT", vendorId: "ve-002", amount: 620000, currency: "EGP", method: "BANK_TRANSFER", bankAccountId: "ba-001", date: daysAgo(5), notes: "BASF excipient shipment payment" },
  { id: "pay-004", reference: "PAY-2026-0004", type: "RECEIVED", customerId: "c-002", invoiceId: "inv-002", amount: 300000, currency: "EGP", method: "BANK_TRANSFER", bankAccountId: "ba-002", date: daysAgo(3), notes: "Partial payment — Seif Pharmacies" },
];

export const SEED_DATA: DataStoreState = {
  businessUnits: SEED_BUS,
  products: SEED_PRODUCTS,
  doctors: SEED_DOCTORS,
  visits: SEED_VISITS,
  tasks: SEED_TASKS,
  marketRequests: SEED_MARKET_REQUESTS,
  customers: SEED_CUSTOMERS,
  vendors: SEED_VENDORS,
  cheques: SEED_CHEQUES,
  invoices: SEED_INVOICES,
  kpis: SEED_KPIS,
  bankAccounts: SEED_BANK_ACCOUNTS,
  messages: SEED_MESSAGES,
  payments: SEED_PAYMENTS,
  nextInvoiceSeq: 3,
};

// ─── Context ─────────────────────────────────────────────────────────────────

type EntityKey = {
  [K in keyof DataStoreState]: DataStoreState[K] extends Array<unknown> ? K : never;
}[keyof DataStoreState];

interface DataStoreValue extends DataStoreState {
  // Generic CRUD
  add: <K extends EntityKey>(key: K, item: DataStoreState[K][number]) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<DataStoreState[K][number]>) => void;
  remove: <K extends EntityKey>(key: K, id: string) => void;
  bulkAdd: <K extends EntityKey>(key: K, items: DataStoreState[K][number][]) => void;
  reset: () => void;
  // Helpers
  genId: (prefix: string) => string;
  generateInvoiceNumber: () => string;
}

const DataStoreContext = createContext<DataStoreValue | null>(null);

const STORAGE_KEY = "pharma.dataStore.v1";

function loadFromStorage(): DataStoreState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persist(state: DataStoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataStoreState>(SEED_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadFromStorage();
    if (loaded) {
      // Merge seed with stored so new keys get defaults
      setState({
        ...SEED_DATA,
        ...loaded,
      });
    }
    setReady(true);
  }, []);

  function mutate(next: DataStoreState) {
    setState(next);
    persist(next);
  }

  function genId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextInvoiceSeq;
    const next: DataStoreState = { ...state, nextInvoiceSeq: seq + 1 };
    mutate(next);
    return `INV-${year}-${String(seq).padStart(4, "0")}`;
  }

  function add<K extends EntityKey>(key: K, item: DataStoreState[K][number]) {
    // We use a narrow local type because TS can't prove the array union matches the single-element union.
    // The runtime is identical: just append.
    const list = state[key] as DataStoreState[K];
    const next: DataStoreState = {
      ...state,
      [key]: [...list, item],
    };
    mutate(next);
  }

  function bulkAdd<K extends EntityKey>(key: K, items: DataStoreState[K][number][]) {
    const list = state[key] as DataStoreState[K];
    const next: DataStoreState = {
      ...state,
      [key]: [...list, ...items],
    };
    mutate(next);
  }

  function update<K extends EntityKey>(key: K, id: string, patch: Partial<DataStoreState[K][number]>) {
    const list = state[key] as Array<{ id: string }>;
    const nextList = list.map((item) =>
      item.id === id ? ({ ...item, ...patch } as DataStoreState[K][number]) : (item as DataStoreState[K][number])
    );
    const next: DataStoreState = {
      ...state,
      [key]: nextList,
    };
    mutate(next);
  }

  function remove<K extends EntityKey>(key: K, id: string) {
    const list = state[key] as Array<{ id: string }>;
    const nextList = list.filter((item) => item.id !== id) as DataStoreState[K];
    const next: DataStoreState = {
      ...state,
      [key]: nextList,
    };
    mutate(next);
  }

  function reset() {
    mutate(SEED_DATA);
  }

  if (!ready) return <>{children}</>;

  return (
    <DataStoreContext.Provider
      value={{
        ...state,
        add,
        update,
        remove,
        bulkAdd,
        reset,
        genId,
        generateInvoiceNumber,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore(): DataStoreValue {
  const ctx = useContext(DataStoreContext);
  if (!ctx) {
    // Safe fallback: return seed data with no-op mutators so pages don't crash
    return {
      ...SEED_DATA,
      add: () => {},
      update: () => {},
      remove: () => {},
      bulkAdd: () => {},
      reset: () => {},
      genId: (p) => `${p}-stub`,
      generateInvoiceNumber: () => "INV-0000-0000",
    };
  }
  return ctx;
}

// ─── Scoping helpers ─────────────────────────────────────────────────────────

// Given a user role and their id, returns which business units they can see.
export function visibleBusinessUnits(
  bus: BusinessUnit[],
  role: UserRole,
  userId: string
): BusinessUnit[] {
  if (role === "ADMIN") return bus;
  if (role === "BUM") return bus.filter((b) => b.managerId === userId);
  return bus.filter((b) => b.memberIds.includes(userId));
}

// Filter doctors to those the current user may see.
// - MEDICAL_REP: only doctors assigned to them
// - DISTRICT_MANAGER: doctors assigned to their reps
// - MARKETEER/BUM: doctors in their BUs
// - ADMIN: all
export function scopeDoctors(
  allDoctors: Doctor[],
  allBUs: BusinessUnit[],
  role: UserRole,
  userId: string,
  repsUnderMe: string[] = []
): Doctor[] {
  if (role === "ADMIN") return allDoctors;
  if (role === "MEDICAL_REP") return allDoctors.filter((d) => d.assignedRepId === userId);
  if (role === "DISTRICT_MANAGER") {
    return allDoctors.filter(
      (d) => d.assignedRepId && (repsUnderMe.includes(d.assignedRepId) || d.assignedRepId === userId)
    );
  }
  // Marketeer / BUM → doctors in their BU's
  const myBUs = visibleBusinessUnits(allBUs, role, userId).map((b) => b.id);
  return allDoctors.filter((d) => d.buId && myBUs.includes(d.buId));
}

// Scope visits by user
export function scopeVisits(
  allVisits: Visit[],
  allBUs: BusinessUnit[],
  role: UserRole,
  userId: string,
  repsUnderMe: string[] = []
): Visit[] {
  if (role === "ADMIN") return allVisits;
  if (role === "MEDICAL_REP") return allVisits.filter((v) => v.repId === userId);
  if (role === "DISTRICT_MANAGER") {
    return allVisits.filter((v) => repsUnderMe.includes(v.repId) || v.partnerId === userId || v.repId === userId);
  }
  const myBUs = visibleBusinessUnits(allBUs, role, userId).map((b) => b.id);
  return allVisits.filter((v) => v.buId && myBUs.includes(v.buId));
}

// Scope tasks: "mine" = assigned to me OR assigned by me
export function scopeTasks(
  allTasks: Task[],
  role: UserRole,
  userId: string,
  mode: "assigned_to_me" | "assigned_by_me" | "mine" = "mine"
): Task[] {
  if (role === "ADMIN") return allTasks;
  if (mode === "assigned_to_me") return allTasks.filter((t) => t.assignedToId === userId);
  if (mode === "assigned_by_me") return allTasks.filter((t) => t.assignedById === userId);
  return allTasks.filter((t) => t.assignedToId === userId || t.assignedById === userId);
}

// Scope market requests: reps see their own; DMs see their reps'; marketeers see their BU's.
export function scopeMarketRequests(
  all: MarketRequest[],
  allBUs: BusinessUnit[],
  role: UserRole,
  userId: string,
  repsUnderMe: string[] = []
): MarketRequest[] {
  if (role === "ADMIN") return all;
  if (role === "MEDICAL_REP") return all.filter((r) => r.requestedById === userId);
  if (role === "DISTRICT_MANAGER") {
    return all.filter(
      (r) =>
        r.requestedById === userId ||
        repsUnderMe.includes(r.requestedById) ||
        r.approvedById === userId
    );
  }
  const myBUs = visibleBusinessUnits(allBUs, role, userId).map((b) => b.id);
  return all.filter((r) => r.buId && myBUs.includes(r.buId));
}

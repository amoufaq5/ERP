"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "./user-context";
import { IMS_TERRITORIES } from "./ims-territory-data";

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
  stockQty: number;
  reorderLevel: number;
  warehouse?: string;
  description?: string;
  manufacturer?: string;
  shelfLife?: string;
  storageCondition?: string;
  documents?: ProductDocument[];
}

export interface ProductDocument {
  id: string;
  name: string;
  type: string;
  data: string;
  uploadedAt: string;
}

export interface ConversionFormula {
  id: string;
  productId: string;
  name: string;
  batchSize: number;
  batchUnit: string;
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[];
  yieldPercent: number;
  instructions?: string;
  createdAt: string;
}

// ─── Bill of Materials (BOM) ─────────────────────────────────────────────────
export interface BOMLine {
  id: string;
  parentProductId: string;           // finished product or sub-assembly
  componentProductId: string;        // raw material or sub-assembly
  quantityRequired: number;
  unit: string;                      // kg, g, ml, units, etc.
  level: number;                     // 0 = top-level, 1 = sub-assembly child, etc.
  notes?: string;
}

export const LIFECYCLE_STAGES = [
  "Development",
  "Testing",
  "Approved",
  "Active",
  "Declining",
  "Discontinued",
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

export interface ProductLifecycle {
  id: string;
  productId: string;
  stage: LifecycleStage;
  enteredAt: string;                 // ISO date when entered this stage
  history: { stage: LifecycleStage; enteredAt: string; exitedAt?: string }[];
}

// ─── IMS Standard Specialties ────────────────────────────────────────────────
export const IMS_SPECIALTIES = [
  "General Practice", "Internal Medicine", "Cardiology", "Endocrinology",
  "Gastroenterology", "Pulmonology", "Nephrology", "Neurology",
  "Rheumatology", "Dermatology", "Pediatrics", "Obstetrics & Gynecology",
  "Orthopedics", "Urology", "Oncology", "Hematology",
  "Ophthalmology", "ENT", "Psychiatry", "Anesthesiology",
  "General Surgery", "Cardiothoracic Surgery", "Neurosurgery", "Plastic Surgery",
  "Emergency Medicine", "Family Medicine", "Geriatrics", "Infectious Disease",
  "Clinical Pathology", "Radiology", "Physical Medicine", "Dentistry",
] as const;

export type IMSSpecialty = typeof IMS_SPECIALTIES[number];

// ─── Buying Ladder (doctor adoption stage) ──────────────────────────────────
export const BUYING_LADDER_STAGES = [
  "Unaware",         // never heard of the product
  "Aware",           // knows of the product
  "Trial",           // prescribed once or twice
  "Regular",         // prescribes regularly
  "Champion",        // top prescriber / advocate
] as const;

export type BuyingLadderStage = typeof BUYING_LADDER_STAGES[number];

// ─── AM Account (hospitals, pharmacies, polyclinics, insurance) ─────────────
export type AMAccountType = "Hospital" | "Polyclinic" | "Pharmacy" | "Insurance Company";

export interface AMAccount {
  id: string;
  name: string;
  type: AMAccountType;
  address: string;
  city: string;
  phone: string;
  email?: string;
  lat: number;
  lng: number;
  brickId?: string | null;
  assignedRepId: string | null;
  buId?: string | null;
  contactPerson?: string;
  notes?: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: IMSSpecialty | string;
  hospital: string;
  city: string;
  phone: string;
  email?: string;
  classification: "A" | "B" | "C" | "D";
  potentialRevenue?: number;       // estimated monthly Rx value in EGP
  areaWeight?: number;             // 1-10 scale of importance in the area
  isKOL: boolean;                  // Key Opinion Leader / HOT list
  buyingLadderStage: BuyingLadderStage;
  assignedRepId: string | null;
  visitFrequency: number;          // required visits per month
  lastVisitAt?: string;
  notes?: string;
  createdAt: string;
  buId?: string | null;
  brickId?: string | null;
  lat?: number;
  lng?: number;
  linkedPharmacyIds: string[];     // 2-3 pharmacy AMAccounts this doctor prescribes to
  linkedAccountIds?: string[];     // hospital/polyclinic where doctor works
}

// ─── IMS-IQVIA Territory Hierarchy ──────────────────────────────────────────
export interface Territory {
  id: string;
  name: string;
  nameAr: string;
  level: "region" | "governorate" | "district" | "brick";
  parentId: string | null;
  imsCode: string;               // IMS-IQVIA code
  geoShare?: number;             // % GEO. SHARE (IMS market share)
  assignedRepIds: string[];       // medical reps assigned to this territory
  assignedBUIds: string[];        // business units active in this territory
}

// ─── Starting Points ────────────────────────────────────────────────────────
export type StartingPointType = "AM" | "PM" | "OFFICE";

export interface StartingPoint {
  id: string;
  userId: string;
  type: StartingPointType;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

// ─── Visit ──────────────────────────────────────────────────────────────────
export type VisitType = "SINGLE" | "DOUBLE";
export type VisitStatus = "LOGGED" | "APPROVED" | "REJECTED";

export interface SampleGiven {
  productId: string;
  quantity: number;
}

export interface ActivityRequest {
  id: string;
  type: RequestType;
  description: string;
  status: "PENDING" | "COMPLETED";
}

export interface Visit {
  id: string;
  repId: string;
  doctorId: string;
  amAccountId?: string;
  dateTime: string;
  type: VisitType;
  partnerId?: string;
  durationMin: number;
  productIds: string[];
  samplesGiven: SampleGiven[];
  samplesDistributed: number;
  buyingLadderBefore?: BuyingLadderStage;
  buyingLadderAfter?: BuyingLadderStage;
  activityRequests: ActivityRequest[];
  notes: string;
  feedback?: string;
  gpsVerified: boolean;
  lat?: number;
  lng?: number;
  status: VisitStatus;
  buId?: string | null;
  planId?: string;
  session: "AM" | "PM";
}

// ─── Weekly Plan & Daily Plan ───────────────────────────────────────────────
export type PlanStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type PlannedVisitCategory = "planned" | "unplanned" | "follow-up";
export type PlannedVisitOutcome = "successful" | "follow-up needed" | "no show" | "pending";

export interface PlannedVisit {
  doctorId?: string;
  amAccountId?: string;
  timeSlot: string;
  session: "AM" | "PM";
  visitType: VisitType;
  partnerId?: string;
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
  category?: PlannedVisitCategory;
  outcome?: PlannedVisitOutcome;
  shortDurationReason?: string;
}

export interface DailyPlan {
  date: string;
  startingPointAM?: string;
  startingPointPM?: string;
  visits: PlannedVisit[];
}

export type ApprovalAction = "SUBMITTED" | "APPROVED" | "REJECTED" | "ESCALATED" | "AUTO_ESCALATED";

export interface ApprovalEntry {
  id: string;
  action: ApprovalAction;
  performedBy: string;
  performedById: string;
  timestamp: string;
  comment?: string;
  level: number;
}

export interface WeeklyPlan {
  id: string;
  repId: string;
  weekStartDate: string;
  days: DailyPlan[];
  status: PlanStatus;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  approvalHistory?: ApprovalEntry[];
  approvalLevel?: number;
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

export interface CustomerDocument {
  id: string;
  name: string;
  type: string;
  data: string;
  uploadedAt: string;
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
  documents?: CustomerDocument[];
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
  partyId?: string;             // customer or vendor ID (for linked parties)
  partyType?: "CUSTOMER" | "VENDOR"; // type of linked party
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

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  subType: string;
  balance: number;
  parentId?: string;
  isActive: boolean;
}

export interface JournalEntryLine {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  costCenterId?: string;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  reference?: string;
  type: "GENERAL" | "ADJUSTING" | "CLOSING" | "OPENING" | "PARTNER" | "REVERSING" | "ACCRUAL";
  lines: JournalEntryLine[];
  status: "DRAFT" | "POSTED" | "VOID";
  createdBy: string;
  createdAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  type: "PRODUCTION" | "ADMINISTRATIVE" | "SELLING" | "R_AND_D" | "DISTRIBUTION";
  managerId?: string;
  budget: number;
  actualSpend: number;
  parentId?: string;
  isActive: boolean;
}

export interface Budget {
  id: string;
  name: string;
  fiscalYear: string;
  period: string;
  accountId?: string;
  costCenterId?: string;
  budgeted: number;
  actual: number;
  status: "DRAFT" | "APPROVED" | "CLOSED";
}

export interface PurchaseOrder {
  id: string;
  number: string;
  vendorId: string;
  date: string;
  expectedDate: string;
  items: { productId: string; description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: "DRAFT" | "APPROVED" | "ORDERED" | "RECEIVED" | "CANCELLED";
  grnId?: string;
  invoiceId?: string;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  date: string;
  expectedDate: string;
  items: { productId: string; description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: "DRAFT" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "INVOICED" | "CANCELLED";
  invoiceId?: string;
  dnId?: string;
  soApprovalId?: string;
  createdAt: string;
}

export interface RFQ {
  id: string;
  number: string;
  vendorId: string;
  date: string;
  validUntil: string;
  items: { description: string; quantity: number; unit: string }[];
  status: "DRAFT" | "SENT" | "RECEIVED" | "CONVERTED" | "CANCELLED";
  convertedPOId?: string;
  notes?: string;
  createdAt: string;
}

export interface GoodsReceipt {
  id: string;
  number: string;
  poId: string;
  vendorId: string;
  date: string;
  items: { productId: string; description: string; quantity: number; unitPrice: number }[];
  status: "PENDING" | "RECEIVED" | "INSPECTED" | "REJECTED";
  createdAt: string;
}

export interface DeliveryNote {
  id: string;
  number: string;
  soId: string;
  customerId: string;
  date: string;
  items: { productId: string; description: string; quantity: number }[];
  status: "PENDING" | "SHIPPED" | "DELIVERED";
  createdAt: string;
}

export interface Shipment {
  id: string;
  number: string;
  poId: string;
  vendorId: string;
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  expectedArrival: string;
  method: "Sea" | "Air" | "Land";
  cost: number;
  status: "IN_TRANSIT" | "DELIVERED" | "DELAYED";
  items: { productId: string; description: string; quantity: number; unitPrice: number }[];
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;        // e.g. "EMP-001"
  name: string;
  email: string;
  department: string;
  position: string;
  hireDate: string;
  salary: number;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED";
  manager: string;
  phone: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  applications: number;
  postedDate: string;
  closingDate: string;
  description: string;
  salaryRange: string;
  requirements: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  degree: string;
  currentCompany: string;
  appliedFor: string;
  experience: string;
  source: string;
  status: string;
  rating: number;
  appliedDate: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  manager: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  status: string;
  description: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: string;
  hours: number;
  status: string;
}

// ─── Store shape ─────────────────────────────────────────────────────────────

export interface DataStoreState {
  businessUnits: BusinessUnit[];
  products: Product[];
  doctors: Doctor[];
  territories: Territory[];
  amAccounts: AMAccount[];
  startingPoints: StartingPoint[];
  visits: Visit[];
  weeklyPlans: WeeklyPlan[];
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
  glAccounts: GLAccount[];
  journalEntries: JournalEntry[];
  costCenters: CostCenter[];
  budgets: Budget[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  rfqs: RFQ[];
  goodsReceipts: GoodsReceipt[];
  deliveryNotes: DeliveryNote[];
  shipments: Shipment[];
  employees: Employee[];
  jobs: Job[];
  candidates: Candidate[];
  projects: Project[];
  projectTasks: ProjectTask[];
  conversionFormulas: ConversionFormula[];
  bomLines: BOMLine[];
  productLifecycles: ProductLifecycle[];
  nextInvoiceSeq: number;
  nextJournalSeq: number;
  nextPOSeq: number;
  nextSOSeq: number;
  nextRFQSeq: number;
  nextGRNSeq: number;
  nextDNSeq: number;
  nextCustomerSeq: number;
  nextVendorSeq: number;
  nextProductSeq: number;
  nextBankSeq: number;
  nextCostCenterSeq: number;
  nextPaymentSeq: number;
  nextChequeSeq: number;
  nextShipmentSeq: number;
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
  { id: "p-cardio-1", code: "CV-001", name: "Cardioprex", strength: "500mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 48, therapeuticArea: "Hypertension", edaRegistration: "EDA/2024/1001", stockQty: 12000, reorderLevel: 3000, warehouse: "FG Warehouse-Cairo" },
  { id: "p-cardio-2", code: "CV-002", name: "Atorvastat", strength: "20mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 62, therapeuticArea: "Dyslipidemia", edaRegistration: "EDA/2024/1002", stockQty: 8500, reorderLevel: 2000, warehouse: "FG Warehouse-Cairo" },
  { id: "p-cardio-3", code: "CV-003", name: "Metoprolax", strength: "50mg", form: "Tablet", buId: "bu-cardio", pricePerUnit: 35, therapeuticArea: "Beta-blocker", edaRegistration: "EDA/2023/0892", stockQty: 15000, reorderLevel: 4000, warehouse: "FG Warehouse-Cairo" },
  { id: "p-diab-1", code: "DM-001", name: "Diabetex XR", strength: "1000mg", form: "Tablet", buId: "bu-diabetes", pricePerUnit: 95, therapeuticArea: "Type 2 Diabetes", edaRegistration: "EDA/2024/1101", stockQty: 6000, reorderLevel: 1500, warehouse: "FG Warehouse-Cairo" },
  { id: "p-diab-2", code: "DM-002", name: "Glargin-Long", strength: "100U/ml", form: "Injection", buId: "bu-diabetes", pricePerUnit: 420, therapeuticArea: "Insulin", edaRegistration: "EDA/2023/0774", stockQty: 2000, reorderLevel: 500, warehouse: "Cold Storage-Cairo" },
  { id: "p-prim-1", code: "PC-001", name: "Antibio-Z", strength: "1g", form: "Capsule", buId: "bu-primary", pricePerUnit: 28, therapeuticArea: "Antibiotic", edaRegistration: "EDA/2022/0550", stockQty: 20000, reorderLevel: 5000, warehouse: "FG Warehouse-Cairo" },
  { id: "p-prim-2", code: "PC-002", name: "Paraflu Junior", strength: "120mg/5ml", form: "Syrup", buId: "bu-primary", pricePerUnit: 22, therapeuticArea: "Pediatric", edaRegistration: "EDA/2023/0612", stockQty: 10000, reorderLevel: 2500, warehouse: "FG Warehouse-Cairo" },
  { id: "p-prim-3", code: "PC-003", name: "Nervocalm", strength: "10mg", form: "Tablet", buId: "bu-primary", pricePerUnit: 18, therapeuticArea: "Anxiolytic", edaRegistration: "EDA/2023/0713", stockQty: 18000, reorderLevel: 4000, warehouse: "FG Warehouse-Cairo" },
];

const SEED_TERRITORIES: Territory[] = IMS_TERRITORIES;

const SEED_AM_ACCOUNTS: AMAccount[] = [
  // ── Hospitals ──
  { id: "am-hosp-001", name: "Cleopatra Hospital", type: "Hospital", address: "El-Nozha, Heliopolis", city: "Cairo", phone: "+20 2 2514 4545", lat: 30.0912, lng: 31.3425, assignedRepId: "u-rep-1", buId: "bu-cardio", contactPerson: "Dr. Hany Aziz", status: "Active", createdAt: daysAgo(365) },
  { id: "am-hosp-002", name: "Dar Al Fouad Hospital", type: "Hospital", address: "26th July Corridor, 6th October", city: "Giza", phone: "+20 2 3835 4000", lat: 30.0210, lng: 31.0135, assignedRepId: "u-rep-1", buId: "bu-diabetes", contactPerson: "Dr. Sameh Rizk", status: "Active", createdAt: daysAgo(300) },
  { id: "am-hosp-003", name: "As-Salam International Hospital", type: "Hospital", address: "Corniche El Nil, Maadi", city: "Cairo", phone: "+20 2 2524 0250", lat: 29.9672, lng: 31.2390, assignedRepId: "u-rep-1", buId: "bu-primary", contactPerson: "Dr. Nadia Kamel", status: "Active", createdAt: daysAgo(280) },
  { id: "am-hosp-004", name: "Ain Shams University Hospital", type: "Hospital", address: "Ramsis St, Abbassia", city: "Cairo", phone: "+20 2 2685 6128", lat: 30.0761, lng: 31.2832, assignedRepId: "u-rep-1", buId: "bu-cardio", contactPerson: "Prof. Ashraf Nour", status: "Active", createdAt: daysAgo(400) },
  // ── Polyclinics ──
  { id: "am-poly-001", name: "Heliopolis Medical Center", type: "Polyclinic", address: "El-Hegaz St, Heliopolis", city: "Cairo", phone: "+20 2 2290 3344", lat: 30.0889, lng: 31.3312, assignedRepId: "u-rep-1", buId: "bu-primary", contactPerson: "Dr. Fady Youssef", status: "Active", createdAt: daysAgo(200) },
  { id: "am-poly-002", name: "Nasr City Specialist Clinic", type: "Polyclinic", address: "Mostafa El-Nahhas St", city: "Cairo", phone: "+20 2 2271 5566", lat: 30.0550, lng: 31.3450, assignedRepId: "u-rep-1", buId: "bu-cardio", contactPerson: "Dr. Rana Ismail", status: "Active", createdAt: daysAgo(180) },
  { id: "am-poly-003", name: "Dokki Medical Hub", type: "Polyclinic", address: "Tahrir St, Dokki", city: "Giza", phone: "+20 2 3762 1100", lat: 30.0380, lng: 31.2089, assignedRepId: "u-rep-1", buId: "bu-diabetes", contactPerson: "Dr. Wael Abbas", status: "Active", createdAt: daysAgo(160) },
  // ── Pharmacies ──
  { id: "am-ph-001", name: "El-Ezaby Pharmacy - Heliopolis", type: "Pharmacy", address: "El-Merghany St, Heliopolis", city: "Cairo", phone: "+20 2 2418 0880", lat: 30.0855, lng: 31.3255, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Tamer Said", status: "Active", createdAt: daysAgo(500) },
  { id: "am-ph-002", name: "Seif Pharmacy - Nasr City", type: "Pharmacy", address: "Abbas El-Akkad St", city: "Cairo", phone: "+20 2 2274 1122", lat: 30.0630, lng: 31.3400, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Mariam Fouad", status: "Active", createdAt: daysAgo(480) },
  { id: "am-ph-003", name: "Roshdy Pharmacy", type: "Pharmacy", address: "Nozha St, Heliopolis", city: "Cairo", phone: "+20 2 2638 0055", lat: 30.0920, lng: 31.3480, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Ahmed Roshdy", status: "Active", createdAt: daysAgo(450) },
  { id: "am-ph-004", name: "El-Ezaby Pharmacy - Dokki", type: "Pharmacy", address: "Dokki Square", city: "Giza", phone: "+20 2 3748 2200", lat: 30.0385, lng: 31.2100, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Noha Khalil", status: "Active", createdAt: daysAgo(420) },
  { id: "am-ph-005", name: "Misr Pharmacy - Mohandessin", type: "Pharmacy", address: "Gameat El-Dowal St", city: "Giza", phone: "+20 2 3749 5500", lat: 30.0505, lng: 31.2010, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Hassan Adly", status: "Active", createdAt: daysAgo(400) },
  { id: "am-ph-006", name: "Care Pharmacy - Korba", type: "Pharmacy", address: "Baghdad St, Korba", city: "Cairo", phone: "+20 2 2415 7700", lat: 30.0870, lng: 31.3110, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Dina Samir", status: "Active", createdAt: daysAgo(350) },
  { id: "am-ph-007", name: "Seif Pharmacy - Maadi", type: "Pharmacy", address: "Road 9, Maadi", city: "Cairo", phone: "+20 2 2359 0088", lat: 29.9600, lng: 31.2555, assignedRepId: "u-rep-1", buId: null, contactPerson: "Pharm. Sherif Nabil", status: "Active", createdAt: daysAgo(380) },
  { id: "am-ph-008", name: "Al-Amal Pharmacy - Maadi", type: "Pharmacy", address: "Laselky St, Maadi", city: "Cairo", phone: "+20 2 2380 1122", lat: 29.9580, lng: 31.2540, assignedRepId: null, buId: null, contactPerson: "Pharm. Mona Adel", status: "Active", createdAt: daysAgo(300) },
  // ── Insurance Companies ──
  { id: "am-ins-001", name: "MetLife Egypt", type: "Insurance Company", address: "Nile City Towers, Corniche", city: "Cairo", phone: "+20 2 2461 9999", lat: 30.0659, lng: 31.2272, assignedRepId: null, buId: null, contactPerson: "Mr. Ehab Fathy", status: "Active", createdAt: daysAgo(500) },
  { id: "am-ins-002", name: "AXA Egypt", type: "Insurance Company", address: "Smart Village, 6th October", city: "Giza", phone: "+20 2 3537 4000", lat: 30.0718, lng: 31.0190, assignedRepId: null, buId: null, contactPerson: "Ms. Heba Mounir", status: "Active", createdAt: daysAgo(450) },
];

const SEED_STARTING_POINTS: StartingPoint[] = [
  { id: "sp-001", userId: "u-rep-1", type: "AM", label: "Home (Nasr City)", address: "Nasr City, Cairo", lat: 30.0511, lng: 31.3656 },
  { id: "sp-002", userId: "u-rep-1", type: "PM", label: "Heliopolis Hub", address: "El-Merghany St, Heliopolis", lat: 30.0876, lng: 31.3277 },
  { id: "sp-003", userId: "u-dm-1", type: "AM", label: "Office - Downtown", address: "Talaat Harb St, Downtown Cairo", lat: 30.0444, lng: 31.2357 },
  { id: "sp-004", userId: "u-dm-1", type: "PM", label: "Home (Maadi)", address: "Road 233, Maadi", lat: 29.9614, lng: 31.2578 },
  { id: "sp-005", userId: "u-dm-1", type: "OFFICE", label: "Cairo HQ", address: "Smart Village, 6th October", lat: 30.0718, lng: 31.0190 },
];

const SEED_WEEKLY_PLANS: WeeklyPlan[] = [
  {
    id: "wp-001", repId: "u-rep-1", weekStartDate: daysAgo(7),
    days: [
      { date: daysAgo(7), startingPointAM: "sp-001", startingPointPM: "sp-002", visits: [
        { amAccountId: "am-hosp-001", timeSlot: "09:00", session: "AM", visitType: "SINGLE", checkInTime: "09:02", checkOutTime: "09:30", category: "planned", outcome: "successful" },
        { amAccountId: "am-poly-001", timeSlot: "10:30", session: "AM", visitType: "SINGLE", checkInTime: "10:35", checkOutTime: "11:10", category: "planned", outcome: "successful" },
        { doctorId: "dr-001", timeSlot: "14:00", session: "PM", visitType: "SINGLE", checkInTime: "14:05", checkOutTime: "14:32", category: "planned", outcome: "successful" },
        { doctorId: "dr-003", timeSlot: "15:30", session: "PM", visitType: "SINGLE", checkInTime: "15:33", checkOutTime: "15:40", category: "follow-up", outcome: "follow-up needed" },
      ]},
      { date: daysAgo(6), startingPointAM: "sp-001", startingPointPM: "sp-002", visits: [
        { amAccountId: "am-hosp-004", timeSlot: "09:00", session: "AM", visitType: "SINGLE", checkInTime: "09:10", checkOutTime: "09:45", category: "planned", outcome: "successful" },
        { doctorId: "dr-005", timeSlot: "14:00", session: "PM", visitType: "SINGLE", checkInTime: "14:00", checkOutTime: "14:22", category: "planned", outcome: "successful" },
        { doctorId: "dr-004", timeSlot: "15:30", session: "PM", visitType: "SINGLE", checkInTime: "15:28", checkOutTime: "15:55", category: "unplanned", outcome: "successful" },
      ]},
      { date: daysAgo(5), startingPointAM: "sp-001", startingPointPM: "sp-002", visits: [
        { amAccountId: "am-hosp-002", timeSlot: "09:00", session: "AM", visitType: "DOUBLE", partnerId: "u-dm-1", checkInTime: "09:00", checkOutTime: "09:48", category: "planned", outcome: "successful" },
        { doctorId: "dr-002", timeSlot: "14:00", session: "PM", visitType: "DOUBLE", partnerId: "u-dm-1", checkInTime: "14:05", checkOutTime: "14:42", category: "planned", outcome: "follow-up needed" },
      ]},
      { date: daysAgo(4), startingPointAM: "sp-001", startingPointPM: "sp-002", visits: [
        { amAccountId: "am-hosp-001", timeSlot: "09:30", session: "AM", visitType: "SINGLE", checkInTime: "09:32", checkOutTime: "10:05", category: "follow-up", outcome: "successful" },
        { doctorId: "dr-001", timeSlot: "14:00", session: "PM", visitType: "SINGLE", category: "planned", outcome: "no show" },
        { doctorId: "dr-005", timeSlot: "15:00", session: "PM", visitType: "SINGLE", checkInTime: "15:05", checkOutTime: "15:12", category: "unplanned", outcome: "follow-up needed" },
      ]},
      { date: daysAgo(3), startingPointAM: "sp-001", startingPointPM: "sp-002", visits: [
        { amAccountId: "am-poly-001", timeSlot: "09:00", session: "AM", visitType: "SINGLE", checkInTime: "09:05", checkOutTime: "09:35", category: "planned", outcome: "successful" },
        { doctorId: "dr-003", timeSlot: "14:00", session: "PM", visitType: "SINGLE", checkInTime: "14:02", checkOutTime: "14:28", category: "planned", outcome: "successful" },
        { doctorId: "dr-004", timeSlot: "15:30", session: "PM", visitType: "SINGLE", checkInTime: "15:35", checkOutTime: "16:00", category: "follow-up", outcome: "successful" },
      ]},
    ],
    status: "APPROVED", submittedAt: daysAgo(10), approvedById: "u-dm-1", approvedAt: daysAgo(9), createdAt: daysAgo(10),
  },
];

const SEED_DOCTORS: Doctor[] = [
  { id: "dr-001", name: "Dr. Ahmed El-Gamal", specialty: "Cardiology", hospital: "Cleopatra Hospital", city: "Cairo", phone: "+20 100 111 2233", classification: "A", potentialRevenue: 85000, areaWeight: 9, isKOL: true, buyingLadderStage: "Champion", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(3), createdAt: daysAgo(180), buId: "bu-cardio", brickId: "brk-1", lat: 30.0912, lng: 31.3425, linkedPharmacyIds: ["am-ph-001", "am-ph-002", "am-ph-003"] },
  { id: "dr-002", name: "Dr. Salma Ibrahim", specialty: "Endocrinology", hospital: "Dar Al Fouad", city: "Giza", phone: "+20 100 222 3344", classification: "A", potentialRevenue: 72000, areaWeight: 8, isKOL: true, buyingLadderStage: "Regular", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(5), createdAt: daysAgo(200), buId: "bu-diabetes", brickId: "brk-39", lat: 30.0380, lng: 31.2089, linkedPharmacyIds: ["am-ph-004", "am-ph-005"] },
  { id: "dr-003", name: "Dr. Mahmoud Adel", specialty: "General Practice", hospital: "Private Clinic", city: "Cairo", phone: "+20 100 333 4455", classification: "B", potentialRevenue: 35000, areaWeight: 5, isKOL: false, buyingLadderStage: "Trial", assignedRepId: "u-rep-1", visitFrequency: 2, lastVisitAt: daysAgo(10), createdAt: daysAgo(150), buId: "bu-primary", brickId: "brk-2", lat: 30.0876, lng: 31.3277, linkedPharmacyIds: ["am-ph-001", "am-ph-006"] },
  { id: "dr-004", name: "Dr. Rania Farouk", specialty: "Pediatrics", hospital: "As-Salam Hospital", city: "Cairo", phone: "+20 100 444 5566", classification: "A", potentialRevenue: 62000, areaWeight: 7, isKOL: false, buyingLadderStage: "Regular", assignedRepId: "u-rep-1", visitFrequency: 4, lastVisitAt: daysAgo(2), createdAt: daysAgo(190), buId: "bu-primary", brickId: "brk-7", lat: 30.0626, lng: 31.3410, linkedPharmacyIds: ["am-ph-007", "am-ph-002"] },
  { id: "dr-005", name: "Dr. Khaled Samy", specialty: "Internal Medicine", hospital: "Ain Shams University", city: "Cairo", phone: "+20 100 555 6677", classification: "B", potentialRevenue: 40000, areaWeight: 6, isKOL: false, buyingLadderStage: "Aware", assignedRepId: "u-rep-1", visitFrequency: 2, lastVisitAt: daysAgo(14), createdAt: daysAgo(120), buId: "bu-cardio", brickId: "brk-8", lat: 30.0761, lng: 31.2832, linkedPharmacyIds: ["am-ph-007", "am-ph-003"] },
  { id: "dr-006", name: "Dr. Youssef Hamdi", specialty: "Cardiology", hospital: "Nasser Institute", city: "Cairo", phone: "+20 100 666 7788", classification: "B", potentialRevenue: 45000, areaWeight: 6, isKOL: true, buyingLadderStage: "Regular", assignedRepId: null, visitFrequency: 2, createdAt: daysAgo(90), buId: "bu-cardio", brickId: "brk-3", lat: 30.0872, lng: 31.3040, linkedPharmacyIds: ["am-ph-001", "am-ph-006"] },
  { id: "dr-007", name: "Dr. Maha Gabr", specialty: "Endocrinology", hospital: "Maadi Military Hospital", city: "Cairo", phone: "+20 100 777 8899", classification: "C", potentialRevenue: 18000, areaWeight: 3, isKOL: false, buyingLadderStage: "Unaware", assignedRepId: null, visitFrequency: 1, createdAt: daysAgo(60), buId: "bu-diabetes", brickId: "brk-34", lat: 29.9614, lng: 31.2578, linkedPharmacyIds: ["am-ph-008"] },
  { id: "dr-008", name: "Dr. Tarek Shaker", specialty: "General Practice", hospital: "Family Clinic", city: "Giza", phone: "+20 100 888 9900", classification: "C", potentialRevenue: 15000, areaWeight: 3, isKOL: false, buyingLadderStage: "Aware", assignedRepId: null, visitFrequency: 1, createdAt: daysAgo(45), buId: "bu-primary", brickId: "brk-40", lat: 30.0444, lng: 31.2119, linkedPharmacyIds: ["am-ph-004", "am-ph-005"] },
];

const SEED_VISITS: Visit[] = [
  { id: "v-001", repId: "u-rep-1", doctorId: "dr-001", dateTime: daysAgo(3), type: "SINGLE", durationMin: 25, productIds: ["p-cardio-1", "p-cardio-2"], samplesGiven: [{ productId: "p-cardio-1", quantity: 3 }, { productId: "p-cardio-2", quantity: 1 }], samplesDistributed: 4, buyingLadderBefore: "Regular", buyingLadderAfter: "Champion", activityRequests: [], notes: "Good reception. Asked about cardio bundle.", gpsVerified: true, lat: 30.0988, lng: 31.3413, status: "APPROVED", buId: "bu-cardio", session: "PM" },
  { id: "v-002", repId: "u-rep-1", doctorId: "dr-002", dateTime: daysAgo(5), type: "DOUBLE", partnerId: "u-dm-1", durationMin: 40, productIds: ["p-diab-1", "p-diab-2"], samplesGiven: [{ productId: "p-diab-1", quantity: 4 }, { productId: "p-diab-2", quantity: 2 }], samplesDistributed: 6, buyingLadderBefore: "Trial", buyingLadderAfter: "Regular", activityRequests: [{ id: "ar-001", type: "LITERATURE", description: "Clinical studies for Diabetex XR", status: "COMPLETED" }], notes: "Joint visit with DM. Prescribed Diabetex for 3 patients.", gpsVerified: true, lat: 29.9627, lng: 30.9373, status: "APPROVED", buId: "bu-diabetes", session: "PM" },
  { id: "v-003", repId: "u-rep-1", doctorId: "dr-004", dateTime: daysAgo(2), type: "SINGLE", durationMin: 20, productIds: ["p-prim-2"], samplesGiven: [{ productId: "p-prim-2", quantity: 8 }], samplesDistributed: 8, buyingLadderBefore: "Regular", buyingLadderAfter: "Regular", activityRequests: [{ id: "ar-002", type: "SAMPLE", description: "Need more Paraflu Junior samples", status: "PENDING" }], notes: "New pediatric patient intake is high.", gpsVerified: true, lat: 30.0444, lng: 31.2357, status: "APPROVED", buId: "bu-primary", session: "PM" },
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
  // Existing KPIs
  { id: "kpi-001", userId: "u-rep-1", period: "2026-04", metric: "Visits", target: 160, actual: 94, setBy: "u-dm-1" },
  { id: "kpi-002", userId: "u-rep-1", period: "2026-04", metric: "Coverage %", target: 90, actual: 87, setBy: "u-dm-1" },
  { id: "kpi-003", userId: "u-dm-1", period: "2026-04", metric: "District achievement %", target: 105, actual: 103, setBy: "u-mkt-1" },
  // Additional KPIs for rep-1 (current month May 2026)
  { id: "kpi-004", userId: "u-rep-1", period: "2026-05", metric: "Visits", target: 160, actual: 42, setBy: "u-dm-1" },
  { id: "kpi-005", userId: "u-rep-1", period: "2026-05", metric: "Coverage %", target: 90, actual: 78, setBy: "u-dm-1" },
  { id: "kpi-006", userId: "u-rep-1", period: "2026-05", metric: "Call Rate", target: 85, actual: 82, setBy: "u-dm-1" },
  { id: "kpi-007", userId: "u-rep-1", period: "2026-05", metric: "New Doctor Listings", target: 5, actual: 3, setBy: "u-dm-1" },
  { id: "kpi-008", userId: "u-rep-1", period: "2026-05", metric: "Samples Distributed", target: 200, actual: 145, setBy: "u-dm-1" },
  { id: "kpi-009", userId: "u-rep-1", period: "2026-05", metric: "Revenue per Visit", target: 5500, actual: 5200, setBy: "u-dm-1" },
  { id: "kpi-010", userId: "u-rep-1", period: "2026-05", metric: "Customer Retention Rate", target: 92, actual: 89, setBy: "u-dm-1" },
  { id: "kpi-011", userId: "u-rep-1", period: "2026-05", metric: "New Account Acquisition", target: 8, actual: 6, setBy: "u-dm-1" },
  { id: "kpi-012", userId: "u-rep-1", period: "2026-05", metric: "Market Share %", target: 18, actual: 16, setBy: "u-dm-1" },
  // DM-1 KPIs (current month)
  { id: "kpi-013", userId: "u-dm-1", period: "2026-05", metric: "District achievement %", target: 105, actual: 98, setBy: "u-mkt-1" },
  { id: "kpi-014", userId: "u-dm-1", period: "2026-05", metric: "Plan Completion %", target: 95, actual: 91, setBy: "u-mkt-1" },
  { id: "kpi-015", userId: "u-dm-1", period: "2026-05", metric: "Coverage %", target: 92, actual: 88, setBy: "u-mkt-1" },
  { id: "kpi-016", userId: "u-dm-1", period: "2026-05", metric: "Revenue per Visit", target: 6200, actual: 6500, setBy: "u-mkt-1" },
  { id: "kpi-017", userId: "u-dm-1", period: "2026-05", metric: "Customer Retention Rate", target: 94, actual: 95, setBy: "u-mkt-1" },
  { id: "kpi-018", userId: "u-dm-1", period: "2026-05", metric: "New Account Acquisition", target: 12, actual: 14, setBy: "u-mkt-1" },
  { id: "kpi-019", userId: "u-dm-1", period: "2026-05", metric: "Market Share %", target: 22, actual: 21, setBy: "u-mkt-1" },
  // Marketeer KPIs (current month)
  { id: "kpi-020", userId: "u-mkt-1", period: "2026-05", metric: "Market Requests Completed", target: 25, actual: 22, setBy: "u-bum" },
  { id: "kpi-021", userId: "u-mkt-1", period: "2026-05", metric: "Coverage %", target: 88, actual: 90, setBy: "u-bum" },
  { id: "kpi-022", userId: "u-mkt-1", period: "2026-05", metric: "Revenue per Visit", target: 7000, actual: 7200, setBy: "u-bum" },
  { id: "kpi-023", userId: "u-mkt-1", period: "2026-05", metric: "Customer Retention Rate", target: 90, actual: 92, setBy: "u-bum" },
  { id: "kpi-024", userId: "u-mkt-1", period: "2026-05", metric: "Market Share %", target: 25, actual: 24, setBy: "u-bum" },
  // Historical data for sparklines (prior months for rep-1)
  { id: "kpi-h01", userId: "u-rep-1", period: "2026-01", metric: "Visits", target: 160, actual: 148, setBy: "u-dm-1" },
  { id: "kpi-h02", userId: "u-rep-1", period: "2026-02", metric: "Visits", target: 160, actual: 155, setBy: "u-dm-1" },
  { id: "kpi-h03", userId: "u-rep-1", period: "2026-03", metric: "Visits", target: 160, actual: 162, setBy: "u-dm-1" },
  { id: "kpi-h04", userId: "u-rep-1", period: "2026-01", metric: "Coverage %", target: 90, actual: 82, setBy: "u-dm-1" },
  { id: "kpi-h05", userId: "u-rep-1", period: "2026-02", metric: "Coverage %", target: 90, actual: 84, setBy: "u-dm-1" },
  { id: "kpi-h06", userId: "u-rep-1", period: "2026-03", metric: "Coverage %", target: 90, actual: 86, setBy: "u-dm-1" },
  { id: "kpi-h07", userId: "u-dm-1", period: "2026-01", metric: "District achievement %", target: 105, actual: 95, setBy: "u-mkt-1" },
  { id: "kpi-h08", userId: "u-dm-1", period: "2026-02", metric: "District achievement %", target: 105, actual: 100, setBy: "u-mkt-1" },
  { id: "kpi-h09", userId: "u-dm-1", period: "2026-03", metric: "District achievement %", target: 105, actual: 102, setBy: "u-mkt-1" },
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

const SEED_GL_ACCOUNTS: GLAccount[] = [
  { id: "gl-1000", code: "1000", name: "Cash & Bank", type: "ASSET", subType: "Current Asset", balance: 19705000, isActive: true },
  { id: "gl-1100", code: "1100", name: "Accounts Receivable", type: "ASSET", subType: "Current Asset", balance: 9110000, isActive: true },
  { id: "gl-1200", code: "1200", name: "Inventory — Raw Materials", type: "ASSET", subType: "Current Asset", balance: 4850000, isActive: true },
  { id: "gl-1300", code: "1300", name: "Inventory — Finished Goods", type: "ASSET", subType: "Current Asset", balance: 6200000, isActive: true },
  { id: "gl-1400", code: "1400", name: "Prepaid Expenses", type: "ASSET", subType: "Current Asset", balance: 320000, isActive: true },
  { id: "gl-1500", code: "1500", name: "Fixed Assets — Equipment", type: "ASSET", subType: "Fixed Asset", balance: 12800000, isActive: true },
  { id: "gl-1600", code: "1600", name: "Accumulated Depreciation", type: "ASSET", subType: "Contra Asset", balance: -3200000, isActive: true },
  { id: "gl-2000", code: "2000", name: "Accounts Payable", type: "LIABILITY", subType: "Current Liability", balance: 2747000, isActive: true },
  { id: "gl-2100", code: "2100", name: "Accrued Expenses", type: "LIABILITY", subType: "Current Liability", balance: 680000, isActive: true },
  { id: "gl-2200", code: "2200", name: "Tax Payable — VAT", type: "LIABILITY", subType: "Current Liability", balance: 410000, isActive: true },
  { id: "gl-2300", code: "2300", name: "Short-term Loans", type: "LIABILITY", subType: "Current Liability", balance: 5000000, isActive: true },
  { id: "gl-2500", code: "2500", name: "Long-term Debt", type: "LIABILITY", subType: "Long-term Liability", balance: 8000000, isActive: true },
  { id: "gl-3000", code: "3000", name: "Share Capital", type: "EQUITY", subType: "Paid-in Capital", balance: 20000000, isActive: true },
  { id: "gl-3100", code: "3100", name: "Retained Earnings", type: "EQUITY", subType: "Retained Earnings", balance: 5480000, isActive: true },
  { id: "gl-4000", code: "4000", name: "Product Sales Revenue", type: "REVENUE", subType: "Operating Revenue", balance: 18500000, isActive: true },
  { id: "gl-4100", code: "4100", name: "Service Revenue", type: "REVENUE", subType: "Operating Revenue", balance: 1200000, isActive: true },
  { id: "gl-4200", code: "4200", name: "Other Income", type: "REVENUE", subType: "Non-operating", balance: 350000, isActive: true },
  { id: "gl-5000", code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", subType: "COGS", balance: 11200000, isActive: true },
  { id: "gl-5100", code: "5100", name: "Direct Labor", type: "EXPENSE", subType: "COGS", balance: 3400000, isActive: true },
  { id: "gl-5200", code: "5200", name: "Manufacturing Overhead", type: "EXPENSE", subType: "COGS", balance: 1850000, isActive: true },
  { id: "gl-6000", code: "6000", name: "Salaries & Wages", type: "EXPENSE", subType: "Operating Expense", balance: 4200000, isActive: true },
  { id: "gl-6100", code: "6100", name: "Rent & Utilities", type: "EXPENSE", subType: "Operating Expense", balance: 960000, isActive: true },
  { id: "gl-6200", code: "6200", name: "Marketing & Promotion", type: "EXPENSE", subType: "Operating Expense", balance: 1450000, isActive: true },
  { id: "gl-6300", code: "6300", name: "Depreciation Expense", type: "EXPENSE", subType: "Operating Expense", balance: 800000, isActive: true },
  { id: "gl-6400", code: "6400", name: "R&D Expenses", type: "EXPENSE", subType: "Operating Expense", balance: 620000, isActive: true },
  { id: "gl-6500", code: "6500", name: "Travel & Field Expenses", type: "EXPENSE", subType: "Operating Expense", balance: 380000, isActive: true },
  { id: "gl-7000", code: "7000", name: "Interest Expense", type: "EXPENSE", subType: "Non-operating", balance: 520000, isActive: true },
];

const SEED_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "je-001", number: "JE-2026-0001", date: daysAgo(25), description: "Record monthly product sales revenue",
    reference: "INV-2026-0001", type: "GENERAL", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(25),
    lines: [
      { accountId: "gl-1100", description: "AR — El-Ezaby Pharmacies", debit: 969000, credit: 0 },
      { accountId: "gl-4000", description: "Product sales revenue", debit: 0, credit: 850000 },
      { accountId: "gl-2200", description: "VAT on sales", debit: 0, credit: 119000 },
    ],
  },
  {
    id: "je-002", number: "JE-2026-0002", date: daysAgo(20), description: "Raw material purchase — Sun Pharma API",
    reference: "PO-4001", type: "GENERAL", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(20),
    lines: [
      { accountId: "gl-1200", description: "RM inventory — Amoxicillin API", debit: 1420000, credit: 0, costCenterId: "cc-prod" },
      { accountId: "gl-2000", description: "AP — Sun Pharma", debit: 0, credit: 1420000 },
    ],
  },
  {
    id: "je-003", number: "JE-2026-0003", date: daysAgo(15), description: "Payment received from Seif Pharmacies",
    reference: "PAY-2026-0004", type: "GENERAL", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(15),
    lines: [
      { accountId: "gl-1000", description: "Bank — NBE Collections", debit: 300000, credit: 0 },
      { accountId: "gl-1100", description: "AR — Seif Pharmacies", debit: 0, credit: 300000 },
    ],
  },
  {
    id: "je-004", number: "JE-2026-0004", date: daysAgo(10), description: "Monthly payroll accrual — April 2026",
    type: "ADJUSTING", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(10),
    lines: [
      { accountId: "gl-6000", description: "Salaries expense", debit: 350000, credit: 0, costCenterId: "cc-admin" },
      { accountId: "gl-5100", description: "Direct labor — production", debit: 280000, credit: 0, costCenterId: "cc-prod" },
      { accountId: "gl-2100", description: "Accrued salaries", debit: 0, credit: 630000 },
    ],
  },
  {
    id: "je-005", number: "JE-2026-0005", date: daysAgo(8), description: "Depreciation — manufacturing equipment",
    type: "ADJUSTING", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(8),
    lines: [
      { accountId: "gl-6300", description: "Depreciation expense", debit: 66667, credit: 0, costCenterId: "cc-prod" },
      { accountId: "gl-1600", description: "Accumulated depreciation", debit: 0, credit: 66667 },
    ],
  },
  {
    id: "je-006", number: "JE-2026-0006", date: daysAgo(5), description: "BASF vendor payment — excipients",
    reference: "PAY-2026-0003", type: "GENERAL", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(5),
    lines: [
      { accountId: "gl-2000", description: "AP — BASF Pharma", debit: 620000, credit: 0 },
      { accountId: "gl-1000", description: "Bank — CIB Main", debit: 0, credit: 620000 },
    ],
  },
  {
    id: "je-007", number: "JE-2026-0007", date: daysAgo(3), description: "Marketing campaign — Q2 field promotion",
    type: "GENERAL", status: "POSTED", createdBy: "u-admin", createdAt: daysAgo(3),
    lines: [
      { accountId: "gl-6200", description: "Marketing spend — field events", debit: 125000, credit: 0, costCenterId: "cc-sell" },
      { accountId: "gl-1000", description: "Bank — CIB Main", debit: 0, credit: 125000 },
    ],
  },
  {
    id: "je-008", number: "JE-2026-0008", date: daysAgo(1), description: "Partner journal — intercompany allocation",
    type: "PARTNER", status: "DRAFT", createdBy: "u-admin", createdAt: daysAgo(1),
    lines: [
      { accountId: "gl-6100", description: "Shared facility rent", debit: 80000, credit: 0, costCenterId: "cc-admin" },
      { accountId: "gl-6100", description: "Lab rent allocation", debit: 40000, credit: 0, costCenterId: "cc-rnd" },
      { accountId: "gl-1000", description: "Bank — BM Payroll", debit: 0, credit: 120000 },
    ],
  },
];

const SEED_COST_CENTERS: CostCenter[] = [
  { id: "cc-prod", code: "CC-100", name: "Production", type: "PRODUCTION", budget: 8500000, actualSpend: 7250000, isActive: true },
  { id: "cc-admin", code: "CC-200", name: "Administration", type: "ADMINISTRATIVE", budget: 2800000, actualSpend: 2340000, isActive: true },
  { id: "cc-sell", code: "CC-300", name: "Sales & Marketing", type: "SELLING", budget: 3200000, actualSpend: 2830000, isActive: true },
  { id: "cc-rnd", code: "CC-400", name: "Research & Development", type: "R_AND_D", budget: 1500000, actualSpend: 620000, isActive: true },
  { id: "cc-dist", code: "CC-500", name: "Distribution & Logistics", type: "DISTRIBUTION", budget: 1200000, actualSpend: 980000, isActive: true },
  { id: "cc-qa", code: "CC-600", name: "Quality Assurance", type: "PRODUCTION", budget: 800000, actualSpend: 540000, isActive: true, parentId: "cc-prod" },
];

const SEED_BUDGETS: Budget[] = [
  { id: "bud-001", name: "Production Budget Q1", fiscalYear: "2026", period: "Q1", costCenterId: "cc-prod", budgeted: 2125000, actual: 1980000, status: "CLOSED" },
  { id: "bud-002", name: "Production Budget Q2", fiscalYear: "2026", period: "Q2", costCenterId: "cc-prod", budgeted: 2125000, actual: 1420000, status: "APPROVED" },
  { id: "bud-003", name: "Admin Budget Q2", fiscalYear: "2026", period: "Q2", costCenterId: "cc-admin", budgeted: 700000, actual: 520000, status: "APPROVED" },
  { id: "bud-004", name: "Sales & Marketing Q2", fiscalYear: "2026", period: "Q2", costCenterId: "cc-sell", budgeted: 800000, actual: 640000, status: "APPROVED" },
  { id: "bud-005", name: "R&D Budget FY2026", fiscalYear: "2026", period: "Annual", costCenterId: "cc-rnd", budgeted: 1500000, actual: 620000, status: "APPROVED" },
  { id: "bud-006", name: "COGS Budget Q2", fiscalYear: "2026", period: "Q2", accountId: "gl-5000", budgeted: 2800000, actual: 2150000, status: "APPROVED" },
  { id: "bud-007", name: "Revenue Target Q2", fiscalYear: "2026", period: "Q2", accountId: "gl-4000", budgeted: 5000000, actual: 3800000, status: "APPROVED" },
  { id: "bud-008", name: "Distribution Q2", fiscalYear: "2026", period: "Q2", costCenterId: "cc-dist", budgeted: 300000, actual: 245000, status: "APPROVED" },
];

const SEED_EMPLOYEES: Employee[] = [
  { id: "emp-1", employeeId: "EMP-001", name: "John Smith", email: "john.smith@company.com", phone: "(555) 100-1001", department: "Engineering", position: "Senior Developer", hireDate: "2022-03-15", salary: 95000, status: "ACTIVE", manager: "David Martinez" },
  { id: "emp-2", employeeId: "EMP-002", name: "Sarah Johnson", email: "sarah.j@company.com", phone: "(555) 100-1002", department: "Marketing", position: "Marketing Manager", hireDate: "2021-06-01", salary: 85000, status: "ACTIVE", manager: "David Martinez" },
  { id: "emp-3", employeeId: "EMP-003", name: "Michael Chen", email: "m.chen@company.com", phone: "(555) 100-1003", department: "Finance", position: "Financial Analyst", hireDate: "2023-01-10", salary: 75000, status: "ACTIVE", manager: "Jennifer Taylor" },
  { id: "emp-4", employeeId: "EMP-004", name: "Emily Davis", email: "e.davis@company.com", phone: "(555) 100-1004", department: "HR", position: "HR Specialist", hireDate: "2022-08-20", salary: 70000, status: "ON_LEAVE", manager: "David Martinez" },
  { id: "emp-5", employeeId: "EMP-005", name: "Robert Wilson", email: "r.wilson@company.com", phone: "(555) 100-1005", department: "Sales", position: "Sales Rep", hireDate: "2023-04-12", salary: 65000, status: "ACTIVE", manager: "Sarah Johnson" },
  { id: "emp-6", employeeId: "EMP-006", name: "Lisa Anderson", email: "l.anderson@company.com", phone: "(555) 100-1006", department: "Engineering", position: "QA Engineer", hireDate: "2022-11-05", salary: 80000, status: "ACTIVE", manager: "John Smith" },
  { id: "emp-7", employeeId: "EMP-007", name: "David Martinez", email: "d.martinez@company.com", phone: "(555) 100-1007", department: "Operations", position: "Operations Lead", hireDate: "2021-02-28", salary: 90000, status: "ACTIVE", manager: "Jennifer Taylor" },
  { id: "emp-8", employeeId: "EMP-008", name: "Jennifer Taylor", email: "j.taylor@company.com", phone: "(555) 100-1008", department: "Finance", position: "Controller", hireDate: "2020-09-14", salary: 110000, status: "ACTIVE", manager: "—" },
];

const SEED_JOBS: Job[] = [
  { id: "job-1", title: "Medical Representative", department: "Sales & Marketing", location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", applications: 45, postedDate: "2026-03-01", closingDate: "2026-04-15", description: "Promote pharmaceutical products to healthcare professionals in assigned territory.", salaryRange: "EGP 18,000 - EGP 24,000/yr", requirements: "BSc Pharmacy/Science, 1-3 yrs pharma sales" },
  { id: "job-2", title: "District Sales Manager", department: "Sales & Marketing", location: "Alexandria, Egypt", type: "FULL_TIME", status: "OPEN", applications: 18, postedDate: "2026-03-05", closingDate: "2026-04-20", description: "Lead and manage a team of medical representatives across the district.", salaryRange: "EGP 30,000 - EGP 42,000/yr", requirements: "BSc Pharmacy, 5+ yrs pharma sales, 2+ yrs management" },
  { id: "job-3", title: "Quality Control Analyst", department: "Quality Assurance", location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "OPEN", applications: 32, postedDate: "2026-03-08", closingDate: "2026-04-10", description: "Perform analytical testing of raw materials, intermediates, and finished products.", salaryRange: "EGP 15,000 - EGP 22,000/yr", requirements: "BSc Pharmacy/Chemistry, HPLC/GC experience" },
  { id: "job-4", title: "Regulatory Affairs Specialist", department: "Regulatory Affairs", location: "Cairo, Egypt", type: "FULL_TIME", status: "OPEN", applications: 14, postedDate: "2026-03-10", closingDate: "2026-04-25", description: "Prepare and submit drug registration dossiers to EDA and other regulatory authorities.", salaryRange: "EGP 25,000 - EGP 35,000/yr", requirements: "BSc Pharmacy, 3+ yrs regulatory affairs, CTD knowledge" },
  { id: "job-5", title: "Production Pharmacist", department: "Manufacturing", location: "10th of Ramadan, Egypt", type: "FULL_TIME", status: "OPEN", applications: 22, postedDate: "2026-03-12", closingDate: "2026-04-18", description: "Supervise pharmaceutical manufacturing operations.", salaryRange: "EGP 20,000 - EGP 28,000/yr", requirements: "BSc Pharmacy, GMP knowledge, 2+ yrs manufacturing" },
  { id: "job-6", title: "R&D Formulation Scientist", department: "Research & Development", location: "6th October, Egypt", type: "FULL_TIME", status: "OPEN", applications: 16, postedDate: "2026-03-18", closingDate: "2026-05-01", description: "Develop and optimize pharmaceutical formulations for generic and branded products.", salaryRange: "EGP 28,000 - EGP 40,000/yr", requirements: "MSc/PhD Pharmaceutics, formulation development" },
];

const SEED_CANDIDATES: Candidate[] = [
  { id: "cand-1", name: "Dr. Amira Hassan", email: "amira.h@email.com", degree: "BSc Pharmacy, Ain Shams", currentCompany: "Hikma Pharmaceuticals", appliedFor: "District Sales Manager", experience: "6 yrs pharma sales", source: "LinkedIn", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-01" },
  { id: "cand-2", name: "Mohamed El-Sayed", email: "mohamed.e@email.com", degree: "BSc Pharmacy, Cairo Univ", currentCompany: "EIPICO", appliedFor: "Medical Representative", experience: "2 yrs pharma sales", source: "Referral", status: "SCREENING", rating: 4, appliedDate: "2026-03-05" },
  { id: "cand-3", name: "Dr. Fatima Khaled", email: "fatima.k@email.com", degree: "MSc Analytical Chemistry", currentCompany: "Pharco Pharmaceuticals", appliedFor: "Quality Control Analyst", experience: "4 yrs QC lab", source: "Company Site", status: "OFFER", rating: 5, appliedDate: "2026-03-02" },
  { id: "cand-4", name: "Ahmed Mansour", email: "ahmed.m@email.com", degree: "BSc Pharmacy, Alex Univ", currentCompany: "Novartis Egypt", appliedFor: "Regulatory Affairs Specialist", experience: "5 yrs regulatory", source: "LinkedIn", status: "INTERVIEW", rating: 4, appliedDate: "2026-03-08" },
  { id: "cand-5", name: "Sara Ibrahim", email: "sara.i@email.com", degree: "BSc Pharmacy, Tanta Univ", currentCompany: "Fresh Graduate", appliedFor: "Medical Representative", experience: "Internship only", source: "University Career Fair", status: "APPLIED", rating: 3, appliedDate: "2026-03-10" },
  { id: "cand-6", name: "Dr. Khaled Nabil", email: "khaled.n@email.com", degree: "PhD Pharmaceutics", currentCompany: "GSK Egypt", appliedFor: "R&D Formulation Scientist", experience: "8 yrs R&D", source: "LinkedIn", status: "INTERVIEW", rating: 5, appliedDate: "2026-03-09" },
];

const SEED_PROJECTS: Project[] = [
  { id: "proj-1", name: "ERP System Rollout", client: "Acme Corp", manager: "Sarah Johnson", startDate: "2026-01-15", endDate: "2026-07-31", budget: 180000, spent: 92000, progress: 52, status: "In Progress", description: "Full ERP system implementation including finance, HR, and inventory modules." },
  { id: "proj-2", name: "Website Redesign", client: "Globex Inc", manager: "Michael Torres", startDate: "2026-02-01", endDate: "2026-04-30", budget: 45000, spent: 38500, progress: 85, status: "In Progress", description: "Complete overhaul of the corporate website with new branding and CMS." },
  { id: "proj-3", name: "Mobile App v2.0", client: "Internal", manager: "Emily Chen", startDate: "2026-03-01", endDate: "2026-09-30", budget: 120000, spent: 18000, progress: 15, status: "In Progress", description: "Major version release of the mobile application with offline support." },
  { id: "proj-4", name: "Data Warehouse Migration", client: "Initech LLC", manager: "David Kim", startDate: "2025-10-01", endDate: "2026-01-31", budget: 95000, spent: 97200, progress: 100, status: "Completed", description: "Migration of legacy data warehouse to cloud-based solution." },
];

const SEED_PROJECT_TASKS: ProjectTask[] = [
  { id: "ptask-1", title: "Design system architecture", project: "ERP System Rollout", assignee: "Sarah Johnson", dueDate: "2026-04-05", priority: "High", hours: 16, status: "Completed" },
  { id: "ptask-2", title: "Implement finance module API", project: "ERP System Rollout", assignee: "James Park", dueDate: "2026-04-20", priority: "High", hours: 40, status: "In Progress" },
  { id: "ptask-3", title: "UI mockups — homepage", project: "Website Redesign", assignee: "Anna White", dueDate: "2026-04-10", priority: "Medium", hours: 12, status: "Review" },
  { id: "ptask-4", title: "Migrate product pages", project: "Website Redesign", assignee: "Michael Torres", dueDate: "2026-04-18", priority: "High", hours: 20, status: "In Progress" },
  { id: "ptask-5", title: "Offline sync architecture", project: "Mobile App v2.0", assignee: "Emily Chen", dueDate: "2026-05-01", priority: "High", hours: 32, status: "Todo" },
  { id: "ptask-6", title: "Push notification service", project: "Mobile App v2.0", assignee: "Carlos Rivera", dueDate: "2026-05-15", priority: "Medium", hours: 24, status: "Todo" },
  { id: "ptask-7", title: "ETL pipeline testing", project: "Data Warehouse Migration", assignee: "David Kim", dueDate: "2026-01-20", priority: "High", hours: 28, status: "Completed" },
  { id: "ptask-8", title: "User acceptance testing", project: "ERP System Rollout", assignee: "Lisa Morgan", dueDate: "2026-04-28", priority: "Medium", hours: 20, status: "On Hold" },
];

const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "po-001", number: "PO-2026-0001", vendorId: "v-001", date: daysAgo(20), expectedDate: daysAgo(5), items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg Tablet — Bulk", quantity: 5000, unitPrice: 28, total: 140000 }], subtotal: 140000, tax: 19600, total: 159600, status: "RECEIVED", grnId: "grn-001", invoiceId: "inv-po-001", createdAt: daysAgo(20) },
  { id: "po-002", number: "PO-2026-0002", vendorId: "v-002", date: daysAgo(10), expectedDate: daysAhead(5), items: [{ productId: "p-diab-1", description: "Diabetex XR 1000mg — Bulk", quantity: 3000, unitPrice: 55, total: 165000 }, { productId: "p-diab-2", description: "Glargin-Long 100U/ml — Bulk", quantity: 500, unitPrice: 280, total: 140000 }], subtotal: 305000, tax: 42700, total: 347700, status: "APPROVED", createdAt: daysAgo(10) },
  { id: "po-003", number: "PO-2026-0003", vendorId: "v-003", date: daysAgo(5), expectedDate: daysAhead(15), items: [{ productId: "p-prim-1", description: "Antibio-Z 1g Capsule — Bulk", quantity: 10000, unitPrice: 14, total: 140000 }], subtotal: 140000, tax: 19600, total: 159600, status: "ORDERED", createdAt: daysAgo(5) },
  { id: "po-004", number: "PO-2026-0004", vendorId: "v-001", date: daysAgo(2), expectedDate: daysAhead(20), items: [{ productId: "p-cardio-2", description: "Atorvastat 20mg — Bulk", quantity: 8000, unitPrice: 35, total: 280000 }], subtotal: 280000, tax: 39200, total: 319200, status: "DRAFT", createdAt: daysAgo(2) },
];

const SEED_SALES_ORDERS: SalesOrder[] = [
  { id: "so-001", number: "SO-2026-0001", customerId: "c-001", date: daysAgo(15), expectedDate: daysAgo(3), items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg Tablet", quantity: 500, unitPrice: 48, total: 24000 }, { productId: "p-cardio-2", description: "Atorvastat 20mg Tablet", quantity: 300, unitPrice: 62, total: 18600 }], subtotal: 42600, tax: 5964, total: 48564, status: "INVOICED", invoiceId: "inv-001", dnId: "dn-001", createdAt: daysAgo(15) },
  { id: "so-002", number: "SO-2026-0002", customerId: "c-002", date: daysAgo(8), expectedDate: daysAhead(2), items: [{ productId: "p-diab-1", description: "Diabetex XR 1000mg Tablet", quantity: 200, unitPrice: 95, total: 19000 }], subtotal: 19000, tax: 2660, total: 21660, status: "CONFIRMED", createdAt: daysAgo(8) },
  { id: "so-003", number: "SO-2026-0003", customerId: "c-003", date: daysAgo(3), expectedDate: daysAhead(10), items: [{ productId: "p-prim-1", description: "Antibio-Z 1g Capsule", quantity: 1000, unitPrice: 28, total: 28000 }, { productId: "p-prim-2", description: "Paraflu Junior Syrup", quantity: 500, unitPrice: 22, total: 11000 }], subtotal: 39000, tax: 5460, total: 44460, status: "DRAFT", createdAt: daysAgo(3) },
];

const SEED_RFQS: RFQ[] = [
  { id: "rfq-001", number: "RFQ-2026-0001", vendorId: "v-001", date: daysAgo(30), validUntil: daysAgo(15), items: [{ description: "Cardioprex 500mg API — Bulk", quantity: 5000, unit: "kg" }], status: "CONVERTED", convertedPOId: "po-001", createdAt: daysAgo(30) },
  { id: "rfq-002", number: "RFQ-2026-0002", vendorId: "v-003", date: daysAgo(7), validUntil: daysAhead(14), items: [{ description: "Antibio-Z raw material", quantity: 2000, unit: "kg" }, { description: "Capsule shells size 0", quantity: 50000, unit: "pcs" }], status: "SENT", createdAt: daysAgo(7) },
];

const SEED_GOODS_RECEIPTS: GoodsReceipt[] = [
  { id: "grn-001", number: "GRN-2026-0001", poId: "po-001", vendorId: "v-001", date: daysAgo(5), items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg Tablet — Bulk", quantity: 5000, unitPrice: 28 }], status: "RECEIVED", createdAt: daysAgo(5) },
];

const SEED_DELIVERY_NOTES: DeliveryNote[] = [
  { id: "dn-001", number: "DN-2026-0001", soId: "so-001", customerId: "c-001", date: daysAgo(5), items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg Tablet", quantity: 500 }, { productId: "p-cardio-2", description: "Atorvastat 20mg Tablet", quantity: 300 }], status: "DELIVERED", createdAt: daysAgo(5) },
];

// ─── Seed BOM Lines ─────────────────────────────────────────────────────────
// Cardioprex (p-cardio-1): 4 raw-material components
// Atorvastat (p-cardio-2): 3 components (one is a sub-assembly referencing Cardioprex)
// Antibio-Z  (p-prim-1):  5 components
const SEED_BOM_LINES: BOMLine[] = [
  // Cardioprex BOM
  { id: "bom-c1-1", parentProductId: "p-cardio-1", componentProductId: "p-prim-3", quantityRequired: 0.5, unit: "kg", level: 0, notes: "Active ingredient base" },
  { id: "bom-c1-2", parentProductId: "p-cardio-1", componentProductId: "p-diab-1", quantityRequired: 0.12, unit: "kg", level: 0, notes: "Excipient binder" },
  { id: "bom-c1-3", parentProductId: "p-cardio-1", componentProductId: "p-prim-2", quantityRequired: 0.05, unit: "L", level: 0, notes: "Coating solution" },
  { id: "bom-c1-4", parentProductId: "p-cardio-1", componentProductId: "p-diab-2", quantityRequired: 0.02, unit: "kg", level: 0, notes: "Stabilizer" },
  // Atorvastat BOM (includes sub-assembly)
  { id: "bom-c2-1", parentProductId: "p-cardio-2", componentProductId: "p-prim-1", quantityRequired: 0.35, unit: "kg", level: 0, notes: "Primary API" },
  { id: "bom-c2-2", parentProductId: "p-cardio-2", componentProductId: "p-cardio-1", quantityRequired: 0.08, unit: "kg", level: 0, notes: "Sub-assembly: Cardioprex base" },
  { id: "bom-c2-3", parentProductId: "p-cardio-2", componentProductId: "p-prim-3", quantityRequired: 0.2, unit: "kg", level: 1, notes: "Filler compound" },
  // Antibio-Z BOM
  { id: "bom-p1-1", parentProductId: "p-prim-1", componentProductId: "p-cardio-3", quantityRequired: 0.6, unit: "kg", level: 0, notes: "Antibiotic base compound" },
  { id: "bom-p1-2", parentProductId: "p-prim-1", componentProductId: "p-prim-2", quantityRequired: 0.15, unit: "L", level: 0, notes: "Suspension medium" },
  { id: "bom-p1-3", parentProductId: "p-prim-1", componentProductId: "p-prim-3", quantityRequired: 0.1, unit: "kg", level: 0, notes: "Capsule shell material" },
  { id: "bom-p1-4", parentProductId: "p-prim-1", componentProductId: "p-diab-1", quantityRequired: 0.04, unit: "kg", level: 0, notes: "Disintegrant" },
  { id: "bom-p1-5", parentProductId: "p-prim-1", componentProductId: "p-diab-2", quantityRequired: 0.01, unit: "L", level: 0, notes: "Preservative" },
];

// ─── Seed Product Lifecycles ────────────────────────────────────────────────
const SEED_PRODUCT_LIFECYCLES: ProductLifecycle[] = [
  { id: "plc-1", productId: "p-cardio-1", stage: "Active", enteredAt: daysAgo(60), history: [
    { stage: "Development", enteredAt: daysAgo(365), exitedAt: daysAgo(280) },
    { stage: "Testing", enteredAt: daysAgo(280), exitedAt: daysAgo(200) },
    { stage: "Approved", enteredAt: daysAgo(200), exitedAt: daysAgo(120) },
    { stage: "Active", enteredAt: daysAgo(120) },
  ]},
  { id: "plc-2", productId: "p-cardio-2", stage: "Active", enteredAt: daysAgo(90), history: [
    { stage: "Development", enteredAt: daysAgo(400), exitedAt: daysAgo(310) },
    { stage: "Testing", enteredAt: daysAgo(310), exitedAt: daysAgo(230) },
    { stage: "Approved", enteredAt: daysAgo(230), exitedAt: daysAgo(150) },
    { stage: "Active", enteredAt: daysAgo(150) },
  ]},
  { id: "plc-3", productId: "p-cardio-3", stage: "Declining", enteredAt: daysAgo(30), history: [
    { stage: "Development", enteredAt: daysAgo(600), exitedAt: daysAgo(520) },
    { stage: "Testing", enteredAt: daysAgo(520), exitedAt: daysAgo(460) },
    { stage: "Approved", enteredAt: daysAgo(460), exitedAt: daysAgo(380) },
    { stage: "Active", enteredAt: daysAgo(380), exitedAt: daysAgo(30) },
    { stage: "Declining", enteredAt: daysAgo(30) },
  ]},
  { id: "plc-4", productId: "p-diab-1", stage: "Testing", enteredAt: daysAgo(15), history: [
    { stage: "Development", enteredAt: daysAgo(120), exitedAt: daysAgo(15) },
    { stage: "Testing", enteredAt: daysAgo(15) },
  ]},
  { id: "plc-5", productId: "p-diab-2", stage: "Approved", enteredAt: daysAgo(10), history: [
    { stage: "Development", enteredAt: daysAgo(200), exitedAt: daysAgo(130) },
    { stage: "Testing", enteredAt: daysAgo(130), exitedAt: daysAgo(10) },
    { stage: "Approved", enteredAt: daysAgo(10) },
  ]},
  { id: "plc-6", productId: "p-prim-1", stage: "Active", enteredAt: daysAgo(45), history: [
    { stage: "Development", enteredAt: daysAgo(300), exitedAt: daysAgo(220) },
    { stage: "Testing", enteredAt: daysAgo(220), exitedAt: daysAgo(150) },
    { stage: "Approved", enteredAt: daysAgo(150), exitedAt: daysAgo(45) },
    { stage: "Active", enteredAt: daysAgo(45) },
  ]},
  { id: "plc-7", productId: "p-prim-2", stage: "Development", enteredAt: daysAgo(20), history: [
    { stage: "Development", enteredAt: daysAgo(20) },
  ]},
  { id: "plc-8", productId: "p-prim-3", stage: "Discontinued", enteredAt: daysAgo(5), history: [
    { stage: "Development", enteredAt: daysAgo(700), exitedAt: daysAgo(620) },
    { stage: "Testing", enteredAt: daysAgo(620), exitedAt: daysAgo(550) },
    { stage: "Approved", enteredAt: daysAgo(550), exitedAt: daysAgo(450) },
    { stage: "Active", enteredAt: daysAgo(450), exitedAt: daysAgo(100) },
    { stage: "Declining", enteredAt: daysAgo(100), exitedAt: daysAgo(5) },
    { stage: "Discontinued", enteredAt: daysAgo(5) },
  ]},
];

export const SEED_DATA: DataStoreState = {
  businessUnits: SEED_BUS,
  products: SEED_PRODUCTS,
  doctors: SEED_DOCTORS,
  territories: SEED_TERRITORIES,
  amAccounts: SEED_AM_ACCOUNTS,
  startingPoints: SEED_STARTING_POINTS,
  visits: SEED_VISITS,
  weeklyPlans: SEED_WEEKLY_PLANS,
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
  glAccounts: SEED_GL_ACCOUNTS,
  journalEntries: SEED_JOURNAL_ENTRIES,
  costCenters: SEED_COST_CENTERS,
  budgets: SEED_BUDGETS,
  purchaseOrders: SEED_PURCHASE_ORDERS,
  salesOrders: SEED_SALES_ORDERS,
  rfqs: SEED_RFQS,
  goodsReceipts: SEED_GOODS_RECEIPTS,
  deliveryNotes: SEED_DELIVERY_NOTES,
  shipments: [],
  employees: SEED_EMPLOYEES,
  jobs: SEED_JOBS,
  candidates: SEED_CANDIDATES,
  projects: SEED_PROJECTS,
  projectTasks: SEED_PROJECT_TASKS,
  conversionFormulas: [],
  bomLines: SEED_BOM_LINES,
  productLifecycles: SEED_PRODUCT_LIFECYCLES,
  nextInvoiceSeq: 3,
  nextJournalSeq: 9,
  nextPOSeq: 5,
  nextSOSeq: 4,
  nextRFQSeq: 3,
  nextGRNSeq: 2,
  nextDNSeq: 2,
  nextCustomerSeq: 1006,
  nextVendorSeq: 2006,
  nextProductSeq: 9,
  nextBankSeq: 5,
  nextCostCenterSeq: 7,
  nextPaymentSeq: 6,
  nextChequeSeq: 8,
  nextShipmentSeq: 1,
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
  generateJournalNumber: () => string;
  generatePONumber: () => string;
  generateSONumber: () => string;
  generateRFQNumber: () => string;
  generateGRNNumber: () => string;
  generateDNNumber: () => string;
  generateCustomerCode: () => string;
  generateVendorCode: () => string;
  generateProductCode: () => string;
  generateBankCode: () => string;
  generateCostCenterCode: () => string;
  generatePaymentRef: () => string;
  generateChequeNumber: () => string;
  generateShipmentNumber: () => string;
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

  function generateJournalNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextJournalSeq;
    const next: DataStoreState = { ...state, nextJournalSeq: seq + 1 };
    mutate(next);
    return `JE-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generatePONumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextPOSeq;
    const next: DataStoreState = { ...state, nextPOSeq: seq + 1 };
    mutate(next);
    return `PO-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateSONumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextSOSeq;
    const next: DataStoreState = { ...state, nextSOSeq: seq + 1 };
    mutate(next);
    return `SO-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateRFQNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextRFQSeq;
    const next: DataStoreState = { ...state, nextRFQSeq: seq + 1 };
    mutate(next);
    return `RFQ-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateGRNNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextGRNSeq;
    const next: DataStoreState = { ...state, nextGRNSeq: seq + 1 };
    mutate(next);
    return `GRN-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateDNNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextDNSeq;
    const next: DataStoreState = { ...state, nextDNSeq: seq + 1 };
    mutate(next);
    return `DN-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateCustomerCode(): string {
    const seq = state.nextCustomerSeq;
    const next: DataStoreState = { ...state, nextCustomerSeq: seq + 1 };
    mutate(next);
    return `CUST-${String(seq).padStart(4, "0")}`;
  }

  function generateVendorCode(): string {
    const seq = state.nextVendorSeq;
    const next: DataStoreState = { ...state, nextVendorSeq: seq + 1 };
    mutate(next);
    return `VEN-${String(seq).padStart(4, "0")}`;
  }

  function generateProductCode(): string {
    const seq = state.nextProductSeq;
    const next: DataStoreState = { ...state, nextProductSeq: seq + 1 };
    mutate(next);
    return `PRD-${String(seq).padStart(4, "0")}`;
  }

  function generateBankCode(): string {
    const seq = state.nextBankSeq;
    const next: DataStoreState = { ...state, nextBankSeq: seq + 1 };
    mutate(next);
    return `BNK-${String(seq).padStart(4, "0")}`;
  }

  function generateCostCenterCode(): string {
    const seq = state.nextCostCenterSeq;
    const next: DataStoreState = { ...state, nextCostCenterSeq: seq + 1 };
    mutate(next);
    return `CC-${String(seq).padStart(4, "0")}`;
  }

  function generatePaymentRef(): string {
    const year = new Date().getFullYear();
    const seq = state.nextPaymentSeq;
    const next: DataStoreState = { ...state, nextPaymentSeq: seq + 1 };
    mutate(next);
    return `PAY-${year}-${String(seq).padStart(4, "0")}`;
  }

  function generateChequeNumber(): string {
    const seq = state.nextChequeSeq;
    const next: DataStoreState = { ...state, nextChequeSeq: seq + 1 };
    mutate(next);
    return `CHQ-${String(seq).padStart(6, "0")}`;
  }

  function generateShipmentNumber(): string {
    const year = new Date().getFullYear();
    const seq = state.nextShipmentSeq;
    const next: DataStoreState = { ...state, nextShipmentSeq: seq + 1 };
    mutate(next);
    return `SHP-${year}-${String(seq).padStart(4, "0")}`;
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
        generateJournalNumber,
        generatePONumber,
        generateSONumber,
        generateRFQNumber,
        generateGRNNumber,
        generateDNNumber,
        generateCustomerCode,
        generateVendorCode,
        generateProductCode,
        generateBankCode,
        generateCostCenterCode,
        generatePaymentRef,
        generateChequeNumber,
        generateShipmentNumber,
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
      generateJournalNumber: () => "JE-0000-0000",
      generatePONumber: () => "PO-0000-0000",
      generateSONumber: () => "SO-0000-0000",
      generateRFQNumber: () => "RFQ-0000-0000",
      generateGRNNumber: () => "GRN-0000-0000",
      generateDNNumber: () => "DN-0000-0000",
      generateCustomerCode: () => "CUST-0000",
      generateVendorCode: () => "VEN-0000",
      generateProductCode: () => "PRD-0000",
      generateBankCode: () => "BNK-0000",
      generateCostCenterCode: () => "CC-0000",
      generatePaymentRef: () => "PAY-0000-0000",
      generateChequeNumber: () => "CHQ-000000",
      generateShipmentNumber: () => "SHP-0000-0000",
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

"use client";
import { useList, useDetail, useCreate, useUpdate, useDelete } from "./hooks";
import { QueryParams } from "./client";

// ==================== CORE ====================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
}

// ==================== AUTOMATION ====================

export interface Workflow {
  id: string;
  name: string;
  module: string;
  triggerType: string;
  triggerConfig: string;
  conditions: string;
  actions: string;
  isActive: boolean;
  createdById: string;
  runCount: number;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== FINANCE ====================

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference?: string | null;
  description: string;
  status: string;
  createdById: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  createdAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  supplierId: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  type: string;
  amount: number;
  date: string;
  method?: string | null;
  reference?: string | null;
  invoiceId?: string | null;
  billId?: string | null;
  createdAt: string;
}

// ==================== PROCUREMENT ====================

export interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  status: string;
  rating?: number | null;
  paymentTerms?: string | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  date: string;
  expectedDate?: string | null;
  status: string;
  total: number;
  notes?: string | null;
  createdById: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  title: string;
  supplierId: string;
  type?: string | null;
  startDate: string;
  endDate?: string | null;
  value: number;
  status: string;
  terms?: string | null;
  createdAt: string;
}

// ==================== INVENTORY ====================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  reorderLevel: number;
  unit: string;
  status: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string | null;
  capacity?: number | null;
  managerId?: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId?: string | null;
  type: string;
  quantity: number;
  date: string;
  reference?: string | null;
  notes?: string | null;
  createdById: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  date: string;
  status: string;
  total: number;
  shippingAddress?: string | null;
  notes?: string | null;
  createdAt: string;
}

// ==================== PROJECTS ====================

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  managerId: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  budget: number;
  spent: number;
  progress: number;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours: number;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  date: string;
  description?: string | null;
  billable: boolean;
}

// ==================== HR ====================

export interface Department {
  id: string;
  name: string;
  managerId?: string | null;
  description?: string | null;
  budget?: number | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  departmentId?: string | null;
  position?: string | null;
  hireDate: string;
  salary?: number | null;
  status: string;
  managerId?: string | null;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string | null;
  approvedById?: string | null;
  createdAt: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  period: string;
  basicSalary: number;
  overtime: number;
  deductions: number;
  bonuses: number;
  tax: number;
  netPay: number;
  status: string;
  paidDate?: string | null;
  createdAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  notes?: string | null;
}

// ==================== ASSETS ====================

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  category?: string | null;
  status: string;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  currentValue?: number | null;
  location?: string | null;
  assignedToId?: string | null;
  depreciationRate?: number | null;
  warrantyExpiry?: string | null;
  createdAt: string;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: string;
  description: string;
  scheduledDate: string;
  completedDate?: string | null;
  cost?: number | null;
  status: string;
}

// ==================== MANUFACTURING ====================

export interface BillOfMaterials {
  id: string;
  productId: string;
  name: string;
  version: string;
  status: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  bomId: string;
  quantity: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  priority: string;
  notes?: string | null;
  createdAt: string;
}

// ==================== CRM - SALES ====================

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source: string;
  status: string;
  assignedToId?: string | null;
  score: number;
  value?: number | null;
  notes?: string | null;
  convertedAccountId?: string | null;
  convertedDate?: string | null;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  accountId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate?: string | null;
  assignedToId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  date: string;
  duration?: number | null;
  userId: string;
  status: string;
  createdAt: string;
}

// ==================== CRM - ACCOUNTS & CONTACTS ====================

export interface Account {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  type: string;
  annualRevenue?: number | null;
  employeeCount?: number | null;
  ownerId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  accountId?: string | null;
  ownerId?: string | null;
  doNotCall: boolean;
  doNotEmail: boolean;
  createdAt: string;
}

// ==================== CRM - MARKETING ====================

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  budget: number;
  spent: number;
  expectedRevenue: number;
  actualRevenue: number;
  leads: number;
  conversions: number;
  ownerId?: string | null;
  createdAt: string;
}

// ==================== CRM - SERVICE ====================

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  accountId?: string | null;
  contactId?: string | null;
  status: string;
  priority: string;
  assignedToId?: string | null;
  category?: string | null;
  slaDeadline?: string | null;
  resolvedAt?: string | null;
  satisfaction?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  tags?: string | null;
  status: string;
  views: number;
  helpful: number;
  notHelpful: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== CRM - GPS / FIELD TRACKING ====================

export interface FieldVisit {
  id: string;
  userId: string;
  accountId?: string | null;
  contactId?: string | null;
  checkInTime: string;
  checkOutTime?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  notes?: string | null;
  status: string;
  distance?: number | null;
  createdAt: string;
}

export interface GPSLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: string;
  batteryLevel?: number | null;
}

export interface Territory {
  id: string;
  name: string;
  description?: string | null;
  assignedToId?: string | null;
  boundaries?: string | null;
  color?: string | null;
  createdAt: string;
}

// ==================== CRM - LOYALTY ====================

export interface LoyaltyProgram {
  id: string;
  name: string;
  description?: string | null;
  pointsPerDollar: number;
  redemptionRate: number;
  status: string;
  createdAt: string;
}

export interface LoyaltyMember {
  id: string;
  programId: string;
  accountId?: string | null;
  contactId?: string | null;
  points: number;
  tier: string;
  joinDate: string;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  memberId: string;
  type: string;
  points: number;
  description?: string | null;
  date: string;
}

// ==================== ATS ====================

export interface Job {
  id: string;
  title: string;
  departmentId?: string | null;
  location?: string | null;
  type: string;
  status: string;
  description?: string | null;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  benefits?: string | null;
  postedDate?: string | null;
  closingDate?: string | null;
  hiringManagerId?: string | null;
  createdAt: string;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  linkedIn?: string | null;
  resumeUrl?: string | null;
  source: string;
  status: string;
  currentCompany?: string | null;
  currentTitle?: string | null;
  expectedSalary?: number | null;
  rating?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  appliedDate: string;
  coverLetter?: string | null;
  score?: number | null;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  interviewerIds: string;
  scheduledDate: string;
  duration: number;
  type: string;
  status: string;
  feedback?: string | null;
  rating?: number | null;
  location?: string | null;
  createdAt: string;
}

export interface OfferLetter {
  id: string;
  applicationId: string;
  salary: number;
  startDate: string;
  expiryDate?: string | null;
  benefits?: string | null;
  status: string;
  terms?: string | null;
  createdAt: string;
}

// ==================== ATS - ONBOARDING & TRAINING ====================

export interface OnboardingChecklist {
  id: string;
  name: string;
  departmentId?: string | null;
  items: string;
  createdAt: string;
}

export interface OnboardingTask {
  id: string;
  checklistId?: string | null;
  employeeId: string;
  title: string;
  description?: string | null;
  assignedToId?: string | null;
  dueDate?: string | null;
  status: string;
  category: string;
  createdAt: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  duration?: string | null;
  format: string;
  status: string;
  materials?: string | null;
  createdAt: string;
}

export interface TrainingEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  status: string;
  enrolledDate: string;
  completedDate?: string | null;
  score?: number | null;
}

// ==================== DOCUMENTS ====================

export interface Document {
  id: string;
  name: string;
  type?: string | null;
  category?: string | null;
  fileUrl: string;
  fileSize?: number | null;
  uploadedById: string;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  version: number;
  tags?: string | null;
  createdAt: string;
}

// ==================== PRE-TYPED HOOKS ====================

// --- Products ---
export const useProducts = (params?: QueryParams) => useList<Product>("products", params);
export const useProduct = (id: string | null) => useDetail<Product>("products", id);
export const useCreateProduct = () => useCreate<Product>("products");
export const useUpdateProduct = () => useUpdate<Product>("products");
export const useDeleteProduct = () => useDelete("products");

// --- Invoices ---
export const useInvoices = (params?: QueryParams) => useList<Invoice>("invoices", params);
export const useInvoice = (id: string | null) => useDetail<Invoice>("invoices", id);
export const useCreateInvoice = () => useCreate<Invoice>("invoices");
export const useUpdateInvoice = () => useUpdate<Invoice>("invoices");
export const useDeleteInvoice = () => useDelete("invoices");

// --- Bills ---
export const useBills = (params?: QueryParams) => useList<Bill>("bills", params);
export const useBill = (id: string | null) => useDetail<Bill>("bills", id);
export const useCreateBill = () => useCreate<Bill>("bills");
export const useUpdateBill = () => useUpdate<Bill>("bills");
export const useDeleteBill = () => useDelete("bills");

// --- Payments ---
export const usePayments = (params?: QueryParams) => useList<Payment>("payments", params);
export const usePayment = (id: string | null) => useDetail<Payment>("payments", id);
export const useCreatePayment = () => useCreate<Payment>("payments");
export const useUpdatePayment = () => useUpdate<Payment>("payments");
export const useDeletePayment = () => useDelete("payments");

// --- Suppliers ---
export const useSuppliers = (params?: QueryParams) => useList<Supplier>("suppliers", params);
export const useSupplier = (id: string | null) => useDetail<Supplier>("suppliers", id);
export const useCreateSupplier = () => useCreate<Supplier>("suppliers");
export const useUpdateSupplier = () => useUpdate<Supplier>("suppliers");
export const useDeleteSupplier = () => useDelete("suppliers");

// --- Purchase Orders ---
export const usePurchaseOrders = (params?: QueryParams) => useList<PurchaseOrder>("purchase-orders", params);
export const usePurchaseOrder = (id: string | null) => useDetail<PurchaseOrder>("purchase-orders", id);
export const useCreatePurchaseOrder = () => useCreate<PurchaseOrder>("purchase-orders");
export const useUpdatePurchaseOrder = () => useUpdate<PurchaseOrder>("purchase-orders");
export const useDeletePurchaseOrder = () => useDelete("purchase-orders");

// --- Contracts ---
export const useContracts = (params?: QueryParams) => useList<Contract>("contracts", params);
export const useContract = (id: string | null) => useDetail<Contract>("contracts", id);
export const useCreateContract = () => useCreate<Contract>("contracts");
export const useUpdateContract = () => useUpdate<Contract>("contracts");
export const useDeleteContract = () => useDelete("contracts");

// --- Warehouses ---
export const useWarehouses = (params?: QueryParams) => useList<Warehouse>("warehouses", params);
export const useWarehouse = (id: string | null) => useDetail<Warehouse>("warehouses", id);
export const useCreateWarehouse = () => useCreate<Warehouse>("warehouses");
export const useUpdateWarehouse = () => useUpdate<Warehouse>("warehouses");
export const useDeleteWarehouse = () => useDelete("warehouses");

// --- Stock Movements ---
export const useStockMovements = (params?: QueryParams) => useList<StockMovement>("stock-movements", params);
export const useStockMovement = (id: string | null) => useDetail<StockMovement>("stock-movements", id);
export const useCreateStockMovement = () => useCreate<StockMovement>("stock-movements");

// --- Sales Orders ---
export const useSalesOrders = (params?: QueryParams) => useList<SalesOrder>("sales-orders", params);
export const useSalesOrder = (id: string | null) => useDetail<SalesOrder>("sales-orders", id);
export const useCreateSalesOrder = () => useCreate<SalesOrder>("sales-orders");
export const useUpdateSalesOrder = () => useUpdate<SalesOrder>("sales-orders");
export const useDeleteSalesOrder = () => useDelete("sales-orders");

// --- Chart of Accounts ---
export const useChartOfAccounts = (params?: QueryParams) => useList<ChartOfAccount>("chart-of-accounts", params);
export const useChartOfAccount = (id: string | null) => useDetail<ChartOfAccount>("chart-of-accounts", id);
export const useCreateChartOfAccount = () => useCreate<ChartOfAccount>("chart-of-accounts");
export const useUpdateChartOfAccount = () => useUpdate<ChartOfAccount>("chart-of-accounts");
export const useDeleteChartOfAccount = () => useDelete("chart-of-accounts");

// --- Journal Entries ---
export const useJournalEntries = (params?: QueryParams) => useList<JournalEntry>("journal-entries", params);
export const useJournalEntry = (id: string | null) => useDetail<JournalEntry>("journal-entries", id);
export const useCreateJournalEntry = () => useCreate<JournalEntry>("journal-entries");
export const useUpdateJournalEntry = () => useUpdate<JournalEntry>("journal-entries");

// --- Employees ---
export const useEmployees = (params?: QueryParams) => useList<Employee>("employees", params);
export const useEmployee = (id: string | null) => useDetail<Employee>("employees", id);
export const useCreateEmployee = () => useCreate<Employee>("employees");
export const useUpdateEmployee = () => useUpdate<Employee>("employees");
export const useDeleteEmployee = () => useDelete("employees");

// --- Departments ---
export const useDepartments = (params?: QueryParams) => useList<Department>("departments", params);
export const useDepartment = (id: string | null) => useDetail<Department>("departments", id);
export const useCreateDepartment = () => useCreate<Department>("departments");
export const useUpdateDepartment = () => useUpdate<Department>("departments");
export const useDeleteDepartment = () => useDelete("departments");

// --- Leave Requests ---
export const useLeaveRequests = (params?: QueryParams) => useList<LeaveRequest>("leave-requests", params);
export const useLeaveRequest = (id: string | null) => useDetail<LeaveRequest>("leave-requests", id);
export const useCreateLeaveRequest = () => useCreate<LeaveRequest>("leave-requests");
export const useUpdateLeaveRequest = () => useUpdate<LeaveRequest>("leave-requests");

// --- Payroll ---
export const usePayrolls = (params?: QueryParams) => useList<Payroll>("payrolls", params);
export const usePayroll = (id: string | null) => useDetail<Payroll>("payrolls", id);
export const useCreatePayroll = () => useCreate<Payroll>("payrolls");
export const useUpdatePayroll = () => useUpdate<Payroll>("payrolls");

// --- Attendance ---
export const useAttendances = (params?: QueryParams) => useList<Attendance>("attendances", params);
export const useAttendance = (id: string | null) => useDetail<Attendance>("attendances", id);
export const useCreateAttendance = () => useCreate<Attendance>("attendances");

// --- Assets ---
export const useAssets = (params?: QueryParams) => useList<Asset>("assets", params);
export const useAsset = (id: string | null) => useDetail<Asset>("assets", id);
export const useCreateAsset = () => useCreate<Asset>("assets");
export const useUpdateAsset = () => useUpdate<Asset>("assets");
export const useDeleteAsset = () => useDelete("assets");

// --- Asset Maintenance ---
export const useAssetMaintenances = (params?: QueryParams) => useList<AssetMaintenance>("asset-maintenances", params);
export const useAssetMaintenance = (id: string | null) => useDetail<AssetMaintenance>("asset-maintenances", id);
export const useCreateAssetMaintenance = () => useCreate<AssetMaintenance>("asset-maintenances");
export const useUpdateAssetMaintenance = () => useUpdate<AssetMaintenance>("asset-maintenances");

// --- Bill of Materials ---
export const useBillOfMaterials = (params?: QueryParams) => useList<BillOfMaterials>("bill-of-materials", params);
export const useBillOfMaterial = (id: string | null) => useDetail<BillOfMaterials>("bill-of-materials", id);
export const useCreateBillOfMaterials = () => useCreate<BillOfMaterials>("bill-of-materials");
export const useUpdateBillOfMaterials = () => useUpdate<BillOfMaterials>("bill-of-materials");

// --- Work Orders ---
export const useWorkOrders = (params?: QueryParams) => useList<WorkOrder>("work-orders", params);
export const useWorkOrder = (id: string | null) => useDetail<WorkOrder>("work-orders", id);
export const useCreateWorkOrder = () => useCreate<WorkOrder>("work-orders");
export const useUpdateWorkOrder = () => useUpdate<WorkOrder>("work-orders");

// --- Projects ---
export const useProjects = (params?: QueryParams) => useList<Project>("projects", params);
export const useProject = (id: string | null) => useDetail<Project>("projects", id);
export const useCreateProject = () => useCreate<Project>("projects");
export const useUpdateProject = () => useUpdate<Project>("projects");
export const useDeleteProject = () => useDelete("projects");

// --- Project Tasks ---
export const useProjectTasks = (params?: QueryParams) => useList<ProjectTask>("project-tasks", params);
export const useProjectTask = (id: string | null) => useDetail<ProjectTask>("project-tasks", id);
export const useCreateProjectTask = () => useCreate<ProjectTask>("project-tasks");
export const useUpdateProjectTask = () => useUpdate<ProjectTask>("project-tasks");
export const useDeleteProjectTask = () => useDelete("project-tasks");

// --- Time Entries ---
export const useTimeEntries = (params?: QueryParams) => useList<TimeEntry>("time-entries", params);
export const useTimeEntry = (id: string | null) => useDetail<TimeEntry>("time-entries", id);
export const useCreateTimeEntry = () => useCreate<TimeEntry>("time-entries");
export const useUpdateTimeEntry = () => useUpdate<TimeEntry>("time-entries");
export const useDeleteTimeEntry = () => useDelete("time-entries");

// --- Leads ---
export const useLeads = (params?: QueryParams) => useList<Lead>("leads", params);
export const useLead = (id: string | null) => useDetail<Lead>("leads", id);
export const useCreateLead = () => useCreate<Lead>("leads");
export const useUpdateLead = () => useUpdate<Lead>("leads");
export const useDeleteLead = () => useDelete("leads");

// --- Opportunities ---
export const useOpportunities = (params?: QueryParams) => useList<Opportunity>("opportunities", params);
export const useOpportunity = (id: string | null) => useDetail<Opportunity>("opportunities", id);
export const useCreateOpportunity = () => useCreate<Opportunity>("opportunities");
export const useUpdateOpportunity = () => useUpdate<Opportunity>("opportunities");
export const useDeleteOpportunity = () => useDelete("opportunities");

// --- Activities ---
export const useActivities = (params?: QueryParams) => useList<Activity>("activities", params);
export const useActivity = (id: string | null) => useDetail<Activity>("activities", id);
export const useCreateActivity = () => useCreate<Activity>("activities");
export const useUpdateActivity = () => useUpdate<Activity>("activities");
export const useDeleteActivity = () => useDelete("activities");

// --- Accounts ---
export const useAccounts = (params?: QueryParams) => useList<Account>("accounts", params);
export const useAccount = (id: string | null) => useDetail<Account>("accounts", id);
export const useCreateAccount = () => useCreate<Account>("accounts");
export const useUpdateAccount = () => useUpdate<Account>("accounts");
export const useDeleteAccount = () => useDelete("accounts");

// --- Contacts ---
export const useContacts = (params?: QueryParams) => useList<Contact>("contacts", params);
export const useContact = (id: string | null) => useDetail<Contact>("contacts", id);
export const useCreateContact = () => useCreate<Contact>("contacts");
export const useUpdateContact = () => useUpdate<Contact>("contacts");
export const useDeleteContact = () => useDelete("contacts");

// --- Campaigns ---
export const useCampaigns = (params?: QueryParams) => useList<Campaign>("campaigns", params);
export const useCampaign = (id: string | null) => useDetail<Campaign>("campaigns", id);
export const useCreateCampaign = () => useCreate<Campaign>("campaigns");
export const useUpdateCampaign = () => useUpdate<Campaign>("campaigns");
export const useDeleteCampaign = () => useDelete("campaigns");

// --- Tickets ---
export const useTickets = (params?: QueryParams) => useList<Ticket>("tickets", params);
export const useTicket = (id: string | null) => useDetail<Ticket>("tickets", id);
export const useCreateTicket = () => useCreate<Ticket>("tickets");
export const useUpdateTicket = () => useUpdate<Ticket>("tickets");
export const useDeleteTicket = () => useDelete("tickets");

// --- Knowledge Articles ---
export const useKnowledgeArticles = (params?: QueryParams) => useList<KnowledgeArticle>("knowledge-articles", params);
export const useKnowledgeArticle = (id: string | null) => useDetail<KnowledgeArticle>("knowledge-articles", id);
export const useCreateKnowledgeArticle = () => useCreate<KnowledgeArticle>("knowledge-articles");
export const useUpdateKnowledgeArticle = () => useUpdate<KnowledgeArticle>("knowledge-articles");
export const useDeleteKnowledgeArticle = () => useDelete("knowledge-articles");

// --- Field Visits ---
export const useFieldVisits = (params?: QueryParams) => useList<FieldVisit>("field-visits", params);
export const useFieldVisit = (id: string | null) => useDetail<FieldVisit>("field-visits", id);
export const useCreateFieldVisit = () => useCreate<FieldVisit>("field-visits");
export const useUpdateFieldVisit = () => useUpdate<FieldVisit>("field-visits");

// --- GPS Locations ---
export const useGPSLocations = (params?: QueryParams) => useList<GPSLocation>("gps-locations", params);
export const useCreateGPSLocation = () => useCreate<GPSLocation>("gps-locations");

// --- Territories ---
export const useTerritories = (params?: QueryParams) => useList<Territory>("territories", params);
export const useTerritory = (id: string | null) => useDetail<Territory>("territories", id);
export const useCreateTerritory = () => useCreate<Territory>("territories");
export const useUpdateTerritory = () => useUpdate<Territory>("territories");
export const useDeleteTerritory = () => useDelete("territories");

// --- Loyalty Programs ---
export const useLoyaltyPrograms = (params?: QueryParams) => useList<LoyaltyProgram>("loyalty-programs", params);
export const useLoyaltyProgram = (id: string | null) => useDetail<LoyaltyProgram>("loyalty-programs", id);
export const useCreateLoyaltyProgram = () => useCreate<LoyaltyProgram>("loyalty-programs");
export const useUpdateLoyaltyProgram = () => useUpdate<LoyaltyProgram>("loyalty-programs");

// --- Loyalty Members ---
export const useLoyaltyMembers = (params?: QueryParams) => useList<LoyaltyMember>("loyalty-members", params);
export const useLoyaltyMember = (id: string | null) => useDetail<LoyaltyMember>("loyalty-members", id);
export const useCreateLoyaltyMember = () => useCreate<LoyaltyMember>("loyalty-members");
export const useUpdateLoyaltyMember = () => useUpdate<LoyaltyMember>("loyalty-members");

// --- Jobs ---
export const useJobs = (params?: QueryParams) => useList<Job>("jobs", params);
export const useJob = (id: string | null) => useDetail<Job>("jobs", id);
export const useCreateJob = () => useCreate<Job>("jobs");
export const useUpdateJob = () => useUpdate<Job>("jobs");
export const useDeleteJob = () => useDelete("jobs");

// --- Candidates ---
export const useCandidates = (params?: QueryParams) => useList<Candidate>("candidates", params);
export const useCandidate = (id: string | null) => useDetail<Candidate>("candidates", id);
export const useCreateCandidate = () => useCreate<Candidate>("candidates");
export const useUpdateCandidate = () => useUpdate<Candidate>("candidates");
export const useDeleteCandidate = () => useDelete("candidates");

// --- Applications ---
export const useApplications = (params?: QueryParams) => useList<Application>("applications", params);
export const useApplication = (id: string | null) => useDetail<Application>("applications", id);
export const useCreateApplication = () => useCreate<Application>("applications");
export const useUpdateApplication = () => useUpdate<Application>("applications");

// --- Interviews ---
export const useInterviews = (params?: QueryParams) => useList<Interview>("interviews", params);
export const useInterview = (id: string | null) => useDetail<Interview>("interviews", id);
export const useCreateInterview = () => useCreate<Interview>("interviews");
export const useUpdateInterview = () => useUpdate<Interview>("interviews");

// --- Offer Letters ---
export const useOfferLetters = (params?: QueryParams) => useList<OfferLetter>("offer-letters", params);
export const useOfferLetter = (id: string | null) => useDetail<OfferLetter>("offer-letters", id);
export const useCreateOfferLetter = () => useCreate<OfferLetter>("offer-letters");
export const useUpdateOfferLetter = () => useUpdate<OfferLetter>("offer-letters");

// --- Onboarding ---
export const useOnboardingChecklists = (params?: QueryParams) => useList<OnboardingChecklist>("onboarding-checklists", params);
export const useOnboardingChecklist = (id: string | null) => useDetail<OnboardingChecklist>("onboarding-checklists", id);
export const useCreateOnboardingChecklist = () => useCreate<OnboardingChecklist>("onboarding-checklists");
export const useUpdateOnboardingChecklist = () => useUpdate<OnboardingChecklist>("onboarding-checklists");

export const useOnboardingTasks = (params?: QueryParams) => useList<OnboardingTask>("onboarding-tasks", params);
export const useOnboardingTask = (id: string | null) => useDetail<OnboardingTask>("onboarding-tasks", id);
export const useCreateOnboardingTask = () => useCreate<OnboardingTask>("onboarding-tasks");
export const useUpdateOnboardingTask = () => useUpdate<OnboardingTask>("onboarding-tasks");

// --- Training ---
export const useTrainingCourses = (params?: QueryParams) => useList<TrainingCourse>("training-courses", params);
export const useTrainingCourse = (id: string | null) => useDetail<TrainingCourse>("training-courses", id);
export const useCreateTrainingCourse = () => useCreate<TrainingCourse>("training-courses");
export const useUpdateTrainingCourse = () => useUpdate<TrainingCourse>("training-courses");

export const useTrainingEnrollments = (params?: QueryParams) => useList<TrainingEnrollment>("training-enrollments", params);
export const useTrainingEnrollment = (id: string | null) => useDetail<TrainingEnrollment>("training-enrollments", id);
export const useCreateTrainingEnrollment = () => useCreate<TrainingEnrollment>("training-enrollments");
export const useUpdateTrainingEnrollment = () => useUpdate<TrainingEnrollment>("training-enrollments");

// --- Documents ---
export const useDocuments = (params?: QueryParams) => useList<Document>("documents", params);
export const useDocument = (id: string | null) => useDetail<Document>("documents", id);
export const useCreateDocument = () => useCreate<Document>("documents");
export const useUpdateDocument = () => useUpdate<Document>("documents");
export const useDeleteDocument = () => useDelete("documents");

// --- Workflows ---
export const useWorkflows = (params?: QueryParams) => useList<Workflow>("workflows", params);
export const useWorkflow = (id: string | null) => useDetail<Workflow>("workflows", id);
export const useCreateWorkflow = () => useCreate<Workflow>("workflows");
export const useUpdateWorkflow = () => useUpdate<Workflow>("workflows");
export const useDeleteWorkflow = () => useDelete("workflows");

// --- Users (admin) ---
export const useUsers = (params?: QueryParams) => useList<User>("users", params);
export const useUser = (id: string | null) => useDetail<User>("users", id);
export const useUpdateUser = () => useUpdate<User>("users");

// --- Notifications ---
export const useNotifications = (params?: QueryParams) => useList<Notification>("notifications", params);
export const useUpdateNotification = () => useUpdate<Notification>("notifications");

// --- System Settings ---
export const useSystemSettings = (params?: QueryParams) => useList<SystemSetting>("system-settings", params);
export const useUpdateSystemSetting = () => useUpdate<SystemSetting>("system-settings");

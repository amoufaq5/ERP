"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Plus,
  ArrowRight,
  PackageCheck,
  BarChart3,
  TrendingUp,
  Users,
  Timer,
  AlertTriangle,
  Eye,
  ChevronUp,
  History,
  FileText,
  Percent,
  Calendar,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import {
  useDataStore,
  scopeMarketRequests,
  type MarketRequest,
  type PurchaseOrder,
} from "@/lib/data-store";

// ─── Analytics seed data ─────────────────────────────────────────────────────

const ANALYTICS_MONTHS = (() => {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
})();

const ANALYTICS_MONTH_LABELS = ANALYTICS_MONTHS.map((m) => {
  const [y, mo] = m.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(mo, 10) - 1]} ${y}`;
});

interface MonthlyVolume {
  month: string;
  label: string;
  count: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

interface TopRequester {
  name: string;
  role: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  totalAmount: number;
}

interface CategoryBudget {
  type: string;
  approvedBudget: number;
  pendingBudget: number;
  rejectedBudget: number;
}

// Seed analytics data for months with no real data
const SEED_VOLUME: Record<string, number> = {
  [ANALYTICS_MONTHS[0]]: 12,
  [ANALYTICS_MONTHS[1]]: 18,
  [ANALYTICS_MONTHS[2]]: 15,
  [ANALYTICS_MONTHS[3]]: 24,
  [ANALYTICS_MONTHS[4]]: 21,
  [ANALYTICS_MONTHS[5]]: 9,
};

const SEED_TYPE_DATA: Record<string, { count: number; approved: number; rejected: number; pending: number; totalBudget: number }> = {
  SAMPLE: { count: 28, approved: 20, rejected: 4, pending: 4, totalBudget: 45000 },
  LITERATURE: { count: 12, approved: 9, rejected: 2, pending: 1, totalBudget: 18000 },
  EVENT: { count: 8, approved: 5, rejected: 2, pending: 1, totalBudget: 85000 },
  DISCOUNT: { count: 15, approved: 10, rejected: 3, pending: 2, totalBudget: 32000 },
  DOCTOR_EDIT: { count: 6, approved: 5, rejected: 1, pending: 0, totalBudget: 0 },
  OTHER: { count: 10, approved: 6, rejected: 2, pending: 2, totalBudget: 12000 },
};

const SEED_REQUESTERS: TopRequester[] = [
  { name: "Mohamed El-Sayed", role: "Medical Rep", total: 18, approved: 14, rejected: 2, pending: 2, totalAmount: 24500 },
  { name: "Sara Ahmed", role: "Medical Rep", total: 14, approved: 10, rejected: 3, pending: 1, totalAmount: 19200 },
  { name: "Hassan Ibrahim", role: "Medical Rep", total: 12, approved: 8, rejected: 2, pending: 2, totalAmount: 15800 },
  { name: "Fatma Nour", role: "Medical Rep", total: 11, approved: 9, rejected: 1, pending: 1, totalAmount: 28000 },
  { name: "Ahmed Mostafa", role: "District Manager", total: 9, approved: 7, rejected: 1, pending: 1, totalAmount: 42000 },
  { name: "Layla Mansour", role: "Medical Rep", total: 8, approved: 5, rejected: 2, pending: 1, totalAmount: 11500 },
];

// ─── Approval Audit Trail & Fulfillment Types ──────────────────────────────

type ApprovalAction = "SUBMITTED" | "APPROVED" | "REJECTED" | "ESCALATED" | "FULFILLED" | "AUTO_ESCALATED" | "RETURNED" | "FINAL_REJECTED";

interface ApprovalEntry {
  id: string;
  action: ApprovalAction;
  performedBy: string;
  timestamp: string;
  comment?: string;
  level: number;
}

type FulfillmentPhase = "APPROVED" | "PROCESSING" | "FULFILLED";

interface FulfillmentInfo {
  phase: FulfillmentPhase;
  percentage: number;
  poStatus?: string;
  deliveryStatus?: string;
  discountCode?: string;
  usageCount?: number;
  eventChecklist?: { item: string; done: boolean }[];
  printStatus?: string;
}

// SLA expected processing days by type
const SLA_DAYS: Record<string, number> = {
  SAMPLE: 3,
  LITERATURE: 5,
  EVENT: 10,
  DISCOUNT: 2,
  DOCTOR_EDIT: 3,
  OTHER: 5,
};

// Approval chain levels config
const APPROVAL_CHAIN = [
  { level: 0, role: "MEDICAL_REP", label: "Med Rep", action: "Submit" },
  { level: 1, role: "DISTRICT_MANAGER", label: "District Manager", action: "Level 1" },
  { level: 2, role: "MARKETEER", label: "Marketeer", action: "Level 2" },
  { level: 3, role: "BUM", label: "BUM", action: "Level 3" },
] as const;

/**
 * Determine which approval levels are required for a given request.
 * Returns the max level needed (1 = DM only, 2 = DM+Marketeer, 3 = DM+Marketeer+BUM).
 */
function getRequiredApprovalLevel(type: string, amount?: number, discountPercent?: number): number {
  if (type === "EVENT") return 3;
  if (type === "DOCTOR_EDIT") return 2;
  if (type === "DISCOUNT" && (discountPercent ?? 0) > 15) return 3;
  if (type === "DISCOUNT") return 1;
  if (type === "LITERATURE") return 1;
  if (type === "SAMPLE" && (amount ?? 0) >= 5000) return 2;
  if (type === "SAMPLE") return 1;
  return 1;
}

/** Generate an id for approval entries */
let _approvalSeq = 0;
function genApprovalId() {
  _approvalSeq++;
  return `ae-${Date.now()}-${_approvalSeq}`;
}

/** Check if a pending request is overdue (>48h) */
function isOverdue(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) > 48 * 60 * 60 * 1000;
}

/** Compute SLA remaining text */
function getSlaInfo(createdAt: string, type: string): { text: string; breached: boolean; remainingMs: number } {
  const slaDays = SLA_DAYS[type] ?? 5;
  const created = new Date(createdAt).getTime();
  const deadline = created + slaDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const remainingMs = deadline - now;
  const breached = remainingMs < 0;
  const absDays = Math.floor(Math.abs(remainingMs) / (24 * 60 * 60 * 1000));
  const absHours = Math.floor((Math.abs(remainingMs) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const text = breached
    ? `SLA Breached -${absDays}d ${absHours}h`
    : `${absDays}d ${absHours}h remaining`;
  return { text, breached, remainingMs };
}

/** Extended MarketRequest with optional linked PO field set on approval */
type MarketRequestExt = MarketRequest & {
  linkedPONumber?: string;
  approvalHistory?: ApprovalEntry[];
  currentApprovalLevel?: number;
  returnCount?: number;
  fulfillment?: FulfillmentInfo;
  discountPercent?: number;
};

import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";

export default function MarketRequestsPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MarketRequest | null>(null);

  // New state for detail view, reject dialog, and audit trails
  const [detailRequest, setDetailRequest] = useState<MarketRequestExt | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MarketRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<"return" | "final">("return");

  // In-memory audit trails & fulfillment (keyed by request id)
  const [auditTrails, setAuditTrails] = useState<Record<string, ApprovalEntry[]>>({});
  const [fulfillmentData, setFulfillmentData] = useState<Record<string, FulfillmentInfo>>({});
  const [approvalLevels, setApprovalLevels] = useState<Record<string, number>>({});
  const [returnCounts, setReturnCounts] = useState<Record<string, number>>({});

  const repsUnderMe = getReportsOf(user.id).map((u) => u.id);

  const myRequests = useMemo(
    () =>
      scopeMarketRequests(
        store.marketRequests,
        store.businessUnits,
        user.role,
        user.id,
        repsUnderMe
      ),
    [store.marketRequests, store.businessUnits, user.role, user.id, repsUnderMe]
  );

  const filteredRequests = useMemo(() => {
    return myRequests.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const requester = allUsers.find((u) => u.id === r.requestedById);
        if (
          !r.description.toLowerCase().includes(q) &&
          !r.type.toLowerCase().includes(q) &&
          !(requester?.name.toLowerCase().includes(q) ?? false)
        )
          return false;
      }
      if (filters.status && r.status !== filters.status) return false;
      if (filters.type && r.type !== filters.type) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }, [myRequests, search, filters, allUsers]);

  // Stats
  const pending = myRequests.filter((r) => r.status === "PENDING").length;
  const approved = myRequests.filter(
    (r) => r.status === "APPROVED" || r.status === "FULFILLED"
  ).length;
  const rejected = myRequests.filter((r) => r.status === "REJECTED").length;
  const totalAmount = myRequests
    .filter((r) => r.amount)
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  // Can this user approve? (DM, Marketeer, BUM, Admin)
  const canApprove =
    user.role === "ADMIN" ||
    user.role === "BUM" ||
    user.role === "MARKETEER" ||
    user.role === "DISTRICT_MANAGER";

  // ─── Audit trail helpers ────────────────────────────────────────────────

  const addAuditEntry = useCallback(
    (requestId: string, action: ApprovalAction, comment?: string, level?: number) => {
      const entry: ApprovalEntry = {
        id: genApprovalId(),
        action,
        performedBy: user.name ?? user.id,
        timestamp: new Date().toISOString(),
        comment,
        level: level ?? 0,
      };
      setAuditTrails((prev) => ({
        ...prev,
        [requestId]: [...(prev[requestId] || []), entry],
      }));
    },
    [user.name, user.id]
  );

  /** Get enriched request with audit/fulfillment data */
  const enrichRequest = useCallback(
    (r: MarketRequest): MarketRequestExt => {
      const rExt = r as MarketRequestExt;
      return {
        ...rExt,
        approvalHistory: auditTrails[r.id] || [],
        currentApprovalLevel: approvalLevels[r.id] ?? 0,
        returnCount: returnCounts[r.id] ?? 0,
        fulfillment: fulfillmentData[r.id],
      };
    },
    [auditTrails, approvalLevels, returnCounts, fulfillmentData]
  );

  // Overdue requests count (pending > 48h)
  const overdueCount = useMemo(
    () => myRequests.filter((r) => r.status === "PENDING" && isOverdue(r.createdAt)).length,
    [myRequests]
  );

  // ─── Analytics computations ─────────────────────────────────────────────

  const monthlyVolume: MonthlyVolume[] = useMemo(() => {
    const counts: Record<string, number> = {};
    myRequests.forEach((r) => {
      const month = r.createdAt.slice(0, 7);
      counts[month] = (counts[month] || 0) + 1;
    });
    return ANALYTICS_MONTHS.map((m, i) => ({
      month: m,
      label: ANALYTICS_MONTH_LABELS[i],
      count: counts[m] || SEED_VOLUME[m] || 0,
    }));
  }, [myRequests]);

  const maxVolumeCount = Math.max(...monthlyVolume.map((v) => v.count), 1);

  const typeBreakdown: TypeBreakdown[] = useMemo(() => {
    const types = ["SAMPLE", "LITERATURE", "EVENT", "DISCOUNT", "DOCTOR_EDIT", "OTHER"];
    const realCounts: Record<string, { count: number; approved: number; rejected: number; pending: number }> = {};
    myRequests.forEach((r) => {
      if (!realCounts[r.type]) realCounts[r.type] = { count: 0, approved: 0, rejected: 0, pending: 0 };
      realCounts[r.type].count++;
      if (r.status === "APPROVED" || r.status === "FULFILLED") realCounts[r.type].approved++;
      else if (r.status === "REJECTED") realCounts[r.type].rejected++;
      else if (r.status === "PENDING") realCounts[r.type].pending++;
    });

    return types.map((type) => {
      const real = realCounts[type];
      const seed = SEED_TYPE_DATA[type];
      const data = real && real.count > 0 ? real : seed;
      const total = data.count;
      const approvalRate = total > 0 ? Math.round((data.approved / total) * 100) : 0;
      return { type, ...data, approvalRate };
    });
  }, [myRequests]);

  const avgProcessingTime = useMemo(() => {
    const processed = myRequests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED" || r.status === "FULFILLED");
    if (processed.length === 0) return 2.4; // seed fallback
    const totalDays = processed.reduce((sum, r) => {
      const created = new Date(r.createdAt).getTime();
      const resolved = r.approvedAt ? new Date(r.approvedAt).getTime() : created + 2 * 86400000;
      return sum + (resolved - created) / 86400000;
    }, 0);
    return Math.round((totalDays / processed.length) * 10) / 10;
  }, [myRequests]);

  const topRequesters: TopRequester[] = useMemo(() => {
    const map: Record<string, TopRequester> = {};
    myRequests.forEach((r) => {
      const requester = allUsers.find((u) => u.id === r.requestedById);
      const name = requester?.name ?? "Unknown";
      const role = requester ? ROLE_LABEL[requester.role] : "Unknown";
      if (!map[name]) map[name] = { name, role, total: 0, approved: 0, rejected: 0, pending: 0, totalAmount: 0 };
      map[name].total++;
      if (r.status === "APPROVED" || r.status === "FULFILLED") map[name].approved++;
      else if (r.status === "REJECTED") map[name].rejected++;
      else if (r.status === "PENDING") map[name].pending++;
      map[name].totalAmount += r.amount ?? 0;
    });
    const realList = Object.values(map).sort((a, b) => b.total - a.total);
    if (realList.length >= 3) return realList.slice(0, 8);
    // Merge with seed data
    const merged = [...realList];
    SEED_REQUESTERS.forEach((sr) => {
      if (!merged.find((m) => m.name === sr.name)) merged.push(sr);
    });
    return merged.sort((a, b) => b.total - a.total).slice(0, 8);
  }, [myRequests, allUsers]);

  const pendingVsProcessed = useMemo(() => {
    const pendingCount = myRequests.filter((r) => r.status === "PENDING").length || 4;
    const processedCount = myRequests.filter((r) => r.status !== "PENDING").length || 18;
    return { pending: pendingCount, processed: processedCount };
  }, [myRequests]);

  const categoryBudgets: CategoryBudget[] = useMemo(() => {
    const types = ["SAMPLE", "LITERATURE", "EVENT", "DISCOUNT", "DOCTOR_EDIT", "OTHER"];
    const map: Record<string, { approved: number; pending: number; rejected: number }> = {};
    myRequests.forEach((r) => {
      if (!map[r.type]) map[r.type] = { approved: 0, pending: 0, rejected: 0 };
      const amt = r.amount ?? 0;
      if (r.status === "APPROVED" || r.status === "FULFILLED") map[r.type].approved += amt;
      else if (r.status === "PENDING") map[r.type].pending += amt;
      else if (r.status === "REJECTED") map[r.type].rejected += amt;
    });
    return types.map((type) => {
      const real = map[type];
      const seed = SEED_TYPE_DATA[type];
      const hasReal = real && (real.approved + real.pending + real.rejected) > 0;
      return {
        type,
        approvedBudget: hasReal ? real.approved : seed.totalBudget,
        pendingBudget: hasReal ? real.pending : Math.round(seed.totalBudget * 0.15),
        rejectedBudget: hasReal ? real.rejected : Math.round(seed.totalBudget * 0.08),
      };
    });
  }, [myRequests]);

  const totalApprovedBudget = categoryBudgets.reduce((s, c) => s + c.approvedBudget, 0);
  const maxCategoryBudget = Math.max(...categoryBudgets.map((c) => c.approvedBudget + c.pendingBudget + c.rejectedBudget), 1);

  const overallApprovalRate = useMemo(() => {
    const decided = myRequests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED" || r.status === "FULFILLED");
    const approvedCount = decided.filter((r) => r.status === "APPROVED" || r.status === "FULFILLED").length;
    if (decided.length === 0) return 72; // seed fallback
    return Math.round((approvedCount / decided.length) * 100);
  }, [myRequests]);

  // ─── Form fields ───────────────────────────────────────────────────────
  const doctorOptions = store.doctors.map((d) => ({
    label: `${d.name} — ${d.hospital}`,
    value: d.id,
  }));
  const productOptions = store.products.map((p) => ({
    label: `${p.code} - ${p.name}`,
    value: p.id,
  }));
  const buOptions = store.businessUnits.map((bu) => ({
    label: bu.name,
    value: bu.id,
  }));

  const formFields: EntityField[] = [
    {
      name: "type",
      label: "Request Type",
      type: "select",
      required: true,
      options: [
        { label: "Product Sample", value: "SAMPLE" },
        { label: "Medical Literature", value: "LITERATURE" },
        { label: "Event / Conference", value: "EVENT" },
        { label: "Discount Request", value: "DISCOUNT" },
        { label: "Doctor Edit Request", value: "DOCTOR_EDIT" },
        { label: "Other", value: "OTHER" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: true,
      defaultValue: "MEDIUM",
      options: [
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Urgent", value: "URGENT" },
      ],
    },
    { name: "doctorId", label: "Related Doctor", type: "select", options: doctorOptions },
    { name: "productId", label: "Related Product", type: "select", options: productOptions },
    { name: "buId", label: "Business Unit", type: "select", options: buOptions },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "amount", label: "Amount (EGP)", type: "number" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      fullWidth: true,
      placeholder: "Describe your request in detail",
    },
  ];

  function handleCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(r: MarketRequest) {
    setEditing(r);
    setFormOpen(true);
  }

  function handleSubmit(data: EntityFormData) {
    const payload = {
      type: String(data.type) as MarketRequest["type"],
      priority: String(data.priority) as MarketRequest["priority"],
      description: String(data.description),
      doctorId: data.doctorId ? String(data.doctorId) : undefined,
      productId: data.productId ? String(data.productId) : undefined,
      buId: data.buId ? String(data.buId) : null,
      quantity: data.quantity ? Number(data.quantity) : undefined,
      amount: data.amount ? Number(data.amount) : undefined,
    };

    if (editing) {
      store.update("marketRequests", editing.id, payload);
    } else {
      const newId = store.genId("mr");
      store.add("marketRequests", {
        id: newId,
        ...payload,
        requestedById: user.id,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
      addAuditEntry(newId, "SUBMITTED", "Request submitted for approval", 0);
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleApprove(r: MarketRequest) {
    const currentLevel = approvalLevels[r.id] ?? 0;
    const requiredLevel = getRequiredApprovalLevel(r.type, r.amount, (r as MarketRequestExt).discountPercent);
    const newLevel = currentLevel + 1;

    // Record audit entry
    addAuditEntry(r.id, "APPROVED", `Approved at level ${newLevel}`, newLevel);

    // Update approval level tracker
    setApprovalLevels((prev) => ({ ...prev, [r.id]: newLevel }));

    // Only fully approve if all required levels are met
    if (newLevel >= requiredLevel) {
      store.update("marketRequests", r.id, {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date().toISOString(),
      });

      // Initialize fulfillment tracking
      let initFulfillment: FulfillmentInfo = { phase: "APPROVED", percentage: 0 };
      if (r.type === "SAMPLE") {
        initFulfillment = { phase: "PROCESSING", percentage: 25, poStatus: "Generating PO...", deliveryStatus: "Pending" };
      } else if (r.type === "EVENT") {
        initFulfillment = {
          phase: "PROCESSING",
          percentage: 10,
          eventChecklist: [
            { item: "Venue booked", done: false },
            { item: "Speaker confirmed", done: false },
            { item: "Invitations sent", done: false },
            { item: "Materials prepared", done: false },
            { item: "Event completed", done: false },
          ],
        };
      } else if (r.type === "DISCOUNT") {
        const code = `DSC-${r.id.toUpperCase().slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        initFulfillment = { phase: "PROCESSING", percentage: 50, discountCode: code, usageCount: 0 };
      } else if (r.type === "LITERATURE") {
        initFulfillment = { phase: "PROCESSING", percentage: 20, printStatus: "Queued for printing" };
      }
      setFulfillmentData((prev) => ({ ...prev, [r.id]: initFulfillment }));

      // If it was a DOCTOR_EDIT request, apply the proposed changes
      if (r.type === "DOCTOR_EDIT" && r.targetEntityId && r.proposedChanges) {
        store.update("doctors", r.targetEntityId, r.proposedChanges);
      }

      // Auto-create a Purchase Order for SAMPLE requests with a product
      if (r.type === "SAMPLE" && r.productId) {
        const product = store.products.find((p) => p.id === r.productId);
        const vendor = store.vendors.length > 0 ? store.vendors[0] : null;
        if (product && vendor) {
          const qty = r.quantity ?? 1;
          const unitPrice = product.pricePerUnit ?? 0;
          const lineTotal = qty * unitPrice;
          const tax = Math.round(lineTotal * 0.14 * 100) / 100;
          const poNumber = store.generatePONumber();
          const now = new Date().toISOString();
          const expectedDate = new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .slice(0, 10);

          const po: PurchaseOrder = {
            id: store.genId("po"),
            number: poNumber,
            vendorId: vendor.id,
            date: now.slice(0, 10),
            expectedDate,
            items: [
              {
                productId: product.id,
                description: `${product.code} - ${product.name} (Sample request ${r.id})`,
                quantity: qty,
                unitPrice,
                total: lineTotal,
              },
            ],
            subtotal: lineTotal,
            tax,
            total: lineTotal + tax,
            status: "DRAFT",
            createdAt: now,
          };

          store.add("purchaseOrders", po);

          // Link the PO number back to the market request
          store.update("marketRequests", r.id, {
            description: r.description + `\n[Auto-PO: ${poNumber}]`,
            linkedPONumber: poNumber,
          } as unknown as Partial<MarketRequest>);

          // Update fulfillment with PO info
          setFulfillmentData((prev) => ({
            ...prev,
            [r.id]: { ...prev[r.id], phase: "PROCESSING", percentage: 50, poStatus: `PO ${poNumber} created`, deliveryStatus: `Expected by ${expectedDate}` },
          }));
        }
      }
    }
    // If not yet fully approved, keep status PENDING (multi-level)
  }

  function openRejectDialog(r: MarketRequest) {
    setRejectingRequest(r);
    setRejectReason("");
    setRejectType("return");
    setRejectDialogOpen(true);
  }

  function handleReject(r: MarketRequest, reason?: string) {
    store.update("marketRequests", r.id, {
      status: "REJECTED",
      approvedById: user.id,
      rejectionReason: reason ?? "Rejected by supervisor",
    });
    addAuditEntry(r.id, "REJECTED", reason ?? "Rejected by supervisor", approvalLevels[r.id] ?? 1);
  }

  function handleRejectWithFlow() {
    if (!rejectingRequest) return;
    const r = rejectingRequest;
    const currentReturns = returnCounts[r.id] ?? 0;

    if (rejectType === "return" && currentReturns < 2) {
      // Return for revision
      const newCount = currentReturns + 1;
      setReturnCounts((prev) => ({ ...prev, [r.id]: newCount }));
      addAuditEntry(r.id, "RETURNED", rejectReason || "Returned for revision", approvalLevels[r.id] ?? 1);
      // Reset approval level so submitter can resubmit
      setApprovalLevels((prev) => ({ ...prev, [r.id]: 0 }));
      // Keep status PENDING so it shows up for revision
    } else {
      // Final reject or auto-reject after 3 returns
      const finalReason =
        currentReturns >= 2
          ? `Auto-rejected after ${currentReturns + 1} returns. Last reason: ${rejectReason || "No reason provided"}`
          : rejectReason || "Final rejection";
      store.update("marketRequests", r.id, {
        status: "REJECTED",
        approvedById: user.id,
        rejectionReason: finalReason,
      });
      addAuditEntry(r.id, "FINAL_REJECTED", finalReason, approvalLevels[r.id] ?? 1);
    }
    setRejectDialogOpen(false);
    setRejectingRequest(null);
  }

  function handleEscalate(r: MarketRequest) {
    const currentLevel = approvalLevels[r.id] ?? 0;
    const newLevel = currentLevel + 1;
    setApprovalLevels((prev) => ({ ...prev, [r.id]: newLevel }));
    addAuditEntry(
      r.id,
      isOverdue(r.createdAt) ? "AUTO_ESCALATED" : "ESCALATED",
      `Escalated from level ${currentLevel} to level ${newLevel}${isOverdue(r.createdAt) ? " (overdue > 48h)" : ""}`,
      newLevel
    );
  }

  function handleMarkFulfilled(r: MarketRequest) {
    store.update("marketRequests", r.id, { status: "FULFILLED" } as Partial<MarketRequest>);
    setFulfillmentData((prev) => ({
      ...prev,
      [r.id]: { ...(prev[r.id] || { phase: "FULFILLED", percentage: 100 }), phase: "FULFILLED", percentage: 100 },
    }));
    addAuditEntry(r.id, "FULFILLED", "Request fulfilled", getRequiredApprovalLevel(r.type, r.amount));
  }

  function handleDelete(r: MarketRequest) {
    store.remove("marketRequests", r.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Requests & Approvals"
        description="Submit, track, and approve market requests through the hierarchy chain."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={ClipboardList}
          title="Total Requests"
          value={myRequests.length}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={Clock}
          title="Pending Approval"
          value={pending}
          iconColor="bg-amber-100 text-amber-700"
        />
        <StatsCard
          icon={CheckCircle2}
          title="Approved / Fulfilled"
          value={approved}
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={DollarSign}
          title="Total Amount"
          value={`EGP ${totalAmount.toLocaleString()}`}
          subtitle={`${rejected} rejected`}
          iconColor="bg-purple-100 text-purple-700"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pending})
          </TabsTrigger>
          <TabsTrigger value="chain">Approval Chain</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* All Requests */}
        <TabsContent value="all" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search requests..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                  { label: "Pending", value: "PENDING" },
                  { label: "Approved", value: "APPROVED" },
                  { label: "Rejected", value: "REJECTED" },
                  { label: "Fulfilled", value: "FULFILLED" },
                ],
              },
              {
                key: "type",
                label: "Type",
                type: "select",
                options: [
                  { label: "Sample", value: "SAMPLE" },
                  { label: "Literature", value: "LITERATURE" },
                  { label: "Event", value: "EVENT" },
                  { label: "Discount", value: "DISCOUNT" },
                  { label: "Doctor Edit", value: "DOCTOR_EDIT" },
                  { label: "Other", value: "OTHER" },
                ],
              },
              {
                key: "priority",
                label: "Priority",
                type: "select",
                options: [
                  { label: "Low", value: "LOW" },
                  { label: "Medium", value: "MEDIUM" },
                  { label: "High", value: "HIGH" },
                  { label: "Urgent", value: "URGENT" },
                ],
              },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
            collapsible
          />

          <DataTable
            columns={[
              {
                key: "type",
                label: "Type",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  return <Badge variant="outline">{r.type}</Badge>;
                },
              },
              {
                key: "requestedById",
                label: "Requester",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  const requester = allUsers.find((u) => u.id === r.requestedById);
                  return (
                    <div>
                      <div className="font-medium text-sm">{requester?.name ?? "—"}</div>
                      <div className="text-[11px] text-slate-500">
                        {requester ? ROLE_LABEL[requester.role] : ""}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "description",
                label: "Description",
                className: "max-w-xs truncate",
              },
              {
                key: "priority",
                label: "Priority",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  return (
                    <Badge
                      variant={
                        r.priority === "URGENT"
                          ? "destructive"
                          : r.priority === "HIGH"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {r.priority}
                    </Badge>
                  );
                },
              },
              {
                key: "amount",
                label: "Amount",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  return (
                    <span className="font-semibold">
                      {r.amount ? `EGP ${r.amount.toLocaleString()}` : "—"}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequestExt;
                  const sla = r.status === "PENDING" ? getSlaInfo(r.createdAt, r.type) : null;
                  const overdue = r.status === "PENDING" && isOverdue(r.createdAt);
                  const fData = fulfillmentData[r.id];
                  return (
                    <div className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={
                            r.status === "APPROVED"
                              ? "success"
                              : r.status === "REJECTED"
                              ? "destructive"
                              : r.status === "FULFILLED"
                              ? "default"
                              : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
                        {overdue && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[9px] px-1.5">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {sla && (
                        <span className={`text-[10px] font-medium ${sla.breached ? "text-red-600" : "text-slate-500"}`}>
                          {sla.breached && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5" />}
                          {sla.text}
                        </span>
                      )}
                      {r.linkedPONumber && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-blue-700 border-blue-300 bg-blue-50">
                          <PackageCheck className="h-3 w-3" />
                          PO: {r.linkedPONumber}
                        </Badge>
                      )}
                      {fData && (r.status === "APPROVED" || r.status === "FULFILLED") && (
                        <div className="w-full min-w-[80px]">
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span className="text-slate-500">{fData.phase}</span>
                            <span className="font-semibold">{fData.percentage}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${fData.percentage === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${fData.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "createdAt",
                label: "Date",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  return (
                    <span className="text-xs">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  );
                },
              },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                render: (_v: unknown, row: unknown) => {
                  const r = row as MarketRequest;
                  const overdueRow = r.status === "PENDING" && isOverdue(r.createdAt);
                  const isSubmitter = r.requestedById === user.id;
                  const extraItems = [
                    ...(canApprove && r.status === "PENDING"
                      ? [
                          {
                            label: "Approve",
                            onClick: () => handleApprove(r),
                            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                          },
                          {
                            label: "Reject",
                            onClick: () => openRejectDialog(r),
                            icon: <XCircle className="h-4 w-4 text-red-600" />,
                            destructive: true,
                          },
                        ]
                      : []),
                    {
                      label: "View Details",
                      onClick: () => setDetailRequest(enrichRequest(r)),
                      icon: <Eye className="h-4 w-4 text-slate-600" />,
                    },
                    ...((r.status === "PENDING" && (overdueRow || isSubmitter))
                      ? [{
                          label: overdueRow ? "Auto-Escalate" : "Escalate to Next Level",
                          onClick: () => handleEscalate(r),
                          icon: <ChevronUp className="h-4 w-4 text-orange-600" />,
                        }]
                      : []),
                    ...(r.status === "APPROVED" && canApprove
                      ? [{
                          label: "Mark Fulfilled",
                          onClick: () => handleMarkFulfilled(r),
                          icon: <PackageCheck className="h-4 w-4 text-green-600" />,
                        }]
                      : []),
                  ];
                  return (
                    <EditDeleteMenu
                      onEdit={
                        r.status === "PENDING" ? () => handleEdit(r) : undefined
                      }
                      canEdit={r.status === "PENDING"}
                      onDelete={() => handleDelete(r)}
                      itemLabel={r.description.slice(0, 40)}
                      extraItems={extraItems}
                    />
                  );
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={
              filteredRequests
                .slice()
                .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)) as unknown as Record<string, unknown>[]
            }
            emptyMessage="No requests match your filters."
            exportable
            exportFilename="market-requests.csv"
          />
        </TabsContent>

        {/* Pending requests */}
        <TabsContent value="pending" className="space-y-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{overdueCount} request{overdueCount > 1 ? "s" : ""} overdue</span>
              <span className="text-orange-600">(pending {"> "}48 hours)</span>
            </div>
          )}
          {myRequests.filter((r) => r.status === "PENDING").length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium">All caught up!</p>
              <p className="text-xs">No pending requests need your attention.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests
                .filter((r) => r.status === "PENDING")
                .sort((a, b) => {
                  const pMap: Record<string, number> = {
                    URGENT: 0,
                    HIGH: 1,
                    MEDIUM: 2,
                    LOW: 3,
                  };
                  return (pMap[a.priority] ?? 2) - (pMap[b.priority] ?? 2);
                })
                .map((r) => {
                  const requester = allUsers.find((u) => u.id === r.requestedById);
                  const doctor = r.doctorId
                    ? store.doctors.find((d) => d.id === r.doctorId)
                    : null;
                  const sla = getSlaInfo(r.createdAt, r.type);
                  const overdue = isOverdue(r.createdAt);
                  const reqLevel = getRequiredApprovalLevel(r.type, r.amount, (r as MarketRequestExt).discountPercent);
                  const curLevel = approvalLevels[r.id] ?? 0;
                  const returns = returnCounts[r.id] ?? 0;
                  return (
                    <Card key={r.id} className={`p-4 ${overdue ? "border-orange-300 bg-orange-50/30" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{r.type}</Badge>
                            <Badge
                              variant={
                                r.priority === "URGENT"
                                  ? "destructive"
                                  : r.priority === "HIGH"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {r.priority}
                            </Badge>
                            {overdue && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px]">
                                Overdue
                              </Badge>
                            )}
                            {returns > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]">
                                Returned x{returns}
                              </Badge>
                            )}
                            {r.amount && (
                              <span className="text-sm font-bold text-slate-700">
                                EGP {r.amount.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* SLA Countdown */}
                          <div className={`mt-1.5 text-[11px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded ${sla.breached ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                            <Timer className="h-3 w-3" />
                            {sla.text}
                          </div>

                          {/* Mini approval chain stepper */}
                          <div className="flex items-center gap-1 mt-2">
                            {APPROVAL_CHAIN.filter((_, i) => i <= reqLevel).map((step, i) => {
                              const completed = i <= curLevel && i > 0;
                              const isCurrent = i === curLevel + 1 || (i === 0 && curLevel === 0);
                              return (
                                <div key={step.level} className="flex items-center gap-1">
                                  {i > 0 && <div className={`w-4 h-0.5 ${completed ? "bg-green-400" : "bg-slate-200"}`} />}
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                                      completed
                                        ? "bg-green-500 border-green-500 text-white"
                                        : isCurrent
                                        ? "bg-blue-100 border-blue-400 text-blue-700"
                                        : "bg-slate-100 border-slate-300 text-slate-400"
                                    }`}
                                    title={`${step.label} (${step.action})`}
                                  >
                                    {completed ? "✓" : i}
                                  </div>
                                </div>
                              );
                            })}
                            <span className="text-[9px] text-slate-400 ml-1">
                              {APPROVAL_CHAIN[Math.min(curLevel + 1, reqLevel)]?.label ?? "Complete"}
                            </span>
                          </div>

                          <p className="text-sm mt-2">{r.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                            <span>By: {requester?.name ?? "—"}</span>
                            {doctor && <span>Doctor: {doctor.name}</span>}
                            <span>
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {r.type === "DOCTOR_EDIT" && r.proposedChanges && (
                            <div className="mt-2 text-xs bg-blue-50 rounded p-2 border border-blue-100">
                              <p className="font-semibold text-blue-700 mb-1">
                                Proposed doctor changes:
                              </p>
                              {Object.entries(r.proposedChanges).map(
                                ([key, val]) =>
                                  val !== undefined && (
                                    <p key={key} className="text-blue-600">
                                      {key}: {String(val)}
                                    </p>
                                  )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 items-end">
                          {canApprove && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => openRejectDialog(r)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleApprove(r)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {(overdue || r.requestedById === user.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 hover:bg-orange-50 text-xs"
                                onClick={() => handleEscalate(r)}
                              >
                                <ChevronUp className="h-3 w-3 mr-1" />
                                {overdue ? "Auto-Escalate" : "Escalate"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-600 text-xs"
                              onClick={() => setDetailRequest(enrichRequest(r))}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Summary row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Overall Approval Rate</p>
                  <p className="text-2xl font-bold">{overallApprovalRate}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Approved Budget</p>
                  <p className="text-2xl font-bold">EGP {totalApprovedBudget.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Timer className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Avg. Processing Time</p>
                  <p className="text-2xl font-bold">{avgProcessingTime} days</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Users className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active Requesters</p>
                  <p className="text-2xl font-bold">{topRequesters.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Request Volume over Time + Pending vs Processed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Request Volume (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-48">
                  {monthlyVolume.map((v) => (
                    <div key={v.month} className="flex-1 flex flex-col items-center justify-end h-full">
                      <span className="text-xs font-semibold text-slate-700 mb-1">{v.count}</span>
                      <div
                        className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors min-h-[4px]"
                        style={{ height: `${(v.count / maxVolumeCount) * 100}%` }}
                        title={`${v.label}: ${v.count} requests`}
                      />
                      <span className="text-[10px] text-slate-500 mt-2 text-center leading-tight">{v.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending vs Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-6 h-48 justify-center">
                  <div className="flex flex-col items-center justify-end h-full">
                    <span className="text-lg font-bold text-amber-700 mb-1">{pendingVsProcessed.pending}</span>
                    <div
                      className="w-16 rounded-t-md bg-amber-400 min-h-[4px]"
                      style={{ height: `${(pendingVsProcessed.pending / (pendingVsProcessed.pending + pendingVsProcessed.processed)) * 100}%` }}
                    />
                    <span className="text-xs text-slate-500 mt-2">Pending</span>
                  </div>
                  <div className="flex flex-col items-center justify-end h-full">
                    <span className="text-lg font-bold text-green-700 mb-1">{pendingVsProcessed.processed}</span>
                    <div
                      className="w-16 rounded-t-md bg-green-500 min-h-[4px]"
                      style={{ height: `${(pendingVsProcessed.processed / (pendingVsProcessed.pending + pendingVsProcessed.processed)) * 100}%` }}
                    />
                    <span className="text-xs text-slate-500 mt-2">Processed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Type Breakdown + Approval Rate by Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Type Breakdown</CardTitle>
                <CardDescription>Distribution of requests by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {typeBreakdown.map((tb) => {
                    const total = tb.count;
                    const maxCount = Math.max(...typeBreakdown.map((t) => t.count), 1);
                    return (
                      <div key={tb.type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{tb.type}</Badge>
                          </div>
                          <span className="font-semibold">{total}</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${(tb.approved / maxCount) * 100}%` }} title={`Approved: ${tb.approved}`} />
                          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(tb.pending / maxCount) * 100}%` }} title={`Pending: ${tb.pending}`} />
                          <div className="h-full bg-red-400 transition-all" style={{ width: `${(tb.rejected / maxCount) * 100}%` }} title={`Rejected: ${tb.rejected}`} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Approved</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Rejected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Approval Rate by Type</CardTitle>
                <CardDescription>Percentage of requests approved per type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {typeBreakdown.map((tb) => (
                    <div key={tb.type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className="text-xs">{tb.type}</Badge>
                        <span className={`font-semibold text-xs ${tb.approvalRate >= 70 ? "text-green-700" : tb.approvalRate >= 50 ? "text-yellow-700" : "text-red-700"}`}>
                          {tb.approvalRate}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${tb.approvalRate >= 70 ? "bg-green-500" : tb.approvalRate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${tb.approvalRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Requesters Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Requesters</CardTitle>
              <CardDescription>Users with the most market requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium text-center">Total</th>
                      <th className="pb-2 font-medium text-center">Approved</th>
                      <th className="pb-2 font-medium text-center">Rejected</th>
                      <th className="pb-2 font-medium text-center">Pending</th>
                      <th className="pb-2 font-medium text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRequesters.map((tr) => (
                      <tr key={tr.name} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 font-medium">{tr.name}</td>
                        <td className="py-2 text-slate-500 text-xs">{tr.role}</td>
                        <td className="py-2 text-center font-semibold">{tr.total}</td>
                        <td className="py-2 text-center">
                          <Badge className="bg-green-100 text-green-700 text-xs">{tr.approved}</Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge className="bg-red-100 text-red-700 text-xs">{tr.rejected}</Badge>
                        </td>
                        <td className="py-2 text-center">
                          <Badge className="bg-amber-100 text-amber-700 text-xs">{tr.pending}</Badge>
                        </td>
                        <td className="py-2 text-right font-semibold">EGP {tr.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* SLA Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SLA Compliance by Request Type</CardTitle>
              <CardDescription>Expected processing times and compliance rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(SLA_DAYS).map(([type, days]) => {
                  const typeRequests = myRequests.filter((r) => r.type === type);
                  const pendingOfType = typeRequests.filter((r) => r.status === "PENDING");
                  const breachedOfType = pendingOfType.filter((r) => getSlaInfo(r.createdAt, r.type).breached);
                  const processedOfType = typeRequests.filter((r) => r.status !== "PENDING");
                  const withinSla = processedOfType.filter((r) => {
                    if (!r.approvedAt) return true;
                    const created = new Date(r.createdAt).getTime();
                    const resolved = new Date(r.approvedAt).getTime();
                    return (resolved - created) <= days * 24 * 60 * 60 * 1000;
                  });
                  const complianceRate = processedOfType.length > 0
                    ? Math.round((withinSla.length / processedOfType.length) * 100)
                    : 100;
                  return (
                    <div key={type} className="flex items-center gap-4">
                      <div className="w-28">
                        <Badge variant="outline" className="text-xs">{type}</Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">SLA: {days} days</span>
                          <div className="flex items-center gap-2">
                            {breachedOfType.length > 0 && (
                              <span className="text-red-600 font-medium">{breachedOfType.length} breached</span>
                            )}
                            <span className={`font-semibold ${complianceRate >= 80 ? "text-green-700" : complianceRate >= 50 ? "text-yellow-700" : "text-red-700"}`}>
                              {complianceRate}% compliant
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${complianceRate >= 80 ? "bg-green-500" : complianceRate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${complianceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>Overdue requests (pending {">"} 48h):</span>
                </div>
                <span className={`text-lg font-bold ${overdueCount > 0 ? "text-red-600" : "text-green-600"}`}>
                  {overdueCount}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cost Analysis: Total Approved Budget by Category</CardTitle>
              <CardDescription>Budget breakdown across request types (approved, pending, rejected)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBudgets.map((cb) => {
                  const totalBudget = cb.approvedBudget + cb.pendingBudget + cb.rejectedBudget;
                  return (
                    <div key={cb.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{cb.type}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-700 font-semibold">EGP {cb.approvedBudget.toLocaleString()}</span>
                          {cb.pendingBudget > 0 && <span className="text-amber-600">+{cb.pendingBudget.toLocaleString()} pending</span>}
                        </div>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${(cb.approvedBudget / maxCategoryBudget) * 100}%` }} title={`Approved: EGP ${cb.approvedBudget.toLocaleString()}`} />
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(cb.pendingBudget / maxCategoryBudget) * 100}%` }} title={`Pending: EGP ${cb.pendingBudget.toLocaleString()}`} />
                        <div className="h-full bg-red-400 transition-all" style={{ width: `${(cb.rejectedBudget / maxCategoryBudget) * 100}%` }} title={`Rejected: EGP ${cb.rejectedBudget.toLocaleString()}`} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-semibold text-slate-700">Total Approved</span>
                  <span className="text-lg font-bold text-green-700">EGP {totalApprovedBudget.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Approved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Rejected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval chain */}
        <TabsContent value="chain">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Workflow</CardTitle>
              <CardDescription>
                Multi-level approval chain: Med Rep → DM → Marketeer → BUM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  {
                    level: 1,
                    label: "Medical Rep",
                    desc: "Initiates request",
                    count: myRequests.filter((r) => {
                      const req = allUsers.find(
                        (u) => u.id === r.requestedById
                      );
                      return req?.role === "MEDICAL_REP";
                    }).length,
                    bg: "bg-blue-50",
                  },
                  {
                    level: 2,
                    label: "District Manager",
                    desc: "First-line approval",
                    count: myRequests.filter(
                      (r) => r.status === "PENDING"
                    ).length,
                    bg: "bg-green-50",
                  },
                  {
                    level: 3,
                    label: "Marketeer",
                    desc: "Regional approval",
                    count: myRequests.filter(
                      (r) => r.status === "APPROVED" && r.amount && r.amount > 5000
                    ).length,
                    bg: "bg-purple-50",
                  },
                  {
                    level: 4,
                    label: "BUM",
                    desc: "Strategic approval",
                    count: myRequests.filter(
                      (r) =>
                        r.status === "APPROVED" && r.amount && r.amount > 20000
                    ).length,
                    bg: "bg-amber-50",
                  },
                ].map((step) => (
                  <div
                    key={step.level}
                    className={`rounded-lg border p-4 ${step.bg}`}
                  >
                    <div className="text-xs text-slate-500">
                      LEVEL {step.level}
                    </div>
                    <div className="font-semibold">{step.label}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {step.desc}
                    </div>
                    <div className="mt-3 text-2xl font-bold">{step.count}</div>
                    <div className="text-xs">Requests</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-500">
                <span className="font-medium">Rep</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">DM</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">Marketeer</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">BUM</span>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-sm mb-3">
                  Recent Approval Actions
                </h4>
                <div className="space-y-2">
                  {myRequests
                    .filter(
                      (r) =>
                        r.status === "APPROVED" || r.status === "REJECTED"
                    )
                    .slice(0, 6)
                    .map((r) => {
                      const rExt = r as MarketRequestExt;
                      const requester = allUsers.find(
                        (u) => u.id === r.requestedById
                      );
                      const approver = r.approvedById
                        ? allUsers.find((u) => u.id === r.approvedById)
                        : null;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded border p-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {requester?.name ?? "—"}
                            </span>{" "}
                            — {r.type} — {r.description.slice(0, 50)}
                            {rExt.linkedPONumber && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-blue-700 border-blue-300 bg-blue-50">
                                <PackageCheck className="h-3 w-3" />
                                PO: {rExt.linkedPONumber}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {approver && (
                              <span className="text-[11px] text-slate-500">
                                by {approver.name}
                              </span>
                            )}
                            <Badge
                              variant={
                                r.status === "APPROVED"
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              {r.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Request" : "New Market Request"}
        description="Submit a request for samples, events, sponsorships, or other market needs."
        fields={formFields}
        initialData={
          editing
            ? {
                type: editing.type,
                priority: editing.priority,
                description: editing.description,
                doctorId: editing.doctorId ?? "",
                productId: editing.productId ?? "",
                buId: editing.buId ?? "",
                quantity: editing.quantity ?? "",
                amount: editing.amount ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : "Submit Request"}
        size="lg"
      />
    </div>
  );
}

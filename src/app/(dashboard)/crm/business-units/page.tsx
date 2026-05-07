"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Building, Plus, Users, Package, UserCog,
  MapPin, Pencil, Trash2, Eye, X, CheckCircle, Clock, Grid3x3,
  ShieldCheck, FileText, ChevronRight, ChevronDown, Search, Check, XCircle,
  Briefcase, BarChart3, DollarSign, Activity, AlertTriangle,
  Network, UserPlus, ExternalLink, Merge, GripVertical,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser } from "@/lib/user-context";
import { useNotificationCenter } from "@/lib/notification-context";
import { useAuditLogger } from "@/lib/audit-logger";

// ─── Local Interfaces ───────────────────────────────────────────────────────

interface BUMember {
  userId: string;
  role: string;
}

interface LocalBusinessUnit {
  id: string;
  name: string;
  code: string;
  description: string;
  managerId: string;
  color: string;
  status: "ACTIVE" | "INACTIVE";
  members: BUMember[];
  productIds: string[];
  territoryIds: string[];
}

interface ProductRepAssignment {
  repId: string;
  productId: string;
}

interface ApprovalLogEntry {
  id: string;
  buId: string;
  action: string;
  performedBy: string;
  date: string;
  details: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
}

// ─── Role Hierarchy Labels ──────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  BUM: "Business Unit Manager",
  MARKETEER: "Marketeer",
  DISTRICT_MANAGER: "District Manager",
  MEDICAL_REP: "Medical Representative",
};

const ROLE_HIERARCHY_ORDER: string[] = ["BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"];

const ROLE_COLORS: Record<string, string> = {
  BUM: "bg-purple-100 text-purple-800",
  MARKETEER: "bg-blue-100 text-blue-800",
  DISTRICT_MANAGER: "bg-amber-100 text-amber-800",
  MEDICAL_REP: "bg-green-100 text-green-800",
};

const BU_COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#10b981" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Indigo", value: "#6366f1" },
];

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_BUS: LocalBusinessUnit[] = [
  {
    id: "lbu-cv",
    name: "Cardiovascular BU",
    code: "BU-CV",
    description: "Cardiology, hypertension, lipid-lowering and heart-failure therapeutics. Includes Cardioprex, Crestor, Concor, and Plavix product lines.",
    managerId: "u-bum",
    color: "#ef4444",
    status: "ACTIVE",
    members: [
      { userId: "u-bum", role: "BUM" },
      { userId: "u-mkt-1", role: "MARKETEER" },
      { userId: "u-dm-1", role: "DISTRICT_MANAGER" },
      { userId: "u-rep-1", role: "MEDICAL_REP" },
    ],
    productIds: ["p-cardio-1", "p-cardio-2", "p-cardio-3"],
    territoryIds: ["reg-cairo", "reg-alex"],
  },
  {
    id: "lbu-ai",
    name: "Anti-Infectives BU",
    code: "BU-AI",
    description: "Antibiotics, antifungals and anti-infective products. Includes Augmentin, Amoxil, and Zithromax.",
    managerId: "u-bum",
    color: "#3b82f6",
    status: "ACTIVE",
    members: [
      { userId: "u-bum", role: "BUM" },
      { userId: "u-mkt-1", role: "MARKETEER" },
      { userId: "u-dm-1", role: "DISTRICT_MANAGER" },
    ],
    productIds: ["p-prim-1"],
    territoryIds: ["reg-cairo"],
  },
  {
    id: "lbu-gi",
    name: "GI & Metabolic BU",
    code: "BU-GI",
    description: "Gastrointestinal and metabolic disorder therapies. Includes Omepak, Glimaryl, and Nexium product lines.",
    managerId: "u-bum",
    color: "#10b981",
    status: "ACTIVE",
    members: [
      { userId: "u-bum", role: "BUM" },
      { userId: "u-rep-1", role: "MEDICAL_REP" },
    ],
    productIds: ["p-diab-1", "p-diab-2"],
    territoryIds: ["reg-cairo", "reg-delta"],
  },
];

const SEED_APPROVAL_LOGS: ApprovalLogEntry[] = [
  { id: "al-1", buId: "lbu-cv", action: "Member Added", performedBy: "u-bum", date: new Date(Date.now() - 2 * 86400000).toISOString(), details: "Mohamed El-Sayed added as Medical Rep", status: "APPROVED" },
  { id: "al-2", buId: "lbu-cv", action: "Product Assigned", performedBy: "u-bum", date: new Date(Date.now() - 5 * 86400000).toISOString(), details: "Cardioprex 500mg assigned to portfolio", status: "APPROVED" },
  { id: "al-3", buId: "lbu-cv", action: "Territory Added", performedBy: "u-admin", date: new Date(Date.now() - 10 * 86400000).toISOString(), details: "Cairo Region assigned to BU coverage", status: "APPROVED" },
  { id: "al-4", buId: "lbu-ai", action: "Member Removed", performedBy: "u-bum", date: new Date(Date.now() - 3 * 86400000).toISOString(), details: "Rep reassigned from Anti-Infectives to Cardiovascular", status: "APPROVED" },
  { id: "al-5", buId: "lbu-ai", action: "BU Created", performedBy: "u-admin", date: new Date(Date.now() - 30 * 86400000).toISOString(), details: "Anti-Infectives BU created with initial product portfolio", status: "APPROVED" },
  { id: "al-6", buId: "lbu-gi", action: "Product Removed", performedBy: "u-bum", date: new Date(Date.now() - 7 * 86400000).toISOString(), details: "Discontinued product removed from GI portfolio", status: "REJECTED" },
  { id: "al-7", buId: "lbu-gi", action: "Territory Added", performedBy: "u-bum", date: new Date(Date.now() - 15 * 86400000).toISOString(), details: "Delta Region expansion requested", status: "PENDING" },
  { id: "al-8", buId: "lbu-cv", action: "Manager Changed", performedBy: "u-admin", date: new Date(Date.now() - 20 * 86400000).toISOString(), details: "Dr. Hossam Tarek appointed as BUM", status: "APPROVED" },
];

const SEED_PRODUCT_REP_ASSIGNMENTS: ProductRepAssignment[] = [
  { repId: "u-rep-1", productId: "p-cardio-1" },
  { repId: "u-rep-1", productId: "p-cardio-2" },
  { repId: "u-dm-1", productId: "p-cardio-1" },
  { repId: "u-dm-1", productId: "p-cardio-3" },
];

// ─── Seed revenue data for KPIs ─────────────────────────────────────────────

const BU_REVENUE: Record<string, number> = {
  "lbu-cv": 4250000,
  "lbu-ai": 1680000,
  "lbu-gi": 2150000,
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function BusinessUnitsPage() {
  const store = useApiDataStore();
  const { user, allUsers } = useCurrentUser();
  const canEdit = user.role === "ADMIN" || user.role === "BUM" || user.role === "MARKETEER";
  const { addNotification } = useNotificationCenter();
  const { logAction } = useAuditLogger();

  // ── Main Tab State ──
  const [activeTab, setActiveTab] = useState<"list" | "detail" | "assignment">("list");
  const [search, setSearch] = useState("");

  // ── Local BU State ──
  const [businessUnits, setBusinessUnits] = useState<LocalBusinessUnit[]>(SEED_BUS);
  const [approvalLogs] = useState<ApprovalLogEntry[]>(SEED_APPROVAL_LOGS);
  const [productRepAssignments, setProductRepAssignments] = useState<ProductRepAssignment[]>(SEED_PRODUCT_REP_ASSIGNMENTS);

  // ── Form State ──
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocalBusinessUnit | null>(null);

  // ── Detail State ──
  const [selectedBU, setSelectedBU] = useState<LocalBusinessUnit | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState<"overview" | "members" | "products" | "territories" | "team-structure" | "approvals">("overview");

  // ── Team Structure (Org Chart) State ──
  const [vacancyAssignOpen, setVacancyAssignOpen] = useState(false);
  const [vacancyRole, setVacancyRole] = useState<string>("");
  const [vacancyParentId, setVacancyParentId] = useState<string>("");
  const [vacancyAssignUserId, setVacancyAssignUserId] = useState<string>("");
  const [personDetailOpen, setPersonDetailOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");

  // ── Member Add Dialog ──
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEDICAL_REP");

  // ── Product/Territory Add Dialog ──
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addTerritoryOpen, setAddTerritoryOpen] = useState(false);

  // ── BU Creation Wizard State ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardBasicInfo, setWizardBasicInfo] = useState<{
    name: string; code: string; description: string; managerId: string; color: string; status: string;
  }>({ name: "", code: "", description: "", managerId: "", color: "#3b82f6", status: "ACTIVE" });
  const [wizardSelectedProducts, setWizardSelectedProducts] = useState<Set<string>>(new Set());
  const [wizardSelectedTerritories, setWizardSelectedTerritories] = useState<Set<string>>(new Set());
  const [wizardBrickAssignments, setWizardBrickAssignments] = useState<Record<string, string>>({});
  const [wizardProductSearch, setWizardProductSearch] = useState("");
  const [wizardTerritorySearch, setWizardTerritorySearch] = useState("");
  const [wizardExpandedNodes, setWizardExpandedNodes] = useState<Set<string>>(new Set());
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});

  // ── Brick Management State (for wizard step 3 enhancements) ──
  const [brickMergeMode, setBrickMergeMode] = useState(false);
  const [brickMergeSelection, setBrickMergeSelection] = useState<Set<string>>(new Set());
  const [brickMergeName, setBrickMergeName] = useState("");
  const [brickMergeDialogOpen, setBrickMergeDialogOpen] = useState(false);
  const [mergedBricks, setMergedBricks] = useState<Array<{ id: string; name: string; sourceIds: string[]; parentId: string }>>([]);
  const [brickTerritoryAssignments, setBrickTerritoryAssignments] = useState<Record<string, string>>({});

  // ── Territory Hierarchy Expanded State (for detail view) ──
  const [territoryExpandedNodes, setTerritoryExpandedNodes] = useState<Set<string>>(new Set());

  // ── Assignment Tab State ──
  const [assignmentBUId, setAssignmentBUId] = useState<string>(SEED_BUS[0]?.id || "");

  // ── Derived Data ──
  const activeBUs = useMemo(() => businessUnits.filter((bu) => bu.status === "ACTIVE"), [businessUnits]);
  const totalMembers = useMemo(() => {
    const ids = new Set<string>();
    businessUnits.forEach((bu) => bu.members.forEach((m) => ids.add(m.userId)));
    return ids.size;
  }, [businessUnits]);
  const totalProducts = useMemo(() => {
    const ids = new Set<string>();
    businessUnits.forEach((bu) => bu.productIds.forEach((pid) => ids.add(pid)));
    return ids.size;
  }, [businessUnits]);

  // ── getRepProducts: returns product IDs assigned to a given rep ──
  const getRepProducts = useCallback(
    (repId: string): string[] => {
      return productRepAssignments
        .filter((a) => a.repId === repId)
        .map((a) => a.productId);
    },
    [productRepAssignments]
  );

  // ── BU Performance Metrics (for the selected BU overview) ──
  const buPerformanceMetrics = useMemo(() => {
    if (!selectedBU) return null;
    const repMembers = selectedBU.members.filter((m) => m.role === "MEDICAL_REP");
    const activeMembers = selectedBU.members.length;
    const inactiveMembers = selectedBU.status === "INACTIVE" ? activeMembers : 0;
    const revenue = BU_REVENUE[selectedBU.id] || 0;
    const revenuePerRep = repMembers.length > 0 ? Math.round(revenue / repMembers.length) : 0;

    // Products per rep (avg) — based on product-rep assignments within this BU
    const repIds = new Set(repMembers.map((m) => m.userId));
    const buProductIds = new Set(selectedBU.productIds);
    let totalAssignedProducts = 0;
    repMembers.forEach((m) => {
      const count = productRepAssignments.filter(
        (a) => a.repId === m.userId && buProductIds.has(a.productId)
      ).length;
      totalAssignedProducts += count;
    });
    const productsPerRep = repMembers.length > 0 ? (totalAssignedProducts / repMembers.length) : 0;

    // Territory coverage: % of BU territories that have at least one assigned rep
    const coveredTerritories = selectedBU.territoryIds.filter((tid) => {
      const t = store.territories.find((tr) => tr.id === tid);
      return t && t.assignedRepIds.length > 0;
    }).length;
    const territoryCoverage = selectedBU.territoryIds.length > 0
      ? Math.round((coveredTerritories / selectedBU.territoryIds.length) * 100)
      : 0;

    // Territories with no assigned rep
    const uncoveredTerritories = selectedBU.territoryIds.filter((tid) => {
      const t = store.territories.find((tr) => tr.id === tid);
      return !t || t.assignedRepIds.length === 0;
    });

    return {
      revenuePerRep,
      productsPerRep,
      territoryCoverage,
      activeMembers,
      inactiveMembers: inactiveMembers,
      repsWithNoProducts: repMembers.filter((m) => {
        const count = productRepAssignments.filter(
          (a) => a.repId === m.userId && buProductIds.has(a.productId)
        ).length;
        return count === 0;
      }),
      uncoveredTerritories,
    };
  }, [selectedBU, productRepAssignments, store.territories]);

  // ── Filtered BUs for main table ──
  const filteredBUs = useMemo(() => {
    if (!search) return businessUnits;
    const q = search.toLowerCase();
    return businessUnits.filter(
      (bu) =>
        bu.name.toLowerCase().includes(q) ||
        bu.code.toLowerCase().includes(q) ||
        bu.description.toLowerCase().includes(q)
    );
  }, [businessUnits, search]);

  // ── Form Fields ──
  const managerOptions = allUsers
    .filter((u) => u.role === "BUM" || u.role === "ADMIN")
    .map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }));

  const formFields: EntityField[] = [
    { name: "name", label: "Business Unit Name", type: "text", required: true, placeholder: "e.g. Oncology BU" },
    { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. BU-ONC" },
    { name: "description", label: "Description", type: "textarea", placeholder: "Therapeutic areas and coverage", fullWidth: true },
    { name: "managerId", label: "Business Unit Manager", type: "select", required: true, options: managerOptions },
    { name: "color", label: "Color", type: "select", options: BU_COLORS, defaultValue: "#3b82f6" },
    { name: "status", label: "Status", type: "select", required: true, options: [
      { label: "Active", value: "ACTIVE" },
      { label: "Inactive", value: "INACTIVE" },
    ], defaultValue: "ACTIVE" },
  ];

  // ── CRUD Handlers ──

  function handleCreateOrUpdate(data: EntityFormData) {
    if (editing) {
      setBusinessUnits((prev) =>
        prev.map((bu) =>
          bu.id === editing.id
            ? {
                ...bu,
                name: String(data.name),
                code: String(data.code),
                description: String(data.description ?? ""),
                managerId: String(data.managerId),
                color: String(data.color || "#3b82f6"),
                status: String(data.status) as "ACTIVE" | "INACTIVE",
              }
            : bu
        )
      );
      try {
        logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: editing.id, entityName: editing.name, details: `${user.name} updated Business Unit ${editing.name}` });
      } catch { /* ignore */ }
    } else {
      const newId = `lbu-${Date.now().toString(36)}`;
      const newBU: LocalBusinessUnit = {
        id: newId,
        name: String(data.name),
        code: String(data.code),
        description: String(data.description ?? ""),
        managerId: String(data.managerId),
        color: String(data.color || "#3b82f6"),
        status: String(data.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
        members: [],
        productIds: [],
        territoryIds: [],
      };
      setBusinessUnits((prev) => [...prev, newBU]);
      try {
        logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "CREATE", module: "CRM", entity: "BusinessUnit", entityId: newId, entityName: String(data.name), details: `${user.name} created Business Unit ${data.name}` });
      } catch { /* ignore */ }
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDeleteBU(buId: string) {
    const bu = businessUnits.find((b) => b.id === buId);
    setBusinessUnits((prev) => prev.filter((b) => b.id !== buId));
    if (selectedBU?.id === buId) {
      setSelectedBU(null);
      setDetailDialogOpen(false);
    }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "DELETE", module: "CRM", entity: "BusinessUnit", entityId: buId, entityName: bu?.name, details: `${user.name} deleted Business Unit ${bu?.name ?? buId}` });
    } catch { /* ignore */ }
  }

  function handleOpenDetail(bu: LocalBusinessUnit) {
    setSelectedBU(bu);
    setDetailSubTab("overview");
    setDetailDialogOpen(true);
  }

  // ── Member Handlers ──
  function handleAddMember() {
    if (!selectedBU || !newMemberUserId) return;
    const memberUser = allUsers.find((u) => u.id === newMemberUserId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id
          ? { ...bu, members: [...bu.members.filter((m) => m.userId !== newMemberUserId), { userId: newMemberUserId, role: newMemberRole }] }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev ? { ...prev, members: [...prev.members.filter((m) => m.userId !== newMemberUserId), { userId: newMemberUserId, role: newMemberRole }] } : prev
    );
    try {
      addNotification({ type: "INFO", title: "Member added to BU", message: `${memberUser?.name ?? newMemberUserId} added to ${selectedBU.name} as ${ROLE_LABELS[newMemberRole] ?? newMemberRole}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} added ${memberUser?.name ?? newMemberUserId} to ${selectedBU.name} as ${ROLE_LABELS[newMemberRole] ?? newMemberRole}` });
    } catch { /* ignore */ }
    setAddMemberOpen(false);
    setNewMemberUserId("");
    setNewMemberRole("MEDICAL_REP");
  }

  function handleRemoveMember(userId: string) {
    if (!selectedBU) return;
    const memberUser = allUsers.find((u) => u.id === userId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id
          ? { ...bu, members: bu.members.filter((m) => m.userId !== userId) }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) } : prev
    );
    try {
      addNotification({ type: "WARNING", title: "Member removed from BU", message: `${memberUser?.name ?? userId} removed from ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} removed ${memberUser?.name ?? userId} from ${selectedBU.name}` });
    } catch { /* ignore */ }
  }

  // ── Vacancy Assignment Handler ──
  function handleAssignVacancy() {
    if (!selectedBU || !vacancyAssignUserId || !vacancyRole) return;
    const memberUser = allUsers.find((u) => u.id === vacancyAssignUserId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id
          ? { ...bu, members: [...bu.members.filter((m) => m.userId !== vacancyAssignUserId), { userId: vacancyAssignUserId, role: vacancyRole }] }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev ? { ...prev, members: [...prev.members.filter((m) => m.userId !== vacancyAssignUserId), { userId: vacancyAssignUserId, role: vacancyRole }] } : prev
    );
    try {
      addNotification({ type: "INFO", title: "Vacancy filled", message: `${memberUser?.name ?? vacancyAssignUserId} assigned as ${ROLE_LABELS[vacancyRole] ?? vacancyRole} in ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} filled vacancy: ${memberUser?.name ?? vacancyAssignUserId} as ${ROLE_LABELS[vacancyRole] ?? vacancyRole}` });
    } catch { /* ignore */ }
    setVacancyAssignOpen(false);
    setVacancyAssignUserId("");
    setVacancyRole("");
    setVacancyParentId("");
  }

  // ── Brick Merge Handler ──
  function handleBrickMerge() {
    if (brickMergeSelection.size < 2 || !brickMergeName.trim()) return;
    const sourceIds = Array.from(brickMergeSelection);
    const firstBrick = store.territories.find((t) => t.id === sourceIds[0]);
    const newMergedBrick = {
      id: `merged-${Date.now().toString(36)}`,
      name: brickMergeName.trim(),
      sourceIds,
      parentId: firstBrick?.parentId ?? "",
    };
    setMergedBricks((prev) => [...prev, newMergedBrick]);
    // Auto-select the merged brick and deselect sources
    setWizardSelectedTerritories((prev) => {
      const next = new Set(prev);
      sourceIds.forEach((id) => next.delete(id));
      next.add(newMergedBrick.id);
      return next;
    });
    setBrickMergeSelection(new Set());
    setBrickMergeName("");
    setBrickMergeDialogOpen(false);
    setBrickMergeMode(false);
  }

  // ── Product Handlers ──
  function handleAddProduct(productId: string) {
    if (!selectedBU) return;
    const product = store.products.find((p) => p.id === productId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id && !bu.productIds.includes(productId)
          ? { ...bu, productIds: [...bu.productIds, productId] }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev && !prev.productIds.includes(productId)
        ? { ...prev, productIds: [...prev.productIds, productId] }
        : prev
    );
    try {
      addNotification({ type: "INFO", title: "Product assigned to BU", message: `${product?.name ?? productId} assigned to ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} assigned product ${product?.name ?? productId} to ${selectedBU.name}` });
    } catch { /* ignore */ }
  }

  function handleRemoveProduct(productId: string) {
    if (!selectedBU) return;
    const product = store.products.find((p) => p.id === productId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id
          ? { ...bu, productIds: bu.productIds.filter((id) => id !== productId) }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev ? { ...prev, productIds: prev.productIds.filter((id) => id !== productId) } : prev
    );
    try {
      addNotification({ type: "WARNING", title: "Product unassigned from BU", message: `${product?.name ?? productId} removed from ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} removed product ${product?.name ?? productId} from ${selectedBU.name}` });
    } catch { /* ignore */ }
  }

  // ── Territory Handlers ──
  function handleAddTerritory(territoryId: string) {
    if (!selectedBU) return;
    const territory = store.territories.find((t) => t.id === territoryId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id && !bu.territoryIds.includes(territoryId)
          ? { ...bu, territoryIds: [...bu.territoryIds, territoryId] }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev && !prev.territoryIds.includes(territoryId)
        ? { ...prev, territoryIds: [...prev.territoryIds, territoryId] }
        : prev
    );
    try {
      addNotification({ type: "INFO", title: "Territory assigned to BU", message: `${territory?.name ?? territoryId} assigned to ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} assigned territory ${territory?.name ?? territoryId} to ${selectedBU.name}` });
    } catch { /* ignore */ }
  }

  function handleRemoveTerritory(territoryId: string) {
    if (!selectedBU) return;
    const territory = store.territories.find((t) => t.id === territoryId);
    setBusinessUnits((prev) =>
      prev.map((bu) =>
        bu.id === selectedBU.id
          ? { ...bu, territoryIds: bu.territoryIds.filter((id) => id !== territoryId) }
          : bu
      )
    );
    setSelectedBU((prev) =>
      prev ? { ...prev, territoryIds: prev.territoryIds.filter((id) => id !== territoryId) } : prev
    );
    try {
      addNotification({ type: "WARNING", title: "Territory unassigned from BU", message: `${territory?.name ?? territoryId} removed from ${selectedBU.name}.`, module: "CRM", entityType: "BusinessUnit", entityId: selectedBU.id, actionUrl: "/crm/business-units" });
    } catch { /* ignore */ }
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "UPDATE", module: "CRM", entity: "BusinessUnit", entityId: selectedBU.id, entityName: selectedBU.name, details: `${user.name} removed territory ${territory?.name ?? territoryId} from ${selectedBU.name}` });
    } catch { /* ignore */ }
  }

  // ── Product-Rep Assignment Handlers ──
  function toggleProductRepAssignment(repId: string, productId: string) {
    setProductRepAssignments((prev) => {
      const exists = prev.some((a) => a.repId === repId && a.productId === productId);
      if (exists) {
        return prev.filter((a) => !(a.repId === repId && a.productId === productId));
      }
      return [...prev, { repId, productId }];
    });
  }

  function handleAssignAll(buId: string) {
    const bu = businessUnits.find((b) => b.id === buId);
    if (!bu) return;
    const reps = bu.members.filter((m) => m.role === "MEDICAL_REP");
    const newAssignments: ProductRepAssignment[] = [];
    reps.forEach((rep) => {
      bu.productIds.forEach((pid) => {
        if (!productRepAssignments.some((a) => a.repId === rep.userId && a.productId === pid)) {
          newAssignments.push({ repId: rep.userId, productId: pid });
        }
      });
    });
    setProductRepAssignments((prev) => [...prev, ...newAssignments]);
  }

  function handleUnassignAll(buId: string) {
    const bu = businessUnits.find((b) => b.id === buId);
    if (!bu) return;
    const repIds = new Set(bu.members.filter((m) => m.role === "MEDICAL_REP").map((m) => m.userId));
    const productIds = new Set(bu.productIds);
    setProductRepAssignments((prev) =>
      prev.filter((a) => !(repIds.has(a.repId) && productIds.has(a.productId)))
    );
  }

  // ── Wizard Helpers ──
  function resetWizard() {
    setWizardStep(1);
    setWizardBasicInfo({ name: "", code: "", description: "", managerId: "", color: "#3b82f6", status: "ACTIVE" });
    setWizardSelectedProducts(new Set());
    setWizardSelectedTerritories(new Set());
    setWizardBrickAssignments({});
    setWizardProductSearch("");
    setWizardTerritorySearch("");
    setWizardExpandedNodes(new Set());
    setWizardErrors({});
    setBrickMergeMode(false);
    setBrickMergeSelection(new Set());
    setBrickMergeName("");
    setBrickMergeDialogOpen(false);
    setMergedBricks([]);
    setBrickTerritoryAssignments({});
  }

  function validateWizardStep(step: number): boolean {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!wizardBasicInfo.name.trim()) errors.name = "Name is required";
      if (!wizardBasicInfo.code.trim()) errors.code = "Code is required";
      if (!wizardBasicInfo.managerId) errors.managerId = "Manager is required";
    }
    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleWizardCreate() {
    const newId = `lbu-${Date.now().toString(36)}`;
    const newBU: LocalBusinessUnit = {
      id: newId,
      name: wizardBasicInfo.name,
      code: wizardBasicInfo.code,
      description: wizardBasicInfo.description,
      managerId: wizardBasicInfo.managerId,
      color: wizardBasicInfo.color || "#3b82f6",
      status: (wizardBasicInfo.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
      members: [],
      productIds: Array.from(wizardSelectedProducts),
      territoryIds: Array.from(wizardSelectedTerritories),
    };
    setBusinessUnits((prev) => [...prev, newBU]);
    try {
      logAction({ userId: user.id, userName: user.name, userRole: user.role, action: "CREATE", module: "CRM", entity: "BusinessUnit", entityId: newId, entityName: wizardBasicInfo.name, details: `${user.name} created Business Unit ${wizardBasicInfo.name} via wizard` });
    } catch { /* ignore */ }
    setWizardOpen(false);
    resetWizard();
  }

  function toggleWizardTerritory(id: string) {
    setWizardSelectedTerritories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Also remove assignment
        setWizardBrickAssignments((ba) => {
          const copy = { ...ba };
          delete copy[id];
          return copy;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleWizardExpand(id: string) {
    setWizardExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Territory Hierarchy Builder ──
  interface TerritoryTreeNode {
    territory: typeof store.territories[0];
    children: TerritoryTreeNode[];
    repCount: number;
    doctorCount: number;
  }

  function buildTerritoryTree(
    territoryIds: string[],
    allTerritories: typeof store.territories,
    doctors: typeof store.doctors
  ): TerritoryTreeNode[] {
    const idSet = new Set(territoryIds);
    // Collect all ancestor IDs needed
    const neededIds = new Set<string>();
    function addAncestors(tid: string) {
      const t = allTerritories.find((x) => x.id === tid);
      if (!t) return;
      neededIds.add(t.id);
      if (t.parentId) addAncestors(t.parentId);
    }
    territoryIds.forEach((tid) => addAncestors(tid));

    const relevantTerritories = allTerritories.filter((t) => neededIds.has(t.id));
    const childrenMap = new Map<string | "root", typeof allTerritories>();
    relevantTerritories.forEach((t) => {
      const key = t.parentId ?? "root";
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(t);
    });

    function buildNode(t: typeof allTerritories[0]): TerritoryTreeNode {
      const kids = (childrenMap.get(t.id) || []).map(buildNode);
      const directDoctors = doctors.filter((d) => d.brickId === t.id).length;
      const directReps = t.assignedRepIds.length;
      const childDoctors = kids.reduce((s, k) => s + k.doctorCount, 0);
      const childReps = kids.reduce((s, k) => s + k.repCount, 0);
      return {
        territory: t,
        children: kids,
        repCount: directReps + childReps,
        doctorCount: directDoctors + childDoctors,
      };
    }

    return (childrenMap.get("root") || []).map(buildNode);
  }

  // Build hierarchy for selected BU territory tab
  const selectedBUTerritoryTree = useMemo(() => {
    if (!selectedBU) return [];
    return buildTerritoryTree(selectedBU.territoryIds, store.territories, store.doctors);
  }, [selectedBU, store.territories, store.doctors]);

  function toggleTerritoryExpand(id: string) {
    setTerritoryExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── DataTable Columns ──
  const buColumns: Column<LocalBusinessUnit>[] = [
    {
      key: "code",
      label: "Code",
      sortable: true,
      render: (_v: string, row: LocalBusinessUnit) => (
        <Badge className="font-mono text-xs" style={{ backgroundColor: `${row.color}20`, color: row.color, borderColor: row.color }}>
          {row.code}
        </Badge>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (_v: string, row: LocalBusinessUnit) => (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "managerId",
      label: "Manager",
      sortable: true,
      render: (v: string) => {
        const mgr = allUsers.find((u) => u.id === v);
        return mgr ? (
          <div className="flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{mgr.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
        );
      },
    },
    {
      key: "members",
      label: "Members",
      sortable: false,
      render: (_v: unknown, row: LocalBusinessUnit) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.members.length}</span>
        </div>
      ),
    },
    {
      key: "productIds",
      label: "Products",
      sortable: false,
      render: (_v: unknown, row: LocalBusinessUnit) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.productIds.length}</span>
        </div>
      ),
    },
    {
      key: "territoryIds",
      label: "Territories",
      sortable: false,
      render: (_v: unknown, row: LocalBusinessUnit) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.territoryIds.length}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v: string) => (
        <Badge className={v === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
          {v === "ACTIVE" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_v: string, row: LocalBusinessUnit) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleOpenDetail(row); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditing(row); setFormOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteBU(row.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ── Selected BU data for detail ──
  const selectedBUProducts = useMemo(() => {
    if (!selectedBU) return [];
    return store.products.filter((p) => selectedBU.productIds.includes(p.id));
  }, [selectedBU, store.products]);

  const selectedBUTerritories = useMemo(() => {
    if (!selectedBU) return [];
    return store.territories.filter((t) => selectedBU.territoryIds.includes(t.id));
  }, [selectedBU, store.territories]);

  const selectedBULogs = useMemo(() => {
    if (!selectedBU) return [];
    return approvalLogs.filter((l) => l.buId === selectedBU.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedBU, approvalLogs]);

  // ── Assignment tab data ──
  const assignmentBU = useMemo(() => businessUnits.find((bu) => bu.id === assignmentBUId), [businessUnits, assignmentBUId]);

  const assignmentReps = useMemo(() => {
    if (!assignmentBU) return [];
    return assignmentBU.members
      .filter((m) => m.role === "MEDICAL_REP")
      .map((m) => {
        const u = allUsers.find((usr) => usr.id === m.userId);
        return u ? { id: u.id, name: u.name } : { id: m.userId, name: m.userId };
      });
  }, [assignmentBU, allUsers]);

  const assignmentProducts = useMemo(() => {
    if (!assignmentBU) return [];
    return store.products.filter((p) => assignmentBU.productIds.includes(p.id));
  }, [assignmentBU, store.products]);

  // ── Render ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Unit Management"
        description="Organize the sales force by Business Unit — assign managers, members, products, and territories."
        actions={
          canEdit && activeTab === "list" ? (
            <Button onClick={() => { resetWizard(); setWizardOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Business Unit
            </Button>
          ) : undefined
        }
      />

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2">
        <Button variant={activeTab === "list" ? "default" : "ghost"} onClick={() => setActiveTab("list")} className="gap-2">
          <Building className="h-4 w-4" /> Business Units
        </Button>
        <Button variant={activeTab === "detail" ? "default" : "ghost"} onClick={() => {
          if (businessUnits.length > 0 && !selectedBU) {
            setSelectedBU(businessUnits[0]);
          }
          setActiveTab("detail");
        }} className="gap-2">
          <Briefcase className="h-4 w-4" /> BU Detail
        </Button>
        <Button variant={activeTab === "assignment" ? "default" : "ghost"} onClick={() => setActiveTab("assignment")} className="gap-2">
          <Grid3x3 className="h-4 w-4" /> Product-Rep Assignment
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: Business Units List
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "list" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard icon={Building} title="Total Business Units" value={businessUnits.length} subtitle="All registered BUs" iconColor="bg-blue-100 text-blue-600" />
            <StatsCard icon={CheckCircle} title="Active BUs" value={activeBUs.length} subtitle={`${businessUnits.length - activeBUs.length} inactive`} iconColor="bg-green-100 text-green-600" />
            <StatsCard icon={Users} title="Total Members" value={totalMembers} subtitle="Across all BUs" iconColor="bg-purple-100 text-purple-600" />
            <StatsCard icon={Package} title="Products Assigned" value={totalProducts} subtitle="Unique products in BUs" iconColor="bg-orange-100 text-orange-600" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* BU Table */}
          <Card>
            <CardContent className="p-0">
              <DataTable<LocalBusinessUnit>
                columns={buColumns}
                data={filteredBUs}
                searchable={false}
                pagination
                onRowClick={(row) => handleOpenDetail(row)}
                emptyMessage="No business units found."
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: BU Detail
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "detail" && (
        <>
          {/* BU Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            {businessUnits.map((bu) => (
              <Button
                key={bu.id}
                variant={selectedBU?.id === bu.id ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => { setSelectedBU(bu); setDetailSubTab("overview"); }}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bu.color }} />
                {bu.name}
              </Button>
            ))}
          </div>

          {selectedBU ? (
            <>
              {/* Detail Sub-tabs */}
              <div className="flex gap-1 border-b pb-0 flex-wrap">
                {([
                  { key: "overview", label: "Overview", icon: BarChart3 },
                  { key: "team-structure", label: "Team Structure", icon: Network },
                  { key: "members", label: "Members", icon: Users },
                  { key: "products", label: "Products", icon: Package },
                  { key: "territories", label: "Territories", icon: MapPin },
                  { key: "approvals", label: "Approval History", icon: FileText },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={detailSubTab === key ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5 rounded-b-none"
                    onClick={() => setDetailSubTab(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* ── Overview Sub-tab ── */}
              {detailSubTab === "overview" && (
                <div className="space-y-4">
                  {/* BU Header Info */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${selectedBU.color}20` }}>
                          <Building className="h-6 w-6" style={{ color: selectedBU.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold">{selectedBU.name}</h2>
                            <Badge className="font-mono text-xs" style={{ backgroundColor: `${selectedBU.color}20`, color: selectedBU.color }}>
                              {selectedBU.code}
                            </Badge>
                            <Badge className={selectedBU.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {selectedBU.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{selectedBU.description}</p>
                          <div className="flex items-center gap-1.5 mt-2 text-sm">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-medium">{allUsers.find((u) => u.id === selectedBU.managerId)?.name ?? "Unassigned"}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard icon={Users} title="Total Members" value={selectedBU.members.length} subtitle={`${selectedBU.members.filter((m) => m.role === "MEDICAL_REP").length} Medical Reps`} iconColor="bg-purple-100 text-purple-600" />
                    <StatsCard icon={Package} title="Products" value={selectedBU.productIds.length} subtitle="In portfolio" iconColor="bg-blue-100 text-blue-600" />
                    <StatsCard icon={MapPin} title="Territories" value={selectedBU.territoryIds.length} subtitle="Coverage areas" iconColor="bg-amber-100 text-amber-600" />
                    <StatsCard icon={DollarSign} title="Revenue (EGP)" value={`${((BU_REVENUE[selectedBU.id] || 0) / 1000000).toFixed(1)}M`} subtitle="Current period" iconColor="bg-green-100 text-green-600" />
                  </div>

                  {/* BU Performance Metrics */}
                  {buPerformanceMetrics && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-indigo-600" />
                          BU Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Revenue per Rep</p>
                            <p className="text-lg font-bold text-green-700">EGP {(buPerformanceMetrics.revenuePerRep / 1000).toFixed(0)}K</p>
                          </div>
                          <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Products per Rep (avg)</p>
                            <p className="text-lg font-bold text-blue-700">{buPerformanceMetrics.productsPerRep.toFixed(1)}</p>
                          </div>
                          <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Territory Coverage</p>
                            <p className={`text-lg font-bold ${buPerformanceMetrics.territoryCoverage === 100 ? "text-green-700" : buPerformanceMetrics.territoryCoverage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                              {buPerformanceMetrics.territoryCoverage}%
                            </p>
                          </div>
                          <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Active / Inactive Members</p>
                            <p className="text-lg font-bold">
                              <span className="text-green-700">{buPerformanceMetrics.activeMembers}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span className="text-gray-400">{buPerformanceMetrics.inactiveMembers}</span>
                            </p>
                          </div>
                        </div>

                        {/* Warnings */}
                        {(buPerformanceMetrics.repsWithNoProducts.length > 0 || buPerformanceMetrics.uncoveredTerritories.length > 0) && (
                          <div className="mt-4 space-y-2">
                            {buPerformanceMetrics.repsWithNoProducts.length > 0 && (
                              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <span className="font-medium text-red-700">Product gap detected:</span>{" "}
                                  <span className="text-red-600">
                                    {buPerformanceMetrics.repsWithNoProducts.map((m) => allUsers.find((u) => u.id === m.userId)?.name ?? m.userId).join(", ")} {buPerformanceMetrics.repsWithNoProducts.length === 1 ? "has" : "have"} no products assigned.
                                  </span>
                                </div>
                              </div>
                            )}
                            {buPerformanceMetrics.uncoveredTerritories.length > 0 && (
                              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <span className="font-medium text-amber-700">Territory coverage gap:</span>{" "}
                                  <span className="text-amber-600">
                                    {buPerformanceMetrics.uncoveredTerritories.map((tid) => store.territories.find((t) => t.id === tid)?.name ?? tid).join(", ")} {buPerformanceMetrics.uncoveredTerritories.length === 1 ? "has" : "have"} no assigned rep.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Role Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Team Role Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ROLE_HIERARCHY_ORDER.map((role) => {
                          const count = selectedBU.members.filter((m) => m.role === role).length;
                          return (
                            <div key={role} className="p-3 rounded-lg border">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-[10px] ${ROLE_COLORS[role] || "bg-gray-100 text-gray-800"}`}>
                                  {role.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <p className="text-2xl font-bold">{count}</p>
                              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role] || role}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── Team Structure Sub-tab (Org Chart) ── */}
              {detailSubTab === "team-structure" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Organizational Hierarchy
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-purple-200 inline-block" /> BUM</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-200 inline-block" /> Marketeer</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-200 inline-block" /> District Mgr</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-200 inline-block" /> Med Rep</span>
                    </div>
                  </div>

                  {/* Org Chart Tree */}
                  <Card>
                    <CardContent className="pt-6 pb-4">
                      {(() => {
                        // Build org chart hierarchy from BU members
                        const bum = selectedBU.members.find((m) => m.role === "BUM");
                        const marketeers = selectedBU.members.filter((m) => m.role === "MARKETEER");
                        const dms = selectedBU.members.filter((m) => m.role === "DISTRICT_MANAGER");
                        const reps = selectedBU.members.filter((m) => m.role === "MEDICAL_REP");

                        // Determine vacancies: each BU should have at least 1 BUM, 1 Marketeer, 1 DM, and reps
                        const expectedRoles: Array<{ role: string; min: number }> = [
                          { role: "BUM", min: 1 },
                          { role: "MARKETEER", min: 1 },
                          { role: "DISTRICT_MANAGER", min: 1 },
                          { role: "MEDICAL_REP", min: 2 },
                        ];

                        const vacancies: Array<{ role: string; parentRole: string }> = [];
                        if (!bum) vacancies.push({ role: "BUM", parentRole: "" });
                        if (marketeers.length === 0) vacancies.push({ role: "MARKETEER", parentRole: "BUM" });
                        if (dms.length === 0) vacancies.push({ role: "DISTRICT_MANAGER", parentRole: "MARKETEER" });
                        if (reps.length < (expectedRoles.find((e) => e.role === "MEDICAL_REP")?.min ?? 2)) {
                          const need = (expectedRoles.find((e) => e.role === "MEDICAL_REP")?.min ?? 2) - reps.length;
                          for (let i = 0; i < need; i++) {
                            vacancies.push({ role: "MEDICAL_REP", parentRole: "DISTRICT_MANAGER" });
                          }
                        }

                        function renderOrgNode(
                          member: BUMember | null,
                          role: string,
                          depth: number,
                          isVacant: boolean,
                          parentUserId: string,
                        ) {
                          const u = member ? allUsers.find((usr) => usr.id === member.userId) : null;
                          const nodeColor = ROLE_COLORS[role] || "bg-gray-100 text-gray-800";
                          const borderClass = isVacant ? "border-dashed border-2 border-amber-400" : "border";

                          return (
                            <div
                              key={isVacant ? `vacant-${role}-${depth}-${parentUserId}` : member?.userId}
                              className={`relative p-3 rounded-lg ${borderClass} ${isVacant ? "bg-amber-50/50" : "bg-card hover:bg-muted/30"} transition-colors cursor-pointer group`}
                              style={{ marginLeft: `${depth * 32}px` }}
                              onClick={() => {
                                if (isVacant && canEdit) {
                                  setVacancyRole(role);
                                  setVacancyParentId(parentUserId);
                                  setVacancyAssignUserId("");
                                  setVacancyAssignOpen(true);
                                } else if (u) {
                                  setSelectedPersonId(u.id);
                                  setPersonDetailOpen(true);
                                }
                              }}
                            >
                              {/* Connector line */}
                              {depth > 0 && (
                                <div className="absolute -left-4 top-1/2 w-4 border-t border-muted-foreground/30" style={{ left: `-16px` }} />
                              )}
                              <div className="flex items-center gap-3">
                                {isVacant ? (
                                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-amber-400 bg-amber-50 flex items-center justify-center shrink-0">
                                    <UserPlus className="h-5 w-5 text-amber-500" />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                    {u?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {isVacant ? (
                                      <span className="text-sm font-medium text-amber-700">Vacant Position</span>
                                    ) : (
                                      <span className="text-sm font-medium">{u?.name || member?.userId}</span>
                                    )}
                                    <Badge className={`text-[9px] ${nodeColor}`}>{ROLE_LABELS[role] || role}</Badge>
                                    {isVacant && (
                                      <Badge className="text-[9px] bg-amber-100 text-amber-800 border-amber-300">
                                        VACANT
                                      </Badge>
                                    )}
                                  </div>
                                  {u && (
                                    <p className="text-xs text-muted-foreground">{u.email}{u.territory ? ` | ${u.territory}` : ""}</p>
                                  )}
                                  {isVacant && canEdit && (
                                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                      <UserPlus className="h-3 w-3" /> Click to assign someone
                                    </p>
                                  )}
                                </div>
                                {!isVacant && u && (
                                  <a
                                    href="/crm/my-team"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {/* BUM Level */}
                            {bum ? renderOrgNode(bum, "BUM", 0, false, "") : renderOrgNode(null, "BUM", 0, true, "")}

                            {/* Connector */}
                            {(bum || vacancies.some((v) => v.role === "BUM")) && (
                              <div className="ml-5 h-3 border-l border-muted-foreground/30" />
                            )}

                            {/* Marketeer Level */}
                            {marketeers.length > 0 ? (
                              marketeers.map((m) => (
                                <div key={m.userId}>
                                  {renderOrgNode(m, "MARKETEER", 1, false, bum?.userId || "")}
                                  <div className="ml-[52px] h-3 border-l border-muted-foreground/30" />
                                </div>
                              ))
                            ) : (
                              <div>
                                {renderOrgNode(null, "MARKETEER", 1, true, bum?.userId || "")}
                                <div className="ml-[52px] h-3 border-l border-muted-foreground/30" />
                              </div>
                            )}

                            {/* District Manager Level */}
                            {dms.length > 0 ? (
                              dms.map((m) => (
                                <div key={m.userId}>
                                  {renderOrgNode(m, "DISTRICT_MANAGER", 2, false, marketeers[0]?.userId || "")}
                                  <div className="ml-[84px] h-3 border-l border-muted-foreground/30" />
                                </div>
                              ))
                            ) : (
                              <div>
                                {renderOrgNode(null, "DISTRICT_MANAGER", 2, true, marketeers[0]?.userId || "")}
                                <div className="ml-[84px] h-3 border-l border-muted-foreground/30" />
                              </div>
                            )}

                            {/* Medical Rep Level */}
                            {reps.map((m) => (
                              <div key={m.userId}>
                                {renderOrgNode(m, "MEDICAL_REP", 3, false, dms[0]?.userId || "")}
                              </div>
                            ))}
                            {/* Vacant rep slots */}
                            {vacancies
                              .filter((v) => v.role === "MEDICAL_REP")
                              .map((v, i) => (
                                <div key={`vacant-rep-${i}`}>
                                  {renderOrgNode(null, "MEDICAL_REP", 3, true, dms[0]?.userId || "")}
                                </div>
                              ))}

                            {selectedBU.members.length === 0 && vacancies.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No team members or positions defined yet.</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Quick Stats Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ROLE_HIERARCHY_ORDER.map((role) => {
                      const filled = selectedBU.members.filter((m) => m.role === role).length;
                      const expected = role === "MEDICAL_REP" ? Math.max(2, filled) : 1;
                      const vacantCount = Math.max(0, expected - filled);
                      return (
                        <div key={role} className={`p-3 rounded-lg border ${vacantCount > 0 ? "border-amber-300 bg-amber-50/50" : ""}`}>
                          <Badge className={`text-[9px] mb-1 ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">{filled}</span>
                            {vacantCount > 0 && (
                              <Badge className="text-[9px] bg-amber-100 text-amber-700">{vacantCount} vacant</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Members Sub-tab ── */}
              {detailSubTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                      Team Members ({selectedBU.members.length})
                    </h3>
                    {canEdit && (
                      <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Member
                      </Button>
                    )}
                  </div>

                  {/* Role Hierarchy Display */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 p-2 bg-muted/50 rounded">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    <span>Role Hierarchy:</span>
                    {ROLE_HIERARCHY_ORDER.map((role, i) => (
                      <span key={role} className="flex items-center gap-1">
                        <Badge className={`text-[9px] ${ROLE_COLORS[role]}`}>{role.replace(/_/g, " ")}</Badge>
                        {i < ROLE_HIERARCHY_ORDER.length - 1 && <ChevronRight className="h-3 w-3" />}
                      </span>
                    ))}
                  </div>

                  {/* Members grouped by role */}
                  {ROLE_HIERARCHY_ORDER.map((role) => {
                    const roleMembers = selectedBU.members.filter((m) => m.role === role);
                    if (roleMembers.length === 0) return null;
                    return (
                      <Card key={role}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Badge className={`${ROLE_COLORS[role]}`}>{ROLE_LABELS[role] || role}</Badge>
                            <span className="text-muted-foreground font-normal">({roleMembers.length})</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {roleMembers.map((member) => {
                              const u = allUsers.find((usr) => usr.id === member.userId);
                              const repProductIds = getRepProducts(member.userId);
                              const buProductIdSet = new Set(selectedBU.productIds);
                              const repBUProducts = repProductIds.filter((pid) => buProductIdSet.has(pid));
                              const isRepRole = member.role === "MEDICAL_REP";
                              return (
                                <div key={member.userId} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                      {u?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{u?.name || member.userId}</p>
                                      <p className="text-xs text-muted-foreground">{u?.email || ""} {u?.territory ? `| ${u.territory}` : ""}</p>
                                      {isRepRole && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {repBUProducts.length > 0 ? (
                                            repBUProducts.map((pid) => {
                                              const prod = store.products.find((p) => p.id === pid);
                                              return (
                                                <Badge key={pid} variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                                                  {prod?.name ?? pid}
                                                </Badge>
                                              );
                                            })
                                          ) : (
                                            <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200">
                                              No products assigned
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {canEdit && (
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleRemoveMember(member.userId)}>
                                      <X className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {selectedBU.members.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No members assigned to this BU yet.</p>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Products Sub-tab ── */}
              {detailSubTab === "products" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                      Product Portfolio ({selectedBUProducts.length})
                    </h3>
                    {canEdit && (
                      <Button size="sm" onClick={() => setAddProductOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedBUProducts.map((product) => (
                      <Card key={product.id} className="relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: selectedBU.color }} />
                        <CardContent className="pt-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Badge variant="outline" className="text-[10px] font-mono mb-1">{product.code}</Badge>
                              <h4 className="font-semibold text-sm">{product.name}</h4>
                              <p className="text-xs text-muted-foreground">{product.strength} {product.form}</p>
                            </div>
                            {canEdit && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => handleRemoveProduct(product.id)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Category</span>
                              <span className="font-medium">{product.therapeuticArea}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Price (EGP)</span>
                              <span className="font-medium">{(product.pricePerUnit ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Stock Qty</span>
                              <span className={`font-medium ${product.stockQty <= product.reorderLevel ? "text-red-600" : "text-green-700"}`}>
                                {(product.stockQty ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Reorder Level</span>
                              <span className="font-medium">{(product.reorderLevel ?? 0).toLocaleString()}</span>
                            </div>
                          </div>
                          {product.edaRegistration && (
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              EDA: {product.edaRegistration}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {selectedBUProducts.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No products in this BU portfolio yet.</p>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Territories Sub-tab (Hierarchical Tree View) ── */}
              {detailSubTab === "territories" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                      Territory Hierarchy ({selectedBUTerritories.length} assigned)
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="inline-block w-2.5 h-2.5 rounded bg-rose-200" /> Region
                        <span className="inline-block w-2.5 h-2.5 rounded bg-blue-200 ml-2" /> District
                        <span className="inline-block w-2.5 h-2.5 rounded bg-green-200 ml-2" /> Brick
                      </div>
                      {canEdit && (
                        <Button size="sm" onClick={() => setAddTerritoryOpen(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Territory
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedBUTerritoryTree.length > 0 ? (
                    <Card>
                      <CardContent className="pt-4 pb-2">
                        {(function renderHierarchyNodes(nodes: TerritoryTreeNode[], depth: number): React.ReactNode {
                          return nodes.map((node) => {
                            const t = node.territory;
                            const hasChildren = node.children.length > 0;
                            const isExpanded = territoryExpandedNodes.has(t.id);
                            const isDirectlyAssigned = selectedBU!.territoryIds.includes(t.id);
                            const levelColors = {
                              region: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", badge: "bg-rose-100 text-rose-800", icon: "text-rose-500" },
                              governorate: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-800", icon: "text-blue-500" },
                              district: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-800", icon: "text-blue-500" },
                              brick: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", badge: "bg-green-100 text-green-800", icon: "text-green-500" },
                            };
                            const colors = levelColors[t.level] || levelColors.brick;

                            return (
                              <div key={t.id}>
                                <div
                                  className={`flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer ${!isDirectlyAssigned ? "opacity-60" : ""}`}
                                  style={{ paddingLeft: `${depth * 24 + 8}px` }}
                                  onClick={() => hasChildren && toggleTerritoryExpand(t.id)}
                                >
                                  {/* Expand/Collapse */}
                                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    {hasChildren ? (
                                      isExpanded ? <ChevronDown className={`h-3.5 w-3.5 ${colors.icon}`} /> : <ChevronRight className={`h-3.5 w-3.5 ${colors.icon}`} />
                                    ) : (
                                      <div className={`h-1.5 w-1.5 rounded-full ${colors.badge.split(" ")[0]}`} />
                                    )}
                                  </div>

                                  {/* Territory Info */}
                                  <Badge className={`text-[10px] ${colors.badge}`}>{t.level}</Badge>
                                  <span className={`text-sm font-medium ${colors.text}`}>{t.name}</span>
                                  <span className="text-xs text-muted-foreground">{t.nameAr}</span>
                                  <Badge variant="outline" className="text-[9px] font-mono ml-1">{t.imsCode}</Badge>

                                  {/* Spacer */}
                                  <div className="flex-1" />

                                  {/* Stats */}
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" /> {node.repCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="h-3 w-3" /> {node.doctorCount}
                                    </span>
                                  </div>

                                  {/* Assigned reps for leaf nodes */}
                                  {t.level === "brick" && isDirectlyAssigned && t.assignedRepIds.length > 0 && (
                                    <div className="flex items-center gap-1 ml-2">
                                      {t.assignedRepIds.slice(0, 2).map((repId) => {
                                        const repUser = allUsers.find((u) => u.id === repId);
                                        return (
                                          <Badge key={repId} variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">
                                            {repUser?.name ?? repId}
                                          </Badge>
                                        );
                                      })}
                                      {t.assignedRepIds.length > 2 && (
                                        <Badge variant="outline" className="text-[9px]">+{t.assignedRepIds.length - 2}</Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* Remove button for directly assigned territories */}
                                  {canEdit && isDirectlyAssigned && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 shrink-0"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveTerritory(t.id); }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                {/* Children */}
                                {hasChildren && isExpanded && renderHierarchyNodes(node.children, depth + 1)}
                              </div>
                            );
                          });
                        })(selectedBUTerritoryTree, 0)}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="p-8 text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No territories assigned to this BU yet.</p>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Approval History Sub-tab ── */}
              {detailSubTab === "approvals" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    Approval History ({selectedBULogs.length})
                  </h3>

                  {selectedBULogs.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No approval logs for this BU.</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {selectedBULogs.map((log) => {
                        const performer = allUsers.find((u) => u.id === log.performedBy);
                        return (
                          <Card key={log.id}>
                            <CardContent className="py-3 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    log.status === "APPROVED" ? "bg-green-100" :
                                    log.status === "REJECTED" ? "bg-red-100" :
                                    "bg-amber-100"
                                  }`}>
                                    {log.status === "APPROVED" ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                                     log.status === "REJECTED" ? <XCircle className="h-4 w-4 text-red-600" /> :
                                     <Clock className="h-4 w-4 text-amber-600" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{log.action}</p>
                                    <p className="text-xs text-muted-foreground">{log.details}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge className={
                                    log.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                    log.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                    "bg-amber-100 text-amber-800"
                                  }>
                                    {log.status}
                                  </Badge>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {performer?.name || "System"} | {new Date(log.date).toLocaleDateString("en-GB")}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a Business Unit to view details.</p>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: Product-Rep Assignment
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "assignment" && (
        <>
          {/* BU Selector for Assignment */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Select BU:</span>
            {businessUnits.map((bu) => (
              <Button
                key={bu.id}
                variant={assignmentBUId === bu.id ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setAssignmentBUId(bu.id)}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bu.color }} />
                {bu.name}
              </Button>
            ))}
          </div>

          {assignmentBU ? (
            <>
              {/* Bulk Actions */}
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => handleAssignAll(assignmentBU.id)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Assign All
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUnassignAll(assignmentBU.id)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Unassign All
                </Button>
                <span className="text-xs text-muted-foreground">
                  {productRepAssignments.filter((a) => {
                    const repIds = new Set(assignmentReps.map((r) => r.id));
                    const prodIds = new Set(assignmentProducts.map((p) => p.id));
                    return repIds.has(a.repId) && prodIds.has(a.productId);
                  }).length} of {assignmentReps.length * assignmentProducts.length} assignments active
                </span>
              </div>

              {assignmentReps.length === 0 || assignmentProducts.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {assignmentReps.length === 0
                      ? "No Medical Reps assigned to this BU. Add Medical Reps in the BU Detail tab."
                      : "No products assigned to this BU. Add products in the BU Detail tab."}
                  </p>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                            Medical Rep
                          </th>
                          {assignmentProducts.map((product) => (
                            <th key={product.id} className="p-3 text-center font-medium text-muted-foreground min-w-[120px]">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs">{product.name}</span>
                                <Badge variant="outline" className="text-[9px] font-mono">{product.code}</Badge>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentReps.map((rep) => (
                          <tr key={rep.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium sticky left-0 bg-card z-10">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                  {rep.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                {rep.name}
                              </div>
                            </td>
                            {assignmentProducts.map((product) => {
                              const isAssigned = productRepAssignments.some(
                                (a) => a.repId === rep.id && a.productId === product.id
                              );
                              return (
                                <td key={product.id} className="p-3 text-center">
                                  <button
                                    onClick={() => toggleProductRepAssignment(rep.id, product.id)}
                                    className={`h-7 w-7 rounded-md border-2 inline-flex items-center justify-center transition-all ${
                                      isAssigned
                                        ? "border-green-500 bg-green-50 text-green-600"
                                        : "border-gray-200 bg-white text-transparent hover:border-gray-400"
                                    }`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No Business Units found. Create a BU first.</p>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── BU Creation Wizard ── */}
      <Dialog open={wizardOpen} onOpenChange={(open) => { setWizardOpen(open); if (!open) resetWizard(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Create Business Unit — Step {wizardStep} of 4
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Define basic information for the new Business Unit."}
              {wizardStep === 2 && "Select products for this Business Unit portfolio."}
              {wizardStep === 3 && "Select territories and bricks to assign to this BU."}
              {wizardStep === 4 && "Assign representatives to each selected brick."}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-2">
            {[
              { num: 1, label: "Basic Info", icon: Building },
              { num: 2, label: "Products", icon: Package },
              { num: 3, label: "Territories", icon: MapPin },
              { num: 4, label: "Assign People", icon: Users },
            ].map(({ num, label, icon: StepIcon }, i) => (
              <div key={num} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  wizardStep === num ? "bg-primary text-primary-foreground" :
                  wizardStep > num ? "bg-green-100 text-green-800" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {wizardStep > num ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                  {label}
                </div>
                {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Basic Info ── */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Unit Name <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Oncology BU"
                    value={wizardBasicInfo.name}
                    onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, name: e.target.value }))}
                    className={wizardErrors.name ? "border-red-500" : ""}
                  />
                  {wizardErrors.name && <p className="text-xs text-red-500 mt-1">{wizardErrors.name}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Code <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. BU-ONC"
                    value={wizardBasicInfo.code}
                    onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, code: e.target.value }))}
                    className={wizardErrors.code ? "border-red-500" : ""}
                  />
                  {wizardErrors.code && <p className="text-xs text-red-500 mt-1">{wizardErrors.code}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm bg-background min-h-[80px] resize-y"
                  placeholder="Therapeutic areas and coverage"
                  value={wizardBasicInfo.description}
                  onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Unit Manager <span className="text-red-500">*</span></label>
                  <select
                    className={`w-full border rounded-md p-2 text-sm bg-background ${wizardErrors.managerId ? "border-red-500" : ""}`}
                    value={wizardBasicInfo.managerId}
                    onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, managerId: e.target.value }))}
                  >
                    <option value="">Select manager...</option>
                    {managerOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {wizardErrors.managerId && <p className="text-xs text-red-500 mt-1">{wizardErrors.managerId}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Color</label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-background"
                    value={wizardBasicInfo.color}
                    onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, color: e.target.value }))}
                  >
                    {BU_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={wizardBasicInfo.status}
                  onChange={(e) => setWizardBasicInfo((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: Select Products ── */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={wizardProductSearch}
                    onChange={(e) => setWizardProductSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
                <Badge variant="outline" className="shrink-0">{wizardSelectedProducts.size} selected</Badge>
              </div>
              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left w-10"></th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Product</th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Code</th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Therapeutic Area</th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.products
                      .filter((p) => {
                        if (!wizardProductSearch) return true;
                        const q = wizardProductSearch.toLowerCase();
                        return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.therapeuticArea.toLowerCase().includes(q);
                      })
                      .map((product) => {
                        const isSelected = wizardSelectedProducts.has(product.id);
                        return (
                          <tr
                            key={product.id}
                            className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                            onClick={() => {
                              setWizardSelectedProducts((prev) => {
                                const next = new Set(prev);
                                if (next.has(product.id)) next.delete(product.id);
                                else next.add(product.id);
                                return next;
                              });
                            }}
                          >
                            <td className="p-2 text-center">
                              <div className={`h-5 w-5 rounded border-2 inline-flex items-center justify-center ${
                                isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                              }`}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </td>
                            <td className="p-2">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground ml-1">{product.strength}</span>
                            </td>
                            <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{product.code}</Badge></td>
                            <td className="p-2 text-muted-foreground">{product.therapeuticArea}</td>
                            <td className="p-2 text-muted-foreground">{product.form}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3: Select Territories/Bricks (Enhanced) ── */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              {/* Search + Actions Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search territories and bricks..."
                    value={wizardTerritorySearch}
                    onChange={(e) => setWizardTerritorySearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
                <Badge variant="outline" className="shrink-0">{wizardSelectedTerritories.size} selected</Badge>
                <Button
                  size="sm"
                  variant={brickMergeMode ? "default" : "outline"}
                  className="h-8 text-xs gap-1"
                  onClick={() => {
                    setBrickMergeMode(!brickMergeMode);
                    setBrickMergeSelection(new Set());
                  }}
                >
                  <Merge className="h-3.5 w-3.5" />
                  {brickMergeMode ? "Cancel Merge" : "Merge Bricks"}
                </Button>
              </div>

              {/* Brick merge info bar */}
              {brickMergeMode && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-xs">
                  <Merge className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-blue-700 flex-1">
                    Click brick-level checkboxes to select bricks to merge. Select 2 or more, then click &quot;Merge Selected&quot;.
                  </span>
                  {brickMergeSelection.size >= 2 && (
                    <Button
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => setBrickMergeDialogOpen(true)}
                    >
                      <Merge className="h-3 w-3" /> Merge {brickMergeSelection.size} Bricks
                    </Button>
                  )}
                </div>
              )}

              {/* Merged bricks display */}
              {mergedBricks.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs font-medium text-green-800 mb-1.5">Merged Bricks:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mergedBricks.map((mb) => (
                      <Badge key={mb.id} className="text-[10px] bg-green-100 text-green-800 gap-1">
                        <Merge className="h-3 w-3" />
                        {mb.name} ({mb.sourceIds.length} bricks)
                        <button
                          className="ml-1 hover:text-red-600"
                          onClick={() => {
                            setMergedBricks((prev) => prev.filter((m) => m.id !== mb.id));
                            setWizardSelectedTerritories((prev) => {
                              const next = new Set(prev);
                              next.delete(mb.id);
                              // Re-add source bricks
                              mb.sourceIds.forEach((sid) => next.add(sid));
                              return next;
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Territory Tree */}
              <div className="max-h-[350px] overflow-y-auto border rounded-md p-2">
                {(() => {
                  const searchQ = wizardTerritorySearch.toLowerCase();
                  const regions = store.territories.filter((t) => t.level === "region");

                  // Check if a brick was consumed by a merge
                  const mergedSourceIds = new Set(mergedBricks.flatMap((m) => m.sourceIds));

                  function matchesSearch(t: typeof store.territories[0]): boolean {
                    if (!searchQ) return true;
                    return t.name.toLowerCase().includes(searchQ) || t.nameAr.includes(searchQ) || t.imsCode.toLowerCase().includes(searchQ);
                  }

                  function hasMatchingDescendant(parentId: string): boolean {
                    const children = store.territories.filter((t) => t.parentId === parentId);
                    return children.some((c) => matchesSearch(c) || hasMatchingDescendant(c.id));
                  }

                  function renderTerritoryNode(t: typeof store.territories[0], depth: number): React.ReactNode {
                    // Hide bricks that were merged into another
                    if (mergedSourceIds.has(t.id)) return null;

                    const children = store.territories.filter((c) => c.parentId === t.id);
                    const hasChildren = children.length > 0;
                    const isExpanded = wizardExpandedNodes.has(t.id);
                    const isSelected = wizardSelectedTerritories.has(t.id);
                    const isMergeSelected = brickMergeSelection.has(t.id);
                    const selfMatch = matchesSearch(t);
                    const descendantMatch = hasMatchingDescendant(t.id);
                    if (searchQ && !selfMatch && !descendantMatch) return null;

                    const levelColors: Record<string, string> = {
                      region: "text-rose-700",
                      governorate: "text-blue-700",
                      district: "text-blue-700",
                      brick: "text-green-700",
                    };
                    const levelBadgeColors: Record<string, string> = {
                      region: "bg-rose-100 text-rose-800",
                      governorate: "bg-blue-100 text-blue-800",
                      district: "bg-blue-100 text-blue-800",
                      brick: "bg-green-100 text-green-800",
                    };

                    // In merge mode, only bricks can be merge-selected
                    const isBrick = t.level === "brick";

                    return (
                      <div key={t.id}>
                        <div
                          className={`flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/40 cursor-pointer ${isMergeSelected ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
                          style={{ paddingLeft: `${depth * 20 + 4}px` }}
                        >
                          {/* Expand */}
                          <button
                            className="w-4 h-4 flex items-center justify-center shrink-0"
                            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleWizardExpand(t.id); }}
                          >
                            {hasChildren ? (
                              isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : null}
                          </button>

                          {/* Checkbox: merge mode uses different selection for bricks */}
                          {brickMergeMode && isBrick ? (
                            <button
                              className={`rounded border-2 inline-flex items-center justify-center shrink-0 ${
                                isMergeSelected ? "border-blue-500 bg-blue-500 text-white" : "border-orange-300 bg-white"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setBrickMergeSelection((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(t.id)) next.delete(t.id);
                                  else next.add(t.id);
                                  return next;
                                });
                              }}
                              style={{ width: "18px", height: "18px" }}
                            >
                              {isMergeSelected && <Merge className="h-2.5 w-2.5" />}
                            </button>
                          ) : (
                            <button
                              className={`rounded border-2 inline-flex items-center justify-center shrink-0 ${
                                isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white"
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleWizardTerritory(t.id); }}
                              style={{ width: "18px", height: "18px" }}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5" />}
                            </button>
                          )}

                          {/* Drag handle indicator for bricks */}
                          {isBrick && !brickMergeMode && (
                            <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                          )}

                          {/* Name */}
                          <Badge className={`text-[9px] ${levelBadgeColors[t.level] || ""}`}>{t.level}</Badge>
                          <span className={`text-sm font-medium ${levelColors[t.level] || ""}`}>{t.name}</span>
                          <span className="text-xs text-muted-foreground">{t.nameAr}</span>

                          {/* Brick territory assignment dropdown (inline) */}
                          {isBrick && isSelected && !brickMergeMode && (
                            <select
                              className="ml-auto text-[10px] border rounded p-0.5 bg-background max-w-[120px]"
                              value={brickTerritoryAssignments[t.id] || ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setBrickTerritoryAssignments((prev) => ({
                                  ...prev,
                                  [t.id]: e.target.value,
                                }));
                              }}
                            >
                              <option value="">Territory...</option>
                              {store.territories
                                .filter((tt) => tt.level === "district" && wizardSelectedTerritories.has(tt.id))
                                .map((tt) => (
                                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                                ))}
                            </select>
                          )}
                        </div>

                        {/* Children */}
                        {hasChildren && (isExpanded || (searchQ && descendantMatch)) && (
                          children.map((child) => renderTerritoryNode(child, depth + 1))
                        )}
                      </div>
                    );
                  }

                  return regions
                    .filter((r) => !searchQ || matchesSearch(r) || hasMatchingDescendant(r.id))
                    .map((r) => renderTerritoryNode(r, 0));
                })()}
              </div>

              {/* Quick summary of selected bricks */}
              {(() => {
                const selectedBrickCount = Array.from(wizardSelectedTerritories).filter((id) => {
                  const t = store.territories.find((tt) => tt.id === id);
                  return t?.level === "brick";
                }).length + mergedBricks.filter((mb) => wizardSelectedTerritories.has(mb.id)).length;

                const selectedDistrictCount = Array.from(wizardSelectedTerritories).filter((id) => {
                  const t = store.territories.find((tt) => tt.id === id);
                  return t?.level === "district";
                }).length;

                const selectedRegionCount = Array.from(wizardSelectedTerritories).filter((id) => {
                  const t = store.territories.find((tt) => tt.id === id);
                  return t?.level === "region";
                }).length;

                return (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground p-2 bg-muted/30 rounded-md">
                    <span className="flex items-center gap-1"><span className="font-medium text-rose-700">{selectedRegionCount}</span> Regions</span>
                    <span className="flex items-center gap-1"><span className="font-medium text-blue-700">{selectedDistrictCount}</span> Districts</span>
                    <span className="flex items-center gap-1"><span className="font-medium text-green-700">{selectedBrickCount}</span> Bricks</span>
                    {mergedBricks.length > 0 && (
                      <span className="flex items-center gap-1"><span className="font-medium text-purple-700">{mergedBricks.length}</span> Merged</span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Step 4: Assign People per Brick ── */}
          {wizardStep === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Assign a representative to each selected brick (including merged bricks). You can also do this later from the BU detail view.
              </p>
              {(() => {
                const selectedBricks = store.territories.filter(
                  (t) => wizardSelectedTerritories.has(t.id) && t.level === "brick"
                );
                const selectedNonBricks = store.territories.filter(
                  (t) => wizardSelectedTerritories.has(t.id) && t.level !== "brick"
                );
                const selectedMergedBricks = mergedBricks.filter((mb) => wizardSelectedTerritories.has(mb.id));

                const allBrickItems: Array<{ id: string; name: string; imsCode: string; parentName: string; isMerged: boolean; sourceCount?: number }> = [
                  ...selectedBricks.map((brick) => {
                    const parentDistrict = store.territories.find((t) => t.id === brick.parentId);
                    return { id: brick.id, name: brick.name, imsCode: brick.imsCode, parentName: parentDistrict?.name ?? "", isMerged: false };
                  }),
                  ...selectedMergedBricks.map((mb) => ({
                    id: mb.id, name: mb.name, imsCode: "MERGED", parentName: store.territories.find((t) => t.id === mb.parentId)?.name ?? "", isMerged: true, sourceCount: mb.sourceIds.length,
                  })),
                ];

                return (
                  <>
                    {selectedNonBricks.length > 0 && (
                      <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
                        <span className="font-medium">{selectedNonBricks.length}</span> non-brick territories selected (regions/districts). Rep assignment is per brick.
                      </div>
                    )}
                    {allBrickItems.length === 0 ? (
                      <Card className="p-6 text-center text-muted-foreground">
                        <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No bricks selected. Go back to step 3 to select brick-level territories for rep assignment.</p>
                      </Card>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 text-left font-medium text-muted-foreground">Brick</th>
                              <th className="p-2 text-left font-medium text-muted-foreground">IMS Code</th>
                              <th className="p-2 text-left font-medium text-muted-foreground">Assigned Rep</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allBrickItems.map((brick) => (
                              <tr key={brick.id} className={`border-b hover:bg-muted/30 ${brick.isMerged ? "bg-purple-50/50" : ""}`}>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    {brick.isMerged && <Merge className="h-3 w-3 text-purple-500 shrink-0" />}
                                    <span className="font-medium">{brick.name}</span>
                                    {brick.parentName && (
                                      <span className="text-xs text-muted-foreground">({brick.parentName})</span>
                                    )}
                                    {brick.isMerged && brick.sourceCount && (
                                      <Badge className="text-[9px] bg-purple-100 text-purple-700">{brick.sourceCount} merged</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <Badge variant="outline" className={`text-[10px] font-mono ${brick.isMerged ? "bg-purple-50 text-purple-700 border-purple-200" : ""}`}>{brick.imsCode}</Badge>
                                </td>
                                <td className="p-2">
                                  <select
                                    className="w-full border rounded-md p-1.5 text-sm bg-background"
                                    value={wizardBrickAssignments[brick.id] || ""}
                                    onChange={(e) => {
                                      setWizardBrickAssignments((prev) => ({
                                        ...prev,
                                        [brick.id]: e.target.value,
                                      }));
                                    }}
                                  >
                                    <option value="">-- No rep --</option>
                                    {allUsers
                                      .filter((u) => u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER")
                                      .map((u) => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                      ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Wizard Footer */}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep((s) => s - 1)}>
                  <ChevronRight className="h-3.5 w-3.5 mr-1 rotate-180" /> Previous
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setWizardOpen(false); resetWizard(); }}>Cancel</Button>
              {wizardStep < 4 ? (
                <Button onClick={() => {
                  if (validateWizardStep(wizardStep)) {
                    setWizardStep((s) => s + 1);
                  }
                }}>
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleWizardCreate}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Create Business Unit
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit BU Form (EntityFormModal for editing only) */}
      <EntityFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        title={editing ? `Edit ${editing.name}` : "Create Business Unit"}
        description="Define a Business Unit with manager, color, and status."
        fields={formFields}
        initialData={editing ? {
          name: editing.name,
          code: editing.code,
          description: editing.description,
          managerId: editing.managerId,
          color: editing.color,
          status: editing.status,
        } : undefined}
        onSubmit={handleCreateOrUpdate}
        submitLabel={editing ? "Save Changes" : "Create"}
        size="lg"
      />

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to {selectedBU?.name}</DialogTitle>
            <DialogDescription>Select a user and assign their role in this Business Unit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">User</label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {allUsers
                  .filter((u) => !selectedBU?.members.some((m) => m.userId === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role in BU</label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
              >
                <option value="BUM">Business Unit Manager</option>
                <option value="MARKETEER">Marketeer</option>
                <option value="DISTRICT_MANAGER">District Manager</option>
                <option value="MEDICAL_REP">Medical Representative</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!newMemberUserId}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product to {selectedBU?.name}</DialogTitle>
            <DialogDescription>Select a product to add to this BU portfolio.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {store.products
              .filter((p) => !selectedBU?.productIds.includes(p.id))
              .map((product) => (
                <button
                  key={product.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg border text-sm hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    handleAddProduct(product.id);
                    setAddProductOpen(false);
                  }}
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.code} | {product.strength} {product.form} | {product.therapeuticArea}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">EGP {product.pricePerUnit}</Badge>
                </button>
              ))}
            {store.products.filter((p) => !selectedBU?.productIds.includes(p.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All products are already assigned.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Territory Dialog */}
      <Dialog open={addTerritoryOpen} onOpenChange={setAddTerritoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Territory to {selectedBU?.name}</DialogTitle>
            <DialogDescription>Select a territory to assign to this BU.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {store.territories
              .filter((t) => !selectedBU?.territoryIds.includes(t.id))
              .map((territory) => (
                <button
                  key={territory.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg border text-sm hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    handleAddTerritory(territory.id);
                    setAddTerritoryOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{territory.name}</p>
                      <p className="text-xs text-muted-foreground">{territory.nameAr} | {territory.imsCode}</p>
                    </div>
                  </div>
                  <Badge className={
                    territory.level === "region" ? "bg-red-100 text-red-800" :
                    territory.level === "governorate" ? "bg-blue-100 text-blue-800" :
                    territory.level === "district" ? "bg-amber-100 text-amber-800" :
                    "bg-green-100 text-green-800"
                  }>{territory.level}</Badge>
                </button>
              ))}
            {store.territories.filter((t) => !selectedBU?.territoryIds.includes(t.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All territories are already assigned.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTerritoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacancy Assignment Dialog */}
      <Dialog open={vacancyAssignOpen} onOpenChange={setVacancyAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-600" />
              Fill Vacant Position
            </DialogTitle>
            <DialogDescription>
              Assign a user to the vacant {ROLE_LABELS[vacancyRole] || vacancyRole} position in {selectedBU?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Position Role</label>
              <div className="p-2.5 rounded-lg border bg-muted/50">
                <Badge className={`${ROLE_COLORS[vacancyRole] || "bg-gray-100 text-gray-800"}`}>
                  {ROLE_LABELS[vacancyRole] || vacancyRole}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Assign User</label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={vacancyAssignUserId}
                onChange={(e) => setVacancyAssignUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {allUsers
                  .filter((u) => {
                    // Filter by matching role or unassigned users
                    const isCorrectRole = u.role === vacancyRole || u.role === "ADMIN";
                    const isNotAlreadyMember = !selectedBU?.members.some((m) => m.userId === u.id);
                    return isCorrectRole && isNotAlreadyMember;
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}){u.territory ? ` - ${u.territory}` : ""}
                    </option>
                  ))}
              </select>
              {allUsers.filter((u) => {
                const isCorrectRole = u.role === vacancyRole || u.role === "ADMIN";
                const isNotAlreadyMember = !selectedBU?.members.some((m) => m.userId === u.id);
                return isCorrectRole && isNotAlreadyMember;
              }).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No available users with the {ROLE_LABELS[vacancyRole] || vacancyRole} role. You can assign any user from the dropdown above.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacancyAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignVacancy} disabled={!vacancyAssignUserId}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign to Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Person Detail Dialog */}
      <Dialog open={personDetailOpen} onOpenChange={setPersonDetailOpen}>
        <DialogContent className="max-w-md">
          {(() => {
            const person = allUsers.find((u) => u.id === selectedPersonId);
            if (!person) return null;
            const memberEntry = selectedBU?.members.find((m) => m.userId === person.id);
            const buRole = memberEntry?.role || person.role;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    {person.name}
                  </DialogTitle>
                  <DialogDescription>{person.email}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Role in BU</p>
                      <Badge className={`${ROLE_COLORS[buRole] || "bg-gray-100 text-gray-800"}`}>
                        {ROLE_LABELS[buRole] || buRole}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">System Role</p>
                      <Badge variant="outline">{person.role}</Badge>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Department</p>
                      <p className="text-sm font-medium">{person.department}</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Territory</p>
                      <p className="text-sm font-medium">{person.territory || "Not assigned"}</p>
                    </div>
                  </div>
                  {buRole === "MEDICAL_REP" && (
                    <div className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Assigned Products</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getRepProducts(person.id).filter((pid) => selectedBU?.productIds.includes(pid)).length > 0 ? (
                          getRepProducts(person.id).filter((pid) => selectedBU?.productIds.includes(pid)).map((pid) => {
                            const prod = store.products.find((p) => p.id === pid);
                            return (
                              <Badge key={pid} variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                                {prod?.name ?? pid}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">No products assigned in this BU</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPersonDetailOpen(false)}>Close</Button>
                  <Button asChild variant="default">
                    <a href="/crm/my-team">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View in My Team
                    </a>
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Brick Merge Dialog */}
      <Dialog open={brickMergeDialogOpen} onOpenChange={setBrickMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-blue-600" />
              Merge Bricks
            </DialogTitle>
            <DialogDescription>
              Combine {brickMergeSelection.size} selected bricks into a single merged brick.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Selected Bricks</label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/30">
                {Array.from(brickMergeSelection).map((brickId) => {
                  const brick = store.territories.find((t) => t.id === brickId);
                  return (
                    <Badge key={brickId} className="text-[10px] bg-green-100 text-green-800">
                      {brick?.name ?? brickId}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Merged Brick Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Heliopolis Combined"
                value={brickMergeName}
                onChange={(e) => setBrickMergeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrickMergeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBrickMerge} disabled={!brickMergeName.trim() || brickMergeSelection.size < 2}>
              <Merge className="h-3.5 w-3.5 mr-1" /> Merge Bricks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BU Detail Dialog (opens from row click on list tab) */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedBU(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedBU && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedBU.color }} />
                  {selectedBU.name}
                  <Badge className="font-mono text-xs ml-1" style={{ backgroundColor: `${selectedBU.color}20`, color: selectedBU.color }}>
                    {selectedBU.code}
                  </Badge>
                </DialogTitle>
                <DialogDescription>{selectedBU.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">Manager</p>
                    <p className="text-sm font-medium truncate">{allUsers.find((u) => u.id === selectedBU.managerId)?.name || "N/A"}</p>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-lg font-bold">{selectedBU.members.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">Products</p>
                    <p className="text-lg font-bold">{selectedBU.productIds.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">Territories</p>
                    <p className="text-lg font-bold">{selectedBU.territoryIds.length}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={selectedBU.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                    {selectedBU.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-3">Revenue:</span>
                  <span className="text-sm font-semibold">EGP {((BU_REVENUE[selectedBU.id] || 0) / 1000).toFixed(0)}K</span>
                </div>

                {/* Members Quick View */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Team Members</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBU.members.map((member) => {
                      const u = allUsers.find((usr) => usr.id === member.userId);
                      return (
                        <Badge key={member.userId} variant="outline" className="text-xs">
                          {u?.name || member.userId}
                          <span className="ml-1 text-[9px] opacity-60">{member.role.replace(/_/g, " ")}</span>
                        </Badge>
                      );
                    })}
                    {selectedBU.members.length === 0 && <span className="text-xs text-muted-foreground">No members</span>}
                  </div>
                </div>

                {/* Products Quick View */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Product Portfolio</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBUProducts.map((product) => (
                      <Badge key={product.id} className="text-xs bg-muted text-muted-foreground">
                        {product.name} ({product.strength})
                      </Badge>
                    ))}
                    {selectedBUProducts.length === 0 && <span className="text-xs text-muted-foreground">No products</span>}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
                <Button onClick={() => {
                  setDetailDialogOpen(false);
                  setDetailSubTab("overview");
                  setActiveTab("detail");
                }}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Open Full Detail
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

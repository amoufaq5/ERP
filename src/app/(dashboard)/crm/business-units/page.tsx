"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Building, Plus, Users, Package, TrendingUp, UserCog, Stethoscope,
  MapPin, Pencil, Trash2, Eye, X, CheckCircle, Clock, Grid3x3,
  ShieldCheck, FileText, ChevronRight, Search, Check, XCircle,
  Briefcase, BarChart3, DollarSign, Activity,
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
import {
  useDataStore,
  visibleBusinessUnits,
  type BusinessUnit,
} from "@/lib/data-store";
import { useCurrentUser, type UserRole } from "@/lib/user-context";

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
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const canEdit = user.role === "ADMIN" || user.role === "BUM" || user.role === "MARKETEER";

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
  const [detailSubTab, setDetailSubTab] = useState<"overview" | "members" | "products" | "territories" | "approvals">("overview");

  // ── Member Add Dialog ──
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEDICAL_REP");

  // ── Product/Territory Add Dialog ──
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addTerritoryOpen, setAddTerritoryOpen] = useState(false);

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
    } else {
      const newBU: LocalBusinessUnit = {
        id: `lbu-${Date.now().toString(36)}`,
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
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDeleteBU(buId: string) {
    setBusinessUnits((prev) => prev.filter((bu) => bu.id !== buId));
    if (selectedBU?.id === buId) {
      setSelectedBU(null);
      setDetailDialogOpen(false);
    }
  }

  function handleOpenDetail(bu: LocalBusinessUnit) {
    setSelectedBU(bu);
    setDetailSubTab("overview");
    setDetailDialogOpen(true);
  }

  // ── Member Handlers ──
  function handleAddMember() {
    if (!selectedBU || !newMemberUserId) return;
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
    setAddMemberOpen(false);
    setNewMemberUserId("");
    setNewMemberRole("MEDICAL_REP");
  }

  function handleRemoveMember(userId: string) {
    if (!selectedBU) return;
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
  }

  // ── Product Handlers ──
  function handleAddProduct(productId: string) {
    if (!selectedBU) return;
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
  }

  function handleRemoveProduct(productId: string) {
    if (!selectedBU) return;
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
  }

  // ── Territory Handlers ──
  function handleAddTerritory(territoryId: string) {
    if (!selectedBU) return;
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
  }

  function handleRemoveTerritory(territoryId: string) {
    if (!selectedBU) return;
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
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
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
              <div className="flex gap-1 border-b pb-0">
                {([
                  { key: "overview", label: "Overview", icon: BarChart3 },
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
                              return (
                                <div key={member.userId} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                      {u?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{u?.name || member.userId}</p>
                                      <p className="text-xs text-muted-foreground">{u?.email || ""} {u?.territory ? `| ${u.territory}` : ""}</p>
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
                              <span className="font-medium">{product.pricePerUnit.toLocaleString()}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Stock Qty</span>
                              <span className={`font-medium ${product.stockQty <= product.reorderLevel ? "text-red-600" : "text-green-700"}`}>
                                {product.stockQty.toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground block">Reorder Level</span>
                              <span className="font-medium">{product.reorderLevel.toLocaleString()}</span>
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

              {/* ── Territories Sub-tab ── */}
              {detailSubTab === "territories" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                      Assigned Territories ({selectedBUTerritories.length})
                    </h3>
                    {canEdit && (
                      <Button size="sm" onClick={() => setAddTerritoryOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Territory
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedBUTerritories.map((territory) => {
                      const repsInTerritory = territory.assignedRepIds.length;
                      const doctorsInTerritory = store.doctors.filter((d) => d.brickId === territory.id).length;
                      return (
                        <Card key={territory.id}>
                          <CardContent className="pt-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-semibold text-sm">{territory.name}</h4>
                                  <span className="text-xs text-muted-foreground">{territory.nameAr}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-mono">{territory.imsCode}</Badge>
                              </div>
                              {canEdit && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => handleRemoveTerritory(territory.id)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <span className="text-muted-foreground block">Level</span>
                                <Badge className={
                                  territory.level === "region" ? "bg-red-100 text-red-800" :
                                  territory.level === "governorate" ? "bg-blue-100 text-blue-800" :
                                  territory.level === "district" ? "bg-amber-100 text-amber-800" :
                                  "bg-green-100 text-green-800"
                                }>{territory.level}</Badge>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <span className="text-muted-foreground block">Reps</span>
                                <span className="font-semibold">{repsInTerritory}</span>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <span className="text-muted-foreground block">Doctors</span>
                                <span className="font-semibold">{doctorsInTerritory}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {selectedBUTerritories.length === 0 && (
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

      {/* Create/Edit BU Form */}
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

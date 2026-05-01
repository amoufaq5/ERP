"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

/** Extended MarketRequest with optional linked PO field set on approval */
type MarketRequestExt = MarketRequest & { linkedPONumber?: string };
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";

export default function MarketRequestsPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MarketRequest | null>(null);

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
      store.add("marketRequests", {
        id: store.genId("mr"),
        ...payload,
        requestedById: user.id,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleApprove(r: MarketRequest) {
    store.update("marketRequests", r.id, {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    });
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
      }
    }
  }

  function handleReject(r: MarketRequest, reason?: string) {
    store.update("marketRequests", r.id, {
      status: "REJECTED",
      approvedById: user.id,
      rejectionReason: reason ?? "Rejected by supervisor",
    });
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
                  return (
                    <div className="flex flex-col gap-1 items-start">
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
                      {r.linkedPONumber && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-blue-700 border-blue-300 bg-blue-50">
                          <PackageCheck className="h-3 w-3" />
                          PO: {r.linkedPONumber}
                        </Badge>
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
                  return (
                    <EditDeleteMenu
                      onEdit={
                        r.status === "PENDING" ? () => handleEdit(r) : undefined
                      }
                      canEdit={r.status === "PENDING"}
                      onDelete={() => handleDelete(r)}
                      itemLabel={r.description.slice(0, 40)}
                      extraItems={
                        canApprove && r.status === "PENDING"
                          ? [
                              {
                                label: "Approve",
                                onClick: () => handleApprove(r),
                                icon: (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ),
                              },
                              {
                                label: "Reject",
                                onClick: () => handleReject(r),
                                icon: (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                ),
                                destructive: true,
                              },
                            ]
                          : []
                      }
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
                  return (
                    <Card key={r.id} className="p-4">
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
                            {r.amount && (
                              <span className="text-sm font-bold text-slate-700">
                                EGP {r.amount.toLocaleString()}
                              </span>
                            )}
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
                        {canApprove && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleReject(r)}
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
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
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

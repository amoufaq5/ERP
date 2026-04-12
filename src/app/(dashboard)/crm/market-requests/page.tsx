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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "@/lib/data-store";
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
            onChange={setFilters}
            collapsible
          />

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                    <tr>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Requester</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Priority</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No requests match your filters.
                        </td>
                      </tr>
                    )}
                    {filteredRequests
                      .slice()
                      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
                      .map((r) => {
                        const requester = allUsers.find((u) => u.id === r.requestedById);
                        return (
                          <tr key={r.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <Badge variant="outline">{r.type}</Badge>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-sm">
                                {requester?.name ?? "—"}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {requester ? ROLE_LABEL[requester.role] : ""}
                              </div>
                            </td>
                            <td className="p-3 max-w-xs truncate">{r.description}</td>
                            <td className="p-3">
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
                            </td>
                            <td className="p-3 font-semibold">
                              {r.amount ? `EGP ${r.amount.toLocaleString()}` : "—"}
                            </td>
                            <td className="p-3">
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
                            </td>
                            <td className="p-3 text-xs">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
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
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                          <div>
                            <span className="font-medium">
                              {requester?.name ?? "—"}
                            </span>{" "}
                            — {r.type} — {r.description.slice(0, 50)}
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

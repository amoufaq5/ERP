"use client";

import { useMemo, useState } from "react";
import {
  Building,
  Plus,
  Users,
  Package,
  TrendingUp,
  UserCog,
  Stethoscope,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
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
import { useCurrentUser } from "@/lib/user-context";

export default function BusinessUnitsPage() {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessUnit | null>(null);

  const canManageBUs = user.role === "ADMIN" || user.role === "BUM";

  // Filter BUs based on role visibility then text
  const scopedBUs = useMemo(
    () => visibleBusinessUnits(store.businessUnits, user.role, user.id),
    [store.businessUnits, user.role, user.id]
  );

  const filteredBUs = useMemo(() => {
    return scopedBUs.filter((bu) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          bu.name.toLowerCase().includes(q) ||
          bu.code.toLowerCase().includes(q) ||
          bu.description.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filters.manager && bu.managerId !== filters.manager) return false;
      return true;
    });
  }, [scopedBUs, search, filters]);

  // Stats
  const totalProducts = store.products.filter((p) =>
    scopedBUs.some((b) => b.id === p.buId)
  ).length;
  const totalMembers = new Set(scopedBUs.flatMap((b) => b.memberIds)).size;
  const totalDoctors = store.doctors.filter((d) =>
    scopedBUs.some((b) => b.id === d.buId)
  ).length;

  // Available users for BU assignment
  const managerOptions = allUsers
    .filter((u) => u.role === "BUM" || u.role === "ADMIN")
    .map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }));
  const memberOptions = allUsers
    .filter((u) => u.role !== "ADMIN")
    .map((u) => ({ label: `${u.name} — ${u.role}`, value: u.id }));
  const productOptions = store.products.map((p) => ({
    label: `${p.code} — ${p.name}`,
    value: p.id,
  }));

  const fields: EntityField[] = [
    { name: "name", label: "Business Unit Name", type: "text", required: true, placeholder: "e.g. Oncology BU" },
    { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. ONC" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Therapeutic areas and coverage",
      fullWidth: true,
    },
    {
      name: "managerId",
      label: "Business Unit Manager",
      type: "select",
      required: true,
      options: managerOptions,
    },
    {
      name: "color",
      label: "Color tag",
      type: "text",
      placeholder: "#3b82f6",
      defaultValue: "#3b82f6",
    },
    {
      name: "memberIds",
      label: "Team Members",
      type: "multiselect",
      options: memberOptions,
      helperText: "Marketeers, District Managers, Medical Reps assigned to this BU",
    },
    {
      name: "productIds",
      label: "Products",
      type: "multiselect",
      options: productOptions,
      helperText: "Products in this business unit's portfolio",
    },
  ];

  function handleCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(bu: BusinessUnit) {
    setEditing(bu);
    setFormOpen(true);
  }

  function handleSubmit(data: EntityFormData) {
    const payload = {
      name: String(data.name),
      code: String(data.code),
      description: String(data.description ?? ""),
      managerId: String(data.managerId),
      color: String(data.color || "#3b82f6"),
      memberIds: (data.memberIds as string[]) ?? [],
      productIds: (data.productIds as string[]) ?? [],
    };
    if (editing) {
      store.update("businessUnits", editing.id, payload);
      // Update product.buId for newly added / removed products
      const oldSet = new Set(editing.productIds);
      const newSet = new Set(payload.productIds);
      // Products newly added — set their buId to this BU
      payload.productIds.forEach((pid) => {
        if (!oldSet.has(pid)) store.update("products", pid, { buId: editing.id });
      });
      // Products removed — clear their buId if it still points to this BU
      editing.productIds.forEach((pid) => {
        if (!newSet.has(pid)) {
          const p = store.products.find((x) => x.id === pid);
          if (p && p.buId === editing.id) {
            store.update("products", pid, { buId: null });
          }
        }
      });
    } else {
      const id = store.genId("bu");
      const newBU: BusinessUnit = {
        id,
        ...payload,
        createdAt: new Date().toISOString(),
      };
      store.add("businessUnits", newBU);
      payload.productIds.forEach((pid) => store.update("products", pid, { buId: id }));
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete(bu: BusinessUnit) {
    // Clear buId on its products so they don't orphan-reference a deleted BU
    bu.productIds.forEach((pid) => {
      const p = store.products.find((x) => x.id === pid);
      if (p && p.buId === bu.id) store.update("products", pid, { buId: null });
    });
    store.remove("businessUnits", bu.id);
  }

  const initialData: EntityFormData | undefined = editing
    ? {
        name: editing.name,
        code: editing.code,
        description: editing.description,
        managerId: editing.managerId ?? "",
        color: editing.color,
        memberIds: editing.memberIds,
        productIds: editing.productIds,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Units"
        description="Create and manage business units. Assign products, BU managers, and team members. Every BU sees only its own data."
        actions={
          canManageBUs && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Business Unit
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Building}
          title="Business Units"
          value={scopedBUs.length}
          subtitle="Visible to you"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Package}
          title="Products"
          value={totalProducts}
          subtitle="Across your BUs"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={Users}
          title="Team Members"
          value={totalMembers}
          subtitle="Assigned to BUs"
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={Stethoscope}
          title="Doctors in BU"
          value={totalDoctors}
          subtitle="Linked to your BUs"
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      <FilterBar
        searchPlaceholder="Search business units by name, code, or description..."
        searchValue={search}
        onSearchChange={setSearch}
        fields={[
          {
            key: "manager",
            label: "Manager",
            type: "select",
            options: managerOptions,
          },
        ]}
        values={filters}
        onChange={setFilters}
        collapsible
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBUs.length === 0 && (
          <Card className="col-span-full p-8 text-center text-slate-500">
            <Building className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No business units match your filters.</p>
          </Card>
        )}
        {filteredBUs.map((bu) => {
          const manager = allUsers.find((u) => u.id === bu.managerId);
          const products = store.products.filter((p) => bu.productIds.includes(p.id));
          const members = allUsers.filter((u) => bu.memberIds.includes(u.id));
          const doctors = store.doctors.filter((d) => d.buId === bu.id);
          const visits = store.visits.filter((v) => v.buId === bu.id);
          return (
            <Card key={bu.id} className="p-5 flex flex-col gap-3 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: bu.color }}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className="font-mono text-[10px]"
                      style={{ backgroundColor: `${bu.color}20`, color: bu.color, borderColor: bu.color }}
                    >
                      {bu.code}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-base text-slate-900 truncate">
                    {bu.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {bu.description}
                  </p>
                </div>
                {canManageBUs && (
                  <EditDeleteMenu
                    onEdit={() => handleEdit(bu)}
                    onDelete={() => handleDelete(bu)}
                    itemLabel={bu.name}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <UserCog className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600 truncate">
                    {manager?.name ?? "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">{products.length} products</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">{members.length} members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">{doctors.length} doctors</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">{visits.length} visits logged</span>
                </div>
              </div>

              {products.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5 font-semibold">
                    Products
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {products.slice(0, 6).map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                      >
                        {p.name}
                      </span>
                    ))}
                    {products.length > 6 && (
                      <span className="text-[10px] text-slate-400">
                        +{products.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <EntityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : "Create Business Unit"}
        description="Define scope, assign a manager, choose team members and products."
        fields={fields}
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : "Create"}
        size="xl"
      />
    </div>
  );
}

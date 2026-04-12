"use client";

import { useMemo, useState } from "react";
import { Stethoscope, Plus, MapPin, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  scopeDoctors,
  type Doctor,
} from "@/lib/data-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";

export default function DoctorsPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const repsUnderMe = getReportsOf(user.id).map((u) => u.id);
  const scoped = useMemo(
    () => scopeDoctors(store.doctors, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.doctors, store.businessUnits, user.role, user.id, repsUnderMe]
  );

  const uniqueCities = Array.from(new Set(scoped.map((d) => d.city))).sort();
  const uniqueSpecialties = Array.from(new Set(scoped.map((d) => d.specialty))).sort();
  const uniqueBUs = store.businessUnits.map((bu) => ({ label: bu.name, value: bu.id }));

  const filtered = useMemo(() => {
    return scoped.filter((d) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !d.specialty.toLowerCase().includes(q) &&
          !d.hospital.toLowerCase().includes(q) &&
          !d.city.toLowerCase().includes(q) &&
          !d.phone.includes(q)
        )
          return false;
      }
      if (filters.classification && d.classification !== filters.classification) return false;
      if (filters.city && d.city !== filters.city) return false;
      if (filters.specialty && d.specialty !== filters.specialty) return false;
      if (filters.buId && d.buId !== filters.buId) return false;
      if (filters.assignedRepId && d.assignedRepId !== filters.assignedRepId) return false;
      return true;
    });
  }, [scoped, search, filters]);

  const classA = scoped.filter((d) => d.classification === "A").length;
  const classB = scoped.filter((d) => d.classification === "B").length;
  const visitedRecently = scoped.filter(
    (d) => d.lastVisitAt && new Date(d.lastVisitAt) > new Date(Date.now() - 14 * 86400000)
  ).length;

  const canEdit = user.role !== "MEDICAL_REP";
  const isRep = user.role === "MEDICAL_REP";

  const repOptions = allUsers
    .filter((u) => u.role === "MEDICAL_REP")
    .map((u) => ({ label: `${u.name}`, value: u.id }));

  const buOptions = store.businessUnits.map((b) => ({ label: b.name, value: b.id }));

  const fields: EntityField[] = [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "Dr. ..." },
    { name: "specialty", label: "Specialty", type: "text", required: true },
    { name: "hospital", label: "Hospital / Clinic", type: "text", required: true },
    { name: "city", label: "City", type: "text", required: true },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email" },
    {
      name: "classification",
      label: "Classification",
      type: "select",
      required: true,
      options: [
        { label: "A - High value", value: "A" },
        { label: "B - Medium value", value: "B" },
        { label: "C - Low value", value: "C" },
        { label: "D - Occasional", value: "D" },
      ],
    },
    { name: "visitFrequency", label: "Required visits/month", type: "number", required: true, defaultValue: 2 },
    { name: "assignedRepId", label: "Assigned Rep", type: "select", options: repOptions },
    { name: "buId", label: "Business Unit", type: "select", options: buOptions },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(d: Doctor) {
    setEditing(d);
    setFormOpen(true);
  }

  function handleSubmit(data: EntityFormData) {
    const payload: Partial<Doctor> = {
      name: String(data.name),
      specialty: String(data.specialty),
      hospital: String(data.hospital),
      city: String(data.city),
      phone: String(data.phone),
      email: data.email ? String(data.email) : undefined,
      classification: data.classification as Doctor["classification"],
      visitFrequency: Number(data.visitFrequency),
      assignedRepId: data.assignedRepId ? String(data.assignedRepId) : null,
      buId: data.buId ? String(data.buId) : null,
      notes: data.notes ? String(data.notes) : undefined,
    };

    if (editing) {
      if (isRep) {
        // Submit as approval request
        store.add("marketRequests", {
          id: store.genId("mr"),
          type: "DOCTOR_EDIT",
          requestedById: user.id,
          doctorId: editing.id,
          description: `Requested updates to doctor: ${editing.name}`,
          priority: "MEDIUM",
          status: "PENDING",
          createdAt: new Date().toISOString(),
          buId: editing.buId ?? null,
          proposedChanges: payload,
          targetEntityId: editing.id,
        });
      } else {
        store.update("doctors", editing.id, payload);
      }
    } else {
      store.add("doctors", {
        id: store.genId("dr"),
        ...payload,
        name: payload.name!,
        specialty: payload.specialty!,
        hospital: payload.hospital!,
        city: payload.city!,
        phone: payload.phone!,
        classification: payload.classification!,
        visitFrequency: payload.visitFrequency!,
        assignedRepId: payload.assignedRepId ?? null,
        createdAt: new Date().toISOString(),
      });
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete(d: Doctor) {
    store.remove("doctors", d.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Directory"
        description={`Showing ${scoped.length} doctors visible to you (${ROLE_LABEL[user.role]}).`}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Doctor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Stethoscope} title="Total Doctors" value={scoped.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Stethoscope} title="Class A" value={classA} subtitle="High-value targets" iconColor="bg-emerald-100 text-emerald-600" />
        <StatsCard icon={Stethoscope} title="Class B" value={classB} iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={Activity} title="Visited (14d)" value={visitedRecently} subtitle="In last 2 weeks" iconColor="bg-purple-100 text-purple-600" />
      </div>

      <FilterBar
        searchPlaceholder="Search doctors by name, specialty, hospital, city, or phone..."
        searchValue={search}
        onSearchChange={setSearch}
        fields={[
          {
            key: "classification",
            label: "Class",
            type: "select",
            options: [
              { label: "A", value: "A" },
              { label: "B", value: "B" },
              { label: "C", value: "C" },
              { label: "D", value: "D" },
            ],
          },
          { key: "city", label: "City", type: "select", options: uniqueCities.map((c) => ({ label: c, value: c })) },
          { key: "specialty", label: "Specialty", type: "select", options: uniqueSpecialties.map((s) => ({ label: s, value: s })) },
          { key: "buId", label: "Business Unit", type: "select", options: uniqueBUs },
          { key: "assignedRepId", label: "Assigned Rep", type: "select", options: repOptions },
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
                  <th className="text-left p-3">Doctor</th>
                  <th className="text-left p-3">Specialty</th>
                  <th className="text-left p-3">Hospital</th>
                  <th className="text-left p-3">City</th>
                  <th className="text-left p-3">Class</th>
                  <th className="text-left p-3">Assigned Rep</th>
                  <th className="text-left p-3">BU</th>
                  <th className="text-left p-3">Last Visit</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No doctors match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map((d) => {
                  const rep = allUsers.find((u) => u.id === d.assignedRepId);
                  const bu = d.buId ? store.businessUnits.find((b) => b.id === d.buId) : null;
                  return (
                    <tr key={d.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-[11px] text-slate-500">{d.phone}</div>
                      </td>
                      <td className="p-3">{d.specialty}</td>
                      <td className="p-3">{d.hospital}</td>
                      <td className="p-3">{d.city}</td>
                      <td className="p-3">
                        <Badge variant={d.classification === "A" ? "success" : d.classification === "B" ? "default" : "secondary"}>
                          {d.classification}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{rep?.name ?? "—"}</td>
                      <td className="p-3 text-xs">
                        {bu ? (
                          <Badge variant="outline" style={{ borderColor: bu.color, color: bu.color }}>
                            {bu.code}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        {d.lastVisitAt ? new Date(d.lastVisitAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-3 text-right">
                        <EditDeleteMenu
                          onEdit={() => handleEdit(d)}
                          onDelete={canEdit ? () => handleDelete(d) : undefined}
                          canDelete={canEdit}
                          itemLabel={d.name}
                          compact
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

      <EntityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? (isRep ? `Request edit: ${editing.name}` : `Edit ${editing.name}`) : "Add Doctor"}
        description={isRep && editing ? "Your changes will be sent as an approval request to your superior." : undefined}
        fields={fields}
        initialData={
          editing
            ? {
                name: editing.name,
                specialty: editing.specialty,
                hospital: editing.hospital,
                city: editing.city,
                phone: editing.phone,
                email: editing.email ?? "",
                classification: editing.classification,
                visitFrequency: editing.visitFrequency,
                assignedRepId: editing.assignedRepId ?? "",
                buId: editing.buId ?? "",
                notes: editing.notes ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitLabel={editing ? (isRep ? "Submit request" : "Save") : "Create"}
        size="xl"
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  UserCheck,
  Activity,
  ClipboardList,
  MapPin,
  Plus,
  Stethoscope,
  CheckCircle2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import {
  useDataStore,
  scopeDoctors,
  scopeVisits,
  scopeTasks,
  scopeMarketRequests,
  type Doctor,
  type Visit,
  type MarketRequest,
  type Territory,
} from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

export default function MedicalRepPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [doctorFilters, setDoctorFilters] = useState<FilterState>({});
  const [visitFilters, setVisitFilters] = useState<FilterState>({});

  const [visitFormOpen, setVisitFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const [editDoctorFormOpen, setEditDoctorFormOpen] = useState(false);
  const [doctorBeingEdited, setDoctorBeingEdited] = useState<Doctor | null>(null);

  const [newDoctorOpen, setNewDoctorOpen] = useState(false);
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);

  // ─── Scoping ───────────────────────────────────────────────────────────
  const repsUnderMe = getReportsOf(user.id).map((u) => u.id);
  const myDoctors = useMemo(
    () => scopeDoctors(store.doctors, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.doctors, store.businessUnits, user.role, user.id, repsUnderMe]
  );
  const myVisits = useMemo(
    () => scopeVisits(store.visits, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.visits, store.businessUnits, user.role, user.id, repsUnderMe]
  );
  const myTasks = useMemo(
    () => scopeTasks(store.tasks, user.role, user.id),
    [store.tasks, user.role, user.id]
  );
  const myMarketRequests = useMemo(
    () => scopeMarketRequests(store.marketRequests, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.marketRequests, store.businessUnits, user.role, user.id, repsUnderMe]
  );

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return myDoctors.filter((d) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !d.specialty.toLowerCase().includes(q) &&
          !d.hospital.toLowerCase().includes(q) &&
          !d.city.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (doctorFilters.classification && d.classification !== doctorFilters.classification)
        return false;
      if (doctorFilters.city && d.city !== doctorFilters.city) return false;
      if (doctorFilters.specialty && d.specialty !== doctorFilters.specialty) return false;
      return true;
    });
  }, [myDoctors, search, doctorFilters]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return myVisits.filter((v) => {
      if (visitFilters.type && v.type !== visitFilters.type) return false;
      if (visitFilters.status && v.status !== visitFilters.status) return false;
      if (visitFilters.from && v.dateTime < visitFilters.from) return false;
      if (visitFilters.to && v.dateTime > visitFilters.to + "T23:59:59") return false;
      return true;
    });
  }, [myVisits, visitFilters]);

  // Stats
  const doneVisits = myVisits.filter((v) => v.status === "APPROVED").length;
  const pendingVisits = myVisits.filter((v) => v.status === "LOGGED").length;
  const pendingRequests = myMarketRequests.filter((r) => r.status === "PENDING").length;
  const coverage = myDoctors.length > 0
    ? Math.round((doneVisits / (myDoctors.length * 2)) * 100)
    : 0;
  const openTasks = myTasks.filter((t) => t.status !== "DONE").length;

  // Role-based capabilities
  const isRep = user.role === "MEDICAL_REP";
  const canDirectlyEditDoctor = user.role === "ADMIN" || user.role === "DISTRICT_MANAGER" || user.role === "BUM" || user.role === "MARKETEER";

  // ─── Doctor form fields ────────────────────────────────────────────────
  const buOptions = store.businessUnits.map((bu) => ({ label: bu.name, value: bu.id }));
  const repOptions = allUsers
    .filter((u) => u.role === "MEDICAL_REP")
    .map((u) => ({ label: `${u.name} — ${u.territory ?? ""}`, value: u.id }));

  const doctorFields: EntityField[] = [
    { name: "name", label: "Doctor Name", type: "text", required: true, placeholder: "Dr. ..." },
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
    {
      name: "visitFrequency",
      label: "Required visits/month",
      type: "number",
      required: true,
      defaultValue: 2,
    },
    {
      name: "assignedRepId",
      label: "Assigned Rep",
      type: "select",
      options: repOptions,
    },
    {
      name: "buId",
      label: "Business Unit",
      type: "select",
      options: buOptions,
    },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  // ─── Visit form fields ─────────────────────────────────────────────────
  const doctorVisitOptions = myDoctors.map((d) => ({
    label: `${d.name} — ${d.hospital}`,
    value: d.id,
  }));
  const productOptions = store.products.map((p) => ({
    label: `${p.code} - ${p.name}`,
    value: p.id,
  }));
  const seniorOptions = allUsers
    .filter((u) =>
      ["DISTRICT_MANAGER", "MARKETEER", "BUM"].includes(u.role)
    )
    .map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }));

  const visitFields: EntityField[] = [
    {
      name: "doctorId",
      label: "Doctor",
      type: "select",
      required: true,
      options: doctorVisitOptions,
    },
    {
      name: "dateTime",
      label: "Date & Time",
      type: "datetime",
      required: true,
      defaultValue: new Date().toISOString().slice(0, 16),
    },
    {
      name: "type",
      label: "Visit Type",
      type: "select",
      required: true,
      defaultValue: "SINGLE",
      options: [
        { label: "Single (just me)", value: "SINGLE" },
        { label: "Double (joint with senior)", value: "DOUBLE" },
      ],
    },
    {
      name: "partnerId",
      label: "Senior joining (for Double visit)",
      type: "select",
      options: seniorOptions,
      helperText: "Required when type is DOUBLE",
    },
    { name: "durationMin", label: "Duration (minutes)", type: "number", defaultValue: 20, required: true },
    {
      name: "productIds",
      label: "Products Detailed",
      type: "multiselect",
      options: productOptions,
    },
    { name: "samplesDistributed", label: "Samples Distributed", type: "number", defaultValue: 0 },
    {
      name: "gpsVerified",
      label: "GPS Verified",
      type: "checkbox",
      defaultValue: true,
      placeholder: "Location confirmed",
    },
    { name: "notes", label: "Visit Notes", type: "textarea", fullWidth: true, required: true },
    { name: "feedback", label: "Doctor Feedback", type: "textarea", fullWidth: true },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────
  function handleLogVisit() {
    setEditingVisit(null);
    setVisitFormOpen(true);
  }

  function handleEditVisit(v: Visit) {
    setEditingVisit(v);
    setVisitFormOpen(true);
  }

  function handleVisitSubmit(data: EntityFormData) {
    const payload = {
      repId: user.role === "MEDICAL_REP" ? user.id : (editingVisit?.repId ?? user.id),
      doctorId: String(data.doctorId),
      dateTime: String(data.dateTime),
      type: data.type as "SINGLE" | "DOUBLE",
      partnerId: data.partnerId ? String(data.partnerId) : undefined,
      durationMin: Number(data.durationMin),
      productIds: (data.productIds as string[]) ?? [],
      samplesDistributed: Number(data.samplesDistributed ?? 0),
      notes: String(data.notes ?? ""),
      feedback: data.feedback ? String(data.feedback) : undefined,
      gpsVerified: !!data.gpsVerified,
      status: "LOGGED" as const,
      buId: store.doctors.find((d) => d.id === String(data.doctorId))?.buId ?? null,
    };

    if (editingVisit) {
      store.update("visits", editingVisit.id, payload);
    } else {
      const id = store.genId("v");
      store.add("visits", { id, ...payload });
      // Update doctor's lastVisitAt
      store.update("doctors", payload.doctorId, { lastVisitAt: payload.dateTime });
    }
    setVisitFormOpen(false);
    setEditingVisit(null);
  }

  function handleDeleteVisit(v: Visit) {
    store.remove("visits", v.id);
  }

  function handleApproveVisit(v: Visit) {
    store.update("visits", v.id, { status: "APPROVED" });
  }

  function handleEditDoctor(d: Doctor) {
    setDoctorBeingEdited(d);
    setEditDoctorFormOpen(true);
  }

  function handleDoctorSubmit(data: EntityFormData) {
    const payload: Partial<Doctor> = {
      name: String(data.name),
      specialty: String(data.specialty),
      hospital: String(data.hospital),
      city: String(data.city),
      phone: String(data.phone),
      email: data.email ? String(data.email) : undefined,
      classification: data.classification as "A" | "B" | "C" | "D",
      visitFrequency: Number(data.visitFrequency),
      assignedRepId: data.assignedRepId ? String(data.assignedRepId) : null,
      buId: data.buId ? String(data.buId) : null,
      notes: data.notes ? String(data.notes) : undefined,
    };

    if (doctorBeingEdited) {
      if (isRep) {
        // Medical reps cannot edit doctors directly; create an approval request
        const req: MarketRequest = {
          id: store.genId("mr"),
          type: "DOCTOR_EDIT",
          requestedById: user.id,
          doctorId: doctorBeingEdited.id,
          description: `Request to update doctor ${doctorBeingEdited.name}'s details`,
          priority: "MEDIUM",
          status: "PENDING",
          createdAt: new Date().toISOString(),
          buId: doctorBeingEdited.buId ?? null,
          proposedChanges: payload,
          targetEntityId: doctorBeingEdited.id,
        };
        store.add("marketRequests", req);
      } else {
        store.update("doctors", doctorBeingEdited.id, payload);
      }
    } else {
      const newDoctor: Doctor = {
        id: store.genId("dr"),
        ...payload,
        assignedRepId: payload.assignedRepId ?? null,
        name: payload.name!,
        specialty: payload.specialty!,
        hospital: payload.hospital!,
        city: payload.city!,
        phone: payload.phone!,
        classification: payload.classification!,
        visitFrequency: payload.visitFrequency!,
        createdAt: new Date().toISOString(),
      };
      store.add("doctors", newDoctor);
    }
    setEditDoctorFormOpen(false);
    setNewDoctorOpen(false);
    setDoctorBeingEdited(null);
  }

  function handleDeleteDoctor(d: Doctor) {
    store.remove("doctors", d.id);
  }

  const uniqueCities = Array.from(new Set(myDoctors.map((d) => d.city))).sort();
  const uniqueSpecialties = Array.from(new Set(myDoctors.map((d) => d.specialty))).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRep ? "My Work" : "Medical Representatives"}
        description={
          isRep
            ? "Your assigned doctors, your visits, your tasks and market requests."
            : "Field force dashboard. Supervisors see their team's data only."
        }
        actions={
          <div className="flex gap-2">
            {isRep && (
              <Button variant="outline" onClick={() => setNewDoctorOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor (request)
              </Button>
            )}
            {canDirectlyEditDoctor && (
              <Button variant="outline" onClick={() => setNewDoctorOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
            )}
            <Button onClick={handleLogVisit}>
              <MapPin className="h-4 w-4 mr-2" />
              Log Visit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Stethoscope}
          title={isRep ? "My Doctors" : "Doctors in scope"}
          value={myDoctors.length}
          subtitle={`${filteredDoctors.length} after filters`}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Activity}
          title="Visits This Period"
          value={myVisits.length}
          subtitle={`${doneVisits} approved · ${pendingVisits} pending`}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={Target}
          title="Coverage"
          value={`${Math.min(coverage, 100)}%`}
          subtitle="Target: 2 visits per A-class"
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={ClipboardList}
          title="Open Tasks"
          value={openTasks}
          subtitle={`${pendingRequests} pending requests`}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      <Tabs defaultValue="doctors">
        <TabsList className="grid w-full grid-cols-5 md:w-auto md:inline-flex">
          <TabsTrigger value="mylist">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            My List
          </TabsTrigger>
          <TabsTrigger value="doctors">
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            All Doctors
          </TabsTrigger>
          <TabsTrigger value="visits">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Visits
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="requests">
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            My Requests
          </TabsTrigger>
        </TabsList>

        {/* My Custom List tab */}
        <TabsContent value="mylist" className="space-y-4">
          <MyDoctorList
            store={store}
            user={user}
            allDoctors={myDoctors}
            onAddDoctor={() => setNewDoctorOpen(true)}
            onViewDoctor={setViewDoctor}
          />
        </TabsContent>

        {/* Doctors tab */}
        <TabsContent value="doctors" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search doctors by name, specialty, hospital, or city..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              {
                key: "classification",
                label: "Classification",
                type: "select",
                options: [
                  { label: "A", value: "A" },
                  { label: "B", value: "B" },
                  { label: "C", value: "C" },
                  { label: "D", value: "D" },
                ],
              },
              {
                key: "city",
                label: "City",
                type: "select",
                options: uniqueCities.map((c) => ({ label: c, value: c })),
              },
              {
                key: "specialty",
                label: "Specialty",
                type: "select",
                options: uniqueSpecialties.map((s) => ({ label: s, value: s })),
              },
            ]}
            values={doctorFilters}
            onChange={(k, v) => setDoctorFilters(f => ({ ...f, [k]: v }))}
            collapsible
          />

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "name", label: "Doctor", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "specialty", label: "Specialty" },
                  { key: "hospital", label: "Hospital" },
                  { key: "city", label: "City" },
                  { key: "classification", label: "Class", render: (v) => (
                    <Badge variant={v === "A" ? "success" : v === "B" ? "default" : "secondary"}>
                      {v as string}
                    </Badge>
                  )},
                  { key: "assignedRepId", label: "Assigned Rep", render: (v) => {
                    const rep = allUsers.find((u) => u.id === v);
                    return <span className="text-xs">{rep?.name ?? "—"}</span>;
                  }},
                  { key: "lastVisitAt", label: "Last Visit", render: (v) => (
                    <span className="text-xs">{v ? new Date(v as string).toLocaleDateString() : "—"}</span>
                  )},
                  { key: "_actions", label: "", className: "text-right", render: (_v, row) => {
                    const d = row as unknown as Doctor;
                    return (
                      <EditDeleteMenu
                        onView={() => setViewDoctor(d)}
                        onEdit={() => handleEditDoctor(d)}
                        onDelete={canDirectlyEditDoctor ? () => handleDeleteDoctor(d) : undefined}
                        canDelete={canDirectlyEditDoctor}
                        itemLabel={d.name}
                        compact
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredDoctors as unknown as Record<string, unknown>[]}
                exportable exportFilename="crm-medical-rep.csv" emptyMessage="No doctors match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits tab */}
        <TabsContent value="visits" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search visits..."
            searchValue=""
            onSearchChange={() => {}}
            fields={[
              {
                key: "type",
                label: "Type",
                type: "select",
                options: [
                  { label: "Single", value: "SINGLE" },
                  { label: "Double", value: "DOUBLE" },
                ],
              },
              {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                  { label: "Logged", value: "LOGGED" },
                  { label: "Approved", value: "APPROVED" },
                  { label: "Rejected", value: "REJECTED" },
                ],
              },
              { key: "from", label: "From", type: "date" },
              { key: "to", label: "To", type: "date" },
            ]}
            values={visitFilters}
            onChange={(k, v) => setVisitFilters(f => ({ ...f, [k]: v }))}
            collapsible
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "dateTime", label: "Date", render: (v) => <span className="text-xs">{new Date(v as string).toLocaleString()}</span> },
                  { key: "doctorId", label: "Doctor", render: (v) => {
                    const doctor = store.doctors.find((d) => d.id === v);
                    return <span className="font-medium">{doctor?.name ?? "—"}</span>;
                  }},
                  { key: "repId", label: "Rep", render: (v) => {
                    const rep = allUsers.find((u) => u.id === v);
                    return <span className="text-xs">{rep?.name ?? "—"}</span>;
                  }},
                  { key: "type", label: "Type", render: (v) => (
                    <Badge variant={v === "DOUBLE" ? "default" : "outline"}>
                      {v as string}
                    </Badge>
                  )},
                  { key: "partnerId", label: "Partner", render: (v) => {
                    const partner = v ? allUsers.find((u) => u.id === v) : null;
                    return <span className="text-xs">{partner?.name ?? "—"}</span>;
                  }},
                  { key: "durationMin", label: "Duration", render: (v) => <span className="text-xs">{v as number}m</span> },
                  { key: "gpsVerified", label: "GPS", render: (v) => (
                    v ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">—</span>
                  )},
                  { key: "status", label: "Status", render: (v) => (
                    <Badge variant={v === "APPROVED" ? "success" : v === "REJECTED" ? "destructive" : "warning"}>
                      {v as string}
                    </Badge>
                  )},
                  { key: "_actions", label: "", className: "text-right", render: (_v, row) => {
                    const v = row as unknown as Visit;
                    return (
                      <EditDeleteMenu
                        onEdit={() => handleEditVisit(v)}
                        onDelete={() => handleDeleteVisit(v)}
                        itemLabel={`visit on ${new Date(v.dateTime).toLocaleDateString()}`}
                        extraItems={
                          !isRep && v.status === "LOGGED"
                            ? [
                                {
                                  label: "Approve",
                                  onClick: () => handleApproveVisit(v),
                                  icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                                },
                              ]
                            : []
                        }
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredVisits.slice().sort((a, b) => (b.dateTime > a.dateTime ? 1 : -1)) as unknown as Record<string, unknown>[]}
                exportable exportFilename="crm-medical-rep.csv" emptyMessage="No visits logged yet."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks tab */}
        <TabsContent value="tasks" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tasks &amp; KPIs assigned to me</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myTasks.length === 0 ? (
                <p className="p-6 text-center text-slate-500">
                  No tasks assigned yet.
                </p>
              ) : (
                <div className="divide-y">
                  {myTasks.map((t) => {
                    const assigner = allUsers.find((u) => u.id === t.assignedById);
                    const progress = t.kpiTarget
                      ? Math.round(((t.kpiActual ?? 0) / t.kpiTarget) * 100)
                      : null;
                    return (
                      <div key={t.id} className="p-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{t.title}</h4>
                            <Badge
                              variant={
                                t.priority === "URGENT"
                                  ? "destructive"
                                  : t.priority === "HIGH"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {t.priority}
                            </Badge>
                            <Badge
                              variant={
                                t.status === "DONE"
                                  ? "success"
                                  : t.status === "BLOCKED"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {t.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{t.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                            <span>From: {assigner?.name ?? "—"}</span>
                            <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                            {t.kpiMetric && (
                              <span>
                                KPI: {t.kpiActual ?? 0} / {t.kpiTarget} {t.kpiMetric}
                              </span>
                            )}
                          </div>
                          {progress !== null && (
                            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests tab */}
        <TabsContent value="requests" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Market Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myMarketRequests.length === 0 ? (
                <p className="p-6 text-center text-slate-500">
                  No market requests yet.
                </p>
              ) : (
                <div className="divide-y">
                  {myMarketRequests.map((r) => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{r.type}</Badge>
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
                          </div>
                          <p className="text-sm mt-2">{r.description}</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Created {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Doctor Detail Dialog */}
      <Dialog open={!!viewDoctor} onOpenChange={(open) => { if (!open) setViewDoctor(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDoctor?.name}</DialogTitle>
          </DialogHeader>
          {viewDoctor && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{viewDoctor.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Specialty</span><p className="font-medium">{viewDoctor.specialty}</p></div>
              <div><span className="text-sm text-muted-foreground">Hospital</span><p className="font-medium">{viewDoctor.hospital}</p></div>
              <div><span className="text-sm text-muted-foreground">City</span><p className="font-medium">{viewDoctor.city}</p></div>
              <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{viewDoctor.phone}</p></div>
              <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{viewDoctor.email || "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Classification</span><p className="font-medium">{viewDoctor.classification}</p></div>
              <div><span className="text-sm text-muted-foreground">Visit Frequency</span><p className="font-medium">{viewDoctor.visitFrequency} / month</p></div>
              <div><span className="text-sm text-muted-foreground">Assigned Rep</span><p className="font-medium">{viewDoctor.assignedRepId ? allUsers.find(u => u.id === viewDoctor.assignedRepId)?.name ?? "—" : "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Last Visit</span><p className="font-medium">{viewDoctor.lastVisitAt ? new Date(viewDoctor.lastVisitAt).toLocaleDateString() : "Never"}</p></div>
              {viewDoctor.notes && (
                <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewDoctor.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={visitFormOpen}
        onOpenChange={setVisitFormOpen}
        title={editingVisit ? "Edit Visit" : "Log New Visit"}
        description="Register a single or double visit. Double visits require a senior (DM, Marketeer, BUM) to join."
        fields={visitFields}
        initialData={
          editingVisit
            ? {
                doctorId: editingVisit.doctorId,
                dateTime: editingVisit.dateTime.slice(0, 16),
                type: editingVisit.type,
                partnerId: editingVisit.partnerId ?? "",
                durationMin: editingVisit.durationMin,
                productIds: editingVisit.productIds,
                samplesDistributed: editingVisit.samplesDistributed,
                gpsVerified: editingVisit.gpsVerified,
                notes: editingVisit.notes,
                feedback: editingVisit.feedback ?? "",
              }
            : undefined
        }
        onSubmit={handleVisitSubmit}
        submitLabel={editingVisit ? "Update Visit" : "Log Visit"}
        size="xl"
      />

      <EntityFormModal
        open={editDoctorFormOpen}
        onOpenChange={(v) => {
          setEditDoctorFormOpen(v);
          if (!v) setDoctorBeingEdited(null);
        }}
        title={
          doctorBeingEdited
            ? isRep
              ? `Request edit · ${doctorBeingEdited.name}`
              : `Edit ${doctorBeingEdited.name}`
            : "Add Doctor"
        }
        description={
          isRep
            ? "Medical reps can suggest edits — they will be submitted as an approval request to your District Manager."
            : "Full edit is available for your role."
        }
        fields={doctorFields}
        initialData={
          doctorBeingEdited
            ? {
                name: doctorBeingEdited.name,
                specialty: doctorBeingEdited.specialty,
                hospital: doctorBeingEdited.hospital,
                city: doctorBeingEdited.city,
                phone: doctorBeingEdited.phone,
                email: doctorBeingEdited.email ?? "",
                classification: doctorBeingEdited.classification,
                visitFrequency: doctorBeingEdited.visitFrequency,
                assignedRepId: doctorBeingEdited.assignedRepId ?? "",
                buId: doctorBeingEdited.buId ?? "",
                notes: doctorBeingEdited.notes ?? "",
              }
            : undefined
        }
        onSubmit={handleDoctorSubmit}
        submitLabel={isRep ? "Submit request" : "Save"}
        size="xl"
      />

      <EntityFormModal
        open={newDoctorOpen}
        onOpenChange={setNewDoctorOpen}
        title="Add New Doctor"
        description="Create a new doctor record."
        fields={doctorFields}
        onSubmit={handleDoctorSubmit}
        submitLabel="Create"
        size="xl"
      />
    </div>
  );
}

/* ─── My Doctor List Component ─── */
function MyDoctorList({
  store,
  user,
  allDoctors,
  onAddDoctor,
  onViewDoctor,
}: {
  store: ReturnType<typeof useDataStore>;
  user: { id: string; role: string };
  allDoctors: Doctor[];
  onAddDoctor: () => void;
  onViewDoctor: (d: Doctor) => void;
}) {
  const [listSearch, setListSearch] = useState("");
  const [selectedBrick, setSelectedBrick] = useState<string>("all");

  const territories = store.territories;

  const myBricks = useMemo(() => {
    return territories.filter(
      (t) => t.level === "brick" && t.assignedRepIds.includes(user.id)
    );
  }, [territories, user.id]);

  const myDoctorsInList = useMemo(() => {
    return allDoctors.filter((d) => d.assignedRepId === user.id);
  }, [allDoctors, user.id]);

  const filteredList = useMemo(() => {
    return myDoctorsInList.filter((d) => {
      if (selectedBrick !== "all" && d.brickId !== selectedBrick) return false;
      if (listSearch) {
        const q = listSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.hospital.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myDoctorsInList, selectedBrick, listSearch]);

  const unassignedDoctors = useMemo(() => {
    const myBrickIds = new Set(myBricks.map((b) => b.id));
    return store.doctors.filter(
      (d) =>
        d.assignedRepId !== user.id &&
        d.brickId &&
        myBrickIds.has(d.brickId)
    );
  }, [store.doctors, myBricks, user.id]);

  function addToMyList(doctorId: string) {
    store.update("doctors", doctorId, { assignedRepId: user.id });
  }

  function removeFromMyList(doctorId: string) {
    store.update("doctors", doctorId, { assignedRepId: null });
  }

  function getBrickPath(brickId: string): string {
    const parts: string[] = [];
    let current = territories.find((t) => t.id === brickId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? territories.find((t) => t.id === current!.parentId) : undefined;
    }
    return parts.join(" > ");
  }

  const classBreakdown = {
    A: filteredList.filter((d) => d.classification === "A").length,
    B: filteredList.filter((d) => d.classification === "B").length,
    C: filteredList.filter((d) => d.classification === "C").length,
    D: filteredList.filter((d) => d.classification === "D").length,
  };

  return (
    <div className="space-y-4">
      {/* Territory assignment banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">My Territory Assignment</h3>
              {myBricks.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No bricks assigned yet. Contact your manager to assign territories.</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {myBricks.map((brick) => (
                    <Badge key={brick.id} variant="outline" className="text-xs bg-white">
                      {getBrickPath(brick.id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-blue-700">{myDoctorsInList.length}</p>
              <p className="text-xs text-blue-600">Doctors in my list</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {(["A", "B", "C", "D"] as const).map((cls) => (
          <Card key={cls}>
            <CardContent className="pt-3 pb-3 text-center">
              <Badge className={
                cls === "A" ? "bg-green-100 text-green-800" :
                cls === "B" ? "bg-blue-100 text-blue-800" :
                cls === "C" ? "bg-amber-100 text-amber-800" :
                "bg-gray-100 text-gray-800"
              }>Class {cls}</Badge>
              <p className="text-xl font-bold mt-1">{classBreakdown[cls]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search my list..."
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          className="max-w-xs text-sm"
        />
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={selectedBrick}
          onChange={(e) => setSelectedBrick(e.target.value)}
        >
          <option value="all">All Bricks</option>
          {myBricks.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.imsCode})</option>
          ))}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={onAddDoctor}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Doctor
          </Button>
        </div>
      </div>

      {/* My Doctor List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">My Doctor List ({filteredList.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No doctors in your list yet.</p>
              <p className="text-xs mt-1">Add doctors from unassigned list below or create a new doctor.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-2.5 font-medium">Doctor</th>
                <th className="text-left p-2.5 font-medium">Brick</th>
                <th className="text-left p-2.5 font-medium">Class</th>
                <th className="text-left p-2.5 font-medium">Freq</th>
                <th className="text-left p-2.5 font-medium">Last Visit</th>
                <th className="text-right p-2.5 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filteredList.map((d) => {
                  const brick = territories.find((t) => t.id === d.brickId);
                  const daysSince = d.lastVisitAt
                    ? Math.floor((Date.now() - new Date(d.lastVisitAt).getTime()) / 86400000)
                    : null;
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-2.5">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialty} · {d.hospital}</p>
                      </td>
                      <td className="p-2.5">
                        {brick ? (
                          <Badge variant="outline" className="text-[10px]">{brick.name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge className={
                          d.classification === "A" ? "bg-green-100 text-green-800" :
                          d.classification === "B" ? "bg-blue-100 text-blue-800" :
                          d.classification === "C" ? "bg-amber-100 text-amber-800" :
                          "bg-gray-100 text-gray-800"
                        }>{d.classification}</Badge>
                      </td>
                      <td className="p-2.5 text-xs">{d.visitFrequency}x/mo</td>
                      <td className="p-2.5 text-xs">
                        {daysSince !== null ? (
                          <span className={daysSince > 14 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                            {daysSince}d ago
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onViewDoctor(d)}>View</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => removeFromMyList(d.id)}>Remove</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Available doctors in my territory not yet in my list */}
      {unassignedDoctors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700">
              Available in My Territory ({unassignedDoctors.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Doctors in your assigned bricks not yet on your list. Click &ldquo;Add&rdquo; to claim.</p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-amber-50/50">
                <th className="text-left p-2.5 font-medium">Doctor</th>
                <th className="text-left p-2.5 font-medium">Brick</th>
                <th className="text-left p-2.5 font-medium">Class</th>
                <th className="text-right p-2.5 font-medium">Action</th>
              </tr></thead>
              <tbody>
                {unassignedDoctors.map((d) => {
                  const brick = territories.find((t) => t.id === d.brickId);
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-2.5">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialty} · {d.hospital}</p>
                      </td>
                      <td className="p-2.5">
                        {brick ? <Badge variant="outline" className="text-[10px]">{brick.name}</Badge> : "—"}
                      </td>
                      <td className="p-2.5">
                        <Badge className={
                          d.classification === "A" ? "bg-green-100 text-green-800" :
                          d.classification === "B" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }>{d.classification}</Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addToMyList(d.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Add to My List
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Target,
  ClipboardList,
  Stethoscope,
  MapPin,
  Plus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useApiDataStore } from "@/lib/api/use-api-store";
import {
  scopeDoctors,
  scopeVisits,
  scopeMarketRequests,
  type Visit,
  type MarketRequest,
} from "@/lib/data-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";

export default function DistrictManagerPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [viewRep, setViewRep] = useState<any>(null);
  const [registerDoubleOpen, setRegisterDoubleOpen] = useState(false);
  const [doubleVisitRepId, setDoubleVisitRepId] = useState("");
  const [doubleVisitDoctorId, setDoubleVisitDoctorId] = useState("");
  const [doubleVisitType, setDoubleVisitType] = useState<"DOUBLE" | "TRIPLE">("DOUBLE");
  const [doubleVisitNotes, setDoubleVisitNotes] = useState("");

  // My reps (team)
  const myReps = useMemo(() => {
    if (user.role === "ADMIN") return allUsers.filter((u) => u.role === "MEDICAL_REP");
    return getReportsOf(user.id).filter((u) => u.role === "MEDICAL_REP");
  }, [user, allUsers, getReportsOf]);

  const repIds = myReps.map((r) => r.id);

  // Scoped data
  const myDoctors = useMemo(
    () => scopeDoctors(store.doctors, store.businessUnits, user.role, user.id, repIds),
    [store.doctors, store.businessUnits, user.role, user.id, repIds]
  );
  const myVisits = useMemo(
    () => scopeVisits(store.visits, store.businessUnits, user.role, user.id, repIds),
    [store.visits, store.businessUnits, user.role, user.id, repIds]
  );
  const myRequests = useMemo(
    () => scopeMarketRequests(store.marketRequests, store.businessUnits, user.role, user.id, repIds),
    [store.marketRequests, store.businessUnits, user.role, user.id, repIds]
  );

  const pendingRequests = myRequests.filter((r) => r.status === "PENDING");
  const pendingVisits = myVisits.filter((v) => v.status === "LOGGED");
  const approvedVisits = myVisits.filter((v) => v.status === "APPROVED").length;

  // Stats per rep
  const repStats = useMemo(() => {
    return myReps.map((rep) => {
      const doctors = store.doctors.filter((d) => d.assignedRepId === rep.id);
      const visits = store.visits.filter((v) => v.repId === rep.id);
      const approved = visits.filter((v) => v.status === "APPROVED").length;
      const total = visits.length;
      return {
        ...rep,
        doctorCount: doctors.length,
        totalVisits: total,
        approvedVisits: approved,
        compliance: total > 0 ? Math.round((approved / total) * 100) : 0,
      };
    });
  }, [myReps, store.doctors, store.visits]);

  function handleApproveVisit(v: Visit) {
    store.update("visits", v.id, { status: "APPROVED" });
  }

  function handleRejectVisit(v: Visit) {
    store.update("visits", v.id, { status: "REJECTED" });
  }

  function handleApproveRequest(r: MarketRequest) {
    store.update("marketRequests", r.id, {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    });
    if (r.type === "DOCTOR_EDIT" && r.targetEntityId && r.proposedChanges) {
      store.update("doctors", r.targetEntityId, r.proposedChanges);
    }
  }

  function handleRejectRequest(r: MarketRequest) {
    store.update("marketRequests", r.id, {
      status: "REJECTED",
      approvedById: user.id,
      rejectionReason: "Rejected by DM",
    });
  }

  const doubleTripleVisits = useMemo(() => {
    return myVisits.filter(
      (v) => v.type === "DOUBLE" || v.type === "TRIPLE"
    ).sort((a, b) => (b.dateTime > a.dateTime ? 1 : -1));
  }, [myVisits]);

  function handleRegisterDoubleVisit() {
    if (!doubleVisitRepId || !doubleVisitDoctorId) return;
    const doctor = store.doctors.find((d) => d.id === doubleVisitDoctorId);
    const id = store.genId("v");
    store.add("visits", {
      id,
      repId: doubleVisitRepId,
      doctorId: doubleVisitDoctorId,
      dateTime: new Date().toISOString(),
      type: doubleVisitType,
      partnerId: user.id,
      partnerIds: [],
      durationMin: 30,
      productIds: [],
      samplesGiven: [],
      samplesDistributed: 0,
      activityRequests: [],
      notes: doubleVisitNotes || `${doubleVisitType} visit registered by DM`,
      gpsVerified: false,
      status: "LOGGED" as const,
      session: "PM" as const,
      buId: doctor?.buId ?? null,
    });
    store.update("doctors", doubleVisitDoctorId, { lastVisitAt: new Date().toISOString() });
    setRegisterDoubleOpen(false);
    setDoubleVisitRepId("");
    setDoubleVisitDoctorId("");
    setDoubleVisitType("DOUBLE");
    setDoubleVisitNotes("");
  }

  const repDoctors = useMemo(() => {
    if (!doubleVisitRepId) return [];
    return store.doctors.filter((d) => d.assignedRepId === doubleVisitRepId);
  }, [doubleVisitRepId, store.doctors]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="District Manager Dashboard"
        description={`Manage your team of ${myReps.length} reps, approve visits and requests, monitor KPIs.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Users} title="My Reps" value={myReps.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Stethoscope} title="Doctors in Territory" value={myDoctors.length} iconColor="bg-emerald-100 text-emerald-600" />
        <StatsCard icon={Activity} title="Total Visits" value={myVisits.length} subtitle={`${approvedVisits} approved`} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={ClipboardList} title="Pending Actions" value={pendingVisits.length + pendingRequests.length} subtitle={`${pendingVisits.length} visits · ${pendingRequests.length} requests`} iconColor="bg-amber-100 text-amber-600" />
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            My Team
          </TabsTrigger>
          <TabsTrigger value="visits">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Pending Visits ({pendingVisits.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Pending Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="double-triple">
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Double/Triple Visits ({doubleTripleVisits.length})
          </TabsTrigger>
        </TabsList>

        {/* Team overview */}
        <TabsContent value="team" className="space-y-3">
          <DataTable
            columns={[
              {
                key: "name",
                label: "Rep",
                render: (_v: unknown, row: unknown) => {
                  const r = row as (typeof repStats)[number];
                  return (
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.email}</div>
                    </div>
                  );
                },
              },
              {
                key: "territory",
                label: "Territory",
                render: (v: unknown) => <span className="text-xs">{(v as string) ?? "—"}</span>,
              },
              {
                key: "doctorCount",
                label: "Doctors",
                render: (v: unknown) => <span className="font-semibold">{v as number}</span>,
              },
              { key: "totalVisits", label: "Visits" },
              { key: "approvedVisits", label: "Approved" },
              {
                key: "compliance",
                label: "Compliance",
                render: (_v: unknown, row: unknown) => {
                  const r = row as (typeof repStats)[number];
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${r.compliance >= 90 ? "bg-emerald-500" : r.compliance >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(r.compliance, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${r.compliance >= 90 ? "text-emerald-600" : r.compliance >= 70 ? "text-amber-600" : "text-red-600"}`}>
                        {r.compliance}%
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "_actions",
                label: "",
                className: "text-right",
                render: (_v: unknown, row: unknown) => {
                  const r = row as (typeof repStats)[number];
                  return (
                    <EditDeleteMenu
                      onView={() => setViewRep(r)}
                      canEdit={false}
                      canDelete={false}
                      itemLabel={r.name}
                      compact
                    />
                  );
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={repStats as unknown as Record<string, unknown>[]}
            exportable exportFilename="crm-district-manager.csv" emptyMessage="No reps in your team."
            
          />
        </TabsContent>

        {/* Pending visits */}
        <TabsContent value="visits" className="space-y-3">
          {pendingVisits.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium">No pending visits.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingVisits
                .sort((a, b) => (b.dateTime > a.dateTime ? 1 : -1))
                .map((v) => {
                  const rep = allUsers.find((u) => u.id === v.repId);
                  const doctor = store.doctors.find((d) => d.id === v.doctorId);
                  return (
                    <Card key={v.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={v.type === "DOUBLE" || v.type === "TRIPLE" ? "default" : "outline"}>
                              {v.type} visit
                            </Badge>
                            {v.gpsVerified && (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                                <MapPin className="h-3 w-3 mr-1" />
                                GPS Verified
                              </Badge>
                            )}
                            {!v.gpsVerified && (
                              <Badge variant="outline" className="text-slate-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm">{doctor?.name ?? "—"}</p>
                          <p className="text-xs text-slate-600 mt-1">{v.notes}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                            <span>Rep: {rep?.name ?? "—"}</span>
                            {v.partnerId && <span>Partner: {allUsers.find((u) => u.id === v.partnerId)?.name ?? "—"}</span>}
                            <span>Duration: {v.durationMin}m</span>
                            <span>{new Date(v.dateTime).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectVisit(v)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApproveVisit(v)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Pending requests */}
        <TabsContent value="requests" className="space-y-3">
          {pendingRequests.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium">No pending requests.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((r) => {
                const requester = allUsers.find((u) => u.id === r.requestedById);
                const doctor = r.doctorId ? store.doctors.find((d) => d.id === r.doctorId) : null;
                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline">{r.type}</Badge>
                          <Badge
                            variant={r.priority === "URGENT" ? "destructive" : r.priority === "HIGH" ? "warning" : "secondary"}
                          >
                            {r.priority}
                          </Badge>
                          {r.amount && (
                            <span className="text-sm font-bold text-slate-700">
                              EGP {(r.amount ?? 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{r.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          <span>By: {requester?.name ?? "—"}</span>
                          {doctor && <span>Doctor: {doctor.name}</span>}
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        {r.type === "DOCTOR_EDIT" && r.proposedChanges && (
                          <div className="mt-2 text-xs bg-blue-50 rounded p-2 border border-blue-100">
                            <p className="font-semibold text-blue-700 mb-1">Proposed changes:</p>
                            {Object.entries(r.proposedChanges).map(([key, val]) =>
                              val !== undefined ? (
                                <p key={key} className="text-blue-600">
                                  {key}: {String(val)}
                                </p>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleRejectRequest(r)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApproveRequest(r)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="double-triple" className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Scheduled and completed double/triple visits with your team reps.
            </p>
            <Button size="sm" onClick={() => setRegisterDoubleOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Register Double/Triple Visit
            </Button>
          </div>
          {doubleTripleVisits.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <UserCheck className="h-12 w-12 mx-auto mb-3 text-blue-300" />
              <p className="font-medium">No double/triple visits yet.</p>
              <p className="text-xs mt-1">Register a joint visit with one of your reps.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {doubleTripleVisits.map((v) => {
                const rep = allUsers.find((u) => u.id === v.repId);
                const doctor = store.doctors.find((d) => d.id === v.doctorId);
                const partner = v.partnerId ? allUsers.find((u) => u.id === v.partnerId) : null;
                const extraPartners = (v.partnerIds ?? []).map((pid) => allUsers.find((u) => u.id === pid)?.name).filter(Boolean);
                return (
                  <Card key={v.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={v.type === "TRIPLE" ? "destructive" : "default"}>
                            {v.type} visit
                          </Badge>
                          <Badge variant={v.status === "APPROVED" ? "success" : v.status === "REJECTED" ? "destructive" : "warning"}>
                            {v.status}
                          </Badge>
                          {v.gpsVerified && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                              <MapPin className="h-3 w-3 mr-1" />
                              GPS Verified
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">{doctor?.name ?? "—"} — {doctor?.specialty ?? ""}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          <span>Rep: {rep?.name ?? "—"}</span>
                          <span>Partner: {partner?.name ?? "—"}</span>
                          {extraPartners.length > 0 && <span>+ {extraPartners.join(", ")}</span>}
                          <span>Duration: {v.durationMin}m</span>
                          <span>{new Date(v.dateTime).toLocaleString()}</span>
                        </div>
                        {v.notes && <p className="text-xs text-slate-600 mt-1">{v.notes}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {v.status === "LOGGED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleRejectVisit(v)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApproveVisit(v)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Register Double/Triple Visit Dialog */}
      <Dialog open={registerDoubleOpen} onOpenChange={setRegisterDoubleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Double/Triple Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Visit Type</label>
              <select
                className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                value={doubleVisitType}
                onChange={(e) => setDoubleVisitType(e.target.value as "DOUBLE" | "TRIPLE")}
              >
                <option value="DOUBLE">Double (you + rep)</option>
                <option value="TRIPLE">Triple (you + rep + 1 more)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Select Rep from your team</label>
              <select
                className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                value={doubleVisitRepId}
                onChange={(e) => {
                  setDoubleVisitRepId(e.target.value);
                  setDoubleVisitDoctorId("");
                }}
              >
                <option value="">— Select Rep —</option>
                {myReps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.territory ?? "No territory"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Select Doctor</label>
              <select
                className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                value={doubleVisitDoctorId}
                onChange={(e) => setDoubleVisitDoctorId(e.target.value)}
                disabled={!doubleVisitRepId}
              >
                <option value="">— Select Doctor —</option>
                {repDoctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.hospital}</option>
                ))}
              </select>
              {doubleVisitRepId && repDoctors.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No doctors assigned to this rep.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full mt-1 rounded-md border p-2 text-sm"
                rows={2}
                value={doubleVisitNotes}
                onChange={(e) => setDoubleVisitNotes(e.target.value)}
                placeholder="Visit notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDoubleOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRegisterDoubleVisit}
              disabled={!doubleVisitRepId || !doubleVisitDoctorId}
            >
              Register {doubleVisitType} Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rep Detail Dialog */}
      <Dialog open={!!viewRep} onOpenChange={(open) => { if (!open) setViewRep(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRep?.name}</DialogTitle>
          </DialogHeader>
          {viewRep && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{viewRep.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{viewRep.email}</p></div>
              <div><span className="text-sm text-muted-foreground">Territory</span><p className="font-medium">{viewRep.territory ?? "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Doctors</span><p className="font-medium">{viewRep.doctorCount}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Visits</span><p className="font-medium">{viewRep.totalVisits}</p></div>
              <div><span className="text-sm text-muted-foreground">Approved Visits</span><p className="font-medium">{viewRep.approvedVisits}</p></div>
              <div><span className="text-sm text-muted-foreground">Compliance</span><p className="font-medium">{viewRep.compliance}%</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  scopeDoctors,
  scopeVisits,
  scopeMarketRequests,
  type Visit,
  type MarketRequest,
} from "@/lib/data-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";

export default function DistrictManagerPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});

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
        </TabsList>

        {/* Team overview */}
        <TabsContent value="team" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                    <tr>
                      <th className="text-left p-3">Rep</th>
                      <th className="text-left p-3">Territory</th>
                      <th className="text-left p-3">Doctors</th>
                      <th className="text-left p-3">Visits</th>
                      <th className="text-left p-3">Approved</th>
                      <th className="text-left p-3">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No reps in your team.
                        </td>
                      </tr>
                    )}
                    {repStats.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-[11px] text-slate-500">{r.email}</div>
                        </td>
                        <td className="p-3 text-xs">{r.territory ?? "—"}</td>
                        <td className="p-3 font-semibold">{r.doctorCount}</td>
                        <td className="p-3">{r.totalVisits}</td>
                        <td className="p-3">{r.approvedVisits}</td>
                        <td className="p-3">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                            <Badge variant={v.type === "DOUBLE" ? "default" : "outline"}>
                              {v.type} visit
                            </Badge>
                            {v.gpsVerified && (
                              <Badge variant="success">
                                <MapPin className="h-3 w-3 mr-1" />
                                GPS verified
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm">{doctor?.name ?? "—"}</p>
                          <p className="text-xs text-slate-600 mt-1">{v.notes}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                            <span>Rep: {rep?.name ?? "—"}</span>
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
                              EGP {r.amount.toLocaleString()}
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
      </Tabs>
    </div>
  );
}

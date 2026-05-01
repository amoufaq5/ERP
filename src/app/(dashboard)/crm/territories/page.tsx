"use client";

import { useMemo, useState } from "react";
import {
  Map, ChevronRight, ChevronDown, Users, Stethoscope, Building,
  Plus, Pencil, Trash2, MapPin, Globe, Layers, BarChart3,
  TrendingUp, TrendingDown, AlertTriangle, ArrowRightLeft, Target,
  CheckCircle, Activity, Zap,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import {
  useDataStore,
  type Territory,
} from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

const LEVEL_COLORS: Record<Territory["level"], string> = {
  region: "bg-red-100 text-red-800",
  governorate: "bg-blue-100 text-blue-800",
  district: "bg-amber-100 text-amber-800",
  brick: "bg-green-100 text-green-800",
};

const LEVEL_LABELS: Record<Territory["level"], string> = {
  region: "Region",
  governorate: "Governorate",
  district: "District",
  brick: "Brick",
};

const LEVEL_ICONS: Record<Territory["level"], typeof Globe> = {
  region: Globe,
  governorate: Map,
  district: MapPin,
  brick: Layers,
};

export default function TerritoriesPage() {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const canEdit = user.role === "ADMIN" || user.role === "BUM" || user.role === "MARKETEER";

  const [activeTab, setActiveTab] = useState<"hierarchy" | "optimization">("hierarchy");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["reg-cairo"]));
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Territory | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Territory | null>(null);

  const territories = store.territories;
  const regions = useMemo(() => territories.filter((t) => t.level === "region"), [territories]);
  const governorates = useMemo(() => territories.filter((t) => t.level === "governorate"), [territories]);
  const districts = useMemo(() => territories.filter((t) => t.level === "district"), [territories]);
  const bricks = useMemo(() => territories.filter((t) => t.level === "brick"), [territories]);

  const totalReps = new Set(territories.flatMap((t) => t.assignedRepIds)).size;
  const coveredBricks = bricks.filter((b) => b.assignedRepIds.length > 0).length;

  function getChildren(parentId: string) {
    return territories.filter((t) => t.parentId === parentId);
  }

  function getDoctorsInBrick(brickId: string) {
    return store.doctors.filter((d) => d.brickId === brickId);
  }

  function getDoctorsInTerritory(territoryId: string): number {
    const territory = territories.find((t) => t.id === territoryId);
    if (!territory) return 0;
    if (territory.level === "brick") {
      return getDoctorsInBrick(territoryId).length;
    }
    return getChildren(territoryId).reduce((sum, child) => sum + getDoctorsInTerritory(child.id), 0);
  }

  function getRepsInTerritory(territoryId: string): string[] {
    const territory = territories.find((t) => t.id === territoryId);
    if (!territory) return [];
    const reps = new Set(territory.assignedRepIds);
    getChildren(territoryId).forEach((child) => {
      getRepsInTerritory(child.id).forEach((r) => reps.add(r));
    });
    return Array.from(reps);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const repOptions = allUsers
    .filter((u) => u.role === "MEDICAL_REP" || u.role === "DISTRICT_MANAGER")
    .map((u) => ({ label: u.name, value: u.id }));

  const buOptions = store.businessUnits.map((bu) => ({ label: bu.name, value: bu.id }));

  function handleAssignReps(repIds: string[]) {
    if (!assignTarget) return;
    store.update("territories", assignTarget.id, { assignedRepIds: repIds });
    setAssignDialogOpen(false);
    setAssignTarget(null);
  }

  const formFields: EntityField[] = [
    { name: "name", label: "Name (English)", type: "text", required: true },
    { name: "nameAr", label: "Name (Arabic)", type: "text", required: true },
    { name: "level", label: "Level", type: "select", required: true, options: [
      { label: "Region", value: "region" },
      { label: "Governorate", value: "governorate" },
      { label: "District", value: "district" },
      { label: "Brick", value: "brick" },
    ]},
    { name: "imsCode", label: "IMS-IQVIA Code", type: "text", required: true, placeholder: "e.g. EG-B010" },
    { name: "geoShare", label: "% GEO. SHARE", type: "number", placeholder: "e.g. 1.49" },
    { name: "parentId", label: "Parent Territory", type: "select", options: territories.map((t) => ({
      label: `${LEVEL_LABELS[t.level]}: ${t.name}`,
      value: t.id,
    }))},
  ];

  function handleCreateTerritory(data: EntityFormData) {
    if (editing) {
      store.update("territories", editing.id, {
        name: String(data.name),
        nameAr: String(data.nameAr),
        level: String(data.level) as Territory["level"],
        imsCode: String(data.imsCode),
        parentId: data.parentId ? String(data.parentId) : null,
        geoShare: data.geoShare ? Number(data.geoShare) : undefined,
      });
    } else {
      store.add("territories", {
        id: store.genId("ter"),
        name: String(data.name),
        nameAr: String(data.nameAr),
        level: String(data.level) as Territory["level"],
        parentId: data.parentId ? String(data.parentId) : null,
        imsCode: String(data.imsCode),
        geoShare: data.geoShare ? Number(data.geoShare) : undefined,
        assignedRepIds: [],
        assignedBUIds: [],
      } as Territory);
    }
    setFormOpen(false);
    setEditing(null);
  }

  // Filtered by search
  const matchesSearch = (t: Territory) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.nameAr.includes(q) || t.imsCode.toLowerCase().includes(q);
  };

  function renderTree(parentId: string | null, depth: number = 0): React.ReactNode {
    const items = territories
      .filter((t) => t.parentId === parentId)
      .filter((t) => {
        if (!search) return true;
        if (matchesSearch(t)) return true;
        return getChildren(t.id).some((c) => matchesSearch(c) || getChildren(c.id).some(matchesSearch));
      });

    if (items.length === 0) return null;

    return items.map((territory) => {
      const children = getChildren(territory.id);
      const hasChildren = children.length > 0;
      const isExpanded = expandedIds.has(territory.id);
      const isSelected = selectedTerritory?.id === territory.id;
      const doctorCount = getDoctorsInTerritory(territory.id);
      const repCount = getRepsInTerritory(territory.id).length;
      const LevelIcon = LEVEL_ICONS[territory.level];

      return (
        <div key={territory.id}>
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
              isSelected ? "bg-blue-50 border border-blue-200" : ""
            }`}
            style={{ paddingLeft: `${depth * 24 + 8}px` }}
            onClick={() => setSelectedTerritory(territory)}
          >
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(territory.id); }} className="p-0.5">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <div className={`p-1 rounded ${LEVEL_COLORS[territory.level].split(" ")[0]}`}>
              <LevelIcon className={`h-3.5 w-3.5 ${LEVEL_COLORS[territory.level].split(" ")[1]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{territory.name}</span>
                <span className="text-xs text-muted-foreground">{territory.nameAr}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{territory.imsCode}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
              {territory.geoShare != null && (
                <span className="flex items-center gap-1 font-mono text-emerald-600">
                  <BarChart3 className="h-3 w-3" />{territory.geoShare.toFixed(2)}%
                </span>
              )}
              {doctorCount > 0 && (
                <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" />{doctorCount}</span>
              )}
              {repCount > 0 && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{repCount}</span>
              )}
              <Badge className={`text-[10px] ${LEVEL_COLORS[territory.level]}`}>
                {LEVEL_LABELS[territory.level]}
              </Badge>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(territory.id, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Territory Management"
        description="IMS-IQVIA geographic hierarchy — Region > Governorate > District > Brick"
        actions={
          canEdit ? (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Territory
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={Globe} title="Regions" value={regions.length} subtitle="Top-level geographic areas" iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={Map} title="Districts / Areas" value={districts.length} subtitle="IMS district-level areas" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Layers} title="Bricks" value={`${coveredBricks}/${bricks.length}`} subtitle="Covered / Total IMS bricks" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Users} title="Field Reps Assigned" value={totalReps} subtitle="Across all territories" iconColor="bg-purple-100 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Territory Tree */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Territory Hierarchy</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search territories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 text-sm h-8"
              />
              <Button size="sm" variant="outline" onClick={() => {
                const allIds = territories.map((t) => t.id);
                setExpandedIds(expandedIds.size === allIds.length ? new Set() : new Set(allIds));
              }}>
                {expandedIds.size > 5 ? "Collapse All" : "Expand All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            <div className="p-2 space-y-0.5">
              {renderTree(null)}
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedTerritory ? selectedTerritory.name : "Select a Territory"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTerritory ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Click a territory in the tree to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Level</span>
                    <Badge className={LEVEL_COLORS[selectedTerritory.level]}>{LEVEL_LABELS[selectedTerritory.level]}</Badge>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">IMS Code</span>
                    <span className="font-mono font-medium">{selectedTerritory.imsCode}</span>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">English Name</span>
                    <span className="font-medium">{selectedTerritory.name}</span>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">Arabic Name</span>
                    <span className="font-medium">{selectedTerritory.nameAr}</span>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">Doctors</span>
                    <span className="font-semibold">{getDoctorsInTerritory(selectedTerritory.id)}</span>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">Sub-territories</span>
                    <span className="font-semibold">{getChildren(selectedTerritory.id).length}</span>
                  </div>
                  {selectedTerritory.geoShare != null && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs">% GEO. SHARE (IMS)</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(selectedTerritory.geoShare * 10, 100)}%` }} />
                        </div>
                        <span className="font-semibold font-mono text-emerald-600">{selectedTerritory.geoShare.toFixed(4)}%</span>
                      </div>
                    </div>
                  )}
                  {selectedTerritory.level !== "brick" && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs">Aggregate GEO. SHARE</span>
                      <span className="font-semibold font-mono text-emerald-600">
                        {(() => {
                          const sum = (id: string): number => {
                            const t = territories.find(x => x.id === id);
                            if (!t) return 0;
                            if (t.geoShare != null) return t.geoShare;
                            return getChildren(id).reduce((s, c) => s + sum(c.id), 0);
                          };
                          return sum(selectedTerritory.id).toFixed(4);
                        })()}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Assigned Reps */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Assigned Reps</h4>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
                        setAssignTarget(selectedTerritory);
                        setAssignDialogOpen(true);
                      }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                  {selectedTerritory.assignedRepIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No reps assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedTerritory.assignedRepIds.map((repId) => {
                        const rep = allUsers.find((u) => u.id === repId);
                        return rep ? (
                          <div key={repId} className="flex items-center gap-2 p-1.5 rounded border text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{rep.name}</span>
                            <Badge variant="secondary" className="text-[10px] ml-auto">{rep.territory || rep.department}</Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Assigned BUs */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Business Units</h4>
                  {selectedTerritory.assignedBUIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No BUs active</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedTerritory.assignedBUIds.map((buId) => {
                        const bu = store.businessUnits.find((b) => b.id === buId);
                        return bu ? (
                          <Badge key={buId} variant="outline" className="text-xs" style={{ borderColor: bu.color, color: bu.color }}>
                            {bu.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Doctors in this brick */}
                {selectedTerritory.level === "brick" && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Doctors in Brick</h4>
                    {getDoctorsInBrick(selectedTerritory.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No doctors mapped to this brick</p>
                    ) : (
                      <div className="space-y-1">
                        {getDoctorsInBrick(selectedTerritory.id).map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-1.5 rounded border text-xs">
                            <Stethoscope className="h-3 w-3 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-muted-foreground">{doc.specialty} · {doc.hospital}</p>
                            </div>
                            <Badge className={
                              doc.classification === "A" ? "bg-green-100 text-green-800" :
                              doc.classification === "B" ? "bg-blue-100 text-blue-800" :
                              doc.classification === "C" ? "bg-amber-100 text-amber-800" :
                              "bg-gray-100 text-gray-800"
                            }>{doc.classification}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      setEditing(selectedTerritory);
                      setFormOpen(true);
                    }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                      store.remove("territories", selectedTerritory.id);
                      setSelectedTerritory(null);
                    }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Territory */}
      <EntityFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        title={editing ? `Edit ${editing.name}` : "Add Territory"}
        description="Define a territory in the IMS-IQVIA hierarchy."
        fields={formFields}
        initialData={editing ? {
          name: editing.name,
          nameAr: editing.nameAr,
          level: editing.level,
          imsCode: editing.imsCode,
          geoShare: editing.geoShare || "",
          parentId: editing.parentId || "",
        } : undefined}
        onSubmit={handleCreateTerritory}
        submitLabel={editing ? "Save" : "Create"}
      />

      {/* Assign Reps Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { if (!open) { setAssignDialogOpen(false); setAssignTarget(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Reps to {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <AssignRepsForm
              currentRepIds={assignTarget.assignedRepIds}
              repOptions={repOptions}
              onSave={handleAssignReps}
              onCancel={() => { setAssignDialogOpen(false); setAssignTarget(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignRepsForm({
  currentRepIds,
  repOptions,
  onSave,
  onCancel,
}: {
  currentRepIds: string[];
  repOptions: { label: string; value: string }[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRepIds));

  return (
    <div className="space-y-4">
      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {repOptions.map((opt) => (
          <label key={opt.value} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer hover:border-blue-400 ${
            selected.has(opt.value) ? "bg-blue-50 border-blue-200" : ""
          }`}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.has(opt.value)}
              onChange={() => {
                const next = new Set(selected);
                next.has(opt.value) ? next.delete(opt.value) : next.add(opt.value);
                setSelected(next);
              }}
            />
            {opt.label}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(Array.from(selected))}>Save</Button>
      </div>
    </div>
  );
}

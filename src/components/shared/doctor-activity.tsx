"use client";

import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ActivityTimeline } from "./activity-timeline";
import { AddNote } from "./add-note";
import { useActivity } from "@/lib/activity/activity-context";
import { useDataStore } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";
import {
  addActivity as addActivityService,
  getActivities as getActivitiesService,
} from "@/lib/activity/activity-service";

interface DoctorActivityProps {
  doctorId: string;
}

export function DoctorActivity({ doctorId }: DoctorActivityProps) {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const { version } = useActivity();

  // Auto-generate activities from visit data for this doctor if not already present
  useEffect(() => {
    const existing = getActivitiesService("doctor", doctorId, { limit: 1 });
    if (existing.length > 0) return;

    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
    const userName = (id: string) => userMap.get(id) ?? "System";
    const doctor = store.doctors.find((d) => d.id === doctorId);
    if (!doctor) return;

    // Seed visit entries for this doctor
    const doctorVisits = store.visits.filter((v) => v.doctorId === doctorId);
    for (const v of doctorVisits) {
      addActivityService({
        entityType: "doctor",
        entityId: doctorId,
        activityType: "visit",
        title: `Visit logged for ${doctor.name}`,
        description: v.notes || undefined,
        userId: v.repId,
        userName: userName(v.repId),
        metadata: { visitId: v.id, status: v.status },
      });
    }

    // Seed assignment if there's a rep assigned
    if (doctor.assignedRepId) {
      addActivityService({
        entityType: "doctor",
        entityId: doctorId,
        activityType: "assignment",
        title: `${doctor.name} assigned to ${userName(doctor.assignedRepId)}`,
        userId: doctor.assignedRepId,
        userName: userName(doctor.assignedRepId),
      });
    }

    // Seed market requests for this doctor
    const requests = store.marketRequests.filter(
      (r) => r.doctorId === doctorId
    );
    for (const r of requests) {
      addActivityService({
        entityType: "doctor",
        entityId: doctorId,
        activityType: "request",
        title: `${r.type} request: ${r.description.slice(0, 80)}`,
        description: r.description,
        userId: r.requestedById,
        userName: userName(r.requestedById),
        metadata: { requestId: r.id, status: r.status },
      });
    }

    // Seed creation entry
    addActivityService({
      entityType: "doctor",
      entityId: doctorId,
      activityType: "creation",
      title: `Doctor ${doctor.name} added to the system`,
      userId: doctor.assignedRepId ?? "u-admin",
      userName: userName(doctor.assignedRepId ?? "u-admin"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const doctor = useMemo(
    () => store.doctors.find((d) => d.id === doctorId),
    [store.doctors, doctorId]
  );

  return (
    <div className="space-y-6">
      {/* Add Note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a Note</CardTitle>
        </CardHeader>
        <CardContent>
          <AddNote entityType="doctor" entityId={doctorId} />
        </CardContent>
      </Card>

      <Separator />

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Activity History
            {doctor ? ` - ${doctor.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            entityType="doctor"
            entityId={doctorId}
            limit={15}
            showFilters
          />
        </CardContent>
      </Card>
    </div>
  );
}

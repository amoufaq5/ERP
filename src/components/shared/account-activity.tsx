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

interface AccountActivityProps {
  accountId: string;
}

export function AccountActivity({ accountId }: AccountActivityProps) {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const { version } = useActivity();

  // Auto-generate activities from store data for this account if not present
  useEffect(() => {
    const existing = getActivitiesService("account", accountId, { limit: 1 });
    if (existing.length > 0) return;

    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
    const userName = (id: string) => userMap.get(id) ?? "System";
    const account = store.amAccounts.find((a) => a.id === accountId);
    if (!account) return;

    // Seed visits that happened at this account
    const accountVisits = store.visits.filter(
      (v) => v.amAccountId === accountId
    );
    for (const v of accountVisits) {
      const doctor = store.doctors.find((d) => d.id === v.doctorId);
      addActivityService({
        entityType: "account",
        entityId: accountId,
        activityType: "visit",
        title: `Visit at ${account.name}${doctor ? ` with ${doctor.name}` : ""}`,
        description: v.notes || undefined,
        userId: v.repId,
        userName: userName(v.repId),
        metadata: { visitId: v.id, status: v.status },
      });
    }

    // Seed assignment
    if (account.assignedRepId) {
      addActivityService({
        entityType: "account",
        entityId: accountId,
        activityType: "assignment",
        title: `${account.name} assigned to ${userName(account.assignedRepId)}`,
        userId: account.assignedRepId,
        userName: userName(account.assignedRepId),
      });
    }

    // Seed creation
    addActivityService({
      entityType: "account",
      entityId: accountId,
      activityType: "creation",
      title: `Account ${account.name} created`,
      userId: account.assignedRepId ?? "u-admin",
      userName: userName(account.assignedRepId ?? "u-admin"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const account = useMemo(
    () => store.amAccounts.find((a) => a.id === accountId),
    [store.amAccounts, accountId]
  );

  return (
    <div className="space-y-6">
      {/* Add Note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a Note</CardTitle>
        </CardHeader>
        <CardContent>
          <AddNote entityType="account" entityId={accountId} />
        </CardContent>
      </Card>

      <Separator />

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Activity History
            {account ? ` - ${account.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            entityType="account"
            entityId={accountId}
            limit={15}
            showFilters
          />
        </CardContent>
      </Card>
    </div>
  );
}

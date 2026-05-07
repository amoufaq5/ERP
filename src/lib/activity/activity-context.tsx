"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import {
  addActivity as addActivityService,
  getActivities as getActivitiesService,
  getRecentActivities as getRecentService,
  seedActivitiesFromStore,
  type ActivityEntry,
  type ActivityType,
  type GetActivitiesOptions,
} from "./activity-service";
import { useDataStore } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

interface ActivityContextValue {
  addActivity: (
    entry: Omit<ActivityEntry, "id" | "timestamp">
  ) => ActivityEntry;
  getActivities: (
    entityType: string,
    entityId: string,
    options?: GetActivitiesOptions
  ) => ActivityEntry[];
  getRecent: (userId: string, limit?: number) => ActivityEntry[];
  /** Monotonically increasing counter that bumps whenever an activity is added via context */
  version: number;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const store = useDataStore();
  const { allUsers } = useCurrentUser();
  const [version, setVersion] = useState(0);

  // Seed on first mount
  useEffect(() => {
    seedActivitiesFromStore({
      visits: store.visits,
      weeklyPlans: store.weeklyPlans,
      marketRequests: store.marketRequests,
      doctors: store.doctors,
      amAccounts: store.amAccounts,
      users: allUsers.map((u) => ({ id: u.id, name: u.name })),
    });
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addActivityWrapped = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      const result = addActivityService(entry);
      setVersion((v) => v + 1);
      return result;
    },
    []
  );

  const getActivitiesWrapped = useCallback(
    (
      entityType: string,
      entityId: string,
      options?: GetActivitiesOptions
    ) => {
      return getActivitiesService(entityType, entityId, options);
    },
    []
  );

  const getRecentWrapped = useCallback(
    (userId: string, limit?: number) => {
      return getRecentService(userId, limit);
    },
    []
  );

  return (
    <ActivityContext.Provider
      value={{
        addActivity: addActivityWrapped,
        getActivities: getActivitiesWrapped,
        getRecent: getRecentWrapped,
        version,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) {
    // Fallback so components don't crash outside the provider
    return {
      addActivity: (entry) => ({
        ...entry,
        id: "stub",
        timestamp: new Date().toISOString(),
      }),
      getActivities: () => [],
      getRecent: () => [],
      version: 0,
    };
  }
  return ctx;
}

export type { ActivityEntry, ActivityType, GetActivitiesOptions };

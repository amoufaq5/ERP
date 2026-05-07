"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { SearchIndex, type SearchOptions, type SearchResult } from "./search-index";
import { useDataStore } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

// ─── Context value ───────────────────────────────────────────────────────────

interface SearchContextValue {
  search: (query: string, options?: SearchOptions) => SearchResult[];
}

const SearchContext = createContext<SearchContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SearchProvider({ children }: { children: ReactNode }) {
  const store = useDataStore();
  const { allUsers } = useCurrentUser();
  const indexRef = useRef(new SearchIndex());

  // Build a fingerprint of the data to detect changes
  const dataFingerprint = useMemo(() => {
    return [
      store.doctors.length,
      store.amAccounts.length,
      store.marketRequests.length,
      store.visits.length,
      store.businessUnits.length,
      store.territories.length,
      allUsers.length,
    ].join(",");
  }, [
    store.doctors,
    store.amAccounts,
    store.marketRequests,
    store.visits,
    store.businessUnits,
    store.territories,
    allUsers,
  ]);

  // Re-index when data changes
  useEffect(() => {
    const idx = new SearchIndex();

    // Index Doctors
    for (const doc of store.doctors) {
      idx.addDocument(doc.id, "doctor", {
        name: doc.name,
        specialty: doc.specialty,
        hospital: doc.hospital,
        city: doc.city,
        classification: doc.classification,
      });
    }

    // Index Accounts (AM Accounts)
    for (const acc of store.amAccounts) {
      idx.addDocument(acc.id, "account", {
        name: acc.name,
        type: acc.type,
        city: acc.city,
        address: acc.address,
      });
    }

    // Index Market Requests
    for (const mr of store.marketRequests) {
      idx.addDocument(mr.id, "market_request", {
        type: mr.type,
        description: mr.description,
        priority: mr.priority,
        status: mr.status,
      });
    }

    // Index Visits
    for (const visit of store.visits) {
      const doctor = store.doctors.find((d) => d.id === visit.doctorId);
      idx.addDocument(visit.id, "visit", {
        notes: visit.notes || "",
        doctorName: doctor?.name || "",
        status: visit.status,
        type: visit.type,
      });
    }

    // Index Business Units
    for (const bu of store.businessUnits) {
      idx.addDocument(bu.id, "business_unit", {
        name: bu.name,
        code: bu.code,
        description: bu.description,
      });
    }

    // Index Territories
    for (const terr of store.territories) {
      idx.addDocument(terr.id, "territory", {
        name: terr.name,
        nameAr: terr.nameAr,
        code: terr.imsCode,
        level: terr.level,
      });
    }

    // Index Users
    for (const user of allUsers) {
      idx.addDocument(user.id, "user", {
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      });
    }

    indexRef.current = idx;
  }, [dataFingerprint, store, allUsers]);

  const contextValue = useMemo<SearchContextValue>(
    () => ({
      search: (query: string, options?: SearchOptions) =>
        indexRef.current.search(query, options),
    }),
    // indexRef is a ref — stable across renders. search function itself is
    // stable; only the underlying index is swapped via ref.
    [],
  );

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return ctx;
}

"use client";

import { useState, useCallback, useMemo } from "react";

export interface UseBulkSelectReturn<T> {
  /** Set of currently selected item IDs */
  selectedIds: Set<string>;
  /** The actual items that are selected */
  selectedItems: T[];
  /** Check whether a specific ID is selected */
  isSelected: (id: string) => boolean;
  /** Toggle selection of a single item by ID */
  toggle: (id: string) => void;
  /** Select all items */
  selectAll: () => void;
  /** Clear all selections */
  deselectAll: () => void;
  /** Toggle between select-all and deselect-all */
  toggleAll: () => void;
  /** True when every item is selected */
  isAllSelected: boolean;
  /** True when some (but not all) items are selected */
  isPartiallySelected: boolean;
  /** Number of selected items */
  selectedCount: number;
}

/**
 * Generic hook for managing bulk selection of items.
 *
 * @param items - The full list of items available for selection.
 * @param keyExtractor - A function that returns a unique string key for each item.
 * @returns Bulk selection state and helpers.
 */
export function useBulkSelect<T>(
  items: T[],
  keyExtractor: (item: T) => string
): UseBulkSelectReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allIds = useMemo(
    () => new Set(items.map(keyExtractor)),
    [items, keyExtractor]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === allIds.size && [...allIds].every((id) => selectedIds.has(id)),
    [items.length, selectedIds, allIds]
  );

  const isPartiallySelected = useMemo(
    () => selectedIds.size > 0 && !isAllSelected,
    [selectedIds.size, isAllSelected]
  );

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, deselectAll, selectAll]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(keyExtractor(item))),
    [items, selectedIds, keyExtractor]
  );

  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    isAllSelected,
    isPartiallySelected,
    selectedCount,
  };
}

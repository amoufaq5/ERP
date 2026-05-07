/**
 * Utility functions for drag-and-drop operations.
 */

/**
 * Reorder items in a list by moving an item from startIndex to endIndex.
 */
export function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Move an item from one list to another.
 * Returns updated copies of both source and destination arrays.
 */
export function moveItem<T>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destIndex: number
): { source: T[]; destination: T[] } {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(sourceIndex, 1);
  destClone.splice(destIndex, 0, removed);
  return { source: sourceClone, destination: destClone };
}

/**
 * Insert an item at a specific index in a list.
 */
export function insertAt<T>(list: T[], index: number, item: T): T[] {
  const result = Array.from(list);
  result.splice(index, 0, item);
  return result;
}

"use client";

import { useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface SelectableRowCheckboxProps {
  /** Whether this row/item is selected */
  isSelected: boolean;
  /** Called when the checkbox is toggled */
  onToggle: () => void;
  /** When true, renders a TableHead instead of a TableCell (for header rows) */
  isHeader?: boolean;
  /** When true, shows an indeterminate state (only relevant for header checkbox) */
  isPartial?: boolean;
  /** Additional className for the wrapper cell */
  className?: string;
}

/**
 * A checkbox cell compatible with the existing DataTable / Table component pattern.
 *
 * Use inside a `<TableRow>` to add a selection column:
 * - In the header row, pass `isHeader` and optionally `isPartial`
 * - In body rows, pass `isSelected` and `onToggle`
 */
export function SelectableRowCheckbox({
  isSelected,
  onToggle,
  isHeader = false,
  isPartial = false,
  className,
}: SelectableRowCheckboxProps) {
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // Handle the indeterminate state for the header checkbox.
  // Radix Checkbox supports "indeterminate" via the `checked` prop set to "indeterminate".
  useEffect(() => {
    if (isHeader && checkboxRef.current) {
      const input = checkboxRef.current.querySelector("input");
      if (input) {
        input.indeterminate = isPartial;
      }
    }
  }, [isHeader, isPartial]);

  const checkedState = isHeader && isPartial ? "indeterminate" : isSelected;

  const checkbox = (
    <Checkbox
      ref={checkboxRef}
      checked={checkedState}
      onCheckedChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      aria-label={isHeader ? "Select all rows" : "Select row"}
      className="cursor-pointer"
    />
  );

  if (isHeader) {
    return (
      <TableHead className={cn("w-10", className)}>
        {checkbox}
      </TableHead>
    );
  }

  return (
    <TableCell className={cn("w-10", className)}>
      {checkbox}
    </TableCell>
  );
}

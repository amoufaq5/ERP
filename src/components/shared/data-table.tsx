"use client";

import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/i18n-context";

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, row: T) => ReactNode;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  key: string | null;
  direction: SortDirection;
}

const PAGE_SIZE = 10;

export interface BulkAction {
  key: string;
  label: string;
  variant?: "default" | "destructive";
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  isLoading?: boolean;
  exportable?: boolean;
  exportFilename?: string;
  pageSize?: number;
  selectable?: boolean;
  onBulkAction?: (action: string, selectedRows: T[]) => void;
  bulkActions?: BulkAction[];
}

export function DataTable<T extends Record<string, any> = Record<string, any>>({
  columns,
  data,
  searchable = false,
  searchKeys = [],
  pagination = true,
  onRowClick,
  emptyMessage = "No records found.",
  className,
  isLoading = false,
  exportable = false,
  exportFilename = "export.csv",
  pageSize: pageSizeProp,
  selectable = false,
  onBulkAction,
  bulkActions = [],
}: DataTableProps<T>) {
  const effectivePageSize = pageSizeProp ?? PAGE_SIZE;
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Clear selection when data or page changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [currentPage, data]);

  // Search / filter
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    const keys = searchKeys.length > 0 ? searchKeys : columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(query);
      })
    );
  }, [data, searchable, searchQuery, searchKeys, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.direction) return filteredData;
    const key = sortState.key;
    const dir = sortState.direction === "asc" ? 1 : -1;
    return [...filteredData].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [filteredData, sortState]);

  // Pagination
  const totalPages = pagination ? Math.max(1, Math.ceil(sortedData.length / effectivePageSize)) : 1;

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedData.slice(start, start + effectivePageSize);
  }, [sortedData, pagination, currentPage, effectivePageSize]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
    setCurrentPage(1);
  }, []);

  const handleExport = useCallback(() => {
    const csvColumns = columns.map((col) => ({ key: col.key as keyof T, label: col.label || col.key }));
    downloadCSV(exportFilename, sortedData as unknown as Record<string, unknown>[], csvColumns as { key: keyof Record<string, unknown>; label: string }[]);
  }, [columns, sortedData, exportFilename]);

  // Select-all indeterminate state
  const allOnPageSelected = selectable && paginatedData.length > 0 && paginatedData.every((_, i) => selectedRows.has(i));
  const someOnPageSelected = selectable && paginatedData.some((_, i) => selectedRows.has(i));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const handleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => i)));
    }
  }, [allOnPageSelected, paginatedData]);

  const handleSelectRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleBulkAction = useCallback((actionKey: string) => {
    const selectedItems = Array.from(selectedRows).sort().map((i) => paginatedData[i]);
    onBulkAction?.(actionKey, selectedItems);
    setSelectedRows(new Set());
  }, [selectedRows, paginatedData, onBulkAction]);

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortState.key !== columnKey) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    if (sortState.direction === "asc") return <ChevronUp className="h-3.5 w-3.5 text-primary" />;
    return <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(searchable || exportable) && (
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder={t("table.search")}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 w-full pl-9 pr-4 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
              />
            </div>
          )}
          {exportable && sortedData.length > 0 && (
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
              <Download className="h-4 w-4" />
              {t("table.exportCsv")}
            </button>
          )}
        </div>
      )}

      {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">{selectedRows.size} {t("table.selected")}</span>
          <div className="flex gap-2">
            {bulkActions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleBulkAction(action.key)}
                className={cn(
                  "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  action.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageSelected && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors select-none"
                    >
                      {col.label}
                      <SortIcon columnKey={col.key} />
                    </button>
                  ) : (
                    <span className="font-medium text-muted-foreground">{col.label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {selectable && (
                    <TableCell>
                      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <div className="h-4 w-full max-w-[180px] rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-32 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    selectable && selectedRows.has(rowIndex) && "bg-primary/5"
                  )}
                >
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleSelectRow(rowIndex)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] != null
                        ? String(row[col.key])
                        : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {t("table.showing")}{" "}
            <span className="font-medium text-foreground">
              {Math.min((currentPage - 1) * effectivePageSize + 1, sortedData.length)}
            </span>
            {" – "}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * effectivePageSize, sortedData.length)}
            </span>{" "}
            {t("table.of")}{" "}
            <span className="font-medium text-foreground">{sortedData.length}</span>{" "}
            {t("table.results")}
          </p>

          <div className="flex items-center gap-1">
            <PaginationButton onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="First page">
              <ChevronsLeft className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </PaginationButton>
            <span className="px-3 py-1.5 text-sm font-medium">{currentPage} / {totalPages}</span>
            <PaginationButton onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Last page">
              <ChevronsRight className="h-4 w-4" />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

interface PaginationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

function PaginationButton({ children, disabled, ...props }: PaginationButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center h-8 w-8 rounded-md border border-input transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed bg-transparent"
          : "hover:bg-accent hover:text-accent-foreground bg-background"
      )}
    >
      {children}
    </button>
  );
}

export default DataTable;

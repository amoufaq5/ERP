"use client";

import { useState, useMemo, useRef } from "react";
import {
  Database, HardDrive, Clock, TableProperties,
  Download, Upload, Trash2, Shield, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, FileJson,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { useDataStore, type DataStoreState } from "@/lib/data-store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ─── Data table definition keys ─────────────────────────────────────

interface TableDef {
  key: string;
  label: string;
  module: string;
}

const TABLE_DEFS: TableDef[] = [
  { key: "customers", label: "Customers", module: "CRM" },
  { key: "vendors", label: "Vendors", module: "Procurement" },
  { key: "products", label: "Products", module: "Inventory" },
  { key: "invoices", label: "Invoices", module: "Finance" },
  { key: "payments", label: "Payments", module: "Finance" },
  { key: "journalEntries", label: "Journal Entries", module: "Accounting" },
  { key: "glAccounts", label: "GL Accounts", module: "Accounting" },
  { key: "bankAccounts", label: "Bank Accounts", module: "Banking" },
  { key: "costCenters", label: "Cost Centers", module: "Accounting" },
  { key: "budgets", label: "Budgets", module: "Finance" },
  { key: "cheques", label: "Cheques", module: "Banking" },
  { key: "purchaseOrders", label: "Purchase Orders", module: "Procurement" },
  { key: "salesOrders", label: "Sales Orders", module: "Sales" },
  { key: "rfqs", label: "RFQs", module: "Procurement" },
  { key: "goodsReceipts", label: "Goods Receipts", module: "Inventory" },
  { key: "deliveryNotes", label: "Delivery Notes", module: "Logistics" },
  { key: "shipments", label: "Shipments", module: "Logistics" },
  { key: "employees", label: "Employees", module: "HR" },
  { key: "jobs", label: "Jobs", module: "HR" },
  { key: "candidates", label: "Candidates", module: "HR" },
  { key: "doctors", label: "Doctors", module: "CRM" },
  { key: "amAccounts", label: "AM Accounts", module: "CRM" },
  { key: "visits", label: "Visits", module: "CRM" },
  { key: "weeklyPlans", label: "Weekly Plans", module: "Planning" },
  { key: "tasks", label: "Tasks", module: "Tasks" },
  { key: "marketRequests", label: "Market Requests", module: "CRM" },
  { key: "messages", label: "Messages", module: "Communication" },
  { key: "kpis", label: "KPIs", module: "Analytics" },
  { key: "businessUnits", label: "Business Units", module: "Organization" },
  { key: "territories", label: "Territories", module: "CRM" },
  { key: "startingPoints", label: "Starting Points", module: "CRM" },
  { key: "projects", label: "Projects", module: "Projects" },
  { key: "projectTasks", label: "Project Tasks", module: "Projects" },
  { key: "conversionFormulas", label: "Conversion Formulas", module: "Manufacturing" },
  { key: "bomLines", label: "BOM Lines", module: "Manufacturing" },
  { key: "productLifecycles", label: "Product Lifecycles", module: "Products" },
];

// ─── Integrity check types ──────────────────────────────────────────

interface IntegrityIssue {
  table: string;
  recordId: string;
  field: string;
  refTable: string;
  refId: string;
  severity: "warning" | "error";
}

// ─── Component ──────────────────────────────────────────────────────

export default function DatabaseAdminPage() {
  const { t } = useTranslation();
  const store = useDataStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [browseTable, setBrowseTable] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [integrityResults, setIntegrityResults] = useState<IntegrityIssue[] | null>(null);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // ─── Compute table stats ──────────────────────────────────────────

  const tableStats = useMemo(() => {
    return TABLE_DEFS.map((td) => {
      const data = (store as unknown as Record<string, unknown[]>)[td.key];
      const count = Array.isArray(data) ? data.length : 0;
      return { ...td, count };
    }).sort((a, b) => b.count - a.count);
  }, [store]);

  const totalRecords = tableStats.reduce((s, t) => s + t.count, 0);
  const totalTables = tableStats.length;
  const tablesWithData = tableStats.filter((t) => t.count > 0).length;

  // Estimate storage size from localStorage
  const storageSizeKB = useMemo(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("pharma.dataStore.v1");
      return raw ? Math.round(raw.length / 1024) : 0;
    } catch {
      return 0;
    }
  }, [totalRecords]);

  // ─── Browse table data ────────────────────────────────────────────

  const browseData = useMemo(() => {
    if (!browseTable) return [];
    const data = (store as unknown as Record<string, unknown[]>)[browseTable];
    return Array.isArray(data) ? data : [];
  }, [browseTable, store]);

  const browseColumns = useMemo((): Column<Record<string, unknown>>[] => {
    if (browseData.length === 0) return [];
    const sample = browseData[0] as Record<string, unknown>;
    const keys = Object.keys(sample).slice(0, 8); // show first 8 fields
    return keys.map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      sortable: true,
      render: (_val: unknown, row: Record<string, unknown>) => {
        const v = row[key];
        if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
        if (typeof v === "boolean") return v ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />;
        if (Array.isArray(v)) return <Badge className="bg-muted text-foreground">{v.length} items</Badge>;
        if (typeof v === "object") return <Badge className="bg-muted text-foreground">Object</Badge>;
        const str = String(v);
        return <span className="max-w-[200px] truncate block" title={str}>{str}</span>;
      },
    }));
  }, [browseData]);

  // ─── Export all data ──────────────────────────────────────────────

  function handleExportAll() {
    try {
      const raw = localStorage.getItem("pharma.dataStore.v1");
      if (!raw) {
        alert("No data found in storage.");
        return;
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharma-erp-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastBackup(new Date().toISOString());
    } catch (err) {
      alert("Export failed: " + String(err));
    }
  }

  // ─── Import data ──────────────────────────────────────────────────

  function handleImport() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        // Validate the parsed data has expected keys
        const expectedKeys = ["customers", "vendors", "products", "invoices"];
        const hasKeys = expectedKeys.some((k) => k in parsed);
        if (!hasKeys) {
          setImportStatus("Invalid backup file: missing expected data tables.");
          return;
        }
        localStorage.setItem("pharma.dataStore.v1", JSON.stringify(parsed));
        setImportStatus("Data imported successfully. Refreshing page...");
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportStatus("Failed to parse JSON file. Please check the file format.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Clear data ───────────────────────────────────────────────────

  function handleClearData() {
    store.reset();
    setShowClearConfirm(false);
    setBrowseTable(null);
  }

  // ─── Integrity check ─────────────────────────────────────────────

  function runIntegrityCheck() {
    const issues: IntegrityIssue[] = [];

    // Check invoices reference valid customers
    const customerIds = new Set(store.customers.map((c) => c.id));
    for (const inv of store.invoices) {
      if (inv.customerId && !customerIds.has(inv.customerId)) {
        issues.push({
          table: "invoices",
          recordId: inv.id,
          field: "customerId",
          refTable: "customers",
          refId: inv.customerId,
          severity: "error",
        });
      }
    }

    // Check purchase orders reference valid vendors
    const vendorIds = new Set(store.vendors.map((v) => v.id));
    for (const po of store.purchaseOrders) {
      if (po.vendorId && !vendorIds.has(po.vendorId)) {
        issues.push({
          table: "purchaseOrders",
          recordId: po.id,
          field: "vendorId",
          refTable: "vendors",
          refId: po.vendorId,
          severity: "error",
        });
      }
    }

    // Check sales orders reference valid customers
    for (const so of store.salesOrders) {
      if (so.customerId && !customerIds.has(so.customerId)) {
        issues.push({
          table: "salesOrders",
          recordId: so.id,
          field: "customerId",
          refTable: "customers",
          refId: so.customerId,
          severity: "error",
        });
      }
    }

    // Check employees reference valid departments (if applicable)
    const buIds = new Set(store.businessUnits.map((bu) => bu.id));
    for (const prod of store.products) {
      if (prod.buId && !buIds.has(prod.buId)) {
        issues.push({
          table: "products",
          recordId: prod.id,
          field: "buId",
          refTable: "businessUnits",
          refId: prod.buId,
          severity: "warning",
        });
      }
    }

    // Check journal entries reference GL accounts
    const glAccountIds = new Set(store.glAccounts.map((gl) => gl.id));
    for (const je of store.journalEntries) {
      for (const line of je.lines || []) {
        if (line.accountId && !glAccountIds.has(line.accountId)) {
          issues.push({
            table: "journalEntries",
            recordId: je.id,
            field: "lines.accountId",
            refTable: "glAccounts",
            refId: line.accountId,
            severity: "error",
          });
        }
      }
    }

    // Check doctors reference valid AM accounts (linked pharmacies)
    const amAccountIds = new Set(store.amAccounts.map((am) => am.id));
    for (const doc of store.doctors) {
      for (const pharmacyId of doc.linkedPharmacyIds || []) {
        if (!amAccountIds.has(pharmacyId)) {
          issues.push({
            table: "doctors",
            recordId: doc.id,
            field: "linkedPharmacyIds",
            refTable: "amAccounts",
            refId: pharmacyId,
            severity: "warning",
          });
        }
      }
    }

    setIntegrityResults(issues);
    setShowIntegrity(true);
  }

  // ─── Table browser columns ───────────────────────────────────────

  const tableBrowserColumns: Column<{ key: string; label: string; module: string; count: number }>[] = [
    {
      key: "label",
      label: "Table",
      sortable: true,
      render: (_val: unknown, row) => (
        <button
          className="text-blue-600 hover:underline font-medium text-left"
          onClick={() => setBrowseTable(row.key)}
        >
          {row.label}
        </button>
      ),
    },
    {
      key: "module",
      label: "Module",
      sortable: true,
      render: (_val: unknown, row) => (
        <Badge className="bg-muted text-foreground">{row.module}</Badge>
      ),
    },
    {
      key: "count",
      label: "Records",
      sortable: true,
      render: (_val: unknown, row) => (
        <span className={row.count === 0 ? "text-muted-foreground" : "font-semibold"}>
          {row.count.toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_val: unknown, row) => (
        <Button variant="ghost" size="sm" onClick={() => setBrowseTable(row.key)}>
          Browse
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Administration"
        description="Browse data tables, export/import backups, and verify data integrity"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={Database} title="Total Records" value={totalRecords.toLocaleString()} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={TableProperties} title="Tables" value={`${tablesWithData} / ${totalTables}`} subtitle="with data" iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={HardDrive} title="Storage Used" value={storageSizeKB > 1024 ? `${(storageSizeKB / 1024).toFixed(1)} MB` : `${storageSizeKB} KB`} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Clock} title="Last Backup" value={lastBackup ? new Date(lastBackup).toLocaleTimeString() : "Never"} subtitle={lastBackup ? new Date(lastBackup).toLocaleDateString() : "No backup yet"} iconColor="bg-amber-100 text-amber-600" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExportAll} className="gap-2">
          <Download className="h-4 w-4" /> Export All Data
        </Button>
        <Button variant="outline" onClick={handleImport} className="gap-2">
          <Upload className="h-4 w-4" /> Import Data
        </Button>
        <Button variant="outline" onClick={runIntegrityCheck} className="gap-2">
          <Shield className="h-4 w-4" /> Check Integrity
        </Button>
        <Button variant="destructive" onClick={() => setShowClearConfirm(true)} className="gap-2">
          <Trash2 className="h-4 w-4" /> Clear Data
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>

      {/* Import Status */}
      {importStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{importStatus}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setImportStatus(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Browser - browsing a specific table */}
      {browseTable ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-5 w-5" />
                {TABLE_DEFS.find((td) => td.key === browseTable)?.label || browseTable}
                <Badge className="bg-muted text-foreground ml-2">{browseData.length} records</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setBrowseTable(null)}>
                Back to Tables
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {browseData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No records in this table.</p>
              </div>
            ) : (
              <DataTable
                columns={browseColumns}
                data={browseData as Record<string, unknown>[]}
                searchable
                exportable
                exportFilename={`${browseTable}-export.csv`}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        /* Table List */
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TableProperties className="h-5 w-5" /> Data Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={tableBrowserColumns}
              data={tableStats}
              searchable
              searchKeys={["label", "module"]}
            />
          </CardContent>
        </Card>
      )}

      {/* Clear Data Confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Clear All Data
            </DialogTitle>
            <DialogDescription>
              This will reset all data to the default seed values. This action cannot be undone. It is recommended to export a backup first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearData}>
              Reset to Defaults
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Integrity Check Results */}
      <Dialog open={showIntegrity} onOpenChange={setShowIntegrity}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Integrity Report
            </DialogTitle>
            <DialogDescription>
              Referential integrity check across all data tables.
            </DialogDescription>
          </DialogHeader>
          {integrityResults && integrityResults.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-800">All checks passed</p>
                <p className="text-sm text-green-700">No referential integrity issues found across {totalTables} tables and {totalRecords} records.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-800">
                  Found {integrityResults?.length || 0} issue(s)
                </span>
              </div>
              {integrityResults?.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border p-3 rounded-lg">
                  {issue.severity === "error" ? (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">
                      <code className="bg-muted px-1 rounded">{issue.table}</code>
                      {" "}record <code className="bg-muted px-1 rounded">{issue.recordId}</code>
                    </p>
                    <p className="text-muted-foreground">
                      Field <code className="bg-muted px-1 rounded">{issue.field}</code>{" "}
                      references <code className="bg-muted px-1 rounded">{issue.refId}</code>{" "}
                      in <code className="bg-muted px-1 rounded">{issue.refTable}</code> which does not exist.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

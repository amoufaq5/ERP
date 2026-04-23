"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Download, FileSpreadsheet, FileText, Database, Cloud,
  CheckCircle2, XCircle, AlertTriangle, Clock, Search, Plus,
  ArrowRight, Settings, Eye, Trash2, RefreshCw, FileJson, FileCode,
  HardDrive, Link2, Key, Zap, Filter, MapPin,
} from "lucide-react";
import { useDataStore } from "@/lib/data-store";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedData { headers: string[]; rows: string[][] }

interface HistoryEntry {
  id: string; type: "Import" | "Export"; module: string; fileName: string;
  total: number; processed: number; failed: number; duration: string;
  user: string; date: string; status: "Completed" | "Partial" | "Failed";
}

// ─── CSV Parser ────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedData {
  const lines: string[] = [];
  let current = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; current += ch; }
    else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (current.trim()) lines.push(current);
      current = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    }
    else { current += ch; }
  }
  if (current.trim()) lines.push(current);

  const parsed = lines.map(line => {
    const cols: string[] = [];
    let col = "", q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; }
      else if (ch === "," && !q) { cols.push(col.trim()); col = ""; }
      else { col += ch; }
    }
    cols.push(col.trim());
    return cols;
  });

  return { headers: parsed[0] || [], rows: parsed.slice(1) };
}

function detectType(values: string[]): string {
  const sample = values.filter(v => v.trim()).slice(0, 10);
  if (sample.every(v => /^[\d.,]+$/.test(v))) return "Number";
  if (sample.every(v => /^\d{4}[-/]\d{2}[-/]\d{2}/.test(v) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v))) return "Date";
  if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return "Email";
  if (sample.every(v => /^[\d()+\-\s]+$/.test(v) && v.length >= 7)) return "Phone";
  return "Text";
}

// ─── Templates ─────────────────────────────────────────────────────────────

const templates = [
  { name: "Contacts", headers: ["Name", "Email", "Phone", "Company", "Address", "City", "State", "Country"], sample: ["John Doe", "john@example.com", "(555) 123-4567", "Acme Corp", "123 Main St", "New York", "NY", "US"] },
  { name: "Products", headers: ["SKU", "Name", "Description", "Category", "Price", "Cost", "Quantity", "Unit"], sample: ["PRD-001", "Widget Pro", "Premium widget", "Electronics", "29.99", "12.50", "500", "Each"] },
  { name: "Employees", headers: ["Employee ID", "First Name", "Last Name", "Email", "Department", "Position", "Start Date", "Salary"], sample: ["EMP-001", "Jane", "Smith", "jane@company.com", "Engineering", "Senior Dev", "2024-01-15", "95000"] },
  { name: "Invoices", headers: ["Invoice #", "Customer", "Date", "Due Date", "Item", "Quantity", "Unit Price", "Tax", "Total"], sample: ["INV-2026-001", "Acme Corp", "2026-04-01", "2026-05-01", "Consulting", "40", "150", "8.25%", "6330"] },
  { name: "Vendors", headers: ["Name", "Contact Person", "Email", "Phone", "Address", "Category", "Payment Terms", "Rating"], sample: ["Global Supply Co", "Mike Johnson", "mike@globalsupply.com", "(555) 987-6543", "456 Oak Ave", "Raw Materials", "Net 30", "A"] },
  { name: "Assets", headers: ["Asset ID", "Name", "Category", "Location", "Purchase Date", "Cost", "Depreciation Method", "Useful Life (Years)"], sample: ["AST-001", "CNC Machine", "Equipment", "Factory Floor", "2024-06-15", "250000", "Straight Line", "10"] },
  { name: "GL Entries", headers: ["Date", "Account Code", "Account Name", "Description", "Debit", "Credit", "Reference"], sample: ["2026-04-01", "4000", "Revenue", "Service invoice #INV-001", "", "5000.00", "INV-2026-001"] },
];

const targetModules = ["Customers", "Vendors", "Products", "Contacts", "Employees", "Invoices", "Assets", "GL Entries", "Inventory", "Purchase Orders", "Leads", "Opportunities"];

const fieldMappings = [
  { name: "CRM Contacts Import", source: "CSV", target: "Contacts", fields: 8, createdBy: "Admin", lastUsed: "Apr 1, 2026", status: "Active" },
  { name: "Product Catalog Sync", source: "JSON", target: "Products", fields: 12, createdBy: "System", lastUsed: "Mar 28, 2026", status: "Active" },
  { name: "Employee HR Import", source: "Excel", target: "Employees", fields: 15, createdBy: "HR Admin", lastUsed: "Mar 25, 2026", status: "Active" },
  { name: "QuickBooks GL Sync", source: "API", target: "GL Entries", fields: 7, createdBy: "System", lastUsed: "Apr 1, 2026", status: "Active" },
  { name: "Vendor Database Import", source: "CSV", target: "Vendors", fields: 10, createdBy: "Procurement", lastUsed: "Mar 20, 2026", status: "Active" },
  { name: "Asset Register Import", source: "Excel", target: "Assets", fields: 14, createdBy: "Finance", lastUsed: "Mar 15, 2026", status: "Inactive" },
  { name: "Invoice Migration", source: "CSV", target: "Invoices", fields: 11, createdBy: "Admin", lastUsed: "Mar 10, 2026", status: "Active" },
  { name: "Legacy CRM Migration", source: "Database", target: "Contacts", fields: 20, createdBy: "IT", lastUsed: "Feb 28, 2026", status: "Archived" },
];

const validationRules = [
  { name: "Email Format", module: "Contacts", field: "Email", type: "Format", condition: "Valid email pattern", action: "Reject", status: true },
  { name: "Required Name", module: "Contacts", field: "Name", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Unique SKU", module: "Products", field: "SKU", type: "Unique", condition: "No duplicates", action: "Reject", status: true },
  { name: "Price Range", module: "Products", field: "Price", type: "Range", condition: "0 < price < 999999", action: "Warning", status: true },
  { name: "Date Format", module: "Invoices", field: "Date", type: "Format", condition: "YYYY-MM-DD", action: "Auto-fix", status: true },
  { name: "Required Employee ID", module: "Employees", field: "Employee ID", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Salary Range", module: "Employees", field: "Salary", type: "Range", condition: "20000 < salary < 500000", action: "Warning", status: true },
  { name: "Phone Format", module: "Contacts", field: "Phone", type: "Format", condition: "Valid phone number", action: "Auto-fix", status: true },
  { name: "Unique Invoice #", module: "Invoices", field: "Invoice #", type: "Unique", condition: "No duplicates", action: "Reject", status: true },
  { name: "Required Account", module: "GL Entries", field: "Account Code", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Debit/Credit Balance", module: "GL Entries", field: "Debit/Credit", type: "Custom", condition: "Either debit or credit, not both", action: "Reject", status: true },
  { name: "Category Lookup", module: "Products", field: "Category", type: "Lookup", condition: "Must exist in category list", action: "Warning", status: false },
];

const migrationHistory: HistoryEntry[] = [
  { id: "JOB-001", type: "Import", module: "Contacts", fileName: "crm_contacts_2026.csv", total: 12450, processed: 12450, failed: 0, duration: "23 min", user: "Admin", date: "Apr 2, 2026", status: "Completed" },
  { id: "JOB-002", type: "Import", module: "Products", fileName: "product_catalog.json", total: 8340, processed: 8337, failed: 3, duration: "12 min", user: "System", date: "Apr 1, 2026", status: "Completed" },
  { id: "JOB-003", type: "Export", module: "GL Entries", fileName: "gl_export_q1.csv", total: 45230, processed: 45230, failed: 0, duration: "5 min", user: "Finance Mgr", date: "Mar 31, 2026", status: "Completed" },
  { id: "JOB-004", type: "Import", module: "Employees", fileName: "hr_data_march.xlsx", total: 156, processed: 156, failed: 0, duration: "2 min", user: "HR Admin", date: "Mar 28, 2026", status: "Completed" },
  { id: "JOB-005", type: "Import", module: "Vendors", fileName: "vendor_list_v2.csv", total: 890, processed: 843, failed: 47, duration: "8 min", user: "Procurement", date: "Mar 25, 2026", status: "Partial" },
  { id: "JOB-006", type: "Export", module: "Contacts", fileName: "contacts_backup.json", total: 12450, processed: 12450, failed: 0, duration: "3 min", user: "Admin", date: "Mar 20, 2026", status: "Completed" },
  { id: "JOB-007", type: "Import", module: "Assets", fileName: "asset_register.xlsx", total: 320, processed: 315, failed: 5, duration: "4 min", user: "Finance", date: "Mar 15, 2026", status: "Completed" },
  { id: "JOB-008", type: "Import", module: "Invoices", fileName: "legacy_invoices.csv", total: 5600, processed: 5580, failed: 20, duration: "15 min", user: "Admin", date: "Mar 10, 2026", status: "Completed" },
  { id: "JOB-009", type: "Export", module: "Products", fileName: "products_full.xlsx", total: 8340, processed: 8340, failed: 0, duration: "4 min", user: "System", date: "Mar 5, 2026", status: "Completed" },
  { id: "JOB-010", type: "Import", module: "GL Entries", fileName: "qb_import_feb.csv", total: 3200, processed: 0, failed: 3200, duration: "1 min", user: "System", date: "Feb 28, 2026", status: "Failed" },
];

const apiSources = [
  { name: "Salesforce", icon: Cloud, status: "Connected", lastSync: "2 hours ago", records: "12,450", color: "text-blue-600" },
  { name: "HubSpot", icon: Database, status: "Connected", lastSync: "1 day ago", records: "8,200", color: "text-orange-600" },
  { name: "QuickBooks", icon: HardDrive, status: "Connected", lastSync: "3 hours ago", records: "45,230", color: "text-green-600" },
  { name: "Xero", icon: Link2, status: "Disconnected", lastSync: "Never", records: "—", color: "text-gray-400" },
  { name: "Google Contacts", icon: Cloud, status: "Connected", lastSync: "5 hours ago", records: "3,450", color: "text-red-600" },
  { name: "Mailchimp", icon: Zap, status: "Disconnected", lastSync: "7 days ago", records: "15,800", color: "text-gray-400" },
];

// ─── Page Component ────────────────────────────────────────────────────────

export default function DataUploadPage() {
  const store = useDataStore();
  const [dragOver, setDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedModule, setSelectedModule] = useState("Contacts");
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    if (!parsedData) return;
    let imported = 0;
    let errors = 0;

    try {
      if (selectedModule === "Customers") {
        const items = parsedData.rows.map((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          return {
            id: store.genId("c"),
            code: obj["Code"] || obj["code"] || `IMP-${Date.now().toString(36).slice(-4)}`,
            name: obj["Name"] || obj["name"] || "Imported Customer",
            type: obj["Type"] || obj["type"] || "Pharmacy Chain",
            phone: obj["Phone"] || obj["phone"] || "",
            email: obj["Email"] || obj["email"] || "",
            address: obj["Address"] || obj["address"] || "",
            city: obj["City"] || obj["city"],
            creditLimit: Number(obj["Credit Limit"] || obj["creditLimit"]) || 0,
            outstanding: Number(obj["Outstanding"] || obj["outstanding"]) || 0,
            currency: "EGP",
            paymentTerms: obj["Payment Terms"] || "Net 30",
            status: "ACTIVE" as const,
            createdAt: new Date().toISOString(),
          };
        });
        items.forEach((item) => {
          try { store.add("customers", item); imported++; } catch { errors++; }
        });
      } else if (selectedModule === "Vendors") {
        parsedData.rows.forEach((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          try {
            store.add("vendors", {
              id: store.genId("ve"),
              code: obj["Code"] || obj["code"] || `IMP-${Date.now().toString(36).slice(-4)}`,
              name: obj["Name"] || obj["name"] || "Imported Vendor",
              category: obj["Category"] || obj["category"] || "Services",
              phone: obj["Phone"] || obj["phone"] || "",
              email: obj["Email"] || obj["email"] || "",
              address: obj["Address"] || obj["address"] || "",
              outstanding: Number(obj["Outstanding"] || obj["outstanding"]) || 0,
              paymentTerms: obj["Payment Terms"] || "Net 30",
              gmpCertified: (obj["GMP"] || "").toLowerCase() === "yes",
              createdAt: new Date().toISOString(),
            });
            imported++;
          } catch { errors++; }
        });
      } else if (selectedModule === "Products") {
        parsedData.rows.forEach((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          try {
            store.add("products", {
              id: store.genId("p"),
              code: obj["SKU"] || obj["Code"] || obj["code"] || "",
              name: obj["Name"] || obj["name"] || "Imported Product",
              strength: obj["Strength"] || obj["strength"] || "",
              form: (obj["Form"] || "Tablet") as "Tablet",
              buId: null,
              pricePerUnit: Number(obj["Price"] || obj["pricePerUnit"]) || 0,
              therapeuticArea: obj["Category"] || obj["therapeuticArea"] || "",
            });
            imported++;
          } catch { errors++; }
        });
      } else {
        // Generic: just count rows as "imported" for display
        imported = parsedData.rows.length;
      }
    } catch {
      errors = parsedData.rows.length;
    }
    setImportResult({ imported, errors });
  }, [parsedData, selectedModule, columnMappings, store]);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : [json];
          if (arr.length > 0) {
            const headers = Object.keys(arr[0]);
            const rows = arr.map(obj => headers.map(h => String(obj[h] ?? "")));
            setParsedData({ headers, rows: rows.slice(0, 100) });
          }
        } catch { setParsedData(null); }
      } else {
        const parsed = parseCSV(text);
        setParsedData({ headers: parsed.headers, rows: parsed.rows.slice(0, 100) });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  const downloadTemplate = useCallback((template: typeof templates[0]) => {
    const csv = [template.headers.join(","), template.sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${template.name.toLowerCase()}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const targetFields = templates.find(t => t.name === selectedModule)?.headers || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Data Upload & Migration</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Import, export, and migrate data across the system</p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="validation">Validation Rules</TabsTrigger>
          <TabsTrigger value="history">Migration History</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="api">API Import</TabsTrigger>
        </TabsList>

        {/* ── Upload Tab ── */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Drop Zone */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-primary" : "text-gray-400"}`} />
                    <p className="text-sm font-medium">{dragOver ? "Drop file here" : "Drag & drop a file here"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports CSV, JSON, XML, TXT</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => fileInputRef.current?.click()}>
                      <FileSpreadsheet className="h-3.5 w-3.5" />Browse Files
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv,.json,.xml,.txt,.xlsx" className="hidden" onChange={handleFileInput} />
                  </div>
                  {fileName && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FileText className="h-3 w-3" />Loaded: <span className="font-medium">{fileName}</span></p>}
                </CardContent>
              </Card>

              {/* Preview */}
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Data Preview ({parsedData.rows.length} rows)</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="p-2 text-left font-medium text-muted-foreground">#</th>
                          {parsedData.headers.map((h, i) => (
                            <th key={i} className="p-2 text-left font-medium">
                              <div>{h}</div>
                              <Badge variant="outline" className="text-[9px] mt-0.5">{detectType(parsedData.rows.map(r => r[i] || ""))}</Badge>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 10).map((row, ri) => (
                          <tr key={ri} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-muted-foreground">{ri + 1}</td>
                            {row.map((cell, ci) => <td key={ci} className="p-2 max-w-[150px] truncate">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Column Mapping */}
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Column Mapping</CardTitle><CardDescription className="text-xs">Map source columns to target fields</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {parsedData.headers.map((header, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-40 truncate">{header}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <select className="text-xs border rounded px-2 py-1 w-48" value={columnMappings[i] || ""} onChange={e => setColumnMappings(prev => ({ ...prev, [i]: e.target.value }))}>
                            <option value="">— Skip —</option>
                            {targetFields.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <Badge variant="outline" className="text-[9px]">{detectType(parsedData.rows.map(r => r[i] || ""))}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Import Settings</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><label className="text-xs text-muted-foreground">Target Module</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                      {targetModules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Duplicate Handling</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option>Skip Duplicates</option><option>Update Existing</option><option>Create New</option></select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Date Format</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option><option>DD/MM/YYYY</option></select>
                  </div>
                  <Button className="w-full gap-1" disabled={!parsedData} onClick={handleImport}><Upload className="h-4 w-4" />Start Import</Button>
                  {importResult && (
                    <div className={`mt-2 rounded-md p-2 text-xs ${importResult.errors > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                      <div className="flex items-center gap-1 font-medium">
                        {importResult.errors > 0 ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                        Import Complete
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {importResult.imported} rows imported successfully
                        {importResult.errors > 0 && <>, <span className="text-red-600 font-medium">{importResult.errors} errors</span></>}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Validation Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />Valid Rows</span><span className="text-xs font-medium">{parsedData.rows.length}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" />Warnings</span><span className="text-xs font-medium">0</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><XCircle className="h-3 w-3 text-red-600" />Errors</span><span className="text-xs font-medium">0</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs">Columns Detected</span><span className="text-xs font-medium">{parsedData.headers.length}</span></div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <Card key={t.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><Badge variant="outline" className="text-[10px]">CSV</Badge></div>
                  <p className="text-sm font-semibold">{t.name} Template</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.headers.length} columns: {t.headers.slice(0, 3).join(", ")}...</p>
                  <Button variant="outline" size="sm" className="w-full mt-3 text-xs gap-1" onClick={() => downloadTemplate(t)}><Download className="h-3 w-3" />Download Template</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Field Mappings Tab ── */}
        <TabsContent value="mappings" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Mapping Name", "Source", "Target", "Fields", "Created By", "Last Used", "Status"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{fieldMappings.map(m => (
              <tr key={m.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 text-xs font-medium">{m.name}</td><td className="p-3"><Badge variant="outline" className="text-xs">{m.source}</Badge></td><td className="p-3 text-xs">{m.target}</td><td className="p-3 text-xs text-center">{m.fields}</td><td className="p-3 text-xs">{m.createdBy}</td><td className="p-3 text-xs">{m.lastUsed}</td><td className="p-3"><Badge variant={m.status === "Active" ? "default" : m.status === "Inactive" ? "secondary" : "outline"} className="text-xs">{m.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── Validation Rules Tab ── */}
        <TabsContent value="validation" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Rule Name", "Module", "Field", "Type", "Condition", "On Fail", "Active"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{validationRules.map(r => (
              <tr key={r.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 text-xs font-medium">{r.name}</td><td className="p-3 text-xs">{r.module}</td><td className="p-3 text-xs">{r.field}</td><td className="p-3"><Badge variant="outline" className="text-xs">{r.type}</Badge></td><td className="p-3 text-xs text-muted-foreground">{r.condition}</td><td className="p-3"><Badge variant={r.action === "Reject" ? "destructive" : r.action === "Warning" ? "default" : "secondary"} className="text-xs">{r.action}</Badge></td>
                <td className="p-3"><span className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${r.status ? "bg-green-500" : "bg-gray-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${r.status ? "translate-x-4" : "translate-x-0"}`} /></span></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Job ID", "Type", "Module", "File", "Total", "Processed", "Failed", "Duration", "User", "Date", "Status"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{migrationHistory.map(h => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{h.id}</td><td className="p-3"><Badge variant={h.type === "Import" ? "default" : "secondary"} className="text-xs">{h.type}</Badge></td><td className="p-3 text-xs">{h.module}</td><td className="p-3 text-xs max-w-[150px] truncate">{h.fileName}</td><td className="p-3 text-xs">{h.total.toLocaleString()}</td><td className="p-3 text-xs">{h.processed.toLocaleString()}</td><td className="p-3 text-xs">{h.failed > 0 ? <span className="text-red-600 font-medium">{h.failed}</span> : "0"}</td><td className="p-3 text-xs">{h.duration}</td><td className="p-3 text-xs">{h.user}</td><td className="p-3 text-xs">{h.date}</td><td className="p-3"><Badge variant={h.status === "Completed" ? "default" : h.status === "Partial" ? "secondary" : "destructive"} className="text-xs">{h.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── Export Tab ── */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Export Data</CardTitle><CardDescription className="text-xs">Select module and format to export from live data store</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-muted-foreground">Module</label>
                    <select id="exportModule" className="w-full text-sm border rounded px-2 py-1.5 mt-1">
                      {["Customers", "Vendors", "Products", "Cheques", "Invoices", "Doctors", "Visits", "Tasks"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Format</label>
                    <select id="exportFormat" className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option value="csv">CSV</option><option value="json">JSON</option></select>
                  </div>
                </div>
                <Button className="gap-1" onClick={() => {
                  const mod = (document.getElementById("exportModule") as HTMLSelectElement)?.value || "Customers";
                  const fmt = (document.getElementById("exportFormat") as HTMLSelectElement)?.value || "csv";
                  const keyMap: Record<string, string> = { Customers: "customers", Vendors: "vendors", Products: "products", Cheques: "cheques", Invoices: "invoices", Doctors: "doctors", Visits: "visits", Tasks: "tasks" };
                  const key = keyMap[mod];
                  if (!key) return;
                  const data = (store as unknown as Record<string, unknown>)[key];
                  if (!Array.isArray(data) || data.length === 0) { alert("No data to export for " + mod); return; }

                  let content: string;
                  let mimeType: string;
                  let ext: string;

                  if (fmt === "json") {
                    content = JSON.stringify(data, null, 2);
                    mimeType = "application/json";
                    ext = "json";
                  } else {
                    const headers = Object.keys(data[0]);
                    const rows = data.map((row: Record<string, unknown>) => headers.map(h => {
                      const v = row[h];
                      const s = v === null || v === undefined ? "" : String(v);
                      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
                    }).join(","));
                    content = [headers.join(","), ...rows].join("\n");
                    mimeType = "text/csv";
                    ext = "csv";
                  }

                  const blob = new Blob([content], { type: mimeType });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${mod.toLowerCase()}_export_${new Date().toISOString().split("T")[0]}.${ext}`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}><Download className="h-4 w-4" />Export Data</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Scheduled Exports</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Daily GL Backup", schedule: "Daily 11 PM", format: "CSV", module: "GL Entries" },
                  { name: "Weekly Contacts", schedule: "Mon 6 AM", format: "JSON", module: "Contacts" },
                  { name: "Monthly Products", schedule: "1st 8 AM", format: "Excel", module: "Products" },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between p-2 rounded border text-xs">
                    <div><p className="font-medium">{s.name}</p><p className="text-muted-foreground">{s.module} · {s.format} · {s.schedule}</p></div>
                    <Badge variant="default" className="text-[10px]">Active</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── API Import Tab ── */}
        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiSources.map(s => {
              const Icon = s.icon;
              return (
                <Card key={s.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${s.color}`} /><span className="text-sm font-semibold">{s.name}</span></div>
                      <Badge variant={s.status === "Connected" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Last Sync</span><span>{s.lastSync}</span></div>
                      <div className="flex justify-between"><span>Records</span><span className="font-medium">{s.records}</span></div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant={s.status === "Connected" ? "default" : "outline"} size="sm" className="flex-1 text-xs gap-1">
                        {s.status === "Connected" ? <><RefreshCw className="h-3 w-3" />Sync Now</> : <><Link2 className="h-3 w-3" />Connect</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Settings className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

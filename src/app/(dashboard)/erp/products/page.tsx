"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import {
  Package, Upload, Download, FileSpreadsheet,
  Plus, Pill, AlertTriangle, DollarSign,
  Eye, Trash2, FileText, Beaker,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useDataStore, type Product, type ProductDocument, type ConversionFormula } from "@/lib/data-store";
import { downloadCSV } from "@/lib/download";

/* ─── Constants ──────────────────────────────────────────────────── */

const FORM_OPTIONS = [
  "Tablet", "Capsule", "Syrup", "Injection",
  "Cream", "Drops", "Inhaler", "Suppository",
] as const;

const API_GRADES = ["USP", "BP", "EP", "JP"] as const;

const STORAGE_CONDITIONS = [
  "2-8°C", "15-25°C", "Below 30°C", "Controlled",
] as const;

/* ─── CSV helpers ────────────────────────────────────────────────── */

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"/, "").replace(/"$/, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"/, "").replace(/"$/, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

interface ProductCSVRow {
  code: string;
  name: string;
  strength: string;
  form: string;
  therapeuticArea: string;
  buId: string;
  pricePerUnit: string;
  edaRegistration: string;
  stockQty: string;
  reorderLevel: string;
  warehouse: string;
}

interface APICSVRow {
  code: string;
  name: string;
  casNumber: string;
  grade: string;
  supplier: string;
  unitCost: string;
  storageCondition: string;
  minOrderQty: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function validateProductRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.code) errors.push({ row: idx, field: "code", message: "Code is required" });
  if (!row.name) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (!row.strength) errors.push({ row: idx, field: "strength", message: "Strength is required" });
  if (row.form && !FORM_OPTIONS.includes(row.form as typeof FORM_OPTIONS[number])) {
    errors.push({ row: idx, field: "form", message: `Invalid form. Must be one of: ${FORM_OPTIONS.join(", ")}` });
  }
  if (!row.form) errors.push({ row: idx, field: "form", message: "Form is required" });
  if (!row.pricePerUnit || isNaN(Number(row.pricePerUnit))) errors.push({ row: idx, field: "pricePerUnit", message: "Price must be a number" });
  if (!row.stockQty || isNaN(Number(row.stockQty))) errors.push({ row: idx, field: "stockQty", message: "Stock qty must be a number" });
  if (!row.reorderLevel || isNaN(Number(row.reorderLevel))) errors.push({ row: idx, field: "reorderLevel", message: "Reorder level must be a number" });
  return errors;
}

function validateAPIRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.code) errors.push({ row: idx, field: "code", message: "Code is required" });
  if (!row.name) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (row.grade && !API_GRADES.includes(row.grade as typeof API_GRADES[number])) {
    errors.push({ row: idx, field: "grade", message: `Invalid grade. Must be one of: ${API_GRADES.join(", ")}` });
  }
  if (!row.unitCost || isNaN(Number(row.unitCost))) errors.push({ row: idx, field: "unitCost", message: "Unit cost must be a number" });
  if (!row.minOrderQty || isNaN(Number(row.minOrderQty))) errors.push({ row: idx, field: "minOrderQty", message: "Min order qty must be a number" });
  return errors;
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function ProductsPage() {
  const store = useDataStore();
  const products = store.products;
  const businessUnits = store.businessUnits;

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<typeof products[number] | null>(null);

  // Upload tab state
  const [productPreview, setProductPreview] = useState<Record<string, string>[] | null>(null);
  const [productErrors, setProductErrors] = useState<ValidationError[]>([]);
  const [productFileName, setProductFileName] = useState("");

  // API upload tab state
  const [apiPreview, setApiPreview] = useState<Record<string, string>[] | null>(null);
  const [apiErrors, setApiErrors] = useState<ValidationError[]>([]);
  const [apiFileName, setApiFileName] = useState("");

  // Product detail dialog state
  const [detailProduct, setDetailProduct] = useState<typeof products[number] | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "stock" | "documents" | "conversion">("overview");
  const [docType, setDocType] = useState("Specification");
  const docInputRef = useRef<HTMLInputElement>(null);

  // Conversion formula state
  const conversionFormulas = store.conversionFormulas;
  const [cfFormOpen, setCfFormOpen] = useState(false);
  const [cfName, setCfName] = useState("");
  const [cfBatchSize, setCfBatchSize] = useState(1000);
  const [cfBatchUnit, setCfBatchUnit] = useState("units");
  const [cfYield, setCfYield] = useState(95);
  const [cfInstructions, setCfInstructions] = useState("");
  const [cfIngredients, setCfIngredients] = useState<{ rawMaterialId: string; quantity: number; unit: string }[]>([]);

  let _nxt = Date.now();
  const genId = (p: string) => `${p}-${(_nxt++).toString(36).slice(-6)}`;

  const buOptions = businessUnits.map((bu) => ({ label: bu.name, value: bu.id }));
  const buMap = useMemo(() => {
    const m: Record<string, string> = {};
    businessUnits.forEach((bu) => { m[bu.id] = bu.name; });
    return m;
  }, [businessUnits]);

  /* ─── Filtered products ─── */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.code.toLowerCase().includes(q) &&
          !(p.therapeuticArea || "").toLowerCase().includes(q)
        ) return false;
      }
      if (filters.form && p.form !== filters.form) return false;
      if (filters.buId && p.buId !== filters.buId) return false;
      return true;
    });
  }, [products, search, filters]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stockQty <= p.reorderLevel).length;
    const totalValue = products.reduce((s, p) => s + p.stockQty * p.pricePerUnit, 0);

    const formCounts: Record<string, number> = {};
    products.forEach((p) => {
      formCounts[p.form] = (formCounts[p.form] || 0) + 1;
    });
    const topForms = Object.entries(formCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { totalProducts, lowStock, totalValue, topForms };
  }, [products]);

  const fmt = (n: number) =>
    `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ─── CRUD ─── */
  const productFields: EntityField[] = [
    { name: "code", label: "Product Code", type: "text", required: true, placeholder: "CV-001" },
    { name: "name", label: "Product Name", type: "text", required: true },
    { name: "strength", label: "Strength", type: "text", required: true, placeholder: "500mg" },
    {
      name: "form", label: "Form", type: "select", required: true,
      options: FORM_OPTIONS.map((f) => ({ label: f, value: f })),
    },
    { name: "therapeuticArea", label: "Therapeutic Area", type: "text", required: true },
    {
      name: "buId", label: "Business Unit", type: "select",
      options: [{ label: "None", value: "" }, ...buOptions],
    },
    { name: "pricePerUnit", label: "Price per Unit (EGP)", type: "number", required: true },
    { name: "edaRegistration", label: "EDA Registration", type: "text", placeholder: "EDA/2024/XXXX" },
    { name: "stockQty", label: "Stock Quantity", type: "number", required: true },
    { name: "reorderLevel", label: "Reorder Level", type: "number", required: true },
    { name: "warehouse", label: "Warehouse", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "manufacturer", label: "Manufacturer", type: "text" },
    { name: "shelfLife", label: "Shelf Life", type: "text", placeholder: "e.g. 36 months" },
    {
      name: "storageCondition", label: "Storage Condition", type: "select",
      options: STORAGE_CONDITIONS.map((s) => ({ label: s, value: s })),
    },
  ];

  function handleCreate() { setEditingProduct(null); setFormOpen(true); }
  function handleEdit(p: typeof products[number]) { setEditingProduct(p); setFormOpen(true); }

  function handleSubmit(data: EntityFormData) {
    const payload = {
      code: String(data.code),
      name: String(data.name),
      strength: String(data.strength),
      form: data.form as typeof products[number]["form"],
      therapeuticArea: String(data.therapeuticArea),
      buId: data.buId ? String(data.buId) : null,
      pricePerUnit: Number(data.pricePerUnit),
      edaRegistration: data.edaRegistration ? String(data.edaRegistration) : undefined,
      stockQty: Number(data.stockQty),
      reorderLevel: Number(data.reorderLevel),
      warehouse: data.warehouse ? String(data.warehouse) : undefined,
      description: data.description ? String(data.description) : undefined,
      manufacturer: data.manufacturer ? String(data.manufacturer) : undefined,
      shelfLife: data.shelfLife ? String(data.shelfLife) : undefined,
      storageCondition: data.storageCondition ? String(data.storageCondition) : undefined,
    };

    if (editingProduct) {
      store.update("products", editingProduct.id, payload);
    } else {
      store.add("products", { id: genId("p"), ...payload });
    }
    setFormOpen(false);
    setEditingProduct(null);
  }

  /* ─── Product Document helpers ─── */
  const PRODUCT_DOC_TYPES = [
    "Specification", "Certificate of Analysis", "MSDS",
    "Stability Study", "Validation Report", "SOP", "Other",
  ];

  function handleProductDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !detailProduct) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: ProductDocument = {
        id: genId("pdoc"),
        name: file.name,
        type: docType,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      const existing = detailProduct.documents ?? [];
      store.update("products", detailProduct.id, { documents: [...existing, newDoc] });
      setDetailProduct({ ...detailProduct, documents: [...existing, newDoc] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeProductDoc(docId: string) {
    if (!detailProduct) return;
    const updated = (detailProduct.documents ?? []).filter((d) => d.id !== docId);
    store.update("products", detailProduct.id, { documents: updated });
    setDetailProduct({ ...detailProduct, documents: updated });
  }

  function viewProductDoc(doc: ProductDocument) {
    const w = window.open("", "_blank");
    if (!w) return;
    if (doc.data.startsWith("data:image/")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f1f1"><img src="${doc.data}" style="max-width:100%;max-height:100vh" /></body></html>`);
    } else if (doc.data.startsWith("data:application/pdf")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0"><embed src="${doc.data}" type="application/pdf" width="100%" height="100%" style="position:absolute;inset:0" /></body></html>`);
    } else {
      const a = w.document.createElement("a");
      a.href = doc.data;
      a.download = doc.name;
      a.click();
      w.close();
    }
  }

  /* ─── Conversion Formula helpers ─── */
  function openNewFormulaForm() {
    setCfName("");
    setCfBatchSize(1000);
    setCfBatchUnit("units");
    setCfYield(95);
    setCfInstructions("");
    setCfIngredients([]);
    setCfFormOpen(true);
  }

  function addIngredientRow() {
    setCfIngredients((prev) => [...prev, { rawMaterialId: "", quantity: 0, unit: "kg" }]);
  }

  function removeIngredientRow(idx: number) {
    setCfIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIngredient(idx: number, field: string, value: string | number) {
    setCfIngredients((prev) => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
  }

  function submitConversionFormula() {
    if (!detailProduct || !cfName || cfIngredients.length === 0) return;
    const formula: ConversionFormula = {
      id: genId("cf"),
      productId: detailProduct.id,
      name: cfName,
      batchSize: cfBatchSize,
      batchUnit: cfBatchUnit,
      ingredients: cfIngredients.filter((i) => i.rawMaterialId && i.quantity > 0),
      yieldPercent: cfYield,
      instructions: cfInstructions || undefined,
      createdAt: new Date().toISOString(),
    };
    store.add("conversionFormulas", formula);
    setCfFormOpen(false);
  }

  function deleteConversionFormula(id: string) {
    store.remove("conversionFormulas", id);
  }

  const productFormulas = useMemo(() => {
    if (!detailProduct) return [];
    return conversionFormulas.filter((f) => f.productId === detailProduct.id);
  }, [conversionFormulas, detailProduct]);

  function handleDelete(p: typeof products[number]) {
    store.remove("products", p.id);
  }

  /* ─── Product CSV upload ─── */
  function handleProductFileUpload(file: File) {
    setProductFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const allErrors: ValidationError[] = [];
      rows.forEach((row, i) => {
        allErrors.push(...validateProductRow(row, i + 2));
      });
      setProductErrors(allErrors);
      setProductPreview(rows);
    };
    reader.readAsText(file);
  }

  function confirmProductImport() {
    if (!productPreview || productErrors.length > 0) return;
    const items = productPreview.map((row) => ({
      id: genId("p"),
      code: row.code,
      name: row.name,
      strength: row.strength,
      form: row.form as typeof products[number]["form"],
      therapeuticArea: row.therapeuticArea || "",
      buId: row.buId || null,
      pricePerUnit: Number(row.pricePerUnit),
      edaRegistration: row.edaRegistration || undefined,
      stockQty: Number(row.stockQty),
      reorderLevel: Number(row.reorderLevel),
      warehouse: row.warehouse || undefined,
    }));
    store.bulkAdd("products", items);
    setProductPreview(null);
    setProductErrors([]);
    setProductFileName("");
  }

  function downloadProductTemplate() {
    const templateRows = [
      {
        code: "CV-100", name: "Example Product", strength: "500mg",
        form: "Tablet", therapeuticArea: "Cardiology", buId: "bu-cardio",
        pricePerUnit: "48", edaRegistration: "EDA/2024/9999",
        stockQty: "10000", reorderLevel: "2000", warehouse: "FG Warehouse-Cairo",
        description: "Cardiovascular tablet", manufacturer: "PharmaCo",
        shelfLife: "36 months", storageCondition: "Below 30°C",
      },
      {
        code: "PC-200", name: "Example Syrup", strength: "120mg/5ml",
        form: "Syrup", therapeuticArea: "Pediatric", buId: "bu-primary",
        pricePerUnit: "22", edaRegistration: "EDA/2023/8888",
        stockQty: "5000", reorderLevel: "1000", warehouse: "FG Warehouse-Cairo",
        description: "Pediatric syrup", manufacturer: "PharmaCo",
        shelfLife: "24 months", storageCondition: "15-25°C",
      },
    ];
    downloadCSV("products-template.csv", templateRows as unknown as Record<string, unknown>[]);
  }

  /* ─── API CSV upload ─── */
  function handleAPIFileUpload(file: File) {
    setApiFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const allErrors: ValidationError[] = [];
      rows.forEach((row, i) => {
        allErrors.push(...validateAPIRow(row, i + 2));
      });
      setApiErrors(allErrors);
      setApiPreview(rows);
    };
    reader.readAsText(file);
  }

  function confirmAPIImport() {
    if (!apiPreview || apiErrors.length > 0) return;
    // Store APIs as products with form "Capsule" placeholder or keep raw — using store.add for each
    // Since APIs are raw materials, we loop add them. In a real scenario they'd go to a rawMaterials collection.
    apiPreview.forEach((row) => {
      store.add("products", {
        id: genId("api"),
        code: row.code,
        name: row.name,
        strength: row.grade || "N/A",
        form: "Capsule" as const,
        therapeuticArea: "API / Raw Material",
        buId: null,
        pricePerUnit: Number(row.unitCost),
        edaRegistration: row.casNumber || undefined,
        stockQty: Number(row.minOrderQty),
        reorderLevel: Math.round(Number(row.minOrderQty) * 0.5),
        warehouse: row.storageCondition || undefined,
      });
    });
    setApiPreview(null);
    setApiErrors([]);
    setApiFileName("");
  }

  function downloadAPITemplate() {
    const templateRows = [
      {
        code: "API-PARA-500", name: "Paracetamol API", casNumber: "103-90-2",
        grade: "USP", supplier: "Sun Pharmaceutical", unitCost: "380",
        storageCondition: "Below 30°C", minOrderQty: "500",
      },
      {
        code: "API-AMOX-250", name: "Amoxicillin Trihydrate", casNumber: "61336-70-7",
        grade: "EP", supplier: "Lonza AG", unitCost: "920",
        storageCondition: "15-25°C", minOrderQty: "400",
      },
    ];
    downloadCSV("api-upload-template.csv", templateRows as unknown as Record<string, unknown>[]);
  }

  /* ─── Table columns ─── */
  const columns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", sortable: true, render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "name", label: "Name", sortable: true, render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "strength", label: "Strength" },
    { key: "form", label: "Form", sortable: true, render: (v) => <Badge variant="secondary">{v as string}</Badge> },
    { key: "therapeuticArea", label: "Therapeutic Area", className: "text-muted-foreground" },
    {
      key: "buId", label: "BU",
      render: (v) => v ? <Badge variant="outline">{buMap[v as string] || (v as string)}</Badge> : <span className="text-muted-foreground">--</span>,
    },
    {
      key: "pricePerUnit", label: "Price", sortable: true, className: "text-right",
      render: (v) => <span className="font-medium">{fmt(v as number)}</span>,
    },
    {
      key: "stockQty", label: "Stock", sortable: true, className: "text-right",
      render: (_v, row) => {
        const p = row as unknown as typeof products[number];
        const isLow = p.stockQty <= p.reorderLevel;
        return (
          <div className={`font-medium ${isLow ? "text-red-600" : ""}`}>
            {p.stockQty.toLocaleString()}
            {isLow && <div className="text-[10px] text-red-500">below reorder</div>}
          </div>
        );
      },
    },
    {
      key: "edaRegistration", label: "EDA Reg",
      render: (v) => v ? <span className="font-mono text-xs">{v as string}</span> : <span className="text-muted-foreground">--</span>,
    },
    {
      key: "id", label: "Actions", className: "text-right",
      render: (_v, row) => {
        const p = row as unknown as typeof products[number];
        return (
          <EditDeleteMenu
            onEdit={() => handleEdit(p)}
            onDelete={() => handleDelete(p)}
            itemLabel={p.name}
            compact
          />
        );
      },
    },
  ];

  /* ─── File drop handlers ─── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const makeDropHandler = useCallback((handler: (file: File) => void) => {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handler(file);
      }
    };
  }, []);

  const makeInputHandler = useCallback((handler: (file: File) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handler(file);
      e.target.value = "";
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Products Management"
        description="Manage pharmaceutical product master data, upload templates, and track inventory"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts.toLocaleString()}
          subtitle={`${new Set(products.map((p) => p.therapeuticArea)).size} therapeutic areas`}
          icon={<Package className="h-5 w-5" />}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          title="By Form (Top 3)"
          value={stats.topForms.map(([f, c]) => `${f}: ${c}`).join(", ") || "N/A"}
          subtitle="Most common dosage forms"
          icon={<Pill className="h-5 w-5" />}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStock.toLocaleString()}
          subtitle="Products at/below reorder level"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-700"
        />
        <StatsCard
          title="Total Inventory Value"
          value={fmt(stats.totalValue)}
          subtitle="Stock quantity x price"
          icon={<DollarSign className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" /> Products List
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Template
          </TabsTrigger>
          <TabsTrigger value="api-upload" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> API Upload Template
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Products List ── */}
        <TabsContent value="products" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by name, code, or therapeutic area..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              {
                key: "form", label: "Form", type: "select",
                options: FORM_OPTIONS.map((f) => ({ label: f, value: f })),
              },
              {
                key: "buId", label: "Business Unit", type: "select",
                options: buOptions,
              },
            ]}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={columns}
                data={filteredProducts as unknown as Record<string, unknown>[]}
                onRowClick={(row) => { setDetailProduct(row as unknown as typeof products[number]); setDetailTab("overview"); }}
                exportable
                exportFilename="products-list.csv"
                emptyMessage="No products match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Upload Template ── */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - Template Info & Download */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" /> Product Template
                </CardTitle>
                <CardDescription>
                  Download the CSV template, fill in your product data, then upload it to bulk-import products.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={downloadProductTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Download Template (.csv)
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Expected columns:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border px-2 py-1 text-left">Column</th>
                          <th className="border px-2 py-1 text-left">Required</th>
                          <th className="border px-2 py-1 text-left">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["code", "Yes", "CV-001"],
                          ["name", "Yes", "Cardioprex"],
                          ["strength", "Yes", "500mg"],
                          ["form", "Yes", "Tablet"],
                          ["therapeuticArea", "No", "Hypertension"],
                          ["buId", "No", "bu-cardio"],
                          ["pricePerUnit", "Yes", "48"],
                          ["edaRegistration", "No", "EDA/2024/1001"],
                          ["stockQty", "Yes", "12000"],
                          ["reorderLevel", "Yes", "3000"],
                          ["warehouse", "No", "FG Warehouse-Cairo"],
                          ["description", "No", "Cardiovascular tablet"],
                          ["manufacturer", "No", "PharmaCo"],
                          ["shelfLife", "No", "36 months"],
                          ["storageCondition", "No", "Below 30°C"],
                        ].map(([col, req, ex]) => (
                          <tr key={col}>
                            <td className="border px-2 py-1 font-mono">{col}</td>
                            <td className="border px-2 py-1">{req}</td>
                            <td className="border px-2 py-1 text-muted-foreground">{ex}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs">
                    Valid form types: {FORM_OPTIONS.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right - Upload area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload Products CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={makeDropHandler(handleProductFileUpload)}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("product-csv-input")?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">Drag & drop a CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  {productFileName && (
                    <p className="text-xs text-primary mt-2 font-medium">Loaded: {productFileName}</p>
                  )}
                  <input
                    id="product-csv-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={makeInputHandler(handleProductFileUpload)}
                  />
                </div>

                {productErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-red-700">Validation Errors ({productErrors.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {productErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">
                          Row {err.row}, {err.field}: {err.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {productPreview && productPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Preview ({productPreview.length} rows)
                      {productErrors.length === 0 && (
                        <Badge className="ml-2 bg-emerald-100 text-emerald-700">Valid</Badge>
                      )}
                    </p>
                    <div className="overflow-x-auto max-h-48 border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {Object.keys(productPreview[0]).map((h) => (
                              <th key={h} className="border px-2 py-1 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {productPreview.slice(0, 10).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="border px-2 py-1">{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {productPreview.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          ... and {productPreview.length - 10} more rows
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmProductImport}
                        disabled={productErrors.length > 0}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Import {productPreview.length} Products
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setProductPreview(null); setProductErrors([]); setProductFileName(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 3: API Upload Template ── */}
        <TabsContent value="api-upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - API Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" /> API (Active Pharmaceutical Ingredient) Template
                </CardTitle>
                <CardDescription>
                  Upload Active Pharmaceutical Ingredients data. APIs are stored as raw materials in inventory, not as finished products.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={downloadAPITemplate}>
                  <Download className="h-4 w-4 mr-2" /> Download API Template (.csv)
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Expected columns:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border px-2 py-1 text-left">Column</th>
                          <th className="border px-2 py-1 text-left">Required</th>
                          <th className="border px-2 py-1 text-left">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["code", "Yes", "API-PARA-500"],
                          ["name", "Yes", "Paracetamol API"],
                          ["casNumber", "No", "103-90-2"],
                          ["grade", "No", "USP"],
                          ["supplier", "No", "Sun Pharmaceutical"],
                          ["unitCost", "Yes", "380"],
                          ["storageCondition", "No", "Below 30°C"],
                          ["minOrderQty", "Yes", "500"],
                        ].map(([col, req, ex]) => (
                          <tr key={col}>
                            <td className="border px-2 py-1 font-mono">{col}</td>
                            <td className="border px-2 py-1">{req}</td>
                            <td className="border px-2 py-1 text-muted-foreground">{ex}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs">
                    Valid grades: {API_GRADES.join(", ")}
                  </p>
                  <p className="mt-1 text-xs">
                    Valid storage conditions: {STORAGE_CONDITIONS.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right - API Upload area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload API CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={makeDropHandler(handleAPIFileUpload)}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("api-csv-input")?.click()}
                >
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">Drag & drop an API CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  {apiFileName && (
                    <p className="text-xs text-primary mt-2 font-medium">Loaded: {apiFileName}</p>
                  )}
                  <input
                    id="api-csv-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={makeInputHandler(handleAPIFileUpload)}
                  />
                </div>

                {apiErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-red-700">Validation Errors ({apiErrors.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {apiErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">
                          Row {err.row}, {err.field}: {err.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {apiPreview && apiPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Preview ({apiPreview.length} rows)
                      {apiErrors.length === 0 && (
                        <Badge className="ml-2 bg-emerald-100 text-emerald-700">Valid</Badge>
                      )}
                    </p>
                    <div className="overflow-x-auto max-h-48 border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {Object.keys(apiPreview[0]).map((h) => (
                              <th key={h} className="border px-2 py-1 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {apiPreview.slice(0, 10).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="border px-2 py-1">{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {apiPreview.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          ... and {apiPreview.length - 10} more rows
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmAPIImport}
                        disabled={apiErrors.length > 0}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Import {apiPreview.length} APIs
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setApiPreview(null); setApiErrors([]); setApiFileName(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CRUD Modal ── */}
      <EntityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingProduct ? `Edit ${editingProduct.name}` : "Add Product"}
        fields={productFields}
        initialData={
          editingProduct
            ? {
                code: editingProduct.code,
                name: editingProduct.name,
                strength: editingProduct.strength,
                form: editingProduct.form,
                therapeuticArea: editingProduct.therapeuticArea,
                buId: editingProduct.buId || "",
                pricePerUnit: editingProduct.pricePerUnit,
                edaRegistration: editingProduct.edaRegistration || "",
                stockQty: editingProduct.stockQty,
                reorderLevel: editingProduct.reorderLevel,
                warehouse: editingProduct.warehouse || "",
                description: editingProduct.description || "",
                manufacturer: editingProduct.manufacturer || "",
                shelfLife: editingProduct.shelfLife || "",
                storageCondition: editingProduct.storageCondition || "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitLabel={editingProduct ? "Save" : "Create"}
        size="xl"
      />
    </div>
  );
}

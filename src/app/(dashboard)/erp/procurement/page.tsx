"use client";

import { useState } from "react";
import { Package, Truck, ClipboardCheck, Plus, ShieldCheck, AlertTriangle, FileText, Eye, Star, CheckCircle } from "lucide-react";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { useDataStore } from "@/lib/data-store";

const INITIAL_PURCHASE_ORDERS = [
  { id: "PO-4001", supplier: "Aurobindo Pharma (API)", category: "Raw Material", items: "Amoxicillin Trihydrate (API)", qty: "500 kg", unitPrice: "$85/kg", total: "$42,500", orderDate: "2026-03-10", expectedDate: "2026-04-15", status: "Approved" },
  { id: "PO-4002", supplier: "BASF Pharma Solutions", category: "Excipient", items: "Microcrystalline Cellulose PH-102", qty: "2,000 kg", unitPrice: "$12/kg", total: "$24,000", orderDate: "2026-03-12", expectedDate: "2026-04-10", status: "Received" },
  { id: "PO-4003", supplier: "Lonza Group", category: "Raw Material", items: "Omeprazole Pellets", qty: "300 kg", unitPrice: "$220/kg", total: "$66,000", orderDate: "2026-03-15", expectedDate: "2026-04-20", status: "Pending QC" },
  { id: "PO-4004", supplier: "Colorcon Inc", category: "Excipient", items: "Opadry II Film Coating (White)", qty: "800 kg", unitPrice: "$45/kg", total: "$36,000", orderDate: "2026-03-18", expectedDate: "2026-04-08", status: "In Transit" },
  { id: "PO-4005", supplier: "West Pharma Packaging", category: "Packaging", items: "Alu-Alu Blister Foil (250mm)", qty: "50,000 m", unitPrice: "$0.15/m", total: "$7,500", orderDate: "2026-03-20", expectedDate: "2026-04-05", status: "Ordered" },
  { id: "PO-4006", supplier: "Cipla Ltd (Finished)", category: "Finished Product", items: "Atorvastatin 20mg Tab (1000s)", qty: "200 units", unitPrice: "$180/unit", total: "$36,000", orderDate: "2026-03-22", expectedDate: "2026-04-12", status: "Approved" },
  { id: "PO-4007", supplier: "Roquette Pharma", category: "Excipient", items: "Lactose Monohydrate (200M)", qty: "3,000 kg", unitPrice: "$8/kg", total: "$24,000", orderDate: "2026-03-25", expectedDate: "2026-04-18", status: "Pending Approval" },
  { id: "PO-4008", supplier: "Dr. Reddy's (API)", category: "Raw Material", items: "Losartan Potassium (API)", qty: "200 kg", unitPrice: "$150/kg", total: "$30,000", orderDate: "2026-03-28", expectedDate: "2026-04-22", status: "Pending Approval" },
  { id: "PO-4009", supplier: "Novartis (Finished)", category: "Finished Product", items: "Diovan 160mg Tab (500s)", qty: "150 units", unitPrice: "$420/unit", total: "$63,000", orderDate: "2026-03-30", expectedDate: "2026-04-25", status: "Ordered" },
  { id: "PO-4010", supplier: "SGD Pharma", category: "Packaging", items: "Amber Glass Bottles 100ml", qty: "10,000 pcs", unitPrice: "$0.65/pc", total: "$6,500", orderDate: "2026-04-01", expectedDate: "2026-04-20", status: "Approved" },
];

const INITIAL_SUPPLIERS = [
  { id: "SUP-01", name: "Aurobindo Pharma", type: "API Manufacturer", country: "India", contact: "Ravi Krishnan", email: "ravi@aurobindo.com", gmpStatus: "EU-GMP Certified", rating: 4.8, orders: 32, status: "Approved" },
  { id: "SUP-02", name: "BASF Pharma Solutions", type: "Excipient Supplier", country: "Germany", contact: "Hans Mueller", email: "hans@basf.com", gmpStatus: "EU-GMP Certified", rating: 4.9, orders: 28, status: "Approved" },
  { id: "SUP-03", name: "Lonza Group", type: "API Manufacturer", country: "Switzerland", contact: "Pierre Dubois", email: "pierre@lonza.com", gmpStatus: "FDA Approved", rating: 4.7, orders: 15, status: "Approved" },
  { id: "SUP-04", name: "Colorcon Inc", type: "Excipient Supplier", country: "USA", contact: "James Wilson", email: "james@colorcon.com", gmpStatus: "FDA Approved", rating: 4.6, orders: 22, status: "Approved" },
  { id: "SUP-05", name: "West Pharma Packaging", type: "Packaging Supplier", country: "USA", contact: "Sarah Johnson", email: "sarah@westpharma.com", gmpStatus: "ISO 15378", rating: 4.5, orders: 18, status: "Approved" },
  { id: "SUP-06", name: "Cipla Ltd", type: "Finished Product", country: "India", contact: "Amit Patel", email: "amit@cipla.com", gmpStatus: "WHO-GMP", rating: 4.7, orders: 45, status: "Approved" },
  { id: "SUP-07", name: "Roquette Pharma", type: "Excipient Supplier", country: "France", contact: "Marie Laurent", email: "marie@roquette.com", gmpStatus: "EU-GMP Certified", rating: 4.4, orders: 12, status: "Approved" },
  { id: "SUP-08", name: "Dr. Reddy's Labs", type: "API Manufacturer", country: "India", contact: "Priya Sharma", email: "priya@drreddys.com", gmpStatus: "FDA Approved", rating: 4.6, orders: 20, status: "Under Review" },
  { id: "SUP-09", name: "Novartis AG", type: "Finished Product", country: "Switzerland", contact: "Anna Schmidt", email: "anna@novartis.com", gmpStatus: "EU-GMP Certified", rating: 4.9, orders: 38, status: "Approved" },
  { id: "SUP-10", name: "SGD Pharma", type: "Packaging Supplier", country: "France", contact: "Claude Martin", email: "claude@sgd.com", gmpStatus: "ISO 15378", rating: 4.3, orders: 8, status: "Approved" },
];

const INITIAL_GRN = [
  { id: "GRN-601", po: "PO-4002", supplier: "BASF Pharma Solutions", material: "Microcrystalline Cellulose PH-102", qty: "2,000 kg", receivedDate: "2026-04-08", batchNo: "MCC-2026-0412", coa: true, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "2028-04-08", status: "Released" },
  { id: "GRN-602", po: "PO-4003", supplier: "Lonza Group", material: "Omeprazole Pellets", qty: "300 kg", receivedDate: "2026-04-18", batchNo: "OMP-2026-0318", coa: true, qcStatus: "Under Testing", storageCondition: "2-8°C", expiryDate: "2027-10-18", status: "Quarantine" },
  { id: "GRN-603", po: "PO-4004", supplier: "Colorcon Inc", material: "Opadry II Film Coating", qty: "800 kg", receivedDate: "2026-04-06", batchNo: "OPD-2026-0215", coa: true, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "2029-02-15", status: "Released" },
  { id: "GRN-604", po: "PO-4001", supplier: "Aurobindo Pharma", material: "Amoxicillin Trihydrate (API)", qty: "500 kg", receivedDate: "2026-04-14", batchNo: "AMX-2026-0110", coa: true, qcStatus: "Under Testing", storageCondition: "Room Temp", expiryDate: "2028-01-10", status: "Quarantine" },
  { id: "GRN-605", po: "PO-4005", supplier: "West Pharma Packaging", material: "Alu-Alu Blister Foil", qty: "50,000 m", receivedDate: "2026-04-04", batchNo: "BLF-2026-0301", coa: false, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "N/A", status: "Released" },
  { id: "GRN-606", po: "PO-4006", supplier: "Cipla Ltd", material: "Atorvastatin 20mg Tab", qty: "200 units", receivedDate: "2026-04-11", batchNo: "ATV-2026-0220", coa: true, qcStatus: "Failed", storageCondition: "Below 25°C", expiryDate: "2028-02-20", status: "Rejected" },
];

const INITIAL_QC_TESTS = [
  { id: "QC-801", grn: "GRN-601", material: "Microcrystalline Cellulose PH-102", test: "Identity (IR)", specification: "Matches reference", result: "Conforms", status: "Pass" },
  { id: "QC-802", grn: "GRN-601", material: "Microcrystalline Cellulose PH-102", test: "Loss on Drying", specification: "≤ 5.0%", result: "3.2%", status: "Pass" },
  { id: "QC-803", grn: "GRN-601", material: "Microcrystalline Cellulose PH-102", test: "Particle Size (d50)", specification: "90-150 μm", result: "118 μm", status: "Pass" },
  { id: "QC-804", grn: "GRN-602", material: "Omeprazole Pellets", test: "Assay (HPLC)", specification: "98.0-102.0%", result: "Pending", status: "In Progress" },
  { id: "QC-805", grn: "GRN-602", material: "Omeprazole Pellets", test: "Dissolution", specification: "≥ 75% in 30 min", result: "Pending", status: "In Progress" },
  { id: "QC-806", grn: "GRN-604", material: "Amoxicillin Trihydrate", test: "Assay (HPLC)", specification: "95.0-102.0%", result: "Pending", status: "In Progress" },
  { id: "QC-807", grn: "GRN-604", material: "Amoxicillin Trihydrate", test: "Heavy Metals", specification: "≤ 20 ppm", result: "Pending", status: "In Progress" },
  { id: "QC-808", grn: "GRN-606", material: "Atorvastatin 20mg Tab", test: "Assay (HPLC)", specification: "95.0-105.0%", result: "92.1%", status: "Fail" },
  { id: "QC-809", grn: "GRN-606", material: "Atorvastatin 20mg Tab", test: "Content Uniformity", specification: "AV ≤ 15.0", result: "18.4", status: "Fail" },
  { id: "QC-810", grn: "GRN-603", material: "Opadry II Film Coating", test: "Viscosity", specification: "80-120 cP", result: "98 cP", status: "Pass" },
];

/* poFields is built inside the component to access store.products */

const supplierFields: EntityField[] = [
  { name: "name", label: "Company Name", type: "text", required: true },
  { name: "type", label: "Supplier Type", type: "select", required: true, options: [{ value: "API Manufacturer", label: "API Manufacturer" }, { value: "Excipient Supplier", label: "Excipient Supplier" }, { value: "Packaging Supplier", label: "Packaging Supplier" }, { value: "Finished Product", label: "Finished Product Supplier" }] },
  { name: "country", label: "Country", type: "text", required: true },
  { name: "contact", label: "Contact Person", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "gmpStatus", label: "GMP Certification", type: "select", required: true, options: [{ value: "EU-GMP Certified", label: "EU-GMP Certified" }, { value: "FDA Approved", label: "FDA Approved" }, { value: "WHO-GMP", label: "WHO-GMP" }, { value: "ISO 15378", label: "ISO 15378" }, { value: "Pending", label: "Pending Audit" }] },
];

type PurchaseOrder = typeof INITIAL_PURCHASE_ORDERS[number];
type Supplier = typeof INITIAL_SUPPLIERS[number];
type GRNRecord = typeof INITIAL_GRN[number];

export default function ProcurementPage() {
  const store = useDataStore();
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [grn] = useState<GRNRecord[]>(INITIAL_GRN);
  const [qcTests] = useState(INITIAL_QC_TESTS);

  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailGRN, setDetailGRN] = useState<GRNRecord | null>(null);

  // Filter state for PO tab
  const [poSearch, setPOSearch] = useState("");
  const [poFilters, setPOFilters] = useState<FilterState>({});
  // Filter state for Supplier tab
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierFilters, setSupplierFilters] = useState<FilterState>({});

  // Computed stats
  const activePOCount = purchaseOrders.length;
  const inTransitCount = purchaseOrders.filter(po => po.status === "In Transit").length;
  const pendingQCCount = purchaseOrders.filter(po => po.status === "Pending QC").length;
  const approvedSupplierCount = suppliers.filter(s => s.status === "Approved").length;

  // Filtered data
  const filteredPOs = purchaseOrders.filter(po => {
    const q = poSearch.toLowerCase();
    if (q && !po.id.toLowerCase().includes(q) && !po.supplier.toLowerCase().includes(q) && !po.items.toLowerCase().includes(q)) return false;
    if (poFilters.status && po.status !== poFilters.status) return false;
    return true;
  });

  const filteredSuppliers = suppliers.filter(s => {
    const q = supplierSearch.toLowerCase();
    if (q && !s.id.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q) && !s.contact.toLowerCase().includes(q)) return false;
    if (supplierFilters.type && s.type !== supplierFilters.type) return false;
    return true;
  });

  const productCatalogOptions = store.products.map((p) => ({
    value: p.id,
    label: `${p.name} ${p.strength} (${p.code})`,
  }));

  const poFields: EntityField[] = [
    { name: "supplier", label: "Supplier", type: "select", required: true, options: suppliers.filter(s => s.status === "Approved").map(s => ({ value: s.name, label: `${s.name} (${s.type})` })) },
    { name: "category", label: "Category", type: "select", required: true, options: [{ value: "Raw Material", label: "Raw Material (API)" }, { value: "Excipient", label: "Excipient" }, { value: "Packaging", label: "Packaging Material" }, { value: "Finished Product", label: "Finished Product" }] },
    { name: "productId", label: "Product (from catalog)", type: "select", options: productCatalogOptions, helperText: "Optionally pick from the product catalog" },
    { name: "items", label: "Material / Product", type: "text", required: true, helperText: "Auto-filled if product selected, or enter manually" },
    { name: "qty", label: "Quantity", type: "text", required: true },
    { name: "unitPrice", label: "Unit Price", type: "text", required: true },
    { name: "total", label: "Total Amount ($)", type: "number", required: true },
    { name: "expectedDate", label: "Expected Delivery", type: "date", required: true },
    { name: "notes", label: "Special Requirements", type: "textarea" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmaceutical Procurement"
        description="Manage purchase orders for APIs, excipients, packaging materials, and finished products"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSupplierModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Supplier
            </Button>
            <Button onClick={() => setShowPOModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Purchase Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} title="Active POs" value={String(activePOCount)} subtitle={`${purchaseOrders.filter(p => p.category === "Raw Material").length} raw materials, ${purchaseOrders.filter(p => p.category === "Excipient").length} excipients`} iconColor="text-blue-600" trend={{ value: 15, label: "vs last month" }} />
        <StatsCard icon={Truck} title="In Transit" value={String(inTransitCount)} subtitle="Expected this week" iconColor="text-amber-600" />
        <StatsCard icon={ClipboardCheck} title="Pending QC" value={String(pendingQCCount)} subtitle="Awaiting quality check" iconColor="text-purple-600" />
        <StatsCard icon={ShieldCheck} title="Approved Suppliers" value={String(approvedSupplierCount)} subtitle="All GMP certified" iconColor="text-green-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="grn">Goods Received</TabsTrigger>
          <TabsTrigger value="qc">Quality Control</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by PO #, supplier, or material..."
            searchValue={poSearch}
            onSearchChange={setPOSearch}
            fields={[
              { key: "status", label: "Status", type: "select" as const, options: [
                { value: "Pending Approval", label: "Pending Approval" },
                { value: "Approved", label: "Approved" },
                { value: "Ordered", label: "Ordered" },
                { value: "In Transit", label: "In Transit" },
                { value: "Received", label: "Received" },
                { value: "Pending QC", label: "Pending QC" },
              ]},
            ]}
            values={poFilters}
            onChange={(key, value) => setPOFilters(prev => ({ ...prev, [key]: value }))}
          />
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Active pharmaceutical procurement orders for raw materials, excipients, packaging, and finished products</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "PO #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "supplier", label: "Supplier", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "category", label: "Category", render: (v: string) => (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      v === "Raw Material" ? "bg-red-100 text-red-700" :
                      v === "Excipient" ? "bg-blue-100 text-blue-700" :
                      v === "Packaging" ? "bg-gray-100 text-gray-700" :
                      "bg-green-100 text-green-700"
                    }`}>{v}</span>
                  ) },
                  { key: "items", label: "Material / Product" },
                  { key: "qty", label: "Quantity" },
                  { key: "total", label: "Total", render: (v: string) => <span className="font-semibold">{v}</span> },
                  { key: "expectedDate", label: "Expected" },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "", className: "text-right w-10", render: (_v: unknown, row: Record<string, unknown>) => {
                    const po = row as unknown as PurchaseOrder;
                    return (
                      <EditDeleteMenu
                        onView={() => setDetailPO(po)}
                        onEdit={() => { setEditingPO(po); setShowPOModal(true); }}
                        onDelete={() => setPurchaseOrders(prev => prev.filter(p => p.id !== po.id))}
                        canView
                        itemLabel={po.id}
                        compact
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredPOs as unknown as Record<string, unknown>[]}
                
                emptyMessage="No purchase orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by ID, name, or contact..."
            searchValue={supplierSearch}
            onSearchChange={setSupplierSearch}
            fields={[
              { key: "type", label: "Type", type: "select" as const, options: [
                { value: "API Manufacturer", label: "API Manufacturer" },
                { value: "Excipient Supplier", label: "Excipient Supplier" },
                { value: "Packaging Supplier", label: "Packaging Supplier" },
                { value: "Finished Product", label: "Finished Product" },
              ]},
            ]}
            values={supplierFilters}
            onChange={(key, value) => setSupplierFilters(prev => ({ ...prev, [key]: value }))}
          />
          <Card>
            <CardHeader>
              <CardTitle>Pharmaceutical Suppliers</CardTitle>
              <CardDescription>GMP-certified suppliers for APIs, excipients, packaging, and finished products</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Supplier", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      v === "API Manufacturer" ? "bg-red-100 text-red-700" :
                      v === "Excipient Supplier" ? "bg-blue-100 text-blue-700" :
                      v === "Packaging Supplier" ? "bg-gray-100 text-gray-700" :
                      "bg-green-100 text-green-700"
                    }`}>{v}</span>
                  ) },
                  { key: "country", label: "Country" },
                  { key: "contact", label: "Contact", render: (_: unknown, row: Record<string, unknown>) => (
                    <div>
                      <div>{row.contact as string}</div>
                      <div className="text-xs text-muted-foreground">{row.email as string}</div>
                    </div>
                  ) },
                  { key: "gmpStatus", label: "GMP Status", render: (v: string) => (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      <ShieldCheck className="h-3 w-3 inline mr-1" />{v}
                    </span>
                  ) },
                  { key: "rating", label: "Rating", render: (v: number) => (
                    <><span className="font-medium">{v}</span><span className="text-amber-500 ml-1">&#9733;</span></>
                  ) },
                  { key: "orders", label: "Orders" },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "", className: "text-right w-10", render: (_v: unknown, row: Record<string, unknown>) => {
                    const s = row as unknown as Supplier;
                    return (
                      <EditDeleteMenu
                        onView={() => setDetailSupplier(s)}
                        onEdit={() => { setEditingSupplier(s); setShowSupplierModal(true); }}
                        onDelete={() => setSuppliers(prev => prev.filter(sup => sup.id !== s.id))}
                        canView
                        itemLabel={s.name}
                        compact
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredSuppliers as unknown as Record<string, unknown>[]}
                
                emptyMessage="No suppliers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goods Received Notes (GRN)</CardTitle>
              <CardDescription>Incoming material receipts with batch tracking, CoA verification, and storage conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "GRN #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "po", label: "PO Ref", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "material", label: "Material", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "qty", label: "Qty" },
                  { key: "batchNo", label: "Batch No.", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "coa", label: "CoA", render: (v: boolean) => v ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"><FileText className="h-3 w-3 inline mr-1" />Received</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">N/A</span>
                  ) },
                  { key: "storageCondition", label: "Storage", render: (v: string) => (
                    <span className={`text-xs ${v === "2-8°C" ? "text-blue-600 font-medium" : ""}`}>{v}</span>
                  ) },
                  { key: "expiryDate", label: "Expiry" },
                  { key: "qcStatus", label: "QC", render: (v: string) => (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v === "Passed" ? "bg-green-100 text-green-700" :
                      v === "Under Testing" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>{v}</span>
                  ) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "", className: "text-right w-10", render: (_v: unknown, row: Record<string, unknown>) => {
                    const g = row as unknown as GRNRecord;
                    return (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailGRN(g)} title="View Details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={grn as unknown as Record<string, unknown>[]}
                
                emptyMessage="No goods received notes found."
              />

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Released to Production</div>
                    <div className="text-2xl font-bold text-green-600">3</div>
                    <div className="text-xs text-muted-foreground">QC passed & released</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">In Quarantine</div>
                    <div className="text-2xl font-bold text-amber-600">2</div>
                    <div className="text-xs text-muted-foreground">Awaiting QC results</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Rejected</div>
                    <div className="text-2xl font-bold text-red-600">1</div>
                    <div className="text-xs text-muted-foreground">Failed QC testing</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Testing</CardTitle>
              <CardDescription>Incoming material QC test results against pharmacopoeial specifications</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Test ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "grn", label: "GRN Ref", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "material", label: "Material", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "test", label: "Test" },
                  { key: "specification", label: "Specification", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "result", label: "Result", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v === "Pass" ? "bg-green-100 text-green-700" :
                      v === "In Progress" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {v === "Fail" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {v}
                    </span>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={qcTests as unknown as Record<string, unknown>[]}
                
                emptyMessage="No QC tests found."
              />

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">QC Summary by Material</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { material: "Microcrystalline Cellulose PH-102", tests: 3, passed: 3, failed: 0, pending: 0 },
                        { material: "Omeprazole Pellets", tests: 2, passed: 0, failed: 0, pending: 2 },
                        { material: "Amoxicillin Trihydrate (API)", tests: 2, passed: 0, failed: 0, pending: 2 },
                        { material: "Atorvastatin 20mg Tab", tests: 2, passed: 0, failed: 2, pending: 0 },
                        { material: "Opadry II Film Coating", tests: 1, passed: 1, failed: 0, pending: 0 },
                      ].map((item) => (
                        <div key={item.material} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <div className="font-medium text-sm">{item.material}</div>
                            <div className="text-xs text-muted-foreground">{item.tests} tests</div>
                          </div>
                          <div className="flex gap-2">
                            {item.passed > 0 && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{item.passed} Passed</span>}
                            {item.pending > 0 && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{item.pending} Pending</span>}
                            {item.failed > 0 && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{item.failed} Failed</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showPOModal}
        onOpenChange={(open) => { setShowPOModal(open); if (!open) setEditingPO(null); }}
        title={editingPO ? `Edit ${editingPO.id}` : "New Purchase Order"}
        fields={poFields}
        initialData={editingPO ? {
          supplier: editingPO.supplier,
          category: editingPO.category,
          items: editingPO.items,
          qty: editingPO.qty,
          unitPrice: editingPO.unitPrice,
          total: editingPO.total,
          expectedDate: editingPO.expectedDate,
        } : undefined}
        onSubmit={(data) => {
          if (editingPO) {
            setPurchaseOrders(prev => prev.map(po => po.id === editingPO.id ? {
              ...po,
              supplier: String(data.supplier ?? po.supplier),
              category: String(data.category ?? po.category),
              items: String(data.items ?? po.items),
              qty: String(data.qty ?? po.qty),
              unitPrice: String(data.unitPrice ?? po.unitPrice),
              total: String(data.total ? `$${Number(data.total).toLocaleString()}` : po.total),
              expectedDate: String(data.expectedDate ?? po.expectedDate),
            } : po));
            setEditingPO(null);
          } else {
            const newPO: PurchaseOrder = {
              id: `PO-${Date.now().toString(36)}`,
              supplier: String(data.supplier ?? ""),
              category: String(data.category ?? ""),
              items: String(data.items ?? ""),
              qty: String(data.qty ?? ""),
              unitPrice: String(data.unitPrice ?? ""),
              total: data.total ? `$${Number(data.total).toLocaleString()}` : "$0",
              orderDate: new Date().toISOString().split("T")[0],
              expectedDate: String(data.expectedDate ?? ""),
              status: "Pending Approval",
            };
            setPurchaseOrders(prev => [...prev, newPO]);
          }
          setShowPOModal(false);
        }}
      />
      <EntityFormModal
        open={showSupplierModal}
        onOpenChange={(open) => { setShowSupplierModal(open); if (!open) setEditingSupplier(null); }}
        title={editingSupplier ? `Edit ${editingSupplier.name}` : "Add Pharmaceutical Supplier"}
        fields={supplierFields}
        initialData={editingSupplier ? {
          name: editingSupplier.name,
          type: editingSupplier.type,
          country: editingSupplier.country,
          contact: editingSupplier.contact,
          email: editingSupplier.email,
          gmpStatus: editingSupplier.gmpStatus,
        } : undefined}
        onSubmit={(data) => {
          if (editingSupplier) {
            setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? {
              ...s,
              name: String(data.name ?? s.name),
              type: String(data.type ?? s.type),
              country: String(data.country ?? s.country),
              contact: String(data.contact ?? s.contact),
              email: String(data.email ?? s.email),
              gmpStatus: String(data.gmpStatus ?? s.gmpStatus),
            } : s));
            setEditingSupplier(null);
          } else {
            const newSupplier: Supplier = {
              id: `SUP-${Date.now().toString(36)}`,
              name: String(data.name ?? ""),
              type: String(data.type ?? ""),
              country: String(data.country ?? ""),
              contact: String(data.contact ?? ""),
              email: String(data.email ?? ""),
              gmpStatus: String(data.gmpStatus ?? ""),
              rating: 0,
              orders: 0,
              status: "Under Review",
            };
            setSuppliers(prev => [...prev, newSupplier]);
          }
          setShowSupplierModal(false);
        }}
      />

      {/* ── Purchase Order Detail Dialog ── */}
      <Dialog open={!!detailPO} onOpenChange={(open) => { if (!open) setDetailPO(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order {detailPO?.id}</DialogTitle>
          </DialogHeader>
          {detailPO && (() => {
            const relatedGRNs = grn.filter((g) => g.po === detailPO.id);
            const statusSteps = ["Pending Approval", "Approved", "Ordered", "In Transit", "Received", "Pending QC"];
            const currentIdx = statusSteps.indexOf(detailPO.status);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Supplier</span><p className="font-medium">{detailPO.supplier}</p></div>
                  <div><span className="text-sm text-muted-foreground">Category</span><p className="font-medium">{detailPO.category}</p></div>
                  <div><span className="text-sm text-muted-foreground">Material / Product</span><p className="font-medium">{detailPO.items}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailPO.qty}</p></div>
                  <div><span className="text-sm text-muted-foreground">Unit Price</span><p className="font-medium">{detailPO.unitPrice}</p></div>
                  <div><span className="text-sm text-muted-foreground">Total</span><p className="font-medium text-lg">{detailPO.total}</p></div>
                  <div><span className="text-sm text-muted-foreground">Order Date</span><p className="font-medium">{detailPO.orderDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Expected Delivery</span><p className="font-medium">{detailPO.expectedDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailPO.status} /></p></div>
                </div>
                {/* Status Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Status Flow</h4>
                  <div className="flex items-center gap-1">
                    {statusSteps.map((step, i) => {
                      const isActive = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-1 flex-1">
                          <div className={`flex flex-col items-center flex-1`}>
                            <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isActive ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step}</span>
                          </div>
                          {i < statusSteps.length - 1 && (
                            <div className={`h-0.5 flex-1 -mt-4 ${isActive ? "bg-primary/60" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Related GRNs */}
                {relatedGRNs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Related GRN Records ({relatedGRNs.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {relatedGRNs.map((g) => (
                        <div key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-mono text-xs font-medium">{g.id}</span>
                            <span className="text-muted-foreground ml-2">{g.material}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">{g.receivedDate}</span>
                            <StatusBadge status={g.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Supplier Detail Dialog ── */}
      <Dialog open={!!detailSupplier} onOpenChange={(open) => { if (!open) setDetailSupplier(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailSupplier?.name}</DialogTitle>
          </DialogHeader>
          {detailSupplier && (() => {
            const supplierPOs = purchaseOrders.filter((po) => po.supplier.includes(detailSupplier.name));
            const fullStars = Math.floor(detailSupplier.rating);
            const hasHalf = detailSupplier.rating - fullStars >= 0.5;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Supplier ID</span><p className="font-medium font-mono">{detailSupplier.id}</p></div>
                  <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{detailSupplier.type}</p></div>
                  <div><span className="text-sm text-muted-foreground">Country</span><p className="font-medium">{detailSupplier.country}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailSupplier.status} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Contact Person</span><p className="font-medium">{detailSupplier.contact}</p></div>
                  <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailSupplier.email}</p></div>
                  <div><span className="text-sm text-muted-foreground">GMP Status</span><p className="font-medium"><Badge variant="secondary"><ShieldCheck className="h-3 w-3 inline mr-1" />{detailSupplier.gmpStatus}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Total Orders</span><p className="font-medium">{detailSupplier.orders}</p></div>
                </div>
                {/* Rating with stars */}
                <div>
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < fullStars ? "fill-amber-400 text-amber-400" : i === fullStars && hasHalf ? "fill-amber-400/50 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-2 font-semibold">{detailSupplier.rating}</span>
                  </div>
                </div>
                {/* Order History */}
                {supplierPOs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Recent Purchase Orders ({supplierPOs.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {supplierPOs.map((po) => (
                        <div key={po.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-mono text-xs font-medium">{po.id}</span>
                            <span className="text-muted-foreground ml-2">{po.items}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{po.total}</span>
                            <StatusBadge status={po.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── GRN Detail Dialog ── */}
      <Dialog open={!!detailGRN} onOpenChange={(open) => { if (!open) setDetailGRN(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Received Note {detailGRN?.id}</DialogTitle>
          </DialogHeader>
          {detailGRN && (() => {
            const relatedQC = qcTests.filter((q) => q.grn === detailGRN.id);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">GRN #</span><p className="font-medium font-mono">{detailGRN.id}</p></div>
                  <div><span className="text-sm text-muted-foreground">PO Reference</span><p className="font-medium font-mono">{detailGRN.po}</p></div>
                  <div><span className="text-sm text-muted-foreground">Supplier</span><p className="font-medium">{detailGRN.supplier}</p></div>
                  <div><span className="text-sm text-muted-foreground">Material</span><p className="font-medium">{detailGRN.material}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailGRN.qty}</p></div>
                  <div><span className="text-sm text-muted-foreground">Batch No.</span><p className="font-medium font-mono">{detailGRN.batchNo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Received Date</span><p className="font-medium">{detailGRN.receivedDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Expiry Date</span><p className="font-medium">{detailGRN.expiryDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Storage Condition</span><p className="font-medium">{detailGRN.storageCondition}</p></div>
                  <div><span className="text-sm text-muted-foreground">CoA</span><p className="font-medium">{detailGRN.coa ? "Received" : "N/A"}</p></div>
                  <div><span className="text-sm text-muted-foreground">QC Status</span><p><Badge variant={detailGRN.qcStatus === "Passed" ? "default" : detailGRN.qcStatus === "Failed" ? "destructive" : "secondary"}>{detailGRN.qcStatus}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailGRN.status} /></p></div>
                </div>
                {/* Related QC Tests */}
                {relatedQC.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">QC Test Results ({relatedQC.length})</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Test</th>
                            <th className="text-left px-3 py-2 font-medium">Specification</th>
                            <th className="text-left px-3 py-2 font-medium">Result</th>
                            <th className="text-left px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {relatedQC.map((q) => (
                            <tr key={q.id}>
                              <td className="px-3 py-2">{q.test}</td>
                              <td className="px-3 py-2 text-muted-foreground">{q.specification}</td>
                              <td className="px-3 py-2 font-medium">{q.result}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  q.status === "Pass" ? "bg-green-100 text-green-700" :
                                  q.status === "In Progress" ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{q.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {relatedQC.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No QC tests recorded for this GRN.</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

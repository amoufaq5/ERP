"use client";

import { useState } from "react";
import { Package, Truck, ClipboardCheck, Plus, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { useDataStore } from "@/lib/data-store";

const PURCHASE_ORDERS = [
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

const SUPPLIERS = [
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

const GRN = [
  { id: "GRN-601", po: "PO-4002", supplier: "BASF Pharma Solutions", material: "Microcrystalline Cellulose PH-102", qty: "2,000 kg", receivedDate: "2026-04-08", batchNo: "MCC-2026-0412", coa: true, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "2028-04-08", status: "Released" },
  { id: "GRN-602", po: "PO-4003", supplier: "Lonza Group", material: "Omeprazole Pellets", qty: "300 kg", receivedDate: "2026-04-18", batchNo: "OMP-2026-0318", coa: true, qcStatus: "Under Testing", storageCondition: "2-8°C", expiryDate: "2027-10-18", status: "Quarantine" },
  { id: "GRN-603", po: "PO-4004", supplier: "Colorcon Inc", material: "Opadry II Film Coating", qty: "800 kg", receivedDate: "2026-04-06", batchNo: "OPD-2026-0215", coa: true, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "2029-02-15", status: "Released" },
  { id: "GRN-604", po: "PO-4001", supplier: "Aurobindo Pharma", material: "Amoxicillin Trihydrate (API)", qty: "500 kg", receivedDate: "2026-04-14", batchNo: "AMX-2026-0110", coa: true, qcStatus: "Under Testing", storageCondition: "Room Temp", expiryDate: "2028-01-10", status: "Quarantine" },
  { id: "GRN-605", po: "PO-4005", supplier: "West Pharma Packaging", material: "Alu-Alu Blister Foil", qty: "50,000 m", receivedDate: "2026-04-04", batchNo: "BLF-2026-0301", coa: false, qcStatus: "Passed", storageCondition: "Room Temp", expiryDate: "N/A", status: "Released" },
  { id: "GRN-606", po: "PO-4006", supplier: "Cipla Ltd", material: "Atorvastatin 20mg Tab", qty: "200 units", receivedDate: "2026-04-11", batchNo: "ATV-2026-0220", coa: true, qcStatus: "Failed", storageCondition: "Below 25°C", expiryDate: "2028-02-20", status: "Rejected" },
];

const QC_TESTS = [
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

export default function ProcurementPage() {
  const store = useDataStore();
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  const productCatalogOptions = store.products.map((p) => ({
    value: p.id,
    label: `${p.name} ${p.strength} (${p.code})`,
  }));

  const poFields: EntityField[] = [
    { name: "supplier", label: "Supplier", type: "select", required: true, options: SUPPLIERS.filter(s => s.status === "Approved").map(s => ({ value: s.name, label: `${s.name} (${s.type})` })) },
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
        <StatsCard icon={Package} title="Active POs" value="10" subtitle="4 raw materials, 3 excipients" iconColor="text-blue-600" trend={{ value: 15, label: "vs last month" }} />
        <StatsCard icon={Truck} title="In Transit" value="2" subtitle="Expected this week" iconColor="text-amber-600" />
        <StatsCard icon={ClipboardCheck} title="Pending QC" value="3" subtitle="2 APIs, 1 finished product" iconColor="text-purple-600" />
        <StatsCard icon={ShieldCheck} title="Approved Suppliers" value="9" subtitle="All GMP certified" iconColor="text-green-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="grn">Goods Received</TabsTrigger>
          <TabsTrigger value="qc">Quality Control</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
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
                ] as Column<Record<string, unknown>>[]}
                data={PURCHASE_ORDERS as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No purchase orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
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
                ] as Column<Record<string, unknown>>[]}
                data={SUPPLIERS as unknown as Record<string, unknown>[]}
                pagination={false}
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
                ] as Column<Record<string, unknown>>[]}
                data={GRN as unknown as Record<string, unknown>[]}
                pagination={false}
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
                data={QC_TESTS as unknown as Record<string, unknown>[]}
                pagination={false}
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
        onOpenChange={setShowPOModal}
        title="New Purchase Order"
        fields={poFields}
        onSubmit={() => setShowPOModal(false)}
      />
      <EntityFormModal
        open={showSupplierModal}
        onOpenChange={setShowSupplierModal}
        title="Add Pharmaceutical Supplier"
        fields={supplierFields}
        onSubmit={() => setShowSupplierModal(false)}
      />
    </div>
  );
}

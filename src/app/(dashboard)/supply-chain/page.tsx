"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, Truck, Factory, Search, Plus, Download, Filter,
  ShoppingCart, Clock, TrendingUp, BarChart3, CheckCircle2,
  AlertTriangle, ArrowUpDown, Warehouse, FileText, Globe,
  DollarSign, ShieldCheck, Layers, Box, MapPin, RefreshCw,
  Eye, Calendar, Users, Anchor, CircleDot,
} from "lucide-react";

const kpis = [
  { label: "Total Suppliers", value: "145", icon: Factory, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Active POs", value: "67", icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "On-Time Delivery", value: "94.3%", icon: Clock, color: "text-green-600", bg: "bg-green-100" },
  { label: "Fill Rate", value: "97.8%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  { label: "Avg Lead Time", value: "12d", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100" },
  { label: "Inventory Turns", value: "8.4x", icon: RefreshCw, color: "text-cyan-600", bg: "bg-cyan-100" },
  { label: "Procurement Cost", value: "4.2%", icon: DollarSign, color: "text-orange-600", bg: "bg-orange-100" },
  { label: "Supply Risk", value: "Low", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100" },
];

const purchaseOrders = [
  { id: "PO-4501", supplier: "Apex Materials Co.", items: 24, total: "$128,450", ordered: "Mar 18, 2026", eta: "Apr 08, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4502", supplier: "GlobalTech Components", items: 12, total: "$67,200", ordered: "Mar 20, 2026", eta: "Apr 12, 2026", status: "Confirmed", priority: "Medium" },
  { id: "PO-4503", supplier: "SteelWorks International", items: 8, total: "$245,000", ordered: "Mar 15, 2026", eta: "Apr 05, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4504", supplier: "ChemPro Industries", items: 15, total: "$34,800", ordered: "Mar 22, 2026", eta: "Apr 14, 2026", status: "Pending Approval", priority: "Low" },
  { id: "PO-4505", supplier: "Pacific Logistics Ltd.", items: 6, total: "$89,300", ordered: "Mar 25, 2026", eta: "Apr 18, 2026", status: "Confirmed", priority: "Medium" },
  { id: "PO-4506", supplier: "NordicParts AB", items: 30, total: "$156,700", ordered: "Mar 12, 2026", eta: "Apr 02, 2026", status: "Delivered", priority: "High" },
  { id: "PO-4507", supplier: "RawMat Suppliers Inc.", items: 18, total: "$72,100", ordered: "Mar 28, 2026", eta: "Apr 20, 2026", status: "Pending Approval", priority: "Medium" },
  { id: "PO-4508", supplier: "Precision Fasteners Co.", items: 42, total: "$19,850", ordered: "Mar 30, 2026", eta: "Apr 10, 2026", status: "Confirmed", priority: "Low" },
  { id: "PO-4509", supplier: "ElectroParts Global", items: 9, total: "$203,600", ordered: "Mar 14, 2026", eta: "Apr 04, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4510", supplier: "BioPlastics Corp.", items: 20, total: "$41,500", ordered: "Apr 01, 2026", eta: "Apr 22, 2026", status: "Draft", priority: "Low" },
];

const suppliers = [
  { id: "SUP-001", name: "Apex Materials Co.", category: "Raw Materials", location: "Houston, TX", rating: 4.8, onTime: "96%", spend: "$2.4M", status: "Preferred", risk: "Low" },
  { id: "SUP-002", name: "GlobalTech Components", category: "Electronics", location: "Shenzhen, China", rating: 4.5, onTime: "91%", spend: "$1.8M", status: "Approved", risk: "Medium" },
  { id: "SUP-003", name: "SteelWorks International", category: "Metals", location: "Pittsburgh, PA", rating: 4.9, onTime: "98%", spend: "$3.1M", status: "Preferred", risk: "Low" },
  { id: "SUP-004", name: "ChemPro Industries", category: "Chemicals", location: "Basel, Switzerland", rating: 4.3, onTime: "89%", spend: "$890K", status: "Approved", risk: "Medium" },
  { id: "SUP-005", name: "Pacific Logistics Ltd.", category: "Logistics", location: "Singapore", rating: 4.6, onTime: "93%", spend: "$1.2M", status: "Approved", risk: "Low" },
  { id: "SUP-006", name: "NordicParts AB", category: "Mechanical Parts", location: "Stockholm, Sweden", rating: 4.7, onTime: "95%", spend: "$1.5M", status: "Preferred", risk: "Low" },
  { id: "SUP-007", name: "RawMat Suppliers Inc.", category: "Raw Materials", location: "Detroit, MI", rating: 4.1, onTime: "87%", spend: "$670K", status: "Conditional", risk: "High" },
  { id: "SUP-008", name: "Precision Fasteners Co.", category: "Hardware", location: "Osaka, Japan", rating: 4.8, onTime: "97%", spend: "$420K", status: "Preferred", risk: "Low" },
  { id: "SUP-009", name: "ElectroParts Global", category: "Electronics", location: "Taipei, Taiwan", rating: 4.4, onTime: "90%", spend: "$2.1M", status: "Approved", risk: "Medium" },
  { id: "SUP-010", name: "BioPlastics Corp.", category: "Polymers", location: "Rotterdam, Netherlands", rating: 4.2, onTime: "92%", spend: "$560K", status: "Approved", risk: "Low" },
];

const shipments = [
  { id: "SHP-7801", origin: "Shenzhen, China", destination: "Los Angeles, CA", carrier: "Maersk Line", mode: "Ocean Freight", departed: "Mar 10, 2026", eta: "Apr 06, 2026", status: "In Transit", weight: "12,400 kg" },
  { id: "SHP-7802", origin: "Stockholm, Sweden", destination: "Newark, NJ", carrier: "DHL Global", mode: "Air Freight", departed: "Mar 28, 2026", eta: "Apr 03, 2026", status: "In Transit", weight: "840 kg" },
  { id: "SHP-7803", origin: "Houston, TX", destination: "Chicago, IL", carrier: "FedEx Freight", mode: "Ground", departed: "Mar 31, 2026", eta: "Apr 04, 2026", status: "In Transit", weight: "5,200 kg" },
  { id: "SHP-7804", origin: "Osaka, Japan", destination: "Seattle, WA", carrier: "NYK Line", mode: "Ocean Freight", departed: "Mar 05, 2026", eta: "Apr 01, 2026", status: "Delivered", weight: "8,900 kg" },
  { id: "SHP-7805", origin: "Basel, Switzerland", destination: "Houston, TX", carrier: "UPS Supply Chain", mode: "Air Freight", departed: "Apr 01, 2026", eta: "Apr 05, 2026", status: "In Transit", weight: "320 kg" },
  { id: "SHP-7806", origin: "Detroit, MI", destination: "Atlanta, GA", carrier: "XPO Logistics", mode: "Ground", departed: "Apr 02, 2026", eta: "Apr 06, 2026", status: "Dispatched", weight: "3,100 kg" },
  { id: "SHP-7807", origin: "Taipei, Taiwan", destination: "San Francisco, CA", carrier: "Evergreen Marine", mode: "Ocean Freight", departed: "Mar 15, 2026", eta: "Apr 08, 2026", status: "In Transit", weight: "15,600 kg" },
  { id: "SHP-7808", origin: "Rotterdam, Netherlands", destination: "Savannah, GA", carrier: "Hapag-Lloyd", mode: "Ocean Freight", departed: "Mar 20, 2026", eta: "Apr 10, 2026", status: "In Transit", weight: "9,750 kg" },
];

const inventoryItems = [
  { sku: "SKU-10201", name: "Carbon Steel Plate 10mm", category: "Raw Materials", onHand: 2400, reorder: 800, max: 5000, unit: "sheets", location: "WH-A", status: "Adequate" },
  { sku: "SKU-10202", name: "PCB Assembly Module v3", category: "Electronics", onHand: 340, reorder: 500, max: 2000, unit: "units", location: "WH-B", status: "Low Stock" },
  { sku: "SKU-10203", name: "Hydraulic Cylinder HX-40", category: "Mechanical", onHand: 890, reorder: 300, max: 1500, unit: "units", location: "WH-A", status: "Adequate" },
  { sku: "SKU-10204", name: "Industrial Epoxy Resin 5L", category: "Chemicals", onHand: 120, reorder: 200, max: 800, unit: "drums", location: "WH-C", status: "Low Stock" },
  { sku: "SKU-10205", name: "Stainless Bolts M12x50", category: "Hardware", onHand: 15000, reorder: 5000, max: 30000, unit: "pcs", location: "WH-A", status: "Adequate" },
  { sku: "SKU-10206", name: "Copper Wire 2.5mm AWG", category: "Electrical", onHand: 4500, reorder: 2000, max: 10000, unit: "meters", location: "WH-B", status: "Adequate" },
  { sku: "SKU-10207", name: "HDPE Pellets Grade A", category: "Polymers", onHand: 60, reorder: 100, max: 500, unit: "bags", location: "WH-C", status: "Critical" },
  { sku: "SKU-10208", name: "Servo Motor SM-200", category: "Electronics", onHand: 210, reorder: 150, max: 600, unit: "units", location: "WH-B", status: "Adequate" },
  { sku: "SKU-10209", name: "Aluminum Extrusion 6061", category: "Metals", onHand: 1800, reorder: 1000, max: 4000, unit: "bars", location: "WH-A", status: "Adequate" },
  { sku: "SKU-10210", name: "Safety Valve SV-100", category: "Mechanical", onHand: 75, reorder: 100, max: 400, unit: "units", location: "WH-A", status: "Low Stock" },
];

const warehouses = [
  { id: "WH-A", name: "Central Distribution Hub", location: "Dallas, TX", capacity: 50000, used: 38500, zones: 12, staff: 45, temp: "Ambient", status: "Operational" },
  { id: "WH-B", name: "Electronics Storage Facility", location: "San Jose, CA", capacity: 25000, used: 21200, zones: 8, staff: 28, temp: "Climate Controlled", status: "Operational" },
  { id: "WH-C", name: "Chemical & Hazmat Warehouse", location: "Houston, TX", capacity: 15000, used: 9800, zones: 6, staff: 18, temp: "Regulated", status: "Operational" },
  { id: "WH-D", name: "Overflow & Returns Center", location: "Memphis, TN", capacity: 35000, used: 12400, zones: 10, staff: 22, temp: "Ambient", status: "Maintenance" },
];

const contracts = [
  { id: "CTR-301", supplier: "Apex Materials Co.", type: "Master Supply Agreement", value: "$4.8M", start: "Jan 01, 2026", end: "Dec 31, 2027", status: "Active", renewal: "Auto" },
  { id: "CTR-302", supplier: "SteelWorks International", type: "Volume Purchase Agreement", value: "$6.2M", start: "Mar 01, 2026", end: "Feb 28, 2028", status: "Active", renewal: "Manual" },
  { id: "CTR-303", supplier: "GlobalTech Components", type: "Framework Agreement", value: "$3.5M", start: "Jun 01, 2025", end: "May 31, 2026", status: "Expiring Soon", renewal: "Auto" },
  { id: "CTR-304", supplier: "Pacific Logistics Ltd.", type: "Service Level Agreement", value: "$1.8M", start: "Jan 01, 2026", end: "Dec 31, 2026", status: "Active", renewal: "Auto" },
  { id: "CTR-305", supplier: "NordicParts AB", type: "Blanket Purchase Order", value: "$2.9M", start: "Apr 01, 2026", end: "Mar 31, 2027", status: "Active", renewal: "Manual" },
  { id: "CTR-306", supplier: "ElectroParts Global", type: "Master Supply Agreement", value: "$4.1M", start: "Feb 01, 2026", end: "Jan 31, 2028", status: "Active", renewal: "Auto" },
  { id: "CTR-307", supplier: "ChemPro Industries", type: "Hazmat Handling Agreement", value: "$1.2M", start: "Sep 01, 2025", end: "Aug 31, 2026", status: "Under Review", renewal: "Manual" },
  { id: "CTR-308", supplier: "RawMat Suppliers Inc.", type: "Framework Agreement", value: "$950K", start: "Nov 01, 2025", end: "Oct 31, 2026", status: "Active", renewal: "Manual" },
];

const spendCategories = [
  { category: "Raw Materials", spend: "$4.8M", pct: 32, trend: "+2.1%", suppliers: 28 },
  { category: "Electronics & Components", spend: "$3.9M", pct: 26, trend: "-1.4%", suppliers: 19 },
  { category: "Logistics & Freight", spend: "$2.3M", pct: 15, trend: "+4.7%", suppliers: 12 },
  { category: "Chemicals & Polymers", spend: "$1.5M", pct: 10, trend: "+0.8%", suppliers: 8 },
  { category: "Mechanical Parts", spend: "$1.2M", pct: 8, trend: "-0.3%", suppliers: 15 },
  { category: "Services & MRO", spend: "$1.3M", pct: 9, trend: "+1.9%", suppliers: 22 },
];

function poStatusBadge(status: string) {
  switch (status) {
    case "Delivered": return <Badge variant="default">{status}</Badge>;
    case "In Transit": return <Badge variant="secondary">{status}</Badge>;
    case "Confirmed": return <Badge variant="outline">{status}</Badge>;
    case "Pending Approval": return <Badge variant="destructive">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function supplierStatusBadge(status: string) {
  switch (status) {
    case "Preferred": return <Badge variant="default">{status}</Badge>;
    case "Approved": return <Badge variant="secondary">{status}</Badge>;
    case "Conditional": return <Badge variant="destructive">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function riskBadge(risk: string) {
  switch (risk) {
    case "Low": return <Badge variant="default">{risk}</Badge>;
    case "Medium": return <Badge variant="secondary">{risk}</Badge>;
    case "High": return <Badge variant="destructive">{risk}</Badge>;
    default: return <Badge variant="outline">{risk}</Badge>;
  }
}

function stockBadge(status: string) {
  switch (status) {
    case "Adequate": return <Badge variant="default">{status}</Badge>;
    case "Low Stock": return <Badge variant="secondary">{status}</Badge>;
    case "Critical": return <Badge variant="destructive">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function contractStatusBadge(status: string) {
  switch (status) {
    case "Active": return <Badge variant="default">{status}</Badge>;
    case "Expiring Soon": return <Badge variant="destructive">{status}</Badge>;
    case "Under Review": return <Badge variant="secondary">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

const poFields: EntityField[] = [
  { name: "supplier", label: "Supplier", type: "text", required: true },
  { name: "items", label: "Number of Items", type: "number", required: true },
  { name: "totalValue", label: "Total Value ($)", type: "number", required: true, placeholder: "0" },
  { name: "expectedDelivery", label: "Expected Delivery", type: "date", required: true },
  { name: "buyer", label: "Buyer", type: "text", required: true },
  { name: "priority", label: "Priority", type: "select", defaultValue: "Medium", options: [
    { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
  { name: "status", label: "Status", type: "select", defaultValue: "Draft", options: [
    { label: "Draft", value: "Draft" }, { label: "Pending Approval", value: "Pending Approval" },
    { label: "Confirmed", value: "Confirmed" }, { label: "In Transit", value: "In Transit" },
    { label: "Delivered", value: "Delivered" },
  ]},
];

const supplierFields: EntityField[] = [
  { name: "name", label: "Supplier Name", type: "text", required: true },
  { name: "category", label: "Category", type: "select", required: true, options: [
    { label: "Raw Materials", value: "Raw Materials" }, { label: "Electronics", value: "Electronics" },
    { label: "Metals", value: "Metals" }, { label: "Chemicals", value: "Chemicals" },
    { label: "Logistics", value: "Logistics" }, { label: "Mechanical Parts", value: "Mechanical Parts" },
    { label: "Hardware", value: "Hardware" }, { label: "Polymers", value: "Polymers" },
  ]},
  { name: "location", label: "Location", type: "text", required: true },
  { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, step: 0.1 },
  { name: "onTime", label: "On-Time Delivery %", type: "text" },
  { name: "spend", label: "Annual Spend", type: "text" },
  { name: "status", label: "Status", type: "select", defaultValue: "Approved", options: [
    { label: "Preferred", value: "Preferred" }, { label: "Approved", value: "Approved" },
    { label: "Conditional", value: "Conditional" },
  ]},
  { name: "risk", label: "Risk Level", type: "select", defaultValue: "Low", options: [
    { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" },
  ]},
];

type ModalMode = { type: "po"; editing: typeof purchaseOrders[0] | null } | { type: "supplier"; editing: typeof suppliers[0] | null } | null;

export default function SupplyChainPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [pos, setPos] = useState(purchaseOrders);
  const [supplierList, setSupplierList] = useState(suppliers);
  const [poFilters, setPoFilters] = useState<FilterState>({});
  const [supFilters, setSupFilters] = useState<FilterState>({});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supply Chain</h1>
          <p className="text-muted-foreground">End-to-end supply chain management, procurement, and logistics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button size="sm" onClick={() => setModal({ type: "po", editing: null })}><Plus className="mr-2 h-4 w-4" />New Purchase Order</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Planning</TabsTrigger>
          <TabsTrigger value="warehousing">Warehousing</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                  <div className={`rounded-md p-2 ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Purchase Orders</CardTitle>
                <CardDescription>Last 5 purchase orders created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pos.slice(0, 5).map((po) => (
                    <div key={po.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{po.id} - {po.supplier}</p>
                        <p className="text-xs text-muted-foreground">{po.items} items | {po.total}</p>
                      </div>
                      {poStatusBadge(po.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Shipments</CardTitle>
                <CardDescription>Shipments currently in transit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shipments.filter(s => s.status === "In Transit").slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{s.id} - {s.carrier}</p>
                        <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">ETA {s.eta}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Procurement Tab */}
        <TabsContent value="procurement" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search purchase orders..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            fields={[
              { key: "status", label: "Status", type: "select", options: [
                { label: "Draft", value: "Draft" }, { label: "Pending Approval", value: "Pending Approval" },
                { label: "Confirmed", value: "Confirmed" }, { label: "In Transit", value: "In Transit" },
                { label: "Delivered", value: "Delivered" },
              ]},
              { key: "priority", label: "Priority", type: "select", options: [
                { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
              ]},
            ]}
            values={poFilters}
            onChange={(k, v) => setPoFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => setModal({ type: "po", editing: null })}><Plus className="mr-2 h-4 w-4" />Add PO</Button>}
          />
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage and track all procurement activities</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "PO #", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "supplier", label: "Supplier" },
                  { key: "items", label: "Items" },
                  { key: "total", label: "Total" },
                  { key: "ordered", label: "Ordered" },
                  { key: "eta", label: "ETA" },
                  { key: "status", label: "Status", render: (v: string) => poStatusBadge(v) },
                  { key: "priority", label: "Priority", render: (v: string) => (
                    <Badge variant={v === "High" ? "destructive" : v === "Medium" ? "secondary" : "outline"}>{v}</Badge>
                  )},
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const po = row as unknown as typeof pos[0];
                    const statusFlow: Record<string, string> = { "Draft": "Pending Approval", "Pending Approval": "Confirmed", "Confirmed": "In Transit", "In Transit": "Delivered" };
                    const nextStatus = statusFlow[po.status];
                    return (
                      <EditDeleteMenu
                        onEdit={() => setModal({ type: "po", editing: po })}
                        onDelete={() => setPos(prev => prev.filter(p => p.id !== po.id))}
                        itemLabel={po.id}
                        extraItems={nextStatus ? [{ label: `→ ${nextStatus}`, onClick: () => setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: nextStatus } : p)) }] : []}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={pos
                  .filter(po => !searchTerm || po.id.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
                  .filter(po => !poFilters.status || po.status === poFilters.status)
                  .filter(po => !poFilters.priority || po.priority === poFilters.priority) as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No purchase orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search suppliers..."
            searchValue={supFilters._search ?? ""}
            onSearchChange={(v) => setSupFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [
                { label: "Preferred", value: "Preferred" }, { label: "Approved", value: "Approved" }, { label: "Conditional", value: "Conditional" },
              ]},
              { key: "risk", label: "Risk", type: "select", options: [
                { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" },
              ]},
            ]}
            values={supFilters}
            onChange={(k, v) => setSupFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => setModal({ type: "supplier", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>}
          />
          <Card>
            <CardHeader>
              <CardTitle>Supplier Directory</CardTitle>
              <CardDescription>Approved vendor list with performance ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "name", label: "Supplier" },
                  { key: "category", label: "Category" },
                  { key: "location", label: "Location" },
                  { key: "rating", label: "Rating", render: (v: number) => (
                    <span className={v >= 4.5 ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>{v}/5</span>
                  )},
                  { key: "onTime", label: "On-Time" },
                  { key: "spend", label: "Annual Spend" },
                  { key: "status", label: "Status", render: (v: string) => supplierStatusBadge(v) },
                  { key: "risk", label: "Risk", render: (v: string) => riskBadge(v) },
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const s = row as unknown as typeof supplierList[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => setModal({ type: "supplier", editing: s })}
                        onDelete={() => setSupplierList(prev => prev.filter(x => x.id !== s.id))}
                        itemLabel={s.name}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={supplierList
                  .filter(s => !supFilters._search || s.name.toLowerCase().includes(supFilters._search.toLowerCase()) || s.id.toLowerCase().includes(supFilters._search.toLowerCase()))
                  .filter(s => !supFilters.status || s.status === supFilters.status)
                  .filter(s => !supFilters.risk || s.risk === supFilters.risk) as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No suppliers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics Tab */}
        <TabsContent value="logistics" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shipments..." className="pl-8" />
            </div>
            <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />Filter</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
              <CardDescription>Real-time visibility of inbound and outbound shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Shipment #", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "origin", label: "Origin" },
                  { key: "destination", label: "Destination" },
                  { key: "carrier", label: "Carrier" },
                  { key: "mode", label: "Mode" },
                  { key: "departed", label: "Departed" },
                  { key: "eta", label: "ETA" },
                  { key: "weight", label: "Weight" },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "Delivered" ? "default" : v === "In Transit" ? "secondary" : "outline"}>{v}</Badge>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={shipments as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No shipments found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Planning Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-8" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Sync Stock</Button>
              <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Inventory Levels</CardTitle>
              <CardDescription>Current stock positions and reorder planning</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "sku", label: "SKU", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "name", label: "Item Name" },
                  { key: "category", label: "Category" },
                  { key: "onHand", label: "On Hand", render: (v: number) => <span className="font-medium">{v.toLocaleString()}</span> },
                  { key: "reorder", label: "Reorder Point", render: (v: number) => <>{v.toLocaleString()}</> },
                  { key: "max", label: "Max", render: (v: number) => <>{v.toLocaleString()}</> },
                  { key: "unit", label: "Unit" },
                  { key: "location", label: "Location" },
                  { key: "status", label: "Status", render: (v: string) => stockBadge(v) },
                ] as Column<Record<string, unknown>>[]}
                data={inventoryItems as unknown as Record<string, unknown>[]}
                emptyMessage="No inventory items found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehousing Tab */}
        <TabsContent value="warehousing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {warehouses.map((wh) => {
              const utilization = Math.round((wh.used / wh.capacity) * 100);
              return (
                <Card key={wh.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{wh.name}</CardTitle>
                        <CardDescription>{wh.id} | {wh.location}</CardDescription>
                      </div>
                      <Badge variant={wh.status === "Operational" ? "default" : "secondary"}>{wh.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Capacity Utilization</span>
                        <span className="font-medium">{utilization}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${utilization > 85 ? "bg-red-500" : utilization > 70 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{wh.used.toLocaleString()} / {wh.capacity.toLocaleString()} sqft</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Zones</p>
                        <p className="font-medium">{wh.zones}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Staff</p>
                        <p className="font-medium">{wh.staff}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Temp Control</p>
                        <p className="font-medium">{wh.temp}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contracts..." className="pl-8" />
            </div>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Contract</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Supplier Contracts</CardTitle>
              <CardDescription>Active agreements and contract lifecycle management</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Contract #", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "supplier", label: "Supplier" },
                  { key: "type", label: "Type" },
                  { key: "value", label: "Value" },
                  { key: "start", label: "Start" },
                  { key: "end", label: "End" },
                  { key: "status", label: "Status", render: (v: string) => contractStatusBadge(v) },
                  { key: "renewal", label: "Renewal", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                ] as Column<Record<string, unknown>>[]}
                data={contracts as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No contracts found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Annual Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$15.0M</div>
                <p className="text-xs text-muted-foreground mt-1">+3.2% vs. prior year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost Savings YTD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">$1.24M</div>
                <p className="text-xs text-muted-foreground mt-1">8.3% savings rate achieved</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Contracted Spend %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78.4%</div>
                <p className="text-xs text-muted-foreground mt-1">Target: 85% by Q4</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Spend by Category</CardTitle>
              <CardDescription>Annual procurement spend breakdown and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spendCategories.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-48">{cat.category}</span>
                        <span className="text-muted-foreground">{cat.suppliers} suppliers</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cat.trend.startsWith("+") ? "text-red-600 text-xs" : "text-green-600 text-xs"}>{cat.trend}</span>
                        <span className="font-medium w-20 text-right">{cat.spend}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers by Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliers.sort((a, b) => parseFloat(b.spend.replace(/[$MK,]/g, "")) - parseFloat(a.spend.replace(/[$MK,]/g, ""))).slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm w-5">{i + 1}.</span>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.category}</p>
                        </div>
                      </div>
                      <span className="font-medium text-sm">{s.spend}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Procurement Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg PO Cycle Time</span>
                    <span className="font-medium">4.2 days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">PO Accuracy Rate</span>
                    <span className="font-medium">98.6%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Supplier Defect Rate</span>
                    <span className="font-medium">0.8%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Invoice Match Rate</span>
                    <span className="font-medium">96.2%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Emergency Orders</span>
                    <span className="font-medium">2.1%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Maverick Spend</span>
                    <span className="font-medium">5.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* PO Modal */}
      {modal?.type === "po" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "New Purchase Order"}
          fields={poFields}
          initialData={modal.editing ? {
            supplier: modal.editing.supplier,
            items: modal.editing.items,
            totalValue: parseFloat(modal.editing.total.replace(/[$,]/g, "")) || 0,
            expectedDelivery: modal.editing.eta,
            buyer: "",
            priority: modal.editing.priority,
            status: modal.editing.status,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(data) => {
            if (modal.editing) {
              setPos(prev => prev.map(p => p.id === modal.editing!.id ? {
                ...p,
                supplier: String(data.supplier),
                items: Number(data.items) || p.items,
                total: `$${Number(data.totalValue).toLocaleString()}`,
                eta: String(data.expectedDelivery),
                priority: String(data.priority) || p.priority,
                status: String(data.status) || p.status,
              } : p));
            } else {
              const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
              setPos(prev => [{
                id: `PO-${4510 + prev.length + 1}`,
                supplier: String(data.supplier),
                items: Number(data.items) || 1,
                total: `$${Number(data.totalValue).toLocaleString()}`,
                ordered: today,
                eta: String(data.expectedDelivery),
                status: "Draft",
                priority: String(data.priority) || "Medium",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Supplier Modal */}
      {modal?.type === "supplier" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.name}` : "Add Supplier"}
          fields={supplierFields}
          initialData={modal.editing ? {
            name: modal.editing.name,
            category: modal.editing.category,
            location: modal.editing.location,
            rating: modal.editing.rating,
            onTime: modal.editing.onTime,
            spend: modal.editing.spend,
            status: modal.editing.status,
            risk: modal.editing.risk,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Add"}
          onSubmit={(data) => {
            if (modal.editing) {
              setSupplierList(prev => prev.map(s => s.id === modal.editing!.id ? {
                ...s,
                name: String(data.name),
                category: String(data.category),
                location: String(data.location),
                rating: Number(data.rating) || s.rating,
                onTime: String(data.onTime) || s.onTime,
                spend: String(data.spend) || s.spend,
                status: String(data.status) || s.status,
                risk: String(data.risk) || s.risk,
              } : s));
            } else {
              setSupplierList(prev => [{
                id: `SUP-${String(prev.length + 1).padStart(3, "0")}`,
                name: String(data.name),
                category: String(data.category),
                location: String(data.location),
                rating: Number(data.rating) || 0,
                onTime: String(data.onTime) || "0%",
                spend: String(data.spend) || "$0",
                status: String(data.status) || "Approved",
                risk: String(data.risk) || "Low",
              }, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}

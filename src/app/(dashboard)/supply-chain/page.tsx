"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { useDataStore } from "@/lib/data-store";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, Truck, Factory, Search, Plus, Download, Filter,
  ShoppingCart, Clock, TrendingUp, BarChart3, CheckCircle2,
  AlertTriangle, ArrowUpDown, Warehouse, FileText, Globe,
  DollarSign, ShieldCheck, Layers, Box, MapPin, RefreshCw,
  Eye, Calendar, Users, Anchor, CircleDot,
} from "lucide-react";

/* kpis are computed inside the component to access store data */

const INITIAL_PURCHASE_ORDERS = [
  { id: "PO-4501", supplier: "Sun Pharma API", items: 24, total: "EGP 1,420,000", ordered: "Mar 18, 2026", eta: "Apr 08, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4502", supplier: "BASF Pharma Solutions", items: 12, total: "EGP 620,000", ordered: "Mar 20, 2026", eta: "Apr 12, 2026", status: "Confirmed", priority: "Medium" },
  { id: "PO-4503", supplier: "Schott Glass", items: 8, total: "EGP 340,000", ordered: "Mar 15, 2026", eta: "Apr 05, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4504", supplier: "Egyptian Lab Reagents", items: 15, total: "EGP 92,000", ordered: "Mar 22, 2026", eta: "Apr 14, 2026", status: "Pending Approval", priority: "Low" },
  { id: "PO-4505", supplier: "Bormioli Pharma", items: 6, total: "EGP 275,000", ordered: "Mar 25, 2026", eta: "Apr 18, 2026", status: "Confirmed", priority: "Medium" },
  { id: "PO-4506", supplier: "Sun Pharma API", items: 30, total: "EGP 850,000", ordered: "Mar 12, 2026", eta: "Apr 02, 2026", status: "Delivered", priority: "High" },
  { id: "PO-4507", supplier: "BASF Pharma Solutions", items: 18, total: "EGP 310,000", ordered: "Mar 28, 2026", eta: "Apr 20, 2026", status: "Pending Approval", priority: "Medium" },
  { id: "PO-4508", supplier: "Schott Glass", items: 42, total: "EGP 170,000", ordered: "Mar 30, 2026", eta: "Apr 10, 2026", status: "Confirmed", priority: "Low" },
  { id: "PO-4509", supplier: "Bormioli Pharma", items: 9, total: "EGP 135,000", ordered: "Mar 14, 2026", eta: "Apr 04, 2026", status: "In Transit", priority: "High" },
  { id: "PO-4510", supplier: "Egyptian Lab Reagents", items: 20, total: "EGP 46,000", ordered: "Apr 01, 2026", eta: "Apr 22, 2026", status: "Draft", priority: "Low" },
];

/* Suppliers are derived from store.vendors inside the component */

const shipments = [
  { id: "SHP-7801", origin: "Mumbai, India", destination: "Cairo, Egypt", carrier: "Maersk Line", mode: "Ocean Freight", departed: "Mar 10, 2026", eta: "Apr 06, 2026", status: "In Transit", weight: "12,400 kg" },
  { id: "SHP-7802", origin: "Ludwigshafen, Germany", destination: "Alexandria, Egypt", carrier: "DHL Global", mode: "Air Freight", departed: "Mar 28, 2026", eta: "Apr 03, 2026", status: "In Transit", weight: "840 kg" },
  { id: "SHP-7803", origin: "Mainz, Germany", destination: "10th of Ramadan, Egypt", carrier: "FedEx Freight", mode: "Ground", departed: "Mar 31, 2026", eta: "Apr 04, 2026", status: "In Transit", weight: "5,200 kg" },
  { id: "SHP-7804", origin: "Parma, Italy", destination: "Cairo, Egypt", carrier: "MSC", mode: "Ocean Freight", departed: "Mar 05, 2026", eta: "Apr 01, 2026", status: "Delivered", weight: "8,900 kg" },
  { id: "SHP-7805", origin: "Mumbai, India", destination: "Port Said, Egypt", carrier: "UPS Supply Chain", mode: "Air Freight", departed: "Apr 01, 2026", eta: "Apr 05, 2026", status: "In Transit", weight: "320 kg" },
  { id: "SHP-7806", origin: "Alexandria, Egypt", destination: "6th October, Egypt", carrier: "Local Freight Co.", mode: "Ground", departed: "Apr 02, 2026", eta: "Apr 06, 2026", status: "Dispatched", weight: "3,100 kg" },
  { id: "SHP-7807", origin: "Ludwigshafen, Germany", destination: "Cairo, Egypt", carrier: "Evergreen Marine", mode: "Ocean Freight", departed: "Mar 15, 2026", eta: "Apr 08, 2026", status: "In Transit", weight: "15,600 kg" },
  { id: "SHP-7808", origin: "Mainz, Germany", destination: "10th of Ramadan, Egypt", carrier: "Hapag-Lloyd", mode: "Ocean Freight", departed: "Mar 20, 2026", eta: "Apr 10, 2026", status: "In Transit", weight: "9,750 kg" },
];

/* Inventory items are derived from store.products inside the component */

const warehouses = [
  { id: "WH-A", name: "Main Pharma Warehouse", location: "10th of Ramadan, Egypt", capacity: 50000, used: 38500, zones: 12, staff: 45, temp: "Climate Controlled", status: "Operational" },
  { id: "WH-B", name: "Cold Chain Storage", location: "6th October, Egypt", capacity: 25000, used: 21200, zones: 8, staff: 28, temp: "Regulated", status: "Operational" },
  { id: "WH-C", name: "API & Raw Materials Depot", location: "Cairo, Egypt", capacity: 15000, used: 9800, zones: 6, staff: 18, temp: "Climate Controlled", status: "Operational" },
  { id: "WH-D", name: "Packaging & Finished Goods", location: "Alexandria, Egypt", capacity: 35000, used: 12400, zones: 10, staff: 22, temp: "Ambient", status: "Maintenance" },
];

const contracts = [
  { id: "CTR-301", supplier: "Sun Pharma API", type: "Master Supply Agreement", value: "EGP 4.8M", start: "Jan 01, 2026", end: "Dec 31, 2027", status: "Active", renewal: "Auto" },
  { id: "CTR-302", supplier: "Schott Glass", type: "Volume Purchase Agreement", value: "EGP 6.2M", start: "Mar 01, 2026", end: "Feb 28, 2028", status: "Active", renewal: "Manual" },
  { id: "CTR-303", supplier: "BASF Pharma Solutions", type: "Framework Agreement", value: "EGP 3.5M", start: "Jun 01, 2025", end: "May 31, 2026", status: "Expiring Soon", renewal: "Auto" },
  { id: "CTR-304", supplier: "Bormioli Pharma", type: "Service Level Agreement", value: "EGP 1.8M", start: "Jan 01, 2026", end: "Dec 31, 2026", status: "Active", renewal: "Auto" },
  { id: "CTR-305", supplier: "Egyptian Lab Reagents", type: "Blanket Purchase Order", value: "EGP 920K", start: "Apr 01, 2026", end: "Mar 31, 2027", status: "Active", renewal: "Manual" },
  { id: "CTR-306", supplier: "Sun Pharma API", type: "API Quality Agreement", value: "EGP 4.1M", start: "Feb 01, 2026", end: "Jan 31, 2028", status: "Active", renewal: "Auto" },
  { id: "CTR-307", supplier: "Schott Glass", type: "Packaging Supply Agreement", value: "EGP 1.2M", start: "Sep 01, 2025", end: "Aug 31, 2026", status: "Under Review", renewal: "Manual" },
  { id: "CTR-308", supplier: "BASF Pharma Solutions", type: "Excipient Framework Agreement", value: "EGP 950K", start: "Nov 01, 2025", end: "Oct 31, 2026", status: "Active", renewal: "Manual" },
];

const spendCategories = [
  { category: "API Suppliers", spend: "EGP 4.8M", pct: 32, trend: "+2.1%", suppliers: 3 },
  { category: "Excipients", spend: "EGP 3.9M", pct: 26, trend: "-1.4%", suppliers: 2 },
  { category: "Primary Packaging", spend: "EGP 2.3M", pct: 15, trend: "+4.7%", suppliers: 2 },
  { category: "Lab Reagents", spend: "EGP 1.5M", pct: 10, trend: "+0.8%", suppliers: 1 },
  { category: "Logistics & Freight", spend: "EGP 1.2M", pct: 8, trend: "-0.3%", suppliers: 5 },
  { category: "Services & MRO", spend: "EGP 1.3M", pct: 9, trend: "+1.9%", suppliers: 4 },
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

/* poFields is built inside the component to access store.vendors */

const supplierFields: EntityField[] = [
  { name: "name", label: "Supplier Name", type: "text", required: true, fullWidth: true },
  { name: "category", label: "Category", type: "select", required: true, options: [
    { label: "API Supplier", value: "API Supplier" }, { label: "Excipient Supplier", value: "Excipient Supplier" },
    { label: "Packaging Supplier", value: "Packaging Supplier" }, { label: "Lab Reagents", value: "Lab Reagents" },
    { label: "Equipment", value: "Equipment" }, { label: "Logistics", value: "Logistics" },
  ]},
  { name: "location", label: "Location", type: "text", required: true },
  { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
  { name: "onTime", label: "On-Time %", type: "text", placeholder: "95%" },
  { name: "spend", label: "Annual Spend", type: "text", placeholder: "EGP 1.2M" },
  { name: "status", label: "Status", type: "select", defaultValue: "Approved", options: [
    { label: "Preferred", value: "Preferred" }, { label: "Approved", value: "Approved" },
    { label: "Conditional", value: "Conditional" },
  ]},
  { name: "risk", label: "Risk Level", type: "select", defaultValue: "Low", options: [
    { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" },
  ]},
  { name: "phone", label: "Phone", type: "text" },
  { name: "email", label: "Email", type: "email" },
];

/* contractFields is built inside the component to access store.vendors */

const shipmentFields: EntityField[] = [
  { name: "origin", label: "Origin", type: "text", required: true },
  { name: "destination", label: "Destination", type: "text", required: true },
  { name: "carrier", label: "Carrier", type: "text", required: true },
  { name: "mode", label: "Mode", type: "select", required: true, options: [
    { label: "Ocean Freight", value: "Ocean Freight" }, { label: "Air Freight", value: "Air Freight" },
    { label: "Ground", value: "Ground" }, { label: "Rail", value: "Rail" },
  ]},
  { name: "departed", label: "Departed", type: "date", required: true },
  { name: "eta", label: "ETA", type: "date", required: true },
  { name: "weight", label: "Weight", type: "text", required: true, placeholder: "e.g. 1,200 kg" },
  { name: "status", label: "Status", type: "select", defaultValue: "Dispatched", options: [
    { label: "Dispatched", value: "Dispatched" }, { label: "In Transit", value: "In Transit" },
    { label: "Delivered", value: "Delivered" },
  ]},
];

/* inventoryFields is built inside the component to access store.products */

const warehouseFields: EntityField[] = [
  { name: "name", label: "Warehouse Name", type: "text", required: true, fullWidth: true },
  { name: "location", label: "Location", type: "text", required: true },
  { name: "capacity", label: "Total Capacity (sqft)", type: "number", required: true, min: 0 },
  { name: "used", label: "Used Capacity (sqft)", type: "number", required: true, min: 0 },
  { name: "zones", label: "Zones", type: "number", required: true, min: 1 },
  { name: "staff", label: "Staff", type: "number", required: true, min: 0 },
  { name: "temp", label: "Temp Control", type: "select", required: true, options: [
    { label: "Ambient", value: "Ambient" }, { label: "Climate Controlled", value: "Climate Controlled" },
    { label: "Regulated", value: "Regulated" },
  ]},
  { name: "status", label: "Status", type: "select", defaultValue: "Operational", options: [
    { label: "Operational", value: "Operational" }, { label: "Maintenance", value: "Maintenance" },
    { label: "Closed", value: "Closed" },
  ]},
];

interface SupplierRow {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  onTime: string;
  spend: string;
  status: string;
  risk: string;
  gmpCertified: boolean;
  phone: string;
  email: string;
}

interface InventoryRow {
  sku: string;
  productId: string;
  name: string;
  category: string;
  onHand: number;
  reorder: number;
  max: number;
  unit: string;
  location: string;
  status: string;
}

type ModalMode =
  | { type: "po"; editing: typeof INITIAL_PURCHASE_ORDERS[0] | null }
  | { type: "supplier"; editing: SupplierRow | null }
  | { type: "contract"; editing: typeof contracts[0] | null }
  | { type: "shipment"; editing: typeof shipments[0] | null }
  | { type: "inventory"; editing: InventoryRow | null }
  | { type: "warehouse"; editing: typeof warehouses[0] | null }
  | null;

export default function SupplyChainPage() {
  const store = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [pos, setPos] = useState(INITIAL_PURCHASE_ORDERS);
  const [contractList, setContractList] = useState(contracts);
  const [shipmentList, setShipmentList] = useState(shipments);
  const [warehouseList, setWarehouseList] = useState(warehouses);
  const [supplierList, setSupplierList] = useState<SupplierRow[]>(() =>
    store.vendors.map((v) => ({
      id: v.code,
      name: v.name,
      category: v.category,
      location: v.address,
      rating: v.gmpCertified ? 4.7 : 4.0,
      onTime: v.gmpCertified ? "95%" : "88%",
      spend: `EGP ${(v.outstanding / 1000).toFixed(0)}K`,
      status: v.gmpCertified ? "Preferred" : "Approved",
      risk: v.gmpCertified ? "Low" : "Medium",
      gmpCertified: v.gmpCertified,
      phone: v.phone,
      email: v.email,
    }))
  );
  const [inventoryList, setInventoryList] = useState<InventoryRow[]>(() =>
    store.products.map((p, idx) => {
      const baseStock = Math.round(p.pricePerUnit * 20);
      const reorder = Math.round(baseStock * 0.3);
      const max = baseStock * 2;
      const onHand = Math.round(baseStock * (0.5 + Math.random() * 0.8));
      const stockStatus = onHand <= reorder * 0.5 ? "Critical" : onHand <= reorder ? "Low Stock" : "Adequate";
      const locations = ["WH-A", "WH-B", "WH-C", "WH-D"];
      return {
        sku: p.code,
        productId: p.id,
        name: `${p.name} ${p.strength}`,
        category: p.therapeuticArea,
        onHand,
        reorder,
        max,
        unit: p.form === "Syrup" ? "bottles" : p.form === "Injection" ? "vials" : "boxes",
        location: locations[idx % locations.length],
        status: stockStatus,
      };
    })
  );
  const [poFilters, setPoFilters] = useState<FilterState>({});
  const [supFilters, setSupFilters] = useState<FilterState>({});
  const [viewPO, setViewPO] = useState<typeof INITIAL_PURCHASE_ORDERS[0] | null>(null);
  const [viewSupplier, setViewSupplier] = useState<SupplierRow | null>(null);

  // Build poFields with store.vendors as supplier options
  const poFields: EntityField[] = [
    { name: "supplier", label: "Supplier", type: "select" as const, required: true, options: store.vendors.map(v => ({ label: v.name, value: v.name })) },
    { name: "items", label: "Number of Items", type: "number" as const, required: true },
    { name: "totalValue", label: "Total Value (EGP)", type: "number" as const, required: true, placeholder: "0" },
    { name: "expectedDelivery", label: "Expected Delivery", type: "date" as const, required: true },
    { name: "buyer", label: "Buyer", type: "text" as const, required: true },
    { name: "priority", label: "Priority", type: "select" as const, defaultValue: "Medium", options: [
      { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
    ]},
    { name: "status", label: "Status", type: "select" as const, defaultValue: "Draft", options: [
      { label: "Draft", value: "Draft" }, { label: "Pending Approval", value: "Pending Approval" },
      { label: "Confirmed", value: "Confirmed" }, { label: "In Transit", value: "In Transit" },
      { label: "Delivered", value: "Delivered" },
    ]},
  ];

  const contractFields: EntityField[] = [
    { name: "title", label: "Type", type: "text" as const, required: true, fullWidth: true, placeholder: "e.g. Master Supply Agreement" },
    { name: "supplier", label: "Supplier", type: "select" as const, required: true, options: store.vendors.map(v => ({ label: v.name, value: v.name })) },
    { name: "startDate", label: "Start Date", type: "date" as const, required: true },
    { name: "endDate", label: "End Date", type: "date" as const, required: true },
    { name: "value", label: "Value (EGP)", type: "number" as const, required: true, placeholder: "0" },
    { name: "status", label: "Status", type: "select" as const, defaultValue: "Active", options: [
      { label: "Active", value: "Active" }, { label: "Expiring Soon", value: "Expiring Soon" },
      { label: "Under Review", value: "Under Review" }, { label: "Expired", value: "Expired" },
    ]},
    { name: "renewal", label: "Renewal", type: "select" as const, defaultValue: "Manual", options: [
      { label: "Auto", value: "Auto" }, { label: "Manual", value: "Manual" },
    ]},
  ];

  const inventoryFields: EntityField[] = [
    { name: "product", label: "Product", type: "select" as const, required: true, options: store.products.map(p => ({ label: `${p.code} - ${p.name}`, value: p.name })) },
    { name: "name", label: "Item Name", type: "text" as const, required: true, fullWidth: true },
    { name: "category", label: "Therapeutic Area", type: "text" as const, required: true },
    { name: "onHand", label: "On Hand", type: "number" as const, required: true, min: 0 },
    { name: "reorder", label: "Reorder Point", type: "number" as const, required: true, min: 0 },
    { name: "max", label: "Max Qty", type: "number" as const, required: true, min: 0 },
    { name: "unit", label: "Unit", type: "text" as const, required: true, placeholder: "e.g. boxes, vials, bottles" },
    { name: "location", label: "Location", type: "select" as const, required: true, options: [
      { label: "WH-A", value: "WH-A" }, { label: "WH-B", value: "WH-B" },
      { label: "WH-C", value: "WH-C" }, { label: "WH-D", value: "WH-D" },
    ]},
    { name: "status", label: "Status", type: "select" as const, defaultValue: "Adequate", options: [
      { label: "Adequate", value: "Adequate" }, { label: "Low Stock", value: "Low Stock" },
      { label: "Critical", value: "Critical" },
    ]},
  ];

  // Dynamic KPI values
  const kpis = [
    { label: "Total Suppliers", value: String(store.vendors.length), icon: Factory, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Active POs", value: String(pos.filter(p => p.status !== "Delivered" && p.status !== "Draft").length), icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "On-Time Delivery", value: "94.3%", icon: Clock, color: "text-green-600", bg: "bg-green-100" },
    { label: "Fill Rate", value: "97.8%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Avg Lead Time", value: "12d", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Products Tracked", value: String(store.products.length), icon: RefreshCw, color: "text-cyan-600", bg: "bg-cyan-100" },
    { label: "Vendor Outstanding", value: `EGP ${(store.vendors.reduce((s, v) => s + v.outstanding, 0) / 1_000_000).toFixed(1)}M`, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Supply Risk", value: store.vendors.every(v => v.gmpCertified) ? "Low" : "Medium", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100" },
  ];

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
                        onView={() => setViewPO(po)}
                        canView
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
                
                exportable exportFilename="supply-chain.csv" emptyMessage="No purchase orders found."
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
            rightSlot={<span className="text-xs text-muted-foreground">Synced from vendor master</span>}
          />
          <Card>
            <CardHeader>
              <CardTitle>Supplier Directory</CardTitle>
              <CardDescription>Vendors from the central data store with performance ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "name", label: "Supplier" },
                  { key: "category", label: "Category" },
                  { key: "location", label: "Location" },
                  { key: "gmpCertified", label: "GMP", render: (v: boolean) => (
                    <Badge variant={v ? "default" : "secondary"}>{v ? "Certified" : "No"}</Badge>
                  )},
                  { key: "onTime", label: "On-Time" },
                  { key: "spend", label: "Outstanding" },
                  { key: "status", label: "Status", render: (v: string) => supplierStatusBadge(v) },
                  { key: "risk", label: "Risk", render: (v: string) => riskBadge(v) },
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const s = row as unknown as typeof supplierList[0];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewSupplier(s)}
                        canView
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
                
                exportable exportFilename="supply-chain.csv" emptyMessage="No suppliers found."
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
            <Button size="sm" onClick={() => setModal({ type: "shipment", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Shipment</Button>
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
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const s = row as unknown as typeof shipmentList[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => setModal({ type: "shipment", editing: s })}
                        onDelete={() => setShipmentList(prev => prev.filter(x => x.id !== s.id))}
                        itemLabel={s.id}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={shipmentList as unknown as Record<string, unknown>[]}

                exportable exportFilename="supply-chain.csv" emptyMessage="No shipments found."
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
              <Button size="sm" onClick={() => setModal({ type: "inventory", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Item</Button>
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
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const item = row as unknown as typeof inventoryList[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => setModal({ type: "inventory", editing: item })}
                        onDelete={() => setInventoryList(prev => prev.filter(x => x.sku !== item.sku))}
                        itemLabel={item.name}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={inventoryList as unknown as Record<string, unknown>[]}
                exportable exportFilename="supply-chain.csv" emptyMessage="No inventory items found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehousing Tab */}
        <TabsContent value="warehousing" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Warehouses</h2>
            <Button size="sm" onClick={() => setModal({ type: "warehouse", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Warehouse</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {warehouseList.map((wh) => {
              const utilization = wh.capacity > 0 ? Math.round((wh.used / wh.capacity) * 100) : 0;
              return (
                <Card key={wh.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{wh.name}</CardTitle>
                        <CardDescription>{wh.id} | {wh.location}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={wh.status === "Operational" ? "default" : "secondary"}>{wh.status}</Badge>
                        <EditDeleteMenu
                          onEdit={() => setModal({ type: "warehouse", editing: wh })}
                          onDelete={() => setWarehouseList(prev => prev.filter(x => x.id !== wh.id))}
                          itemLabel={wh.name}
                        />
                      </div>
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
            <Button size="sm" onClick={() => setModal({ type: "contract", editing: null })}><Plus className="mr-2 h-4 w-4" />New Contract</Button>
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
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as typeof contractList[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => setModal({ type: "contract", editing: c })}
                        onDelete={() => setContractList(prev => prev.filter(x => x.id !== c.id))}
                        itemLabel={c.id}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={contractList as unknown as Record<string, unknown>[]}

                exportable exportFilename="supply-chain.csv" emptyMessage="No contracts found."
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
                <div className="text-2xl font-bold">EGP 15.0M</div>
                <p className="text-xs text-muted-foreground mt-1">+3.2% vs. prior year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost Savings YTD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">EGP 1.24M</div>
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
                  {[...supplierList].sort((a: SupplierRow, b: SupplierRow) => parseFloat(b.spend.replace(/[EGPMK, ]/g, "")) - parseFloat(a.spend.replace(/[EGPMK, ]/g, ""))).slice(0, 5).map((s: SupplierRow, i: number) => (
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
            totalValue: parseFloat(modal.editing.total.replace(/[^0-9.]/g, "")) || 0,
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
                total: `EGP ${Number(data.totalValue).toLocaleString()}`,
                eta: String(data.expectedDelivery),
                priority: String(data.priority) || p.priority,
                status: String(data.status) || p.status,
              } : p));
            } else {
              const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
              setPos(prev => [{
                id: `PO-${Date.now().toString(36)}`,
                supplier: String(data.supplier),
                items: Number(data.items) || 1,
                total: `EGP ${Number(data.totalValue).toLocaleString()}`,
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
                id: `SUP-${Date.now().toString(36)}`,
                name: String(data.name),
                category: String(data.category),
                location: String(data.location),
                rating: Number(data.rating) || 0,
                onTime: String(data.onTime) || "0%",
                spend: String(data.spend) || "EGP 0",
                status: String(data.status) || "Approved",
                risk: String(data.risk) || "Low",
                gmpCertified: false,
                phone: String(data.phone) || "",
                email: String(data.email) || "",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Contract Modal */}
      {modal?.type === "contract" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "New Contract"}
          fields={contractFields}
          initialData={modal.editing ? {
            title: modal.editing.type,
            supplier: modal.editing.supplier,
            startDate: modal.editing.start,
            endDate: modal.editing.end,
            value: parseFloat(modal.editing.value.replace(/[^0-9.]/g, "")) || 0,
            status: modal.editing.status,
            renewal: modal.editing.renewal,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(data) => {
            if (modal.editing) {
              setContractList(prev => prev.map(c => c.id === modal.editing!.id ? {
                ...c,
                supplier: String(data.supplier),
                type: String(data.title),
                value: `EGP ${Number(data.value).toLocaleString()}`,
                start: String(data.startDate),
                end: String(data.endDate),
                status: String(data.status) || c.status,
                renewal: String(data.renewal) || c.renewal,
              } : c));
            } else {
              setContractList(prev => [{
                id: `CTR-${Date.now().toString(36)}`,
                supplier: String(data.supplier),
                type: String(data.title),
                value: `EGP ${Number(data.value).toLocaleString()}`,
                start: String(data.startDate),
                end: String(data.endDate),
                status: String(data.status) || "Active",
                renewal: String(data.renewal) || "Manual",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Shipment Modal */}
      {modal?.type === "shipment" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "Add Shipment"}
          fields={shipmentFields}
          initialData={modal.editing ? {
            origin: modal.editing.origin,
            destination: modal.editing.destination,
            carrier: modal.editing.carrier,
            mode: modal.editing.mode,
            departed: modal.editing.departed,
            eta: modal.editing.eta,
            weight: modal.editing.weight,
            status: modal.editing.status,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(data) => {
            if (modal.editing) {
              setShipmentList(prev => prev.map(s => s.id === modal.editing!.id ? {
                ...s,
                origin: String(data.origin),
                destination: String(data.destination),
                carrier: String(data.carrier),
                mode: String(data.mode),
                departed: String(data.departed),
                eta: String(data.eta),
                weight: String(data.weight),
                status: String(data.status) || s.status,
              } : s));
            } else {
              setShipmentList(prev => [{
                id: `SHP-${Date.now().toString(36)}`,
                origin: String(data.origin),
                destination: String(data.destination),
                carrier: String(data.carrier),
                mode: String(data.mode),
                departed: String(data.departed),
                eta: String(data.eta),
                weight: String(data.weight),
                status: String(data.status) || "Dispatched",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Inventory Modal */}
      {modal?.type === "inventory" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.name}` : "Add Inventory Item"}
          fields={inventoryFields}
          initialData={modal.editing ? {
            name: modal.editing.name,
            category: modal.editing.category,
            onHand: modal.editing.onHand,
            reorder: modal.editing.reorder,
            max: modal.editing.max,
            unit: modal.editing.unit,
            location: modal.editing.location,
            status: modal.editing.status,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(data) => {
            if (modal.editing) {
              setInventoryList(prev => prev.map(item => item.sku === modal.editing!.sku ? {
                ...item,
                name: String(data.name),
                category: String(data.category),
                onHand: Number(data.onHand) || 0,
                reorder: Number(data.reorder) || 0,
                max: Number(data.max) || 0,
                unit: String(data.unit),
                location: String(data.location),
                status: String(data.status) || item.status,
              } : item));
            } else {
              setInventoryList(prev => [{
                sku: `SKU-${Date.now().toString(36)}`,
                productId: `prod-${Date.now().toString(36)}`,
                name: String(data.name),
                category: String(data.category),
                onHand: Number(data.onHand) || 0,
                reorder: Number(data.reorder) || 0,
                max: Number(data.max) || 0,
                unit: String(data.unit),
                location: String(data.location),
                status: String(data.status) || "Adequate",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Warehouse Modal */}
      {modal?.type === "warehouse" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.name}` : "Add Warehouse"}
          fields={warehouseFields}
          initialData={modal.editing ? {
            name: modal.editing.name,
            location: modal.editing.location,
            capacity: modal.editing.capacity,
            used: modal.editing.used,
            zones: modal.editing.zones,
            staff: modal.editing.staff,
            temp: modal.editing.temp,
            status: modal.editing.status,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(data) => {
            if (modal.editing) {
              setWarehouseList(prev => prev.map(wh => wh.id === modal.editing!.id ? {
                ...wh,
                name: String(data.name),
                location: String(data.location),
                capacity: Number(data.capacity) || 0,
                used: Number(data.used) || 0,
                zones: Number(data.zones) || 0,
                staff: Number(data.staff) || 0,
                temp: String(data.temp),
                status: String(data.status) || wh.status,
              } : wh));
            } else {
              setWarehouseList(prev => [{
                id: `WH-${Date.now().toString(36).toUpperCase()}`,
                name: String(data.name),
                location: String(data.location),
                capacity: Number(data.capacity) || 0,
                used: Number(data.used) || 0,
                zones: Number(data.zones) || 0,
                staff: Number(data.staff) || 0,
                temp: String(data.temp) || "Ambient",
                status: String(data.status) || "Operational",
              }, ...prev]);
            }
          }}
        />
      )}

      {/* ── Purchase Order Detail Dialog ── */}
      <Dialog open={!!viewPO} onOpenChange={(o) => !o && setViewPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order {viewPO?.id}</DialogTitle>
          </DialogHeader>
          {viewPO && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">PO Number</span><p className="font-medium font-mono">{viewPO.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Supplier</span><p className="font-medium">{viewPO.supplier}</p></div>
              <div><span className="text-sm text-muted-foreground">Items</span><p className="font-medium">{viewPO.items}</p></div>
              <div><span className="text-sm text-muted-foreground">Total</span><p className="font-semibold text-lg">{viewPO.total}</p></div>
              <div><span className="text-sm text-muted-foreground">Order Date</span><p className="font-medium">{viewPO.ordered}</p></div>
              <div><span className="text-sm text-muted-foreground">ETA</span><p className="font-medium">{viewPO.eta}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p>{poStatusBadge(viewPO.status)}</p></div>
              <div><span className="text-sm text-muted-foreground">Priority</span><p><Badge variant={viewPO.priority === "High" ? "destructive" : viewPO.priority === "Medium" ? "secondary" : "outline"}>{viewPO.priority}</Badge></p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Supplier Detail Dialog ── */}
      <Dialog open={!!viewSupplier} onOpenChange={(o) => !o && setViewSupplier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewSupplier?.name}</DialogTitle>
          </DialogHeader>
          {viewSupplier && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Supplier ID</span><p className="font-medium font-mono">{viewSupplier.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{viewSupplier.name}</p></div>
              <div><span className="text-sm text-muted-foreground">Category</span><p className="font-medium">{viewSupplier.category}</p></div>
              <div><span className="text-sm text-muted-foreground">Location</span><p className="font-medium">{viewSupplier.location}</p></div>
              <div><span className="text-sm text-muted-foreground">Rating</span><p className={`font-medium ${viewSupplier.rating >= 4.5 ? "text-green-600" : "text-amber-600"}`}>{viewSupplier.rating}/5</p></div>
              <div><span className="text-sm text-muted-foreground">On-Time Delivery</span><p className="font-medium">{viewSupplier.onTime}</p></div>
              <div><span className="text-sm text-muted-foreground">Annual Spend</span><p className="font-medium">{viewSupplier.spend}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p>{supplierStatusBadge(viewSupplier.status)}</p></div>
              <div><span className="text-sm text-muted-foreground">Risk Level</span><p>{riskBadge(viewSupplier.risk)}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

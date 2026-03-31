"use client"

import { useState } from "react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable from "@/components/shared/data-table"
import StatusBadge from "@/components/shared/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  AlertTriangle,
  DollarSign,
  Warehouse,
  Plus,
} from "lucide-react"

type Product = {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  reorderPoint: number
  unitCost: number
  warehouse: string
  status: string
}

type StockMovement = {
  id: string
  date: string
  product: string
  type: string
  quantity: number
  reference: string
  warehouse: string
}

type SalesOrder = {
  id: string
  number: string
  customer: string
  items: number
  total: number
  orderDate: string
  status: string
}

type WarehouseRecord = {
  id: string
  name: string
  location: string
  manager: string
  capacity: number
  used: number
  status: string
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const initialProducts: Product[] = [
  { id: "1", sku: "PRD-001", name: "Laptop Pro 15\"", category: "Electronics", quantity: 45, reorderPoint: 10, unitCost: 1299, warehouse: "Main Warehouse", status: "In Stock" },
  { id: "2", sku: "PRD-002", name: "Wireless Mouse", category: "Accessories", quantity: 8, reorderPoint: 15, unitCost: 29.99, warehouse: "Main Warehouse", status: "Low Stock" },
  { id: "3", sku: "PRD-003", name: "USB-C Hub 7-in-1", category: "Accessories", quantity: 0, reorderPoint: 20, unitCost: 49.99, warehouse: "East Warehouse", status: "Out of Stock" },
  { id: "4", sku: "PRD-004", name: "27\" Monitor 4K", category: "Electronics", quantity: 22, reorderPoint: 5, unitCost: 649, warehouse: "Main Warehouse", status: "In Stock" },
  { id: "5", sku: "PRD-005", name: "Mechanical Keyboard", category: "Accessories", quantity: 7, reorderPoint: 10, unitCost: 129, warehouse: "East Warehouse", status: "Low Stock" },
  { id: "6", sku: "PRD-006", name: "Standing Desk", category: "Furniture", quantity: 15, reorderPoint: 3, unitCost: 499, warehouse: "Main Warehouse", status: "In Stock" },
  { id: "7", sku: "PRD-007", name: "Ergonomic Chair", category: "Furniture", quantity: 30, reorderPoint: 5, unitCost: 399, warehouse: "West Warehouse", status: "In Stock" },
  { id: "8", sku: "PRD-008", name: "Webcam HD 1080p", category: "Electronics", quantity: 3, reorderPoint: 8, unitCost: 89.99, warehouse: "Main Warehouse", status: "Low Stock" },
]

const initialMovements: StockMovement[] = [
  { id: "1", date: "2026-03-28", product: "Laptop Pro 15\"", type: "Receipt", quantity: 20, reference: "PO-001", warehouse: "Main Warehouse" },
  { id: "2", date: "2026-03-27", product: "Wireless Mouse", type: "Issue", quantity: 10, reference: "SO-005", warehouse: "Main Warehouse" },
  { id: "3", date: "2026-03-26", product: "27\" Monitor 4K", type: "Receipt", quantity: 10, reference: "PO-003", warehouse: "Main Warehouse" },
  { id: "4", date: "2026-03-25", product: "Standing Desk", type: "Transfer", quantity: 5, reference: "TRF-001", warehouse: "West Warehouse" },
  { id: "5", date: "2026-03-24", product: "Ergonomic Chair", type: "Issue", quantity: 8, reference: "SO-004", warehouse: "West Warehouse" },
  { id: "6", date: "2026-03-23", product: "USB-C Hub 7-in-1", type: "Adjustment", quantity: -5, reference: "ADJ-001", warehouse: "East Warehouse" },
]

const initialSalesOrders: SalesOrder[] = [
  { id: "1", number: "SO-001", customer: "Acme Corp", items: 3, total: 4187, orderDate: "2026-03-20", status: "Fulfilled" },
  { id: "2", number: "SO-002", customer: "Globex Inc", items: 5, total: 9250, orderDate: "2026-03-22", status: "Processing" },
  { id: "3", number: "SO-003", customer: "Initech LLC", items: 2, total: 1558, orderDate: "2026-03-25", status: "Shipped" },
  { id: "4", number: "SO-004", customer: "Umbrella Co", items: 8, total: 6350, orderDate: "2026-03-27", status: "Processing" },
]

const initialWarehouses: WarehouseRecord[] = [
  { id: "1", name: "Main Warehouse", location: "123 Industrial Ave, Chicago, IL", manager: "Tom Richards", capacity: 5000, used: 3240, status: "Active" },
  { id: "2", name: "East Warehouse", location: "456 Commerce Blvd, Newark, NJ", manager: "Lisa Park", capacity: 2500, used: 1890, status: "Active" },
  { id: "3", name: "West Warehouse", location: "789 Logistics Way, Los Angeles, CA", manager: "Carlos Mendez", capacity: 3000, used: 1450, status: "Active" },
]

type Tab = "products" | "movements" | "salesorders" | "warehouses"

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("products")
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(initialSalesOrders)
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>(initialWarehouses)

  const [productOpen, setProductOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [soOpen, setSOOpen] = useState(false)
  const [warehouseOpen, setWarehouseOpen] = useState(false)

  const [newProduct, setNewProduct] = useState({ sku: "", name: "", category: "", quantity: "", reorderPoint: "", unitCost: "", warehouse: "Main Warehouse", status: "In Stock" })
  const [newMovement, setNewMovement] = useState({ product: "", type: "Receipt", quantity: "", reference: "", warehouse: "Main Warehouse" })
  const [newSO, setNewSO] = useState({ number: "", customer: "", items: "", total: "", status: "Processing" })
  const [newWarehouse, setNewWarehouse] = useState({ name: "", location: "", manager: "", capacity: "", status: "Active" })

  const totalProducts = products.length
  const lowStockItems = products.filter(p => p.status === "Low Stock" || p.status === "Out of Stock").length
  const totalValue = products.reduce((s, p) => s + p.quantity * p.unitCost, 0)
  const warehouseCount = warehouses.length

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.sku) return
    const prod: Product = {
      id: String(Date.now()),
      sku: newProduct.sku,
      name: newProduct.name,
      category: newProduct.category || "General",
      quantity: parseInt(newProduct.quantity) || 0,
      reorderPoint: parseInt(newProduct.reorderPoint) || 5,
      unitCost: parseFloat(newProduct.unitCost) || 0,
      warehouse: newProduct.warehouse,
      status: newProduct.status,
    }
    setProducts(prev => [prod, ...prev])
    setNewProduct({ sku: "", name: "", category: "", quantity: "", reorderPoint: "", unitCost: "", warehouse: "Main Warehouse", status: "In Stock" })
    setProductOpen(false)
  }

  const handleAddMovement = () => {
    if (!newMovement.product || !newMovement.quantity) return
    const mv: StockMovement = {
      id: String(Date.now()),
      date: new Date().toISOString().slice(0, 10),
      product: newMovement.product,
      type: newMovement.type,
      quantity: parseInt(newMovement.quantity),
      reference: newMovement.reference || "MANUAL",
      warehouse: newMovement.warehouse,
    }
    setMovements(prev => [mv, ...prev])
    setNewMovement({ product: "", type: "Receipt", quantity: "", reference: "", warehouse: "Main Warehouse" })
    setMovementOpen(false)
  }

  const handleAddSO = () => {
    if (!newSO.customer || !newSO.total) return
    const so: SalesOrder = {
      id: String(Date.now()),
      number: newSO.number || `SO-${String(salesOrders.length + 1).padStart(3, "0")}`,
      customer: newSO.customer,
      items: parseInt(newSO.items) || 1,
      total: parseFloat(newSO.total),
      orderDate: new Date().toISOString().slice(0, 10),
      status: newSO.status,
    }
    setSalesOrders(prev => [so, ...prev])
    setNewSO({ number: "", customer: "", items: "", total: "", status: "Processing" })
    setSOOpen(false)
  }

  const handleAddWarehouse = () => {
    if (!newWarehouse.name) return
    const wh: WarehouseRecord = {
      id: String(Date.now()),
      name: newWarehouse.name,
      location: newWarehouse.location || "TBD",
      manager: newWarehouse.manager || "Unassigned",
      capacity: parseInt(newWarehouse.capacity) || 1000,
      used: 0,
      status: newWarehouse.status,
    }
    setWarehouses(prev => [...prev, wh])
    setNewWarehouse({ name: "", location: "", manager: "", capacity: "", status: "Active" })
    setWarehouseOpen(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "products", label: "Products" },
    { key: "movements", label: "Stock Movements" },
    { key: "salesorders", label: "Sales Orders" },
    { key: "warehouses", label: "Warehouses" },
  ]

  const productColumns = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Product" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Qty", render: (v: unknown) => (v as number).toLocaleString() },
    { key: "reorderPoint", label: "Reorder Pt." },
    { key: "unitCost", label: "Unit Cost", render: (v: unknown) => fmt(v as number) },
    { key: "warehouse", label: "Warehouse" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const movementColumns = [
    { key: "date", label: "Date" },
    { key: "product", label: "Product" },
    { key: "type", label: "Type" },
    { key: "quantity", label: "Quantity", render: (v: unknown) => {
      const n = v as number
      return <span className={n < 0 ? "text-red-600 font-medium" : "text-green-700 font-medium"}>{n > 0 ? "+" : ""}{n}</span>
    }},
    { key: "reference", label: "Reference" },
    { key: "warehouse", label: "Warehouse" },
  ]

  const soColumns = [
    { key: "number", label: "Order #" },
    { key: "customer", label: "Customer" },
    { key: "items", label: "Items" },
    { key: "orderDate", label: "Order Date" },
    { key: "total", label: "Total", render: (v: unknown) => fmt(v as number) },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const warehouseColumns = [
    { key: "name", label: "Warehouse" },
    { key: "location", label: "Location" },
    { key: "manager", label: "Manager" },
    { key: "capacity", label: "Capacity", render: (v: unknown) => (v as number).toLocaleString() + " units" },
    { key: "used", label: "Used", render: (_v: unknown, row: unknown) => {
      const r = row as WarehouseRecord
      const pct = Math.round((r.used / r.capacity) * 100)
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      )
    }},
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Inventory" description="Track products, stock movements, and warehouses">
        {activeTab === "products" && (
          <Button onClick={() => setProductOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        )}
        {activeTab === "movements" && (
          <Button onClick={() => setMovementOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Record Movement
          </Button>
        )}
        {activeTab === "salesorders" && (
          <Button onClick={() => setSOOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Sales Order
          </Button>
        )}
        {activeTab === "warehouses" && (
          <Button onClick={() => setWarehouseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Warehouse
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={totalProducts.toLocaleString()}
          subtitle="Active SKUs"
          icon={<Package className="h-5 w-5" />}
          trend={{ value: 3.8, label: "vs last month" }}
        />
        <StatsCard
          title="Low Stock Items"
          value={lowStockItems.toLocaleString()}
          subtitle="Need reordering"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatsCard
          title="Total Value"
          value={fmt(totalValue)}
          subtitle="Inventory at cost"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: 1.4, label: "vs last month" }}
        />
        <StatsCard
          title="Warehouses"
          value={warehouseCount.toLocaleString()}
          subtitle="Storage locations"
          icon={<Warehouse className="h-5 w-5" />}
        />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "products" && (
        <DataTable columns={productColumns as Parameters<typeof DataTable>[0]["columns"]} data={products as Record<string, unknown>[]} />
      )}
      {activeTab === "movements" && (
        <DataTable columns={movementColumns as Parameters<typeof DataTable>[0]["columns"]} data={movements as Record<string, unknown>[]} />
      )}
      {activeTab === "salesorders" && (
        <DataTable columns={soColumns as Parameters<typeof DataTable>[0]["columns"]} data={salesOrders as Record<string, unknown>[]} />
      )}
      {activeTab === "warehouses" && (
        <DataTable columns={warehouseColumns as Parameters<typeof DataTable>[0]["columns"]} data={warehouses as Record<string, unknown>[]} />
      )}

      {/* Add Product Dialog */}
      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU *</Label>
                <Input placeholder="PRD-009" value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input placeholder="Electronics" value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input placeholder="Product name" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" placeholder="0" value={newProduct.quantity} onChange={e => setNewProduct(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Point</Label>
                <Input type="number" placeholder="5" value={newProduct.reorderPoint} onChange={e => setNewProduct(p => ({ ...p, reorderPoint: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost</Label>
              <Input type="number" placeholder="0.00" value={newProduct.unitCost} onChange={e => setNewProduct(p => ({ ...p, unitCost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select value={newProduct.warehouse} onValueChange={v => setNewProduct(p => ({ ...p, warehouse: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newProduct.status} onValueChange={v => setNewProduct(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["In Stock", "Low Stock", "Out of Stock"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Input placeholder="Product name or SKU" value={newMovement.product} onChange={e => setNewMovement(p => ({ ...p, product: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Movement Type</Label>
              <Select value={newMovement.type} onValueChange={v => setNewMovement(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Receipt", "Issue", "Transfer", "Adjustment"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input type="number" placeholder="0" value={newMovement.quantity} onChange={e => setNewMovement(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input placeholder="PO-001 / SO-001" value={newMovement.reference} onChange={e => setNewMovement(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select value={newMovement.warehouse} onValueChange={v => setNewMovement(p => ({ ...p, warehouse: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMovement}>Record Movement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sales Order Dialog */}
      <Dialog open={soOpen} onOpenChange={setSOOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Order Number</Label>
              <Input placeholder="SO-005" value={newSO.number} onChange={e => setNewSO(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Input placeholder="Customer name" value={newSO.customer} onChange={e => setNewSO(p => ({ ...p, customer: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Items</Label>
                <Input type="number" placeholder="1" value={newSO.items} onChange={e => setNewSO(p => ({ ...p, items: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Total *</Label>
                <Input type="number" placeholder="0.00" value={newSO.total} onChange={e => setNewSO(p => ({ ...p, total: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newSO.status} onValueChange={v => setNewSO(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Processing", "Shipped", "Fulfilled", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSOOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSO}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Warehouse Dialog */}
      <Dialog open={warehouseOpen} onOpenChange={setWarehouseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Warehouse</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Warehouse Name *</Label>
              <Input placeholder="e.g. North Warehouse" value={newWarehouse.name} onChange={e => setNewWarehouse(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Address" value={newWarehouse.location} onChange={e => setNewWarehouse(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Input placeholder="Manager name" value={newWarehouse.manager} onChange={e => setNewWarehouse(p => ({ ...p, manager: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity (units)</Label>
              <Input type="number" placeholder="1000" value={newWarehouse.capacity} onChange={e => setNewWarehouse(p => ({ ...p, capacity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newWarehouse.status} onValueChange={v => setNewWarehouse(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseOpen(false)}>Cancel</Button>
            <Button onClick={handleAddWarehouse}>Add Warehouse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

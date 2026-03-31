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
  ShoppingCart,
  Clock,
  Users,
  FileSignature,
  Plus,
} from "lucide-react"

type PurchaseOrder = {
  id: string
  number: string
  supplier: string
  items: number
  total: number
  orderDate: string
  expectedDate: string
  status: string
}

type Supplier = {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  country: string
  status: string
  totalOrders: number
}

type Contract = {
  id: string
  number: string
  supplier: string
  type: string
  startDate: string
  endDate: string
  value: number
  status: string
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const initialPOs: PurchaseOrder[] = [
  { id: "1", number: "PO-001", supplier: "TechSupply Co", items: 5, total: 24500, orderDate: "2026-03-10", expectedDate: "2026-04-05", status: "Approved" },
  { id: "2", number: "PO-002", supplier: "Office Pro", items: 12, total: 3200, orderDate: "2026-03-15", expectedDate: "2026-03-30", status: "Received" },
  { id: "3", number: "PO-003", supplier: "Industrial Parts Ltd", items: 8, total: 67800, orderDate: "2026-03-20", expectedDate: "2026-04-20", status: "Pending Approval" },
  { id: "4", number: "PO-004", supplier: "Green Office Supplies", items: 20, total: 1850, orderDate: "2026-03-22", expectedDate: "2026-03-28", status: "Ordered" },
  { id: "5", number: "PO-005", supplier: "Digital Components Inc", items: 3, total: 15600, orderDate: "2026-03-25", expectedDate: "2026-04-15", status: "Pending Approval" },
]

const initialSuppliers: Supplier[] = [
  { id: "1", name: "TechSupply Co", contact: "John Martinez", email: "john@techsupply.com", phone: "+1 555-0101", country: "USA", status: "Active", totalOrders: 24 },
  { id: "2", name: "Office Pro", contact: "Sarah Lee", email: "sarah@officepro.com", phone: "+1 555-0102", country: "USA", status: "Active", totalOrders: 18 },
  { id: "3", name: "Industrial Parts Ltd", contact: "Mike Brown", email: "mike@indparts.co.uk", phone: "+44 20 7946 0102", country: "UK", status: "Active", totalOrders: 7 },
  { id: "4", name: "Green Office Supplies", contact: "Emma Wilson", email: "emma@greenoffice.com", phone: "+1 555-0104", country: "USA", status: "Active", totalOrders: 31 },
  { id: "5", name: "Digital Components Inc", contact: "David Chen", email: "david@digcomp.com", phone: "+1 555-0105", country: "USA", status: "Active", totalOrders: 12 },
  { id: "6", name: "GlobalParts GmbH", contact: "Hans Weber", email: "hans@globalparts.de", phone: "+49 30 12345678", country: "Germany", status: "Inactive", totalOrders: 3 },
]

const initialContracts: Contract[] = [
  { id: "1", number: "CTR-001", supplier: "TechSupply Co", type: "Annual Supply", startDate: "2026-01-01", endDate: "2026-12-31", value: 280000, status: "Active" },
  { id: "2", number: "CTR-002", supplier: "Office Pro", type: "Service Agreement", startDate: "2026-02-01", endDate: "2027-01-31", value: 48000, status: "Active" },
  { id: "3", number: "CTR-003", supplier: "Industrial Parts Ltd", type: "Framework", startDate: "2025-07-01", endDate: "2026-06-30", value: 500000, status: "Active" },
  { id: "4", number: "CTR-004", supplier: "GlobalParts GmbH", type: "One-time", startDate: "2025-01-01", endDate: "2025-12-31", value: 75000, status: "Closed" },
]

type Tab = "po" | "suppliers" | "contracts"

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("po")
  const [pos, setPOs] = useState<PurchaseOrder[]>(initialPOs)
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)

  const [poOpen, setPOOpen] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [contractOpen, setContractOpen] = useState(false)

  const [newPO, setNewPO] = useState({ number: "", supplier: "", items: "", total: "", expectedDate: "", status: "Pending Approval" })
  const [newSupplier, setNewSupplier] = useState({ name: "", contact: "", email: "", phone: "", country: "", status: "Active" })
  const [newContract, setNewContract] = useState({ number: "", supplier: "", type: "", startDate: "", endDate: "", value: "", status: "Active" })

  const totalOrders = pos.length
  const pendingApproval = pos.filter(p => p.status === "Pending Approval").length
  const activeSuppliers = suppliers.filter(s => s.status === "Active").length
  const activeContracts = contracts.filter(c => c.status === "Active").length

  const handleAddPO = () => {
    if (!newPO.supplier || !newPO.total) return
    const po: PurchaseOrder = {
      id: String(Date.now()),
      number: newPO.number || `PO-${String(pos.length + 1).padStart(3, "0")}`,
      supplier: newPO.supplier,
      items: parseInt(newPO.items) || 1,
      total: parseFloat(newPO.total),
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: newPO.expectedDate || "2026-05-01",
      status: newPO.status,
    }
    setPOs(prev => [po, ...prev])
    setNewPO({ number: "", supplier: "", items: "", total: "", expectedDate: "", status: "Pending Approval" })
    setPOOpen(false)
  }

  const handleAddSupplier = () => {
    if (!newSupplier.name) return
    const sup: Supplier = {
      id: String(Date.now()),
      name: newSupplier.name,
      contact: newSupplier.contact,
      email: newSupplier.email,
      phone: newSupplier.phone,
      country: newSupplier.country || "USA",
      status: newSupplier.status,
      totalOrders: 0,
    }
    setSuppliers(prev => [sup, ...prev])
    setNewSupplier({ name: "", contact: "", email: "", phone: "", country: "", status: "Active" })
    setSupplierOpen(false)
  }

  const handleAddContract = () => {
    if (!newContract.supplier || !newContract.value) return
    const con: Contract = {
      id: String(Date.now()),
      number: newContract.number || `CTR-${String(contracts.length + 1).padStart(3, "0")}`,
      supplier: newContract.supplier,
      type: newContract.type || "Agreement",
      startDate: newContract.startDate || new Date().toISOString().slice(0, 10),
      endDate: newContract.endDate || "2027-01-01",
      value: parseFloat(newContract.value),
      status: newContract.status,
    }
    setContracts(prev => [con, ...prev])
    setNewContract({ number: "", supplier: "", type: "", startDate: "", endDate: "", value: "", status: "Active" })
    setContractOpen(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "po", label: "Purchase Orders" },
    { key: "suppliers", label: "Suppliers" },
    { key: "contracts", label: "Contracts" },
  ]

  const poColumns = [
    { key: "number", label: "PO Number" },
    { key: "supplier", label: "Supplier" },
    { key: "items", label: "Items" },
    { key: "orderDate", label: "Order Date" },
    { key: "expectedDate", label: "Expected Date" },
    { key: "total", label: "Total", render: (v: unknown) => fmt(v as number) },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const supplierColumns = [
    { key: "name", label: "Supplier" },
    { key: "contact", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "country", label: "Country" },
    { key: "totalOrders", label: "Orders" },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const contractColumns = [
    { key: "number", label: "Contract #" },
    { key: "supplier", label: "Supplier" },
    { key: "type", label: "Type" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "value", label: "Value", render: (v: unknown) => fmt(v as number) },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Procurement" description="Manage purchase orders, suppliers, and contracts">
        {activeTab === "po" && (
          <Button onClick={() => setPOOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Purchase Order
          </Button>
        )}
        {activeTab === "suppliers" && (
          <Button onClick={() => setSupplierOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </Button>
        )}
        {activeTab === "contracts" && (
          <Button onClick={() => setContractOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Contract
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          subtitle="All purchase orders"
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={{ value: 5.3, label: "vs last month" }}
        />
        <StatsCard
          title="Pending Approval"
          value={pendingApproval.toLocaleString()}
          subtitle="Awaiting review"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatsCard
          title="Active Suppliers"
          value={activeSuppliers.toLocaleString()}
          subtitle="Approved vendors"
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 2.1, label: "vs last month" }}
        />
        <StatsCard
          title="Active Contracts"
          value={activeContracts.toLocaleString()}
          subtitle="Current agreements"
          icon={<FileSignature className="h-5 w-5" />}
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

      {activeTab === "po" && (
        <DataTable columns={poColumns as Parameters<typeof DataTable>[0]["columns"]} data={pos as Record<string, unknown>[]} emptyMessage="No purchase orders found." />
      )}
      {activeTab === "suppliers" && (
        <DataTable columns={supplierColumns as Parameters<typeof DataTable>[0]["columns"]} data={suppliers as Record<string, unknown>[]} emptyMessage="No suppliers found." />
      )}
      {activeTab === "contracts" && (
        <DataTable columns={contractColumns as Parameters<typeof DataTable>[0]["columns"]} data={contracts as Record<string, unknown>[]} emptyMessage="No contracts found." />
      )}

      {/* Add PO Dialog */}
      <Dialog open={poOpen} onOpenChange={setPOOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>PO Number</Label>
              <Input placeholder="PO-006" value={newPO.number} onChange={e => setNewPO(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Input placeholder="Supplier name" value={newPO.supplier} onChange={e => setNewPO(p => ({ ...p, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Items</Label>
              <Input type="number" placeholder="1" value={newPO.items} onChange={e => setNewPO(p => ({ ...p, items: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Amount *</Label>
              <Input type="number" placeholder="0.00" value={newPO.total} onChange={e => setNewPO(p => ({ ...p, total: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Delivery</Label>
              <Input type="date" value={newPO.expectedDate} onChange={e => setNewPO(p => ({ ...p, expectedDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newPO.status} onValueChange={v => setNewPO(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Pending Approval", "Approved", "Ordered", "Received", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPOOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPO}>Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input placeholder="Company name" value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input placeholder="Full name" value={newSupplier.contact} onChange={e => setNewSupplier(p => ({ ...p, contact: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="contact@company.com" value={newSupplier.email} onChange={e => setNewSupplier(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+1 555-0000" value={newSupplier.phone} onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input placeholder="USA" value={newSupplier.country} onChange={e => setNewSupplier(p => ({ ...p, country: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newSupplier.status} onValueChange={v => setNewSupplier(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contract Dialog */}
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Contract Number</Label>
              <Input placeholder="CTR-005" value={newContract.number} onChange={e => setNewContract(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Input placeholder="Supplier name" value={newContract.supplier} onChange={e => setNewContract(p => ({ ...p, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contract Type</Label>
              <Input placeholder="e.g. Annual Supply" value={newContract.type} onChange={e => setNewContract(p => ({ ...p, type: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={newContract.startDate} onChange={e => setNewContract(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={newContract.endDate} onChange={e => setNewContract(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contract Value *</Label>
              <Input type="number" placeholder="0.00" value={newContract.value} onChange={e => setNewContract(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newContract.status} onValueChange={v => setNewContract(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Active", "Pending", "Closed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContract}>Create Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

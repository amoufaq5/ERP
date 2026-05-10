"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Monitor,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  RotateCcw,
  XCircle,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Today's Sales", value: "$24,580", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
  { label: "Transactions", value: "187", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Avg Basket Size", value: "$131.44", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Top Selling SKU", value: "SKU-4821", icon: Monitor, color: "text-orange-600", bg: "bg-orange-100" },
];

const terminals = [
  { id: "POS-001", store: "Downtown Flagship", status: "In Use", operator: "Sarah Chen", lastTxn: "2:34 PM", shiftTotal: "$4,280.50" },
  { id: "POS-002", store: "Downtown Flagship", status: "Online", operator: "—", lastTxn: "1:58 PM", shiftTotal: "$3,120.00" },
  { id: "POS-003", store: "Mall Location", status: "In Use", operator: "James Wilson", lastTxn: "2:41 PM", shiftTotal: "$5,610.25" },
  { id: "POS-004", store: "Mall Location", status: "Offline", operator: "—", lastTxn: "11:30 AM", shiftTotal: "$1,890.00" },
  { id: "POS-005", store: "Airport Kiosk", status: "In Use", operator: "Maria Lopez", lastTxn: "2:39 PM", shiftTotal: "$2,450.75" },
  { id: "POS-006", store: "Suburban Store", status: "Online", operator: "—", lastTxn: "2:15 PM", shiftTotal: "$3,780.00" },
  { id: "POS-007", store: "Suburban Store", status: "In Use", operator: "David Park", lastTxn: "2:42 PM", shiftTotal: "$4,105.30" },
  { id: "POS-008", store: "Outlet Center", status: "Online", operator: "—", lastTxn: "12:45 PM", shiftTotal: "$2,230.00" },
];

const transactions = [
  { receipt: "RCP-10421", terminal: "POS-003", time: "2:41 PM", items: 5, subtotal: "$142.50", tax: "$11.40", total: "$153.90", payment: "Card", cashier: "James Wilson" },
  { receipt: "RCP-10420", terminal: "POS-005", time: "2:39 PM", items: 2, subtotal: "$89.00", tax: "$7.12", total: "$96.12", payment: "Mobile", cashier: "Maria Lopez" },
  { receipt: "RCP-10419", terminal: "POS-001", time: "2:34 PM", items: 8, subtotal: "$245.80", tax: "$19.66", total: "$265.46", payment: "Card", cashier: "Sarah Chen" },
  { receipt: "RCP-10418", terminal: "POS-007", time: "2:30 PM", items: 1, subtotal: "$49.99", tax: "$4.00", total: "$53.99", payment: "Cash", cashier: "David Park" },
  { receipt: "RCP-10417", terminal: "POS-003", time: "2:25 PM", items: 3, subtotal: "$178.00", tax: "$14.24", total: "$192.24", payment: "Card", cashier: "James Wilson" },
  { receipt: "RCP-10416", terminal: "POS-001", time: "2:18 PM", items: 4, subtotal: "$67.50", tax: "$5.40", total: "$72.90", payment: "Mobile", cashier: "Sarah Chen" },
  { receipt: "RCP-10415", terminal: "POS-005", time: "2:12 PM", items: 6, subtotal: "$312.00", tax: "$24.96", total: "$336.96", payment: "Card", cashier: "Maria Lopez" },
  { receipt: "RCP-10414", terminal: "POS-007", time: "2:05 PM", items: 2, subtotal: "$55.00", tax: "$4.40", total: "$59.40", payment: "Cash", cashier: "David Park" },
];

const endOfDayReports = [
  { date: "May 9, 2026", totalSales: "$32,450", transactions: 243, avgBasket: "$133.54", cashVariance: "-$2.30", status: "Closed" },
  { date: "May 8, 2026", totalSales: "$28,910", transactions: 218, avgBasket: "$132.61", cashVariance: "+$0.50", status: "Closed" },
  { date: "May 7, 2026", totalSales: "$35,120", transactions: 271, avgBasket: "$129.59", cashVariance: "$0.00", status: "Closed" },
  { date: "May 6, 2026", totalSales: "$30,780", transactions: 235, avgBasket: "$130.98", cashVariance: "-$5.00", status: "Closed" },
  { date: "May 5, 2026", totalSales: "$26,340", transactions: 198, avgBasket: "$133.03", cashVariance: "+$1.20", status: "Closed" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    "In Use": "bg-blue-100 text-blue-800",
    Online: "bg-green-100 text-green-800",
    Offline: "bg-red-100 text-red-800",
    Closed: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function paymentIcon(method: string) {
  if (method === "Card") return <CreditCard className="h-4 w-4 inline mr-1" />;
  if (method === "Mobile") return <Smartphone className="h-4 w-4 inline mr-1" />;
  return <Banknote className="h-4 w-4 inline mr-1" />;
}

export default function PointOfSalePage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground">Manage POS terminals, transactions, and daily operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><RotateCcw className="h-4 w-4 mr-2" />Process Return</Button>
          <Button variant="outline"><XCircle className="h-4 w-4 mr-2" />Void Transaction</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Open Register</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search terminals or transactions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Run Z-Report</Button>
        <Button variant="outline">Close Shift</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="terminals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="terminals">Active Terminals</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="eod">End of Day</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="terminals">
          <Card>
            <CardHeader><CardTitle>Terminal Status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead className="text-right">Shift Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminals.filter((t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.store.toLowerCase().includes(search.toLowerCase())).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono font-medium">{t.id}</TableCell>
                      <TableCell>{t.store}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>{t.operator}</TableCell>
                      <TableCell>{t.lastTxn}</TableCell>
                      <TableCell className="text-right font-medium">{t.shiftTotal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Terminal</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Cashier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.receipt}>
                      <TableCell className="font-mono">{t.receipt}</TableCell>
                      <TableCell>{t.terminal}</TableCell>
                      <TableCell>{t.time}</TableCell>
                      <TableCell>{t.items}</TableCell>
                      <TableCell>{t.subtotal}</TableCell>
                      <TableCell>{t.tax}</TableCell>
                      <TableCell className="font-medium">{t.total}</TableCell>
                      <TableCell>{paymentIcon(t.payment)}{t.payment}</TableCell>
                      <TableCell>{t.cashier}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eod">
          <Card>
            <CardHeader><CardTitle>End of Day Reports</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Avg Basket</TableHead>
                    <TableHead>Cash Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endOfDayReports.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="font-medium">{r.totalSales}</TableCell>
                      <TableCell>{r.transactions}</TableCell>
                      <TableCell>{r.avgBasket}</TableCell>
                      <TableCell className={r.cashVariance.startsWith("-") ? "text-red-600" : "text-green-600"}>{r.cashVariance}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>POS Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Tax Rate (%)</label>
                  <Input defaultValue="8.0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Printer</label>
                  <Input defaultValue="Epson TM-T88VI" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Input defaultValue="USD" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift Duration (hours)</label>
                  <Input defaultValue="8" />
                </div>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
